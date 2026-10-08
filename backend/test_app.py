import json
import tempfile
import unittest
from pathlib import Path

from backend.app import load_legacy_cache_payload, map_work_item


class WorkItemMappingTests(unittest.TestCase):
    def test_maps_closed_epic(self):
        task = map_work_item(
            {
                "ID": "42",
                "Type": "Epic",
                "Title": "Brake feature",
                "State": "Closed",
                "Severity": "Major",
                "Filed Against": "ESP10",
                "Owned By": "user1",
            },
            "Sprint 7",
        )

        self.assertEqual(task["id"], "ALM-42")
        self.assertEqual(task["type"], "EPIC")
        self.assertEqual(task["status"], "Done")
        self.assertEqual(task["priority"], "High")
        self.assertEqual(task["maturity"], 100)
        self.assertEqual(task["project"], "ESP10")

    def test_uses_iteration_when_filed_against_is_missing(self):
        task = map_work_item(
            {"ID": "ALM-9", "Type": "Story", "State": "In Progress"},
            "BL4.0",
        )

        self.assertEqual(task["id"], "ALM-9")
        self.assertEqual(task["type"], "Story")
        self.assertEqual(task["status"], "In Progress")
        self.assertEqual(task["project"], "BL4.0")

    def test_loads_legacy_cache_scopes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_path = Path(temp_dir) / "alm_cache.json"
            cache_path.write_text(
                json.dumps(
                    {
                        "Project A | Sprint 1": {
                            "all_defects": [
                                {
                                    "ID": "7",
                                    "Type": "Task",
                                    "Title": "Cached task",
                                    "State": "New",
                                    "Filed Against": "Component A",
                                }
                            ]
                        }
                    }
                ),
                encoding="utf-8",
            )

            payload = load_legacy_cache_payload(str(cache_path))

        self.assertEqual(payload["meta"]["source"], "Legacy ALM cache")
        self.assertEqual(payload["meta"]["count"], 1)
        self.assertEqual(payload["tasks"][0]["project"], "Project A")
        self.assertEqual(payload["tasks"][0]["component"], "Component A")
        self.assertEqual(payload["tasks"][0]["iteration"], "Sprint 1")


if __name__ == "__main__":
    unittest.main()
