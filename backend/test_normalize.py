import unittest

import pandas as pd

from backend.normalize import normalize_baseline, normalize_baselines
from backend.reference_bridge import _install_baseline_normalizer


class NormalizeBaselineTests(unittest.TestCase):
    def test_format_cleaning_table(self):
        cases = {
            " BL04": "BL04",
            "BL04 ": "BL04",
            "\u00a0BL04\u00a0": "BL04",
            "BL\u200b04": "BL04",
            "\ufeffBL04": "BL04",
            "\uff22\uff2c\uff10\uff14": "BL04",
            "BL04\t": "BL04",
            "BL3  CAT2": "BL3 CAT2",
            "ESP\u3000BSS07SP10": "ESP BSS07SP10",
            "BL2.1 & BL3.12": "BL2.1 & BL3.12",
            "   ": "",
            "": "",
            None: "",
            float("nan"): "",
            "<EMPTY>": "<EMPTY>",
        }
        for raw, expected in cases.items():
            with self.subTest(raw=repr(raw)):
                self.assertEqual(normalize_baseline(raw), expected)

    def test_does_not_merge_differently_spelled_names(self):
        for name in ("bl04", "BL 1.2", "BL3.06", "AeroHT_BL1.1"):
            self.assertEqual(normalize_baseline(name), name)

    def test_selection_is_deduplicated_in_order(self):
        self.assertEqual(normalize_baselines([" BL04", "BL1", "BL04", "", None]), ["BL04", "BL1"])


class ReferenceReaderTests(unittest.TestCase):
    def test_wraps_reader_once_and_cleans_baseline_column(self):
        class Module:
            @staticmethod
            def read_dumpdoors_csv(path):
                return pd.DataFrame({"RB_Baseline": [" BL04", None, "BL1"], "Other": [" x", "y", "z"]})

        _install_baseline_normalizer(Module)
        wrapped = Module.read_dumpdoors_csv
        _install_baseline_normalizer(Module)
        frame = Module.read_dumpdoors_csv("ignored")

        self.assertIs(Module.read_dumpdoors_csv, wrapped)
        self.assertEqual(frame["RB_Baseline"].tolist(), ["BL04", "", "BL1"])
        self.assertEqual(frame["Other"].tolist(), [" x", "y", "z"])

    def test_fails_loudly_when_reader_is_missing(self):
        class Module:
            pass

        with self.assertRaises(RuntimeError):
            _install_baseline_normalizer(Module)


if __name__ == "__main__":
    unittest.main()
