from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

# DOORS states that mean the requirement does not need to be implemented or tested.
NOT_REQUIRED_STATES = {"no_req", "rejected", "canceled"}


def _node(task: dict[str, Any], via: str = "") -> dict[str, Any]:
    node = {
        "key": str(task.get("key") or task.get("id") or ""),
        "id": str(task.get("id") or ""),
        "source": str(task.get("source") or ""),
        "type": str(task.get("type") or ""),
        "title": str(task.get("title") or ""),
        "status": str(task.get("status") or ""),
        "project": str(task.get("project") or ""),
        "iteration": str(task.get("iteration") or ""),
        "issueReason": str(task.get("issueReason") or ""),
    }
    if via:
        node["via"] = via
    return node


def _append_unique(nodes: list[dict[str, Any]], node: dict[str, Any]) -> None:
    identity = node.get("key") or node.get("id")
    if identity and not any((item.get("key") or item.get("id")) == identity for item in nodes):
        nodes.append(node)


def _choose_task(candidates: list[dict[str, Any]], project: str) -> dict[str, Any] | None:
    if not candidates:
        return None
    return next((task for task in candidates if task.get("project") == project), candidates[0])


def build_traceability(tasks: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    doors_tasks = [task for task in tasks if task.get("source") == "DOORS"]
    alm_tasks = [task for task in tasks if task.get("source") == "ALM"]
    qc_tasks = [task for task in tasks if task.get("source") == "QC"]

    alm_by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for task in alm_tasks:
        alm_by_id[str(task.get("id") or "")].append(task)

    doors_by_project_id: dict[tuple[str, str], dict[str, Any]] = {}
    doors_by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    doors_by_key: dict[str, dict[str, Any]] = {}
    for task in doors_tasks:
        raw_id = str(task.get("id") or "").removeprefix("DOORS-")
        project = str(task.get("project") or "")
        doors_by_project_id[(project, raw_id)] = task
        doors_by_id[raw_id].append(task)
        doors_by_key[str(task.get("key") or task.get("id") or "")] = task

    traces: dict[str, dict[str, Any]] = {}

    def trace_for(doors_task: dict[str, Any]) -> dict[str, Any]:
        key = str(doors_task.get("key") or doors_task.get("id") or "")
        if key not in traces:
            traces[key] = {
                "id": key,
                "requirement": _node(doors_task),
                "alm": [],
                "qcRequirements": [],
                "qcTests": [],
                "unresolvedAlmIds": [],
            }
        return traces[key]

    unresolved_alm_references = 0
    for doors_task in doors_tasks:
        trace = trace_for(doors_task)
        for alm_id in dict.fromkeys(doors_task.get("linkedAlmIds") or []):
            linked_task = _choose_task(alm_by_id.get(str(alm_id), []), str(doors_task.get("project") or ""))
            if linked_task is None:
                if alm_id not in trace["unresolvedAlmIds"]:
                    trace["unresolvedAlmIds"].append(alm_id)
                    unresolved_alm_references += 1
                continue
            _append_unique(trace["alm"], _node(linked_task, "DOORS external WorkItemID"))

    qc_tests_by_project_test_id: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for task in qc_tasks:
        if task.get("type") == "Test Instance" and task.get("testId"):
            qc_tests_by_project_test_id[(str(task.get("project") or ""), str(task["testId"]))].append(task)

    unresolved_doors_references: set[tuple[str, str]] = set()

    def resolve_door(project: str, raw_id: str) -> dict[str, Any] | None:
        exact = doors_by_project_id.get((project, raw_id))
        if exact is not None:
            return exact
        candidates = doors_by_id.get(raw_id, [])
        return candidates[0] if len(candidates) == 1 else None

    for task in qc_tasks:
        project = str(task.get("project") or "")
        if task.get("type") == "Test Instance":
            for raw_id in list(dict.fromkeys(task.get("doorsIds") or [])):
                doors_task = resolve_door(project, str(raw_id))
                if doors_task is None:
                    unresolved_doors_references.add((project, str(raw_id)))
                    continue
                _append_unique(
                    trace_for(doors_task)["qcTests"],
                    _node(task, "QC RB_DoorsLinks"),
                )
            continue

        if task.get("type") != "QC Requirement":
            continue
        raw_id = str(task.get("doorsIdentifier") or "").strip()
        if not raw_id:
            continue
        doors_task = resolve_door(project, raw_id)
        if doors_task is None:
            unresolved_doors_references.add((project, raw_id))
            continue
        trace = trace_for(doors_task)
        _append_unique(
            trace["qcRequirements"],
            _node(task, "QC RB_Doors_Identifier"),
        )
        for test_id in task.get("linkedTestIds") or []:
            for test_task in qc_tests_by_project_test_id.get((project, str(test_id)), []):
                _append_unique(trace["qcTests"], _node(test_task, "QC Req2Test"))

    traceability: list[dict[str, Any]] = []
    for trace in traces.values():
        has_alm = bool(trace["alm"])
        has_qc = bool(trace["qcRequirements"] or trace["qcTests"])
        has_qc_issue = any(
            node.get("issueReason")
            for node in [*trace["qcRequirements"], *trace["qcTests"]]
        )
        if str(doors_by_key[trace["id"]].get("rawState") or "").strip().lower() in NOT_REQUIRED_STATES:
            category = "not-required"
            level = "info"
            label = "Not required"
            reason = "The requirement is marked no_req, rejected or canceled, so no ALM or QC link is expected."
        elif has_alm and has_qc:
            category = "end-to-end"
            level = "warn" if has_qc_issue else "ok"
            label = "End-to-end"
            reason = (
                "DOORS is linked to loaded ALM and QC records; one or more QC records need attention."
                if has_qc_issue
                else "DOORS is linked to loaded ALM and QC records."
            )
        elif has_alm or has_qc:
            category = "doors-alm" if has_alm else "doors-qc"
            level = "warn"
            label = "Partial"
            missing = "QC" if has_alm else "ALM"
            reason = f"Exact cross-source links were found, but no loaded {missing} record completes the chain."
        elif trace["unresolvedAlmIds"]:
            category = "unresolved-alm"
            level = "bad"
            label = "Unresolved"
            reason = "The DOORS export contains ALM references that are outside the loaded ALM scopes."
        else:
            category = "unlinked"
            level = "bad"
            label = "No link"
            reason = "No ALM or QC record is linked to this requirement."
        trace["health"] = {"level": level, "label": label, "reason": reason}
        trace["category"] = category
        traceability.append(trace)

    traceability.sort(
        key=lambda item: (
            str(item["requirement"].get("project") or ""),
            str(item["requirement"].get("id") or ""),
        )
    )
    not_required = sum(item["category"] == "not-required" for item in traceability)
    unlinked = sum(item["category"] == "unlinked" for item in traceability)
    meta = {
        "method": "Exact exported identifiers only",
        "doorTaskCount": len(doors_tasks),
        "requirementCount": len(traceability) - not_required,
        "notRequiredCount": not_required,
        "unlinkedCount": unlinked,
        "linkedDoorCount": len(traceability) - not_required - unlinked,
        "doorsWithAlm": sum(bool(item["alm"]) for item in traceability),
        "doorsWithQc": sum(bool(item["qcRequirements"] or item["qcTests"]) for item in traceability),
        "endToEndCount": sum(item["category"] == "end-to-end" for item in traceability),
        "doorsAlmOnlyCount": sum(item["category"] == "doors-alm" for item in traceability),
        "doorsQcOnlyCount": sum(item["category"] == "doors-qc" for item in traceability),
        "unresolvedOnlyCount": sum(
            item["category"] == "unresolved-alm" for item in traceability
        ),
        "almLinkCount": sum(len(item["alm"]) for item in traceability),
        "qcRequirementLinkCount": sum(len(item["qcRequirements"]) for item in traceability),
        "qcTestLinkCount": sum(len(item["qcTests"]) for item in traceability),
        "unresolvedAlmReferences": unresolved_alm_references,
        "unresolvedDoorsReferences": len(unresolved_doors_references),
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    return traceability, meta
