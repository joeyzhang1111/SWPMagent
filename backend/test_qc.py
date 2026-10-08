import csv
import json
import tempfile
import unittest
from pathlib import Path

from backend.qc import load_qc_tasks


class QcCacheTests(unittest.TestCase):
    def test_reads_selected_test_instances_and_matching_requirements(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            build = root / "jenkins" / "Demo_Project_12_ref"
            qc_dir = build / "Reference" / "QC" / "Demo"
            qc_dir.mkdir(parents=True)
            config_path = root / "config.json"
            derived_path = root / "derived.json"

            config_path.write_text(
                json.dumps(
                    {
                        "selection_states": {
                            "Demo_Project": {
                                "qc_paths": ["\\Baseline  4.0\\01_Functional Tests"]
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )

            with (qc_dir / "QC_TestInstances.csv").open(
                "w", encoding="utf-8", newline=""
            ) as csv_file:
                writer = csv.DictWriter(
                    csv_file,
                    fieldnames=[
                        "TEST_INSTANCE_ID",
                        "Test_Name",
                        "TestSet_Name",
                        "TestSetFolder_Path_full",
                        "TestExec_Status",
                        "RB_Comment",
                        "ResponsibleTester",
                        "TEST_ID",
                        "RB_DoorsLinks",
                    ],
                    delimiter=";",
                    quotechar='"',
                    quoting=csv.QUOTE_ALL,
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "TEST_INSTANCE_ID": "17",
                        "Test_Name": "Brake pressure test",
                        "TestSet_Name": "Functional brake tests",
                        "TestSetFolder_Path_full": "\\Baseline  4.0\\01_Functional Tests\\Brake",
                        "TestExec_Status": "Failed",
                        "RB_Comment": "",
                        "ResponsibleTester": "tester1",
                        "TEST_ID": "5",
                        "RB_DoorsLinks": "REQ-1",
                    }
                )
                writer.writerow(
                    {
                        "TEST_INSTANCE_ID": "99",
                        "Test_Name": "Out of scope",
                        "TestSetFolder_Path_full": "\\Baseline  5.0\\01_Functional Tests",
                        "TestExec_Status": "Passed",
                        "TEST_ID": "9",
                    }
                )

            with (qc_dir / "QC_Requirements.csv").open(
                "w", encoding="utf-8", newline=""
            ) as csv_file:
                writer = csv.DictWriter(
                    csv_file,
                    fieldnames=[
                        "REQ_ID",
                        "Name",
                        "RB_Baseline",
                        "Requirement_Type",
                        "Direct_Cover_Status",
                        "Author",
                        "RB_Doors_Identifier",
                    ],
                    delimiter=";",
                    quotechar='"',
                    quoting=csv.QUOTE_ALL,
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "REQ_ID": "42",
                        "Name": "Brake coverage requirement",
                        "RB_Baseline": "4.0",
                        "Requirement_Type": "105",
                        "Direct_Cover_Status": "Not Covered",
                        "Author": "author1",
                        "RB_Doors_Identifier": "REQ-1",
                    }
                )
                writer.writerow(
                    {
                        "REQ_ID": "43",
                        "Name": "Wrong type",
                        "RB_Baseline": "4.0",
                        "Requirement_Type": "101",
                        "Direct_Cover_Status": "Passed",
                    }
                )

            with (qc_dir / "QC_Req2Test.csv").open(
                "w", encoding="utf-8", newline=""
            ) as csv_file:
                writer = csv.DictWriter(
                    csv_file,
                    fieldnames=["REQ_ID", "TEST_ID"],
                    delimiter=";",
                    quotechar='"',
                    quoting=csv.QUOTE_ALL,
                )
                writer.writeheader()
                writer.writerow({"REQ_ID": "42", "TEST_ID": "5"})

            payload = load_qc_tasks(
                jenkins_root=str(root / "jenkins"),
                config_path=str(config_path),
                derived_cache_path=str(derived_path),
            )

        self.assertEqual(payload["meta"]["count"], 2)
        self.assertEqual(payload["meta"]["testInstanceCount"], 1)
        self.assertEqual(payload["meta"]["requirementCount"], 1)
        self.assertEqual(payload["meta"]["issueCount"], 2)
        self.assertEqual(payload["tasks"][0]["id"], "QC-TI-17")
        self.assertEqual(payload["tasks"][0]["iteration"], "4.0")
        self.assertEqual(payload["tasks"][0]["doorsIds"], ["REQ-1"])
        self.assertEqual(payload["tasks"][1]["id"], "QC-REQ-42")
        self.assertEqual(payload["tasks"][1]["source"], "QC")
        self.assertEqual(payload["tasks"][1]["linkedTestIds"], ["5"])


if __name__ == "__main__":
    unittest.main()
