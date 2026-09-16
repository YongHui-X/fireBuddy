import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.query_terms import expand_query_acronyms


class QueryTermExpansionTests(unittest.TestCase):
    def test_expands_each_acronym_once(self):
        expanded = expand_query_acronyms("What is the FRS in 2026? Is the FRS fixed?")

        self.assertEqual(
            expanded,
            "What is the FRS (Full Retirement Sum) in 2026? Is the FRS fixed?",
        )

    def test_is_case_sensitive_so_ordinary_words_survive(self):
        self.assertEqual(expand_query_acronyms("ma sa ow"), "ma sa ow")

    def test_skips_acronyms_whose_expansion_is_already_present(self):
        self.assertEqual(
            expand_query_acronyms("Full Retirement Sum FRS"),
            "Full Retirement Sum FRS",
        )

    def test_handles_empty_input(self):
        self.assertEqual(expand_query_acronyms(""), "")


if __name__ == "__main__":
    unittest.main()
