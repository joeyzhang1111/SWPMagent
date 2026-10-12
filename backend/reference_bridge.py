from __future__ import annotations

import dataclasses
import importlib
import logging
import math
import os
import threading
from datetime import date, datetime
from pathlib import Path
from types import ModuleType
from typing import Any

from backend.normalize import normalize_baseline


LOGGER = logging.getLogger(__name__)
_module: ModuleType | None = None
_module_lock = threading.Lock()


class ReferenceBackendError(RuntimeError):
    pass


def _install_baseline_normalizer(module: ModuleType) -> None:
    """Every DOORS CSV in the analysis backend is read through read_dumpdoors_csv."""
    original = getattr(module, "read_dumpdoors_csv", None)
    if original is None:
        raise ReferenceBackendError(
            "Analysis backend no longer exposes read_dumpdoors_csv; RB_Baseline cannot be normalized."
        )
    if getattr(original, "swpm_normalizes_baseline", False):
        return

    def read_normalized(path: Any) -> Any:
        frame = original(path)
        if frame is not None and "RB_Baseline" in frame.columns:
            frame["RB_Baseline"] = frame["RB_Baseline"].map(normalize_baseline)
        return frame

    read_normalized.swpm_normalizes_baseline = True  # type: ignore[attr-defined]
    module.read_dumpdoors_csv = read_normalized


def _cache_root() -> Path:
    configured = os.getenv("SWPM_ANALYSIS_CACHE_DIR", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return (Path(__file__).parent / ".app_cache").resolve()


def _configure_module(module: ModuleType) -> None:
    root = _cache_root()
    module.APP_CACHE_DIR = str(root)
    module.JENKINS_CACHE_DIR = str(root / "jenkins")
    module.ALM_CACHE_DIR = str(root / "alm")
    module.CONFIG_DIR = str(root / "config")
    module.TIMELINE_CACHE_DIR = str(root / "timeline")
    module.CRED_DIR = str(root / "cred")
    module.CACHE_DIR = module.JENKINS_CACHE_DIR
    module.CONFIG_PATH = str(root / "config" / "config.json")
    module.ALM_CACHE_PATH = str(root / "alm" / "alm_cache.json")
    module.TIMELINE_CACHE_PATH = str(root / "timeline" / "timeline_cache.json")
    module.CRED_PATH = str(root / "cred" / "rtc_cred.bin")
    for folder in (
        module.JENKINS_CACHE_DIR,
        module.ALM_CACHE_DIR,
        module.CONFIG_DIR,
        module.TIMELINE_CACHE_DIR,
        module.CRED_DIR,
    ):
        Path(folder).mkdir(parents=True, exist_ok=True)

    if os.getenv("JENKINS_BASE_URL"):
        module.BASE_URL = os.environ["JENKINS_BASE_URL"].rstrip("/")
    if os.getenv("JENKINS_USER") or os.getenv("JENKINS_TOKEN"):
        username = os.getenv("JENKINS_USER", "")
        token = os.getenv("JENKINS_TOKEN", "")
        module.USERNAME = username
        module.TOKEN = token
        module.AUTH = module.HTTPBasicAuth(username, token)
    if not (module.USERNAME and module.TOKEN):
        LOGGER.warning("JENKINS_USER / JENKINS_TOKEN are not set; Jenkins requests will be rejected.")
    proxy = os.getenv("JENKINS_PROXY", "").strip()
    if proxy:
        module.PROXIES = {"http": proxy, "https": proxy}
    elif os.getenv("JENKINS_USE_PROXY", "").strip().lower() in {"0", "false", "no", "off"}:
        module.PROXIES = {}
    module.REQ = {
        "auth": module.AUTH,
        "proxies": module.PROXIES,
        "verify": os.getenv("JENKINS_VERIFY_SSL", "false").strip().lower()
        not in {"0", "false", "no", "off"},
        "timeout": float(os.getenv("JENKINS_TIMEOUT_SECONDS", "20")),
    }
    module.SERVER = os.getenv("RTC_ALM_SERVER", module.SERVER).rstrip("/")
    module.PROJECT_AREA = os.getenv("RTC_ALM_PROJECT_AREA", module.PROJECT_AREA).strip()
    # A valid reference build may contain only AS or only XS data. Treat a scanned
    # directory as loaded so the facade does not download it again unnecessarily.
    module.DoorsDataSession.loaded = property(
        lambda self: bool(self.base_dir and (self.file_map or self.xs_file_map))
    )
    _install_baseline_normalizer(module)


def load_reference_backend() -> ModuleType:
    global _module
    with _module_lock:
        if _module is not None:
            return _module
        module = importlib.import_module("backend.summary_backend")
        _configure_module(module)
        _module = module
        return module


def json_safe(value: Any) -> Any:
    if dataclasses.is_dataclass(value):
        return {field.name: json_safe(getattr(value, field.name)) for field in dataclasses.fields(value)}
    if hasattr(value, "to_dict") and value.__class__.__module__.startswith("pandas"):
        return json_safe(value.to_dict("records"))
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if hasattr(value, "item"):
        try:
            return json_safe(value.item())
        except (TypeError, ValueError):
            pass
    return value


def serialize_analysis_result(result: Any) -> dict[str, Any]:
    qc = result.qc
    qc_requirements = []
    if qc is not None and qc.filtered_req_df is not None:
        qc_requirements = json_safe(qc.filtered_req_df)
    return {
        "asRows": json_safe(result.as_rows),
        "xsRows": json_safe(result.xs_rows),
        "almRows": json_safe(result.alm_defects),
        "almIssues": json_safe(result.alm_issues),
        "qcTestInstances": json_safe(qc.filtered_rows if qc else []),
        "qcProblems": json_safe(qc.problem_rows if qc else []),
        "qcRequirements": qc_requirements,
        "qcSummary": json_safe(qc) if qc else {},
        "crossReferenceStats": json_safe(result.cross_ref_stats),
        "summaries": {
            "as": list(result.as_summary),
            "xs": list(result.xs_summary),
            "alm": result.alm_summary,
        },
    }
