from __future__ import annotations

import re
import tempfile
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.normalize import normalize_baselines
from backend.reference_bridge import (
    ReferenceBackendError,
    load_reference_backend,
    serialize_analysis_result,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class AnalysisService:
    def __init__(self) -> None:
        self._state_lock = threading.RLock()
        self._alm_lock = threading.Lock()
        self._jobs_lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="swpm-analysis")
        self._backend: Any = None
        self._module: Any = None
        self._jobs: dict[str, dict[str, Any]] = {}
        self._results: dict[str, tuple[Any, Any]] = {}
        self._inputs_cache: dict[tuple[str, str], dict[str, Any]] = {}

    def _ensure_backend(self) -> tuple[Any, Any]:
        with self._state_lock:
            if self._module is None:
                self._module = load_reference_backend()
            if self._backend is None:
                self._backend = self._module.AnalysisBackend()
            return self._module, self._backend

    def _cached_builds(self, project: str) -> list[str]:
        module, _ = self._ensure_backend()
        root = Path(module.CACHE_DIR)
        pattern = re.compile(rf"^{re.escape(project)}_(.+?)_ref(?:\.zip)?$")
        builds = {
            match.group(1)
            for item in root.iterdir() if root.is_dir()
            for match in [pattern.match(item.name)]
            if match
        }
        return sorted(builds, key=lambda value: (not value.isdigit(), int(value) if value.isdigit() else value), reverse=True)

    def bootstrap(self, refresh_projects: bool = False) -> dict[str, Any]:
        module, _ = self._ensure_backend()
        config = module.load_config()
        states = config.get("selection_states") or {}
        projects = sorted(states)
        warning = ""
        if refresh_projects:
            try:
                projects = sorted(set(projects) | set(module.get_all_projects()))
            except Exception as exc:  # reference client exposes requests errors directly
                warning = str(exc)
        last_project = str(config.get("last_project") or (projects[0] if projects else ""))
        cached_builds = self._cached_builds(last_project) if last_project else []
        last_build = str(config.get("last_build") or (cached_builds[0] if cached_builds else ""))
        return {
            "projects": projects,
            "lastProject": last_project,
            "lastBuild": last_build,
            "cachedBuilds": cached_builds,
            "selection": self._selection_for(config, last_project),
            "warning": warning,
        }

    def cached_builds(self, project: str) -> list[str]:
        return self._cached_builds(project)

    @staticmethod
    def _expandable_nodes(module: Any) -> dict[str, tuple[str, list[str], str]]:
        """Leaf iterations whose children were never fetched: display -> (timeline, label chain, child_url)."""
        cache = module.load_local_cache(module.TIMELINE_CACHE_PATH)
        found: dict[str, tuple[str, list[str], str]] = {}

        def walk(timeline: str, nodes: list[dict[str, Any]], chain: list[str]) -> None:
            for node in nodes or []:
                current = [*chain, str(node.get("label") or "").strip()]
                children = node.get("children") or []
                child_url = str(node.get("child_url") or "").strip()
                if children:
                    walk(timeline, children, current)
                elif child_url:
                    found[f"{timeline} | {' / '.join(current)}"] = (timeline, current, child_url)

        for timeline, nodes in cache.items():
            walk(timeline, nodes, [])
        return found

    def _scope_options(self, module: Any, backend: Any) -> list[dict[str, Any]]:
        expandable = self._expandable_nodes(module)
        return [{**scope, "expandable": scope.get("display") in expandable} for scope in backend.alm_scopes()]

    def load_alm_children(self, display: str) -> dict[str, Any]:
        """Fetch one layer of child iterations from RTC and write it back to the timeline cache."""
        module, backend = self._ensure_backend()
        with self._alm_lock:
            target = self._expandable_nodes(module).get(display)
            if target is None:
                raise ValueError(f"ALM iteration has no unloaded sub-iterations: {display}")
            timeline, chain, child_url = target
            try:
                if backend.alm is None:
                    backend.connect_alm()
                children = backend.alm.fetch_children_for_node(child_url)
            except Exception:
                backend.alm = None  # force a fresh RTC login on the next attempt
                raise
            if children:
                backend.alm.update_cache_with_children(timeline, chain, children)
                if display in self._expandable_nodes(module):
                    raise RuntimeError("Sub-iterations were fetched but could not be written to the timeline cache")
            return {"loaded": len(children), "almScopes": self._scope_options(module, backend)}

    @staticmethod
    def _selection_for(config: dict[str, Any], project: str) -> dict[str, Any]:
        raw = (config.get("selection_states") or {}).get(project) or {}
        scopes = raw.get("alm_scope_displays")
        if scopes is None:
            legacy = raw.get("alm_scope_display")
            scopes = [legacy] if legacy else []
        return {
            "asFileNames": list(raw.get("as_file_names") or []),
            "asFeatures": normalize_baselines(raw.get("as_features") or []),
            "xsFileNames": list(raw.get("xs_file_names") or []),
            "xsFeatures": normalize_baselines(raw.get("xs_features") or []),
            "almScopes": list(scopes or []),
            "qcPaths": list(raw.get("qc_paths") or []),
        }

    def inputs(self, project: str, build: str, refresh: bool = False) -> dict[str, Any]:
        if not project or not build:
            raise ValueError("Project and build are required")
        module, backend = self._ensure_backend()
        key = (project, build)
        scanned = None if refresh else self._inputs_cache.get(key)
        if scanned is not None:
            # Lock-free so the page stays responsive while an analysis holds the state lock.
            return self._compose_inputs(module, backend, scanned)
        with self._state_lock:
            self._load_build_without_cleanup(module, backend, project, build)
            as_files = sorted(backend.data.file_map)
            xs_files = sorted(backend.data.xs_file_map)
            scanned = {
                "project": project,
                "build": build,
                "asFiles": as_files,
                "asFeatures": backend.data.list_baselines(as_files, "as") if as_files else [],
                "xsFiles": xs_files,
                "xsFeatures": backend.data.list_baselines(xs_files, "xs") if xs_files else [],
                "qcFolders": backend.qc_folder_tree(),
                "qcPaths": backend.qc.available_folder_paths(),
            }
            self._inputs_cache[key] = scanned
            config = module.load_config()
            config["last_project"] = project
            config["last_build"] = build
            module.save_config(config)
            return self._compose_inputs(module, backend, scanned)

    def _compose_inputs(self, module: Any, backend: Any, scanned: dict[str, Any]) -> dict[str, Any]:
        """Scan results are cached; scopes and the saved selection are always read fresh."""
        return {
            **scanned,
            "almScopes": self._scope_options(module, backend),
            "selection": self._selection_for(module.load_config(), scanned["project"]),
        }

    @staticmethod
    def _load_build_without_cleanup(module: Any, backend: Any, project: str, build: str) -> None:
        """Use the reference scanners while keeping older cached builds intact."""
        build = str(build).strip()
        zip_path = Path(module.CACHE_DIR) / f"{project}_{build}_ref.zip"
        base_dir = Path(module.CACHE_DIR) / f"{project}_{build}_ref"
        base_dir.mkdir(parents=True, exist_ok=True)
        if not zip_path.is_file():
            artifact = module.download_ref_zip(project, build)
            zip_path.write_bytes(module.download_file(project, build, artifact))
        if not any(base_dir.iterdir()):
            with module.zipfile.ZipFile(zip_path) as archive:
                archive.extractall(base_dir)
        data = backend.data
        data.base_dir = str(base_dir)
        data.file_map = module.scan_10as_files(data.base_dir)
        data.xs_file_map = module.scan_40gen_swxs_files(data.base_dir)
        data.csv_cache.clear()
        data.xs_targets = module.scan_40gen_swxs_targets(data.base_dir, data.csv_cache)
        data.project = project
        data.build = build
        backend.force_alm_refresh = True
        backend.load_qc()

    def jenkins_status(self, project: str) -> dict[str, Any]:
        module, _ = self._ensure_backend()
        return module.get_jenkins_status(project)

    def trigger_build(self, project: str) -> str:
        job_id = self._new_job("jenkins", {"project": project})
        self._executor.submit(self._trigger_worker, job_id, project)
        return job_id

    def _trigger_worker(self, job_id: str, project: str) -> None:
        module, _ = self._ensure_backend()
        self._set_job(job_id, status="running", message="Triggering Jenkins build", progress=5)
        try:
            status = module.trigger_and_wait(
                project,
                log=lambda message, level="info": self._append_log(job_id, message, level),
            )
            self._set_job(job_id, status="complete", message="Jenkins build triggered", progress=100, result=status)
        except Exception as exc:
            self._set_job(job_id, status="failed", message=str(exc), error=str(exc))

    def start_analysis(self, payload: dict[str, Any]) -> str:
        job_id = self._new_job("analysis", payload)
        self._executor.submit(self._analysis_worker, job_id, payload)
        return job_id

    def _analysis_worker(self, job_id: str, payload: dict[str, Any]) -> None:
        module, backend = self._ensure_backend()
        self._set_job(job_id, status="running", message="Preparing analysis", progress=1)
        try:
            request = module.AnalysisRequest(
                project=str(payload.get("project") or ""),
                build=str(payload.get("build") or ""),
                as_file_names=list(payload.get("asFileNames") or []),
                as_features=normalize_baselines(payload.get("asFeatures") or []),
                xs_file_names=list(payload.get("xsFileNames") or []),
                xs_features=normalize_baselines(payload.get("xsFeatures") or []),
                alm_scopes=list(payload.get("almScopes") or []),
                qc_paths=list(payload.get("qcPaths") or []),
            )
            with self._state_lock:
                backend.log = lambda message, level="info": self._append_log(job_id, message, level)
                if (
                    str(backend.data.project or "") != request.project
                    or str(backend.data.build or "") != request.build
                    or not backend.data.base_dir
                ):
                    self._load_build_without_cleanup(module, backend, request.project, request.build)
                if request.alm_scopes and backend.alm is None:
                    backend.connect_alm()
                result = backend.run_full_analysis(
                    request,
                    progress=lambda step, total, message, percent: self._set_job(
                        job_id,
                        step=step,
                        totalSteps=total,
                        message=message,
                        progress=percent,
                    ),
                )
                self._save_selection(module, request)
            serialized = serialize_analysis_result(result)
            with self._jobs_lock:
                self._results[job_id] = (result, request)
            self._set_job(job_id, status="complete", message="Analysis complete", progress=100, result=serialized)
        except Exception as exc:
            self._append_log(job_id, str(exc), "error")
            self._set_job(job_id, status="failed", message=str(exc), error=str(exc))

    @staticmethod
    def _save_selection(module: Any, request: Any) -> None:
        config = module.load_config()
        states = config.setdefault("selection_states", {})
        states[request.project] = {
            "as_file_names": list(request.as_file_names),
            "as_features": list(request.as_features),
            "xs_file_names": list(request.xs_file_names),
            "xs_features": list(request.xs_features),
            "alm_scope_displays": [
                item.get("display", "") if isinstance(item, dict) else item
                for item in request.alm_scopes
            ],
            "qc_paths": list(request.qc_paths),
        }
        config["last_project"] = request.project
        config["last_build"] = request.build
        module.save_config(config)

    def _new_job(self, kind: str, request: dict[str, Any]) -> str:
        job_id = uuid.uuid4().hex
        with self._jobs_lock:
            self._jobs[job_id] = {
                "id": job_id,
                "kind": kind,
                "status": "queued",
                "progress": 0,
                "step": 0,
                "totalSteps": 0,
                "message": "Queued",
                "error": "",
                "logs": [],
                "request": request,
                "createdAt": _now(),
                "updatedAt": _now(),
            }
        return job_id

    def _append_log(self, job_id: str, message: str, level: str = "info") -> None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            job["logs"].append({"time": _now(), "level": level, "message": str(message)})
            job["logs"] = job["logs"][-500:]
            job["updatedAt"] = _now()

    def _set_job(self, job_id: str, **updates: Any) -> None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            job.update(updates)
            job["updatedAt"] = _now()

    def job(self, job_id: str, include_result: bool = True) -> dict[str, Any] | None:
        with self._jobs_lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            response = dict(job)
            response["logs"] = list(job["logs"])
            if not include_result:
                response.pop("result", None)
            return response

    def export_report(self, job_id: str) -> Path:
        module, backend = self._ensure_backend()
        with self._jobs_lock:
            saved = self._results.get(job_id)
        if saved is None:
            raise KeyError(job_id)
        result, request = saved
        output = Path(tempfile.gettempdir()) / f"SWPM_{request.project}_{request.build}_{job_id[:8]}.xlsx"
        with self._state_lock:
            backend.export_report(str(output), result, request)
        return output


analysis_service = AnalysisService()
