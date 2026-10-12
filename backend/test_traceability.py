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

    def test_lists_unlinked_and_not_required_requirements(self):
        def door(key, raw_state, linked=()):
            return {
                "key": key, "id": f"DOORS-{key}", "source": "DOORS", "type": "SW Requirement",
                "title": key, "project": "Demo", "iteration": "BL1", "status": "Done",
                "rawState": raw_state, "linkedAlmIds": list(linked),
            }

        tasks = [
            door("a", "accepted"),
            door("b", "no_req"),
            door("c", "Rejected", ["ALM-1"]),
            door("d", "accepted", ["ALM-404"]),
        ]

        traceability, meta = build_traceability(tasks)
        categories = {item["id"]: item["category"] for item in traceability}

        self.assertEqual(categories, {"a": "unlinked", "b": "not-required", "c": "not-required", "d": "unresolved-alm"})
        self.assertEqual(meta["requirementCount"], 2)
        self.assertEqual(meta["notRequiredCount"], 2)
        self.assertEqual(meta["unlinkedCount"], 1)
        self.assertEqual(meta["linkedDoorCount"], 1)


if __name__ == "__main__":
    unittest.main()
