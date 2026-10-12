from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.normalize import NORMALIZER_VERSION, normalize_baseline, normalize_baselines


try:
    csv.field_size_limit(512 * 1024 * 1024)
except OverflowError:
    csv.field_size_limit(sys.maxsize)


PROJECT_ALIASES = {
    "AeroHT_X3_IPB_Platform": "AeroHT",
    "Vinfast_IPB2_0_ROPP41": "Vinfast_IPB2.0_ROPP41",
    "RG-003597_GHRD_ESP9.3": "Honda_3NE_ESP9.3",
    "RG_03308_Lotus_T132A_PHEV_IPB1": "Lotus_T132A_IPB1.1",
    "RG_003651_BAW212_IPB2_VDM": "BAW212_WB105_IPB2.0_w_VDM",
}

VALID_AS_STATUSES = {
    "accepted",
    "rejected",
    "no_req",
    "validated",
    "accepted_w_rem",
    "canceled",
}


class DoorsDataError(RuntimeError):
    pass


def _compact(value: Any, limit: int = 260) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1].rstrip()}…"


def _parse_due_date(value: Any) -> str:
    raw = str(value or "").strip()
    for pattern in ("%Y-%m-%d", "%Y/%m/%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            continue
    return ""


def _doors_status(raw_status: str) -> str:
    normalized = raw_status.strip().lower()
    if normalized in {"accepted", "validated", "passed", "ok", "no_req", "rejected", "canceled"}:
        return "Done"
    if normalized in {"accepted_w_rem", "in review", "review", "reviewed"}:
        return "In Review"
    if normalized in {"in progress", "analyzed", "analysis", "implemented"}:
        return "In Progress"
    return "To Do"


def _maturity(status: str) -> int:
    return {"Done": 100, "In Review": 85, "In Progress": 50}.get(status, 0)


def _as_issue_reasons(row: dict[str, str]) -> list[str]:
    status = str(row.get("RB_AS_Status") or "").strip().lower()
    agreed = str(row.get("RB_Agreed_by_Customer") or "").strip().upper()
    change = str(row.get("RB_Change_Required") or "").strip().lower()
    baseline = normalize_baseline(row.get("RB_Baseline"))
    fnid = str(row.get("RB_Top_FNID") or "").strip()
    reasons: list[str] = []

    if status not in VALID_AS_STATUSES:
        reasons.append("Requirement not analyzed or analysis incomplete")
    if status == "rejected" and agreed != "TRUE":
        reasons.append("Rejected requirement not agreed by customer")
    if status in {"accepted", "accepted_w_rem", "validated"} and change not in {"yes", "no"}:
        reasons.append("Change required is empty")
    if status not in {"no_req", "canceled", "rejected"} and not fnid:
        reasons.append("FNID not assigned")
    if status not in {"no_req", "canceled", "rejected"} and not baseline:
        reasons.append("Baseline not assigned")
    return reasons


def _xs_issue_reasons(row: dict[str, str], has_story: bool) -> list[str]:
    status = str(row.get("RB_RS_CP_Status") or "").strip().lower()
    test_status = str(row.get("RB_TestStatus") or "").strip().lower()
    review_status = str(row.get("RB_ReviewStatus") or "").strip().lower()
    reasons: list[str] = []
    if status in {"accepted", "validated"}:
        if test_status != "passed":
            reasons.append("XS not test passed")
        if review_status != "ok":
            reasons.append("XS requirement review not completed")
        if not has_story:
            reasons.append("XS requirement not linked to Story")
    return reasons


def _read_first_row(path: Path) -> dict[str, str]:
    try:
        with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as csv_file:
            return next(csv.DictReader(csv_file, delimiter="|", quotechar='"'), {})
    except (OSError, csv.Error) as exc:
        raise DoorsDataError(f"Unable to inspect DOORS CSV {path}: {exc}") from exc


def _discover_build_dir(jenkins_root: Path, project_key: str) -> Path | None:
    candidates = [
        path
        for path in jenkins_root.glob(f"{project_key}_*_ref")
        if path.is_dir()
    ]
    return max(candidates, key=lambda path: path.stat().st_mtime_ns, default=None)


def _category(path: Path) -> str:
    parts = set(path.parts)
    if "10_AS" in parts:
        return "10_AS"
    if "40_Gen_SWXS" in parts or "40_Gen_SWSX" in parts:
        return "40_Gen_SWXS"
    return ""


def _module_index(build_dir: Path) -> dict[tuple[str, str], Path]:
    result: dict[tuple[str, str], Path] = {}
    for path in build_dir.rglob("*-module.csv"):
        category = _category(path)
        if not category or "DOORS" not in path.parts:
            continue
        first_row = _read_first_row(path)
        module_name = str(first_row.get("Modulename") or "").strip()
        if module_name:
            result[(category, module_name)] = path
    return result


def _external_path(module_path: Path) -> Path:
    return module_path.with_name(module_path.name.replace("-module.csv", "-external.csv"))


def _external_links(module_path: Path) -> dict[str, list[str]]:
    external_path = module_path.with_name(module_path.name.replace("-module.csv", "-external.csv"))
    if not external_path.is_file():
        return {}
    links: dict[str, list[str]] = {}
    try:
        with external_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as csv_file:
            for row in csv.DictReader(csv_file, delimiter="|", quotechar='"'):
                source_url = str(row.get("Source_URL") or "").strip()
                raw_id = str(row.get("WorkItemID") or "").strip()
                if not raw_id:
                    target_url = str(row.get("Target_URL") or "").strip()
                    match = re.search(r"/(\d+)(?:[/?#].*)?$", target_url)
                    raw_id = match.group(1) if match else ""
                if not source_url or not raw_id:
                    continue
                alm_id = raw_id if raw_id.upper().startswith("ALM-") else f"ALM-{raw_id}"
                values = links.setdefault(source_url, [])
                if alm_id not in values:
                    values.append(alm_id)
    except (OSError, csv.Error):
        return {}
    return links


def _matches_baseline(value: str, selected: set[str]) -> bool:
    baseline = normalize_baseline(value)
    return baseline in selected or (not baseline and "<EMPTY>" in selected)


def _row_to_task(
    row: dict[str, str],
    *,
    project_key: str,
    category: str,
    module_name: str,
    linked_alm_ids: list[str],
) -> dict[str, Any] | None:
    raw_id = str(row.get("Object_Identifier") or row.get("DoorsUUID") or "").strip()
    if not raw_id:
        return None

    project = PROJECT_ALIASES.get(project_key, project_key)
    baseline = normalize_baseline(row.get("RB_Baseline")) or "<EMPTY>"
    raw_status = str(
        row.get("RB_AS_Status") if category == "10_AS" else row.get("RB_RS_CP_Status")
        or ""
    ).strip()
    status = _doors_status(raw_status)
    reasons = (
        _as_issue_reasons(row)
        if category == "10_AS"
        else _xs_issue_reasons(row, bool(linked_alm_ids))
    )
    title = next(
        (
            _compact(row.get(field))
            for field in ("Object_Heading", "Object_Short_Text", "Object_Text")
            if _compact(row.get(field))
        ),
        module_name,
    )
    author = str(row.get("Last_Modified_By") or row.get("Created_By") or "Unassigned").strip()
    task_id = raw_id if raw_id.upper().startswith("DOORS-") else f"DOORS-{raw_id}"
    issue_reason = "; ".join(reasons)

    return {
        "key": f"DOORS:{project_key}:{category}:{module_name}:{raw_id}:{baseline}",
        "id": task_id,
        "type": "Requirement" if category == "10_AS" else "SW Requirement",
        "title": title,
        "source": "DOORS",
        "assignee": author or "Unassigned",
        "priority": "High" if reasons else "Medium",
        "due": _parse_due_date(row.get("RB_AS_Analysis_Due_Date")),
        "status": status,
        "maturity": _maturity(status),
        "project": project,
        "iteration": baseline,
        "component": str(row.get("RB_Allocation") or row.get("RB_Realizing_SWComponent") or "").strip(),
        "scope": f"{project_key} | {baseline}",
        "module": module_name,
        "requirementLevel": category,
        "rawState": raw_status,
        "testStatus": str(row.get("RB_TestStatus") or "").strip(),
        "reviewStatus": str(row.get("RB_ReviewStatus") or "").strip(),
        "issueReason": issue_reason,
        "url": str(row.get("URL") or "").strip(),
        "doorsUuid": str(row.get("DoorsUUID") or "").strip(),
        "absoluteNumber": str(row.get("Absolute_Number") or "").strip(),
        "linkedAlmIds": linked_alm_ids,
    }


def _fingerprint(config_path: Path, selected_files: list[Path], max_records: int) -> str:
    digest = hashlib.sha256()
    for path in [config_path, *sorted(selected_files)]:
        stat = path.stat()
        digest.update(str(path).encode("utf-8"))
        digest.update(str(stat.st_size).encode("ascii"))
        digest.update(str(stat.st_mtime_ns).encode("ascii"))
    digest.update(str(max_records).encode("ascii"))
    digest.update(f"normalizer:{NORMALIZER_VERSION}".encode("ascii"))
    return digest.hexdigest()


def load_doors_tasks(
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
        raise DoorsDataError(f"Legacy Jenkins cache not found: {root}")
    if not config_file.is_file():
        raise DoorsDataError(f"Legacy selection config not found: {config_file}")

    try:
        with config_file.open("r", encoding="utf-8-sig") as source:
            config = json.load(source)
    except (OSError, json.JSONDecodeError) as exc:
        raise DoorsDataError(f"Unable to read legacy selection config: {exc}") from exc

    selections = config.get("selection_states") or {}
    selected_modules: list[tuple[str, str, str, set[str], Path]] = []
    missing_modules: list[str] = []
    build_names: list[str] = []

    for project_key, selection in selections.items():
        if not isinstance(selection, dict):
            continue
        build_dir = _discover_build_dir(root, project_key)
        if build_dir is None:
            continue
        build_names.append(build_dir.name)
        index = _module_index(build_dir)
        for category, names_key, baselines_key in (
            ("10_AS", "as_file_names", "as_features"),
            ("40_Gen_SWXS", "xs_file_names", "xs_features"),
        ):
            baselines = set(normalize_baselines(selection.get(baselines_key) or []))
            if not baselines:
                continue
            for module_name in selection.get(names_key) or []:
                normalized_name = str(module_name).strip()
                module_path = index.get((category, normalized_name))
                if module_path is None:
                    missing_modules.append(f"{project_key}/{category}/{normalized_name}")
                    continue
                selected_modules.append((project_key, category, normalized_name, baselines, module_path))

    selected_files: list[Path] = []
    for module in selected_modules:
        module_path = module[-1]
        selected_files.append(module_path)
        external_path = _external_path(module_path)
        if external_path.is_file():
            selected_files.append(external_path)
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
    truncated = False
    cleaned: dict[tuple[str, str, str], int] = {}
    for project_key, category, module_name, baselines, module_path in selected_modules:
        external_links = _external_links(module_path)
        try:
            with module_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as csv_file:
                reader = csv.DictReader(csv_file, delimiter="|", quotechar='"')
                for row in reader:
                    if str(row.get("Modulename") or "").strip() != module_name:
                        continue
                    raw_baseline = str(row.get("RB_Baseline") or "")
                    if raw_baseline and raw_baseline != normalize_baseline(raw_baseline):
                        change = (module_name, raw_baseline, normalize_baseline(raw_baseline))
                        cleaned[change] = cleaned.get(change, 0) + 1
                    if not _matches_baseline(raw_baseline, baselines):
                        continue
                    url = str(row.get("URL") or "").strip()
                    task = _row_to_task(
                        row,
                        project_key=project_key,
                        category=category,
                        module_name=module_name,
                        linked_alm_ids=external_links.get(url, []),
                    )
                    if task:
                        tasks.append(task)
                    if len(tasks) >= max_records:
                        truncated = True
                        break
        except (OSError, csv.Error) as exc:
            parse_errors.append(f"{module_path}: {exc}")
        if truncated:
            break

    payload = {
        "fingerprint": fingerprint,
        "tasks": tasks,
        "meta": {
            "source": "DOORS Jenkins cache",
            "count": len(tasks),
            "moduleCount": len(selected_modules),
            "builds": sorted(set(build_names)),
            "missingModules": missing_modules,
            "parseErrors": parse_errors,
            "truncated": truncated,
            "baselineNormalized": [
                {"module": module, "raw": raw, "normalized": value, "rows": rows}
                for (module, raw, value), rows in sorted(cleaned.items())
            ],
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
