from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.doors import PROJECT_ALIASES


try:
    csv.field_size_limit(512 * 1024 * 1024)
except OverflowError:
    csv.field_size_limit(sys.maxsize)


class QcDataError(RuntimeError):
    pass


def _compact(value: Any, limit: int = 260) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1].rstrip()}…"


def _parse_date(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    for pattern in (
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            continue
    return ""


def _extract_baseline(path: str) -> str:
    for part in path.split("\\"):
        match = re.search(r"baseline\s*[_ ]*([0-9.]+)", part, re.IGNORECASE)
        if match:
            return match.group(1)
    return ""


def _status(raw_status: str) -> str:
    normalized = raw_status.strip().lower()
    if normalized == "passed":
        return "Done"
    if normalized in {"in progress", "running", "executing"}:
        return "In Progress"
    if normalized in {"failed", "blocked", "not completed"}:
        return "In Review"
    return "To Do"


def _maturity(status: str) -> int:
    return {"Done": 100, "In Review": 85, "In Progress": 50}.get(status, 0)


def _discover_build_dir(jenkins_root: Path, project_key: str) -> Path | None:
    candidates = [path for path in jenkins_root.glob(f"{project_key}_*_ref") if path.is_dir()]
    return max(candidates, key=lambda path: path.stat().st_mtime_ns, default=None)


def _find_qc_file(build_dir: Path, filename: str) -> Path | None:
    return next(
        (
            path
            for path in sorted(build_dir.rglob(filename))
            if "QC" in path.parts
        ),
        None,
    )


def _test_instance_to_task(row: dict[str, str], project_key: str) -> dict[str, Any] | None:
    raw_id = str(row.get("TEST_INSTANCE_ID") or row.get("TEST_ID") or "").strip()
    if not raw_id:
        return None

    raw_status = str(row.get("TestExec_Status") or "").strip()
    comment = str(row.get("RB_Comment") or "").strip()
    status = _status(raw_status)
    has_issue = raw_status != "Passed" and not comment
    baseline = str(row.get("RB_Baseline") or "").strip()
    folder_path = str(row.get("TestSetFolder_Path_full") or "").strip()
    if not baseline:
        baseline = _extract_baseline(folder_path)
    project = PROJECT_ALIASES.get(project_key, project_key)
    task_id = raw_id if raw_id.upper().startswith("QC-") else f"QC-TI-{raw_id}"
    title = _compact(row.get("Test_Name") or row.get("Name") or row.get("TestSet_Name"))
    test_id = str(row.get("TEST_ID") or row.get("TestPlan_TEST_ID") or "").strip()
    doors_ids = [
        value.strip()
        for value in str(row.get("RB_DoorsLinks") or "").split(";")
        if value.strip()
    ]

    return {
        "key": f"QC:{project_key}:TI:{raw_id}",
        "id": task_id,
        "type": "Test Instance",
        "title": title or "(Untitled test instance)",
        "source": "QC",
        "assignee": str(
            row.get("ResponsibleTester")
            or row.get("RB_Tester")
            or row.get("Author")
            or "Unassigned"
        ).strip(),
        "priority": "High" if has_issue else "Medium",
        "due": _parse_date(row.get("PlannedExecDate")),
        "status": status,
        "maturity": _maturity(status),
        "project": project,
        "iteration": baseline or "Unassigned baseline",
        "component": str(row.get("RB_Feature") or row.get("TestConfig_Name") or "").strip(),
        "scope": f"{project_key} | {baseline or 'Unassigned baseline'}",
        "module": str(row.get("TestSet_Name") or "").strip(),
        "rawState": raw_status,
        "issueReason": (
            "Test execution is not Passed and RB_Comment is empty" if has_issue else ""
        ),
        "comment": comment,
        "folderPath": folder_path,
        "qcProject": str(row.get("QC_Project") or "").strip(),
        "testId": test_id,
        "doorsIds": list(dict.fromkeys(doors_ids)),
    }


def _requirement_to_task(
    row: dict[str, str],
    project_key: str,
    linked_test_ids: list[str],
) -> dict[str, Any] | None:
    raw_id = str(row.get("REQ_ID") or row.get("RB_Doors_Identifier") or "").strip()
    if not raw_id:
        return None

    cover_status = str(row.get("Direct_Cover_Status") or "").strip()
    status = _status(cover_status)
    has_issue = cover_status != "Passed"
    baseline = str(row.get("RB_Baseline") or "").strip()
    project = PROJECT_ALIASES.get(project_key, project_key)
    task_id = raw_id if raw_id.upper().startswith("QC-") else f"QC-REQ-{raw_id}"
    title = _compact(row.get("Name") or row.get("REQ_Name"))

    return {
        "key": f"QC:{project_key}:REQ:{raw_id}:{baseline}",
        "id": task_id,
        "type": "QC Requirement",
        "title": title or "(Untitled QC requirement)",
        "source": "QC",
        "assignee": str(row.get("Author") or "Unassigned").strip(),
        "priority": "High" if has_issue else "Medium",
        "due": "",
        "status": status,
        "maturity": _maturity(status),
        "project": project,
        "iteration": baseline or "Unassigned baseline",
        "component": str(row.get("RB_Allocation") or row.get("RB_Top_FNID") or "").strip(),
        "scope": f"{project_key} | {baseline or 'Unassigned baseline'}",
        "module": str(row.get("ReqFolder_Path") or "").strip(),
        "rawState": cover_status,
        "reviewStatus": str(row.get("RB_ReviewStatus") or "").strip(),
        "issueReason": "Requirement direct coverage is not Passed" if has_issue else "",
        "requirementType": str(row.get("Requirement_Type") or "").strip(),
        "doorsIdentifier": str(row.get("RB_Doors_Identifier") or "").strip(),
        "qcProject": str(row.get("QC_Project") or "").strip(),
        "qcRequirementId": raw_id,
        "linkedTestIds": linked_test_ids,
    }


def _fingerprint(config_path: Path, selected_files: list[Path], max_records: int) -> str:
    digest = hashlib.sha256()
    for path in [config_path, *sorted(selected_files)]:
        stat = path.stat()
        digest.update(str(path).encode("utf-8"))
        digest.update(str(stat.st_size).encode("ascii"))
        digest.update(str(stat.st_mtime_ns).encode("ascii"))
    digest.update(str(max_records).encode("ascii"))
    return digest.hexdigest()


def load_qc_tasks(
    *,
    jenkins_root: str,
    config_path: str,
    derived_cache_path: str,
    refresh: bool = False,
    max_records: int = 50_000,
) -> dict[str, Any]:
    root = Path(jenkins_root)
    config_file = Path(config_path)
    derived_file = Path(derived_cache_path)
    if not root.is_dir():
        raise QcDataError(f"Legacy Jenkins cache not found: {root}")
    if not config_file.is_file():
        raise QcDataError(f"Legacy selection config not found: {config_file}")

    try:
        with config_file.open("r", encoding="utf-8-sig") as source:
            config = json.load(source)
    except (OSError, json.JSONDecodeError) as exc:
        raise QcDataError(f"Unable to read legacy selection config: {exc}") from exc

    selections = config.get("selection_states") or {}
    selected_projects: list[tuple[str, list[str], Path, Path, Path | None]] = []
    missing_files: list[str] = []
    build_names: list[str] = []
    selected_path_count = 0

    for project_key, selection in selections.items():
        if not isinstance(selection, dict):
            continue
        prefixes = [
            str(value).strip()
            for value in selection.get("qc_paths") or []
            if str(value).strip()
        ]
        if not prefixes:
            continue
        selected_path_count += len(prefixes)
        build_dir = _discover_build_dir(root, project_key)
        if build_dir is None:
            missing_files.append(f"{project_key}: build directory")
            continue
        test_instances = _find_qc_file(build_dir, "QC_TestInstances.csv")
        requirements = _find_qc_file(build_dir, "QC_Requirements.csv")
        coverage = _find_qc_file(build_dir, "QC_Req2Test.csv")
        if test_instances is None:
            missing_files.append(f"{project_key}: QC_TestInstances.csv")
        if requirements is None:
            missing_files.append(f"{project_key}: QC_Requirements.csv")
        if coverage is None:
            missing_files.append(f"{project_key}: QC_Req2Test.csv")
        if test_instances is None or requirements is None:
            continue
        build_names.append(build_dir.name)
        selected_projects.append((project_key, prefixes, test_instances, requirements, coverage))

    selected_files = [
        path
        for _, _, test_path, req_path, coverage_path in selected_projects
        for path in (test_path, req_path, coverage_path)
        if path is not None
    ]
    fingerprint = _fingerprint(config_file, selected_files, max_records)
    if not refresh and derived_file.is_file():
        try:
            with derived_file.open("r", encoding="utf-8") as cached_file:
                cached = json.load(cached_file)
            if cached.get("fingerprint") == fingerprint:
                return cached
        except (OSError, json.JSONDecodeError):
            pass

    tasks: list[dict[str, Any]] = []
    parse_errors: list[str] = []
    test_instance_count = 0
    requirement_count = 0
    issue_count = 0
    coverage_link_count = 0
    truncated = False

    for project_key, prefixes, test_path, requirement_path, coverage_path in selected_projects:
        baselines: set[str] = set()
        selected_test_ids: set[str] = set()
        try:
            with test_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as csv_file:
                reader = csv.DictReader(csv_file, delimiter=";", quotechar='"')
                for row in reader:
                    folder_path = str(row.get("TestSetFolder_Path_full") or "")
                    if not folder_path or not any(folder_path.startswith(prefix) for prefix in prefixes):
                        continue
                    baseline = _extract_baseline(folder_path)
                    if baseline:
                        baselines.add(baseline)
                    task = _test_instance_to_task(row, project_key)
                    if task:
                        tasks.append(task)
                        test_instance_count += 1
                        issue_count += bool(task["issueReason"])
                        if task["testId"]:
                            selected_test_ids.add(task["testId"])
                    if len(tasks) >= max_records:
                        truncated = True
                        break
        except (OSError, csv.Error) as exc:
            parse_errors.append(f"{test_path}: {exc}")
        if truncated:
            break

        if not baselines:
            continue
        requirement_test_ids: dict[str, list[str]] = {}
        if coverage_path is not None:
            try:
                with coverage_path.open(
                    "r", encoding="utf-8-sig", errors="replace", newline=""
                ) as csv_file:
                    for row in csv.DictReader(csv_file, delimiter=";", quotechar='"'):
                        requirement_id = str(row.get("REQ_ID") or "").strip()
                        test_id = str(row.get("TEST_ID") or "").strip()
                        if not requirement_id or test_id not in selected_test_ids:
                            continue
                        values = requirement_test_ids.setdefault(requirement_id, [])
                        if test_id not in values:
                            values.append(test_id)
                            coverage_link_count += 1
            except (OSError, csv.Error) as exc:
                parse_errors.append(f"{coverage_path}: {exc}")
        try:
            with requirement_path.open(
                "r", encoding="utf-8-sig", errors="replace", newline=""
            ) as csv_file:
                reader = csv.DictReader(csv_file, delimiter=";", quotechar='"')
                for row in reader:
                    if str(row.get("RB_Baseline") or "").strip() not in baselines:
                        continue
                    if str(row.get("Requirement_Type") or "").strip() != "105":
                        continue
                    raw_requirement_id = str(row.get("REQ_ID") or "").strip()
                    task = _requirement_to_task(
                        row,
                        project_key,
                        requirement_test_ids.get(raw_requirement_id, []),
                    )
                    if task:
                        tasks.append(task)
                        requirement_count += 1
                        issue_count += bool(task["issueReason"])
                    if len(tasks) >= max_records:
                        truncated = True
                        break
        except (OSError, csv.Error) as exc:
            parse_errors.append(f"{requirement_path}: {exc}")
        if truncated:
            break

    payload = {
        "fingerprint": fingerprint,
        "tasks": tasks,
        "meta": {
            "source": "QC Jenkins cache",
            "count": len(tasks),
            "testInstanceCount": test_instance_count,
            "requirementCount": requirement_count,
            "issueCount": issue_count,
            "coverageLinkCount": coverage_link_count,
            "projectCount": len(selected_projects),
            "selectedPathCount": selected_path_count,
            "builds": sorted(set(build_names)),
            "missingFiles": missing_files,
            "parseErrors": parse_errors,
            "truncated": truncated,
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        },
    }
    try:
        derived_file.parent.mkdir(parents=True, exist_ok=True)
        temporary = derived_file.with_suffix(f"{derived_file.suffix}.tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        temporary.replace(derived_file)
    except OSError:
        pass
    return payload
