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

    def test_strip_lines_remove_page_header_before_the_wrapped_join(self):
        raw = "\n".join([
            "You should compare these against the Savings Bonds to see which better suits",
            "MONETARY AUTHORITY OF SINGAPORE",
            "your needs and goals.",
        ])

        cleaned = pdf_to_md.clean_extracted_text(
            raw, "faq.pdf", strip_lines=["MONETARY AUTHORITY OF SINGAPORE"],
        )

        self.assertNotIn("MONETARY", cleaned)
        self.assertIn("to see which better suits your needs and goals.", cleaned)

    def test_two_word_question_tail_is_kept_and_joined(self):
        raw = "\n".join([
            "12. If I have reached my Individual Limit but have submitted a redemption request, will I be able to bring my holdings back to the",
            "Individual Limit?",
            "Yes, you may.",
        ])

        cleaned = pdf_to_md.clean_extracted_text(raw, "faq.pdf")

        self.assertIn("back to the Individual Limit?", cleaned)
        self.assertIn("\n\nYes, you may.", cleaned)

    def test_numbered_questions_promote_only_when_the_counter_advances(self):
        paragraphs = [
            "1. Can I redeem early?",
            "2. How do I apply for DCS?",
            "1. Online through the CDP Internet service",
            "2. Contact the CDP Call Centre",
            "3. Can I change my bank?",
        ]

        result = pdf_to_md.promote_numbered_questions(paragraphs, {"style": "numbered", "level": 4})

        self.assertEqual(result[0], "#### 1. Can I redeem early?")
        self.assertEqual(result[1], "#### 2. How do I apply for DCS?")
        self.assertEqual(result[2], "1. Online through the CDP Internet service")
        self.assertEqual(result[3], "2. Contact the CDP Call Centre")
        self.assertEqual(result[4], "#### 3. Can I change my bank?")

    def test_counter_reset_starts_a_new_titled_section(self):
        paragraphs = ["1. A?", "body a", "2. B?", "3. C?", "1. D?", "2. E?"]
        config = {"style": "numbered", "level": 3, "section_titles": ["General", "Emergency funds"]}

        result = pdf_to_md.promote_numbered_questions(paragraphs, config)

        self.assertEqual(result[0], "## General")
        self.assertEqual(result[1], "### 1. A?")
        self.assertEqual(result[5], "## Emergency funds")
        self.assertEqual(result[6], "### 1. D?")
        self.assertEqual(sum(item.startswith("### ") for item in result), 5)

    def test_fused_question_is_cut_at_the_first_question_mark(self):
        text = (
            "I have not set aside 6 months of expenses. Can I still purchase? "
            "There are many approaches to building a financial plan and the Guide is one of them."
        )

        heading, body = pdf_to_md.split_fused_question(text)

        self.assertTrue(heading.endswith("Can I still purchase?"))
        self.assertTrue(body.startswith("There are many approaches"))

    def test_long_question_without_a_mark_is_capped_losslessly(self):
        text = "What should I do with my current insurance policies in light of the rules of thumb " * 3

        heading, body = pdf_to_md.split_fused_question(text.strip())

        self.assertLessEqual(len(heading), 165)
        self.assertTrue(heading.endswith("..."))
        self.assertEqual(body, text.strip())

    def test_double_question_heading_is_not_split(self):
        heading, body = pdf_to_md.split_fused_question(
            "What are Savings Bonds? What are the main features?"
        )

        self.assertEqual(heading, "What are Savings Bonds? What are the main features?")
        self.assertIsNone(body)

    def test_section_patterns_promote_ssb_parts_and_subsections(self):
        rules = [
            {"pattern": r"^[A-D]\. [A-Z][A-Z0-9 &()/,'\-]+$", "level": 2},
            {"pattern": r"^[A-D]\.\d+ [A-Z][A-Z0-9 &()/,'\-]+$", "level": 3},
        ]
        paragraphs = [
            "A. INTRODUCTION AND PRODUCT FEATURES",
            "A.4 INVESTMENT AMOUNTS",
            "D. CENTRAL DEPOSITORY (CDP) SECURITIES ACCOUNT",
            "A sentence about bonds.",
        ]

        result = pdf_to_md.promote_section_headings(paragraphs, rules)

        self.assertEqual(result[0], "## A. INTRODUCTION AND PRODUCT FEATURES")
        self.assertEqual(result[1], "### A.4 INVESTMENT AMOUNTS")
        self.assertEqual(result[2], "## D. CENTRAL DEPOSITORY (CDP) SECURITIES ACCOUNT")
        self.assertEqual(result[3], "A sentence about bonds.")

    def test_cpfis_dividers_promote_and_table_rows_dedupe(self):
        structure = registry_by_cache_path()["cpf/cpfis-investment-products.md"]["structure"]
        markdown = "\n\n".join([
            "# Source: cpfis-investment-products.pdf",
            "Unit Trusts",
            "Up to 35% of investible savings (PDF, 0.1MB) can be invested in:",
            "| Property Funds | ok |",
            "| Property Funds | ok |",
            "Up to 10% of investible savings (PDF, 0.1MB) can be invested in:",
        ])

        result = pdf_to_md.recover_structure(markdown, structure)

        self.assertIn("## Up to 35% of investible savings", result)
        self.assertIn("## Up to 10% of investible savings", result)
        self.assertEqual(result.count("| Property Funds | ok |"), 1)
        self.assertTrue(result.startswith("# Source: cpfis-investment-products.pdf\n\n"))

    def test_recover_structure_without_config_is_identity(self):
        markdown = "# Source: x.pdf\n\n1. Not a question here\n\nMONETARY AUTHORITY OF SINGAPORE"

        self.assertEqual(pdf_to_md.recover_structure(markdown, None), markdown)
        self.assertEqual(pdf_to_md.recover_structure(markdown, {}), markdown)

    def test_inline_noise_is_stripped_from_paragraphs(self):
        result = pdf_to_md.strip_inline_noise(
            ["see which suits MONETARY AUTHORITY OF SINGAPORE your needs.", "MONETARY AUTHORITY OF SINGAPORE"],
            ["MONETARY AUTHORITY OF SINGAPORE"],
        )

        self.assertEqual(result, ["see which suits your needs."])

    def test_registry_structure_configs_are_valid(self):
        import re

        structured = [source for source in PDFS if source.get("structure")]
        self.assertEqual(len(structured), 3)
        for source in structured:
            for rule in source["structure"].get("promote_sections", []):
                re.compile(rule["pattern"])
                self.assertIn(rule["level"], (2, 3))
            if source["structure"].get("merge_sibling_sections"):
                self.assertIn("faqs", source["dest"])

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
