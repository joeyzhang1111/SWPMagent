from __future__ import annotations

import unittest
from dataclasses import dataclass, field

import pandas as pd

from backend.reference_bridge import json_safe, serialize_analysis_result


@dataclass
class FakeQcResult:
    filtered_rows: list[dict] = field(default_factory=list)
    problem_rows: list[dict] = field(default_factory=list)
    filtered_req_df: pd.DataFrame | None = None


class FakeAnalysisResult:
    as_rows = [{"Object_Identifier": "1", "Issue Reason": "FNID not assigned"}]
    xs_rows = []
    alm_defects = [{"ID": "100", "State": "Open"}]
    alm_issues = [{"ID": "100", "Issue Reason": "Task not fully closed"}]
    cross_ref_stats = {"alm_status": {"total": 1}}
    as_summary = ["10_AS Analysis Summary"]
    xs_summary = ["40_Gen_SWXS Analysis Summary"]
    alm_summary = "ALM Data Statistics Summary\n"

    def __init__(self) -> None:
        self.qc = FakeQcResult(
            filtered_rows=[{"TEST_INSTANCE_ID": "200"}],
            problem_rows=[],
            filtered_req_df=pd.DataFrame([{"REQ_ID": "300", "Direct_Cover_Status": "Passed"}]),
        )


class ReferenceBridgeTests(unittest.TestCase):
    def test_serializes_reference_result_for_the_react_page(self) -> None:
        payload = serialize_analysis_result(FakeAnalysisResult())

        self.assertEqual(payload["asRows"][0]["Object_Identifier"], "1")
        self.assertEqual(payload["qcTestInstances"][0]["TEST_INSTANCE_ID"], "200")
        self.assertEqual(payload["qcRequirements"][0]["REQ_ID"], "300")
        self.assertEqual(payload["crossReferenceStats"]["alm_status"]["total"], 1)

    def test_normalizes_nan_values(self) -> None:
        self.assertIsNone(json_safe(float("nan")))


if __name__ == "__main__":
    unittest.main()


class AlmChildrenTests(unittest.TestCase):
    def setUp(self) -> None:
        from types import SimpleNamespace

        from backend.analysis_service import AnalysisService

        self.cache = {"P": [{"label": "Root", "url": "u", "children": [], "child_url": "c"}]}
        cache = self.cache

        class FakeAlm:
            def fetch_children_for_node(self, url):
                return [{"label": "BL1", "url": "u1", "children": [], "child_url": ""}]

            def update_cache_with_children(self, timeline, chain, nodes):
                cache[timeline][0]["children"] = nodes

        def scopes():
            out = []
            for node in cache["P"]:
                leaves = node["children"] or [node]
                out += [{"display": f"P | Root / {n['label']}" if node["children"] else "P | Root"} for n in leaves]
            return out

        self.module = SimpleNamespace(TIMELINE_CACHE_PATH="x", load_local_cache=lambda _path: cache)
        self.backend = SimpleNamespace(alm=FakeAlm(), alm_scopes=scopes)
        self.service = AnalysisService()
        self.service._ensure_backend = lambda: (self.module, self.backend)

    def test_marks_unloaded_leaf_as_expandable(self) -> None:
        options = self.service._scope_options(self.module, self.backend)
        self.assertEqual(options, [{"display": "P | Root", "expandable": True}])

    def test_loading_children_replaces_the_parent_option(self) -> None:
        result = self.service.load_alm_children("P | Root")
        self.assertEqual(result["loaded"], 1)
        self.assertEqual(result["almScopes"], [{"display": "P | Root / BL1", "expandable": False}])

    def test_rejects_unknown_iteration(self) -> None:
        with self.assertRaises(ValueError):
            self.service.load_alm_children("P | Missing")


class InputsCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        from types import SimpleNamespace

        from backend.analysis_service import AnalysisService

        self.loads = []
        config = {"selection_states": {"P": {"as_features": [" BL1"]}}}
        data = SimpleNamespace(
            file_map={"A": {}}, xs_file_map={"X": {}}, project=None, build=None,
            list_baselines=lambda files, kind: [f"{kind}-BL"],
        )
        self.module = SimpleNamespace(
            TIMELINE_CACHE_PATH="x", load_local_cache=lambda _path: {},
            load_config=lambda: config, save_config=lambda value: None,
        )
        self.backend = SimpleNamespace(
            data=data, alm_scopes=lambda: [], qc_folder_tree=lambda: [],
            qc=SimpleNamespace(available_folder_paths=lambda: ["q"]),
        )
        self.service = AnalysisService()
        self.service._ensure_backend = lambda: (self.module, self.backend)
        self.service._load_build_without_cleanup = lambda *args: self.loads.append(args[2:])

    def test_second_call_reuses_the_scan(self) -> None:
        first = self.service.inputs("P", "7")
        second = self.service.inputs("P", "7")
        self.assertEqual(len(self.loads), 1)
        self.assertEqual(first, second)
        self.assertEqual(second["selection"]["asFeatures"], ["BL1"])

    def test_refresh_and_new_build_rescan(self) -> None:
        self.service.inputs("P", "7")
        self.service.inputs("P", "7", refresh=True)
        self.service.inputs("P", "8")
        self.assertEqual(len(self.loads), 3)

    def test_cached_call_does_not_wait_for_the_state_lock(self) -> None:
        import threading

        self.service.inputs("P", "7")
        results = []
        with self.service._state_lock:
            worker = threading.Thread(target=lambda: results.append(self.service.inputs("P", "7")))
            worker.start()
            worker.join(timeout=2)
        self.assertFalse(worker.is_alive())
        self.assertEqual(len(results), 1)


class VendoredBackendTests(unittest.TestCase):
    def test_loads_the_module_shipped_in_this_repository(self) -> None:
        from pathlib import Path

        from backend.reference_bridge import load_reference_backend

        module = load_reference_backend()
        self.assertEqual(Path(module.__file__).parent, Path(__file__).parent)
        self.assertTrue(getattr(module.read_dumpdoors_csv, "swpm_normalizes_baseline", False))

    def test_has_no_hardcoded_jenkins_credentials(self) -> None:
        import re
        from pathlib import Path

        source = (Path(__file__).parent / "summary_backend.py").read_text(encoding="utf-8")
        self.assertRegex(source, r'TOKEN = os\.environ\.get\("JENKINS_TOKEN", ""\)')
        self.assertRegex(source, r'USERNAME = os\.environ\.get\("JENKINS_USER", ""\)')
        self.assertFalse(re.search(r"[A-Za-z]:\\\\Users", source))
