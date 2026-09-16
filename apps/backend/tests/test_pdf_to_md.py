import sys
import tempfile
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = BACKEND_DIR / "rag" / "fetchAndConvert"
for path in (BACKEND_DIR, SCRIPTS_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import pdf_to_md
from check_pdfs import PDFS, registry_by_cache_path, registry_by_pdf_name


class PdfToMarkdownTests(unittest.TestCase):
    def test_table_to_markdown_drops_spacer_columns_and_keeps_rows_aligned(self):
        table = [
            ["Year", None, "BRS", None, "FRS"],
            ["2026", None, "$110,200", None, "$220,400"],
            [None, None, None, None, None],
        ]

        markdown = pdf_to_md.table_to_markdown(table)

        self.assertEqual(
            markdown.splitlines(),
            [
                "| Year | BRS | FRS |",
                "|---|---|---|",
                "| 2026 | $110,200 | $220,400 |",
            ],
        )

    def test_wrapped_lines_are_rejoined_into_paragraphs(self):
        raw = "\n".join([
            "1. Is an emergency fund of 3 to 6 months of expenses enough?",
            "Setting aside at least 3 - 6 months’ worth of expenses as emergency funds is generally an accepted rule of",
            "thumb, and should provide sufficient buffer for most people during emergencies.",
            "A. Introduction and Product Features",
            "What are Savings Bonds?",
            "| 2026 | $8,000 |",
            "Note this table.",
        ])

        cleaned = pdf_to_md.clean_extracted_text(raw, "faq.pdf")
        paragraphs = cleaned.split("\n\n")[1:]

        self.assertEqual(paragraphs[0], "1. Is an emergency fund of 3 to 6 months of expenses enough?")
        self.assertTrue(paragraphs[1].startswith("Setting aside at least 3 - 6 months"))
        self.assertTrue(paragraphs[1].endswith("rule of thumb, and should provide sufficient buffer for most people during emergencies."))
        self.assertEqual(paragraphs[2], "A. Introduction and Product Features")
        self.assertEqual(paragraphs[3], "What are Savings Bonds?")
        self.assertEqual(paragraphs[4], "| 2026 | $8,000 |")
        self.assertEqual(paragraphs[5], "Note this table.")

    def test_table_rows_survive_short_line_cleanup(self):
        cleaned = pdf_to_md.clean_extracted_text("| 2026 | $8,000 |\n\nNil\n", "x.pdf")

        self.assertIn("| 2026 | $8,000 |", cleaned)
        self.assertNotIn("\nNil", cleaned)

    def test_tiny_conversion_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            problem = pdf_to_md.markdown_size_problem("# Source: x.pdf\n\n2017 $83,000", Path(temp_dir) / "x.md")

        self.assertIn("minimum", problem)

    def test_conversion_that_loses_most_of_the_cache_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            md_path = Path(temp_dir) / "x.md"
            md_path.write_text("A" * 10_000, encoding="utf-8")

            problem = pdf_to_md.markdown_size_problem("B" * 3_000, md_path)
            fine = pdf_to_md.markdown_size_problem("B" * 9_000, md_path)

        self.assertIn("more than half", problem)
        self.assertIsNone(fine)

    def test_registry_superseded_entries_point_at_existing_manual_documents(self):
        knowledge_base = BACKEND_DIR / "rag" / "knowledge-base"
        superseded = [source for source in PDFS if source.get("superseded_by")]

        self.assertGreaterEqual(len(superseded), 4)
        for source in superseded:
            self.assertTrue((knowledge_base / source["superseded_by"]).exists(), source["label"])

    def test_registry_indexes_share_the_same_entries(self):
        by_cache = registry_by_cache_path()
        by_name = registry_by_pdf_name()

        self.assertEqual(len(by_cache), len(PDFS))
        self.assertEqual(len(by_name), len(PDFS))
        self.assertEqual(
            by_cache["mas/singapore-savings-bonds-faqs.md"]["skip_pages"],
            [2, 3, 4],
        )


if __name__ == "__main__":
    unittest.main()
