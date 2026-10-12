import csv
import json
import tempfile
import unittest
from pathlib import Path

from backend.doors import load_doors_tasks


class DoorsCacheTests(unittest.TestCase):
    def test_reads_selected_module_and_baseline(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            build = root / "jenkins" / "Demo_Project_12_ref"
            doors_dir = build / "Reference" / "DOORS" / "10_AS"
            doors_dir.mkdir(parents=True)
            config_path = root / "config.json"
            derived_path = root / "derived.json"
            module_path = doors_dir / "demo-module.csv"

            config_path.write_text(
                json.dumps(
                    {
                        "selection_states": {
                            "Demo_Project": {
                                "as_file_names": ["Demo module"],
                                "as_features": ["BL1"],
                                "xs_file_names": [],
                                "xs_features": [],
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            with module_path.open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.DictWriter(
                    csv_file,
                    fieldnames=[
                        "Modulename",
                        "Object_Identifier",
                        "Object_Text",
                        "RB_Baseline",
                        "RB_AS_Status",
                        "RB_Top_FNID",
                        "RB_Change_Required",
                        "Last_Modified_By",
                        "URL",
                    ],
                    delimiter="|",
                    quotechar='"',
                    quoting=csv.QUOTE_ALL,
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "Modulename": "Demo module",
                        "Object_Identifier": "REQ-1",
                        "Object_Text": "Brake requirement",
                        "RB_Baseline": "BL1",
                        "RB_AS_Status": "accepted",
                        "RB_Top_FNID": "42",
                        "RB_Change_Required": "yes",
                        "Last_Modified_By": "user1",
                        "URL": "doors://demo/REQ-1",
                    }
                )
            with (doors_dir / "demo-external.csv").open(
                "w", encoding="utf-8", newline=""
            ) as csv_file:
                writer = csv.DictWriter(
                    csv_file,
                    fieldnames=["Source_URL", "Target_URL", "WorkItemID"],
                    delimiter="|",
                    quotechar='"',
                    quoting=csv.QUOTE_ALL,
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "Source_URL": "doors://demo/REQ-1",
                        "Target_URL": "https://alm.example/workitem/42",
                        "WorkItemID": "42",
                    }
                )

            payload = load_doors_tasks(
                jenkins_root=str(root / "jenkins"),
                config_path=str(config_path),
                derived_cache_path=str(derived_path),
            )

        self.assertEqual(payload["meta"]["count"], 1)
        self.assertFalse(payload["meta"]["truncated"])
        self.assertEqual(payload["tasks"][0]["source"], "DOORS")
        self.assertEqual(payload["tasks"][0]["id"], "DOORS-REQ-1")
        self.assertEqual(payload["tasks"][0]["iteration"], "BL1")
        self.assertEqual(payload["tasks"][0]["linkedAlmIds"], ["ALM-42"])


if __name__ == "__main__":
    unittest.main()


class BaselineWhitespaceTests(unittest.TestCase):
    def test_baseline_with_stray_space_is_selected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            doors_dir = root / "jenkins" / "Demo_Project_12_ref" / "Reference" / "DOORS" / "10_AS"
            doors_dir.mkdir(parents=True)
            config_path = root / "config.json"
            config_path.write_text(
                json.dumps({"selection_states": {"Demo_Project": {"as_file_names": ["Demo module"], "as_features": ["BL04"]}}}),
                encoding="utf-8",
            )
            with (doors_dir / "demo-module.csv").open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.DictWriter(
                    csv_file, fieldnames=["Modulename", "Object_Identifier", "RB_Baseline", "URL"],
                    delimiter="|", quotechar='"', quoting=csv.QUOTE_ALL,
                )
                writer.writeheader()
                for index, baseline in enumerate((" BL04", "BL04", "BL05")):
                    writer.writerow({"Modulename": "Demo module", "Object_Identifier": f"R{index}", "RB_Baseline": baseline, "URL": f"u{index}"})

            payload = load_doors_tasks(
                jenkins_root=str(root / "jenkins"), config_path=str(config_path),
                derived_cache_path=str(root / "derived.json"),
            )

        self.assertEqual(payload["meta"]["count"], 2)
        self.assertEqual({task["iteration"] for task in payload["tasks"]}, {"BL04"})
        self.assertEqual(
            payload["meta"]["baselineNormalized"],
            [{"module": "Demo module", "raw": " BL04", "normalized": "BL04", "rows": 1}],
        )
