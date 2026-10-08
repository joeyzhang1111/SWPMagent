from __future__ import annotations

import json
import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import urllib3
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.doors import DoorsDataError, load_doors_tasks
from backend.qc import QcDataError, load_qc_tasks
from backend.traceability import build_traceability


LOGGER = logging.getLogger(__name__)

OSLC_QUERY = "oslc_cm.query"
OSLC_PROPERTIES = "oslc_cm.properties"
PROP_ID = "dc:identifier"
PROP_TITLE = "dc:title"
PROP_TYPE = "dc:type"
PROP_STATE = "rtc_cm:state"
PROP_RESOLUTION = "rtc_cm:resolution"
PROP_SEVERITY = "oslc_cm:severity"
PROP_FILED_AGAINST = "rtc_cm:filedAgainst"
PROP_OWNED_BY = "rtc_cm:ownedBy"


class AlmConfigurationError(RuntimeError):
    pass


class AlmRequestError(RuntimeError):
    pass


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class Settings:
    data_mode: str
    legacy_cache_path: str
    legacy_cache_scope: str
    doors_enabled: bool
    legacy_jenkins_root: str
    legacy_config_path: str
    doors_derived_cache_path: str
    doors_max_records: int
    qc_enabled: bool
    qc_derived_cache_path: str
    qc_max_records: int
    server: str
    project_area: str
    username: str
    password: str
    iteration_id: str
    iteration_name: str
    verify: bool | str
    trust_env: bool
    timeout_seconds: float
    page_size: int
    max_pages: int
    cache_ttl_seconds: int

    @classmethod
    def from_env(cls) -> "Settings":
        verify_setting = os.getenv("RTC_ALM_CA_BUNDLE", "").strip()
        if not verify_setting:
            verify_setting = _env_bool("RTC_ALM_VERIFY_SSL", True)

        return cls(
            data_mode=os.getenv("SWPM_TASK_DATA_MODE", "auto").strip().lower(),
            legacy_cache_path=os.getenv("SWPM_LEGACY_ALM_CACHE", "").strip(),
            legacy_cache_scope=os.getenv("SWPM_LEGACY_ALM_SCOPE", "").strip(),
            doors_enabled=_env_bool("SWPM_DOORS_ENABLED", True),
            legacy_jenkins_root=os.getenv("SWPM_LEGACY_JENKINS_ROOT", "").strip(),
            legacy_config_path=os.getenv("SWPM_LEGACY_CONFIG", "").strip(),
            doors_derived_cache_path=os.getenv(
                "SWPM_DOORS_DERIVED_CACHE", "backend/.cache/doors_tasks.json"
            ).strip(),
            doors_max_records=max(1, int(os.getenv("SWPM_DOORS_MAX_RECORDS", "50000"))),
            qc_enabled=_env_bool("SWPM_QC_ENABLED", True),
            qc_derived_cache_path=os.getenv(
                "SWPM_QC_DERIVED_CACHE", "backend/.cache/qc_tasks.json"
            ).strip(),
            qc_max_records=max(1, int(os.getenv("SWPM_QC_MAX_RECORDS", "50000"))),
            server=os.getenv("RTC_ALM_SERVER", "https://rb-alm-06-p.de.bosch.com").rstrip("/"),
            project_area=os.getenv("RTC_ALM_PROJECT_AREA", "_UkehAJxnEeeWvYReE95djA").strip(),
            username=os.getenv("RTC_ALM_USERNAME", "").strip(),
            password=os.getenv("RTC_ALM_PASSWORD", ""),
            iteration_id=os.getenv("RTC_ALM_ITERATION_ID", "").strip(),
            iteration_name=os.getenv("RTC_ALM_ITERATION_NAME", "").strip(),
            verify=verify_setting,
            trust_env=_env_bool("RTC_ALM_TRUST_ENV", False),
            timeout_seconds=float(os.getenv("RTC_ALM_TIMEOUT_SECONDS", "20")),
            page_size=max(1, min(int(os.getenv("RTC_ALM_PAGE_SIZE", "500")), 500)),
            max_pages=max(1, int(os.getenv("RTC_ALM_MAX_PAGES", "100"))),
            cache_ttl_seconds=max(0, int(os.getenv("RTC_ALM_CACHE_TTL_SECONDS", "300"))),
        )

    def validate_live(self, iteration_id: str) -> None:
        missing = []
        if not self.server:
            missing.append("RTC_ALM_SERVER")
        if not self.project_area:
            missing.append("RTC_ALM_PROJECT_AREA")
        if not self.username:
            missing.append("RTC_ALM_USERNAME")
        if not self.password:
            missing.append("RTC_ALM_PASSWORD")
        if not iteration_id:
            missing.append("RTC_ALM_ITERATION_ID")
        if missing:
            raise AlmConfigurationError(f"Missing backend configuration: {', '.join(missing)}")


def _resource_uri(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("rdf:resource") or value.get("resource") or "")
    return str(value or "")


def _oslc_results(payload: dict[str, Any]) -> list[dict[str, Any]]:
    for key in ("oslc:results", "oslc_cm:results", "rdfs:member"):
        results = payload.get(key)
        if isinstance(results, list):
            return results
    return []


def _status_label(state: str) -> str:
    normalized = state.strip().lower()
    if any(word in normalized for word in ("closed", "resolved", "verified", "done", "complete")):
        return "Done"
    if any(word in normalized for word in ("review", "approve", "validate")):
        return "In Review"
    if any(word in normalized for word in ("progress", "started", "implement", "active")):
        return "In Progress"
    return "To Do"


def _priority_label(severity: str) -> str:
    normalized = severity.strip().lower()
    if any(word in normalized for word in ("critical", "blocker", "high", "major", "urgent")):
        return "High"
    if any(word in normalized for word in ("low", "minor", "trivial")):
        return "Low"
    return "Medium"


def _type_label(work_item_type: str) -> str:
    normalized = work_item_type.strip().lower()
    if normalized == "epic":
        return "EPIC"
    if "story" in normalized:
        return "Story"
    if normalized in {"task", "work task"}:
        return "Task"
    return work_item_type.strip() or "Task"


def _maturity_for_status(status: str) -> int:
    return {"Done": 100, "In Review": 85, "In Progress": 50}.get(status, 0)


def map_work_item(
    record: dict[str, Any],
    iteration_name: str,
    project_name: str = "",
    key_prefix: str = "",
) -> dict[str, Any]:
    raw_id = str(record.get("ID") or "").strip()
    state = str(record.get("State") or "")
    status = _status_label(state)
    component = str(record.get("Filed Against") or "").strip()
    task_id = raw_id if raw_id.upper().startswith("ALM-") else f"ALM-{raw_id}"
    return {
        "key": f"{key_prefix}:{task_id}" if key_prefix else task_id,
        "id": task_id,
        "type": _type_label(str(record.get("Type") or "")),
        "title": str(record.get("Title") or "(Untitled work item)"),
        "source": "ALM",
        "assignee": str(record.get("Owned By") or "Unassigned"),
        "priority": _priority_label(str(record.get("Severity") or "")),
        "due": str(record.get("Due Date") or ""),
        "status": status,
        "maturity": _maturity_for_status(status),
        "project": project_name or component or iteration_name,
        "component": component,
        "iteration": iteration_name,
        "rawState": state,
        "resolution": str(record.get("Resolution") or ""),
    }


class AlmClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.session = requests.Session()
        self.session.verify = settings.verify
        self.session.trust_env = settings.trust_env
        self.session.auth = (settings.username, settings.password)
        self._attribute_cache: dict[str, str] = {}
        self._attribute_cache_lock = threading.Lock()

        if settings.verify is False:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    def login(self) -> None:
        try:
            self.session.get(
                f"{self.settings.server}/ccm/authenticated/identity",
                timeout=self.settings.timeout_seconds,
            )
            response = self.session.post(
                f"{self.settings.server}/ccm/j_security_check",
                data={"j_username": self.settings.username, "j_password": self.settings.password},
                timeout=self.settings.timeout_seconds,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AlmRequestError(f"Unable to connect to RTC/ALM: {exc}") from exc

        if "x-com-ibm-team-repository-web-auth-msg" in response.headers:
            raise AlmRequestError("RTC/ALM authentication failed")

    def query_work_items(self, iteration_id: str) -> list[dict[str, Any]]:
        url = (
            f"{self.settings.server}/ccm/oslc/contexts/"
            f"{self.settings.project_area}/workitems"
        )
        properties = ",".join(
            (
                PROP_ID,
                PROP_TITLE,
                PROP_TYPE,
                PROP_STATE,
                PROP_RESOLUTION,
                PROP_SEVERITY,
                PROP_FILED_AGAINST,
                PROP_OWNED_BY,
            )
        )
        merged: list[dict[str, Any]] = []
        last_id = ""

        for _page in range(self.settings.max_pages):
            query = (
                f'rtc_cm:plannedFor="{iteration_id}" and {PROP_ID}>"{last_id}"'
                if last_id
                else f'rtc_cm:plannedFor="{iteration_id}"'
            )
            query += f" /sort={PROP_ID}"
            try:
                response = self.session.get(
                    url,
                    params={
                        OSLC_QUERY: query,
                        OSLC_PROPERTIES: properties,
                        "oslc.pageSize": self.settings.page_size,
                    },
                    headers={"Accept": "application/json"},
                    timeout=self.settings.timeout_seconds,
                )
                response.raise_for_status()
                page = _oslc_results(response.json())
            except (requests.RequestException, ValueError) as exc:
                raise AlmRequestError(f"RTC/ALM work-item query failed: {exc}") from exc

            if not page:
                break
            merged.extend(page)
            next_id = str(page[-1].get(PROP_ID) or "")
            if not next_id or next_id == last_id:
                break
            last_id = next_id
        else:
            raise AlmRequestError(
                f"RTC/ALM query exceeded RTC_ALM_MAX_PAGES={self.settings.max_pages}"
            )

        return merged

    def resolve_attribute(self, uri: str) -> str:
        if not uri:
            return ""
        if "/users/" in uri:
            return uri.rstrip("/").rsplit("/", 1)[-1]

        with self._attribute_cache_lock:
            cached = self._attribute_cache.get(uri)
        if cached is not None:
            return cached

        value = ""
        try:
            response = self.session.get(
                uri,
                headers={"Accept": "application/json"},
                timeout=self.settings.timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
            value = str(payload.get("dc:title") or payload.get("title") or "")
        except (requests.RequestException, ValueError) as exc:
            LOGGER.warning("Failed to resolve ALM attribute %s: %s", uri, exc)

        with self._attribute_cache_lock:
            self._attribute_cache[uri] = value
        return value

    def parse_work_item(self, item: dict[str, Any], iteration_name: str) -> dict[str, Any]:
        record = {
            "ID": item.get(PROP_ID),
            "Title": item.get(PROP_TITLE),
            "Type": self.resolve_attribute(_resource_uri(item.get(PROP_TYPE))),
            "State": self.resolve_attribute(_resource_uri(item.get(PROP_STATE))),
            "Resolution": self.resolve_attribute(_resource_uri(item.get(PROP_RESOLUTION))),
            "Severity": self.resolve_attribute(_resource_uri(item.get(PROP_SEVERITY))),
            "Filed Against": self.resolve_attribute(_resource_uri(item.get(PROP_FILED_AGAINST))),
            "Owned By": self.resolve_attribute(_resource_uri(item.get(PROP_OWNED_BY))),
        }
        return map_work_item(record, iteration_name)

    def fetch_tasks(self, iteration_id: str, iteration_name: str) -> list[dict[str, Any]]:
        self.login()
        work_items = self.query_work_items(iteration_id)
        with ThreadPoolExecutor(max_workers=12) as executor:
            tasks = list(executor.map(lambda item: self.parse_work_item(item, iteration_name), work_items))
        return sorted(tasks, key=lambda task: task["id"])


_cache_lock = threading.Lock()
_response_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _split_scope(scope: str) -> tuple[str, str]:
    project, separator, iteration = scope.partition("|")
    return project.strip(), iteration.strip() if separator else project.strip()


def load_legacy_cache_payload(cache_path: str, selected_scope: str = "") -> dict[str, Any]:
    path = Path(cache_path)
    if not path.is_file():
        raise AlmConfigurationError(f"Legacy ALM cache not found: {path}")

    try:
        with path.open("r", encoding="utf-8-sig") as cache_file:
            raw_cache = json.load(cache_file)
    except (OSError, json.JSONDecodeError) as exc:
        raise AlmRequestError(f"Unable to read legacy ALM cache: {exc}") from exc

    if not isinstance(raw_cache, dict):
        raise AlmRequestError("Legacy ALM cache root must be a JSON object")
    if selected_scope and selected_scope not in raw_cache:
        raise AlmConfigurationError(f"Legacy ALM scope not found: {selected_scope}")

    scopes: list[dict[str, Any]] = []
    tasks: list[dict[str, Any]] = []
    for scope_name, scope_data in raw_cache.items():
        if selected_scope and scope_name != selected_scope:
            continue
        if not isinstance(scope_data, dict):
            continue
        records = scope_data.get("all_defects") or []
        if not isinstance(records, list):
            continue
        project_name, iteration_name = _split_scope(scope_name)
        scopes.append(
            {
                "name": scope_name,
                "project": project_name,
                "iteration": iteration_name,
                "count": len(records),
            }
        )
        for record in records:
            if not isinstance(record, dict):
                continue
            task = map_work_item(
                record,
                iteration_name,
                project_name=project_name,
                key_prefix=scope_name,
            )
            task["scope"] = scope_name
            tasks.append(task)

    modified_at = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
    return {
        "tasks": sorted(tasks, key=lambda task: (task["project"], task["iteration"], task["id"])),
        "traceability": [],
        "meta": {
            "source": "Legacy ALM cache",
            "fetchedAt": modified_at.isoformat().replace("+00:00", "Z"),
            "loadedAt": _now_iso(),
            "cachePath": str(path),
            "scope": selected_scope,
            "scopes": scopes,
            "count": len(tasks),
        },
    }


def _attach_doors_payload(
    payload: dict[str, Any],
    settings: Settings,
    refresh: bool,
) -> dict[str, Any]:
    alm_tasks = payload.get("tasks") or []
    source_counts = {"ALM": len(alm_tasks), "DOORS": 0}
    payload["meta"]["sourceCounts"] = source_counts
    payload["meta"]["sourceDetails"] = {"ALM": payload["meta"].copy()}
    if not settings.doors_enabled:
        return payload

    try:
        doors_payload = load_doors_tasks(
            jenkins_root=settings.legacy_jenkins_root,
            config_path=settings.legacy_config_path,
            derived_cache_path=settings.doors_derived_cache_path,
            refresh=refresh,
            max_records=settings.doors_max_records,
        )
    except DoorsDataError as exc:
        LOGGER.warning("DOORS data unavailable: %s", exc)
        payload["meta"]["sourceErrors"] = {"DOORS": str(exc)}
        return payload

    doors_tasks = doors_payload.get("tasks") or []
    source_counts["DOORS"] = len(doors_tasks)
    payload["tasks"] = sorted(
        [*alm_tasks, *doors_tasks],
        key=lambda task: (
            str(task.get("project") or ""),
            str(task.get("iteration") or ""),
            str(task.get("source") or ""),
            str(task.get("id") or ""),
        ),
    )
    payload["meta"]["source"] = "ALM + DOORS cache"
    payload["meta"]["count"] = len(payload["tasks"])
    payload["meta"]["sourceDetails"]["DOORS"] = doors_payload.get("meta") or {}
    return payload


def _attach_qc_payload(
    payload: dict[str, Any],
    settings: Settings,
    refresh: bool,
) -> dict[str, Any]:
    source_counts = payload["meta"].setdefault("sourceCounts", {})
    source_counts["QC"] = 0
    source_details = payload["meta"].setdefault("sourceDetails", {})
    if not settings.qc_enabled:
        return payload

    try:
        qc_payload = load_qc_tasks(
            jenkins_root=settings.legacy_jenkins_root,
            config_path=settings.legacy_config_path,
            derived_cache_path=settings.qc_derived_cache_path,
            refresh=refresh,
            max_records=settings.qc_max_records,
        )
    except QcDataError as exc:
        LOGGER.warning("QC data unavailable: %s", exc)
        payload["meta"].setdefault("sourceErrors", {})["QC"] = str(exc)
        return payload

    qc_tasks = qc_payload.get("tasks") or []
    source_counts["QC"] = len(qc_tasks)
    payload["tasks"] = sorted(
        [*(payload.get("tasks") or []), *qc_tasks],
        key=lambda task: (
            str(task.get("project") or ""),
            str(task.get("iteration") or ""),
            str(task.get("source") or ""),
            str(task.get("id") or ""),
        ),
    )
    payload["meta"]["source"] = f"{payload['meta'].get('source') or 'ALM'} + QC cache"
    payload["meta"]["count"] = len(payload["tasks"])
    source_details["QC"] = qc_payload.get("meta") or {}
    return payload


def _get_tasks_payload(
    iteration_id: str,
    iteration_name: str,
    selected_scope: str,
    refresh: bool,
) -> dict[str, Any]:
    settings = Settings.from_env()
    legacy_path = Path(settings.legacy_cache_path) if settings.legacy_cache_path else None
    use_legacy_cache = settings.data_mode == "legacy-cache" or (
        settings.data_mode == "auto" and legacy_path is not None and legacy_path.is_file()
    )
    if settings.data_mode not in {"auto", "legacy-cache", "live"}:
        raise AlmConfigurationError(
            "SWPM_TASK_DATA_MODE must be one of: auto, legacy-cache, live"
        )

    effective_scope = selected_scope or settings.legacy_cache_scope
    if use_legacy_cache:
        cache_mtime = legacy_path.stat().st_mtime_ns if legacy_path and legacy_path.is_file() else 0
        doors_config = Path(settings.legacy_config_path) if settings.legacy_config_path else None
        doors_mtime = doors_config.stat().st_mtime_ns if doors_config and doors_config.is_file() else 0
        cache_key = f"legacy\0{legacy_path}\0{effective_scope}\0{cache_mtime}\0{doors_mtime}"
    else:
        settings.validate_live(iteration_id)
        cache_key = f"live\0{iteration_id}\0{iteration_name}"
    now = datetime.now(timezone.utc).timestamp()

    if not refresh and settings.cache_ttl_seconds:
        with _cache_lock:
            cached = _response_cache.get(cache_key)
        if cached and now - cached[0] < settings.cache_ttl_seconds:
            return cached[1]

    if use_legacy_cache:
        payload = load_legacy_cache_payload(settings.legacy_cache_path, effective_scope)
    else:
        tasks = AlmClient(settings).fetch_tasks(iteration_id, iteration_name)
        payload = {
            "tasks": tasks,
            "traceability": [],
            "meta": {
                "source": "RTC/ALM",
                "fetchedAt": _now_iso(),
                "iterationId": iteration_id,
                "iterationName": iteration_name,
                "count": len(tasks),
            },
        }
    payload = _attach_doors_payload(payload, settings, refresh)
    payload = _attach_qc_payload(payload, settings, refresh)
    payload["traceability"], payload["meta"]["traceability"] = build_traceability(
        payload.get("tasks") or []
    )
    with _cache_lock:
        _response_cache[cache_key] = (now, payload)
    return payload


app = FastAPI(title="SWPM Tasks API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "SWPM_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks")
def tasks(
    iteration_id: str | None = Query(default=None, alias="iterationId"),
    iteration_name: str | None = Query(default=None, alias="iterationName"),
    scope: str | None = None,
    refresh: bool = False,
) -> dict[str, Any]:
    settings = Settings.from_env()
    selected_id = (iteration_id or settings.iteration_id).strip()
    selected_name = (iteration_name or settings.iteration_name or selected_id).strip()
    try:
        return _get_tasks_payload(selected_id, selected_name, (scope or "").strip(), refresh)
    except AlmConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AlmRequestError as exc:
        LOGGER.exception("ALM task fetch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
