import unittest

from backend.traceability import build_traceability


class TraceabilityTests(unittest.TestCase):
    def test_builds_exact_doors_alm_qc_chain(self):
        tasks = [
            {
                "key": "door-key",
                "id": "DOORS-REQ-1",
                "source": "DOORS",
                "type": "SW Requirement",
                "title": "Brake requirement",
                "project": "Demo",
                "iteration": "BL1",
                "status": "Done",
                "linkedAlmIds": ["ALM-42"],
            },
            {
                "key": "alm-key",
                "id": "ALM-42",
                "source": "ALM",
                "type": "Story",
                "title": "Implement brake requirement",
                "project": "Demo",
                "iteration": "BL1",
                "status": "In Progress",
            },
            {
                "key": "qc-key",
                "id": "QC-TI-7",
                "source": "QC",
                "type": "Test Instance",
                "title": "Brake test",
                "project": "Demo",
                "iteration": "BL1",
                "status": "Done",
                "testId": "5",
                "doorsIds": ["REQ-1"],
            },
        ]

        traceability, meta = build_traceability(tasks)

        self.assertEqual(len(traceability), 1)
        self.assertEqual(traceability[0]["alm"][0]["id"], "ALM-42")
        self.assertEqual(traceability[0]["qcTests"][0]["id"], "QC-TI-7")
        self.assertEqual(traceability[0]["health"]["label"], "End-to-end")
        self.assertEqual(traceability[0]["category"], "end-to-end")
        self.assertEqual(meta["endToEndCount"], 1)
        self.assertEqual(meta["doorsAlmOnlyCount"], 0)
        self.assertEqual(meta["unresolvedDoorsReferences"], 0)


if __name__ == "__main__":
    unittest.main()
