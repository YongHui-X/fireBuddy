import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.Implementation import ingest


class RagIngestChunkingTests(unittest.TestCase):
    def test_manual_front_matter_overrides_metadata_and_is_stripped(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_path = knowledge_base / "manual" / "fire" / "calculator.md"
            source_path.parent.mkdir(parents=True)
            source_path.write_text(
                """---
source_title: Example FIRE Calculator
source_url: https://example.test/calculator
agency: Example Publisher
topic: fire_calculators
ingest: true
ignored_field: ignored
---

# Projection method

Annual spending / withdrawal rate.
""",
                encoding="utf-8",
            )

            with patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base):
                document = ingest.md_to_doc_obj(source_path)

            self.assertEqual(document["title"], "Example FIRE Calculator")
            self.assertEqual(document["source_url"], "https://example.test/calculator")
            self.assertEqual(document["agency"], "Example Publisher")
            self.assertEqual(document["topic"], "fire_calculators")
            self.assertTrue(document["ingest"])
            self.assertTrue(document["text"].startswith("# Projection method"))
            self.assertNotIn("source_title:", document["text"])

            chunks = ingest.create_ingestable_chunks(document)
            self.assertEqual(
                chunks[0].metadata["source_url"],
                "https://example.test/calculator",
            )
            self.assertEqual(
                chunks[0].metadata["source_title"],
                "Example FIRE Calculator",
            )

    def test_manual_review_date_is_captured_but_never_embedded(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_path = knowledge_base / "manual" / "cpf" / "sums.md"
            source_path.parent.mkdir(parents=True)
            source_path.write_text(
                """---
source_title: CPF Retirement Sums
agency: CPF Board
topic: cpf-retirement-sums
ingest: true
last_reviewed: 2026-09-15
---

# Sums

In 2026 the FRS is $220,400.
""",
                encoding="utf-8",
            )

            with patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base):
                document = ingest.md_to_doc_obj(source_path)

            self.assertEqual(document["as_of"], "2026-09-15")
            self.assertNotIn("last_reviewed", document["text"])
            # The date steers the answer prompt, not the vector: keeping it out
            # of the chunk text stops it competing for keyword matches.
            chunk = ingest.create_ingestable_chunks(document)[0]
            self.assertNotIn("2026-09-15", chunk.page_content)
            self.assertNotIn("as_of", chunk.metadata)

    def test_pdf_cache_review_date_comes_from_the_registry(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_path = knowledge_base / "markdown-cache" / "mas" / "ssb-faqs.md"
            source_path.parent.mkdir(parents=True)
            source_path.write_text(
                "# Source: ssb-faqs.pdf\n\nContent.\n", encoding="utf-8"
            )

            with patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base):
                with patch.object(
                    ingest,
                    "registry_by_cache_path",
                    return_value={"mas/ssb-faqs.md": {"published": "2022-06-13"}},
                ):
                    document = ingest.md_to_doc_obj(source_path)

            self.assertEqual(document["as_of"], "2022-06-13")

    def test_source_metadata_records_one_entry_per_document(self):
        documents = [
            {
                "source": "manual/cpf/sums.md",
                "title": "CPF Retirement Sums",
                "agency": "CPF Board",
                "type": "manual",
                "as_of": "2026-09-15",
            },
            {
                "source": "markdown-cache/iras/reliefs.md",
                "title": "Reliefs",
                "agency": "iras",
                "type": "pdf_cache",
                "as_of": None,
            },
        ]

        metadata = ingest.build_source_metadata(documents)

        self.assertEqual(
            metadata["sources"]["manual/cpf/sums.md"]["as_of"], "2026-09-15"
        )
        self.assertIsNone(metadata["sources"]["markdown-cache/iras/reliefs.md"]["as_of"])

    def test_manual_document_with_ingest_false_is_skipped(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_dir = knowledge_base / "manual" / "fire"
            source_dir.mkdir(parents=True)
            included_path = source_dir / "included.md"
            skipped_path = source_dir / "registry.md"
            included_path.write_text("# Included\n\nUseful content.\n", encoding="utf-8")
            skipped_path.write_text(
                "---\ningest: false\n---\n\n# Registry\n\nDo not index.\n",
                encoding="utf-8",
            )

            with patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base):
                documents = ingest.load_ingestable_documents(
                    [included_path, skipped_path]
                )

            self.assertEqual(len(documents), 1)
            self.assertEqual(documents[0]["source"], "manual/fire/included.md")

    def test_legacy_manual_document_keeps_existing_defaults(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_path = knowledge_base / "manual" / "fire" / "legacy-note.md"
            source_path.parent.mkdir(parents=True)
            original_text = "# Legacy note\n\nExisting content remains unchanged.\n"
            source_path.write_text(original_text, encoding="utf-8")

            with patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base):
                document = ingest.md_to_doc_obj(source_path)

            self.assertEqual(document["title"], "Legacy Note")
            self.assertEqual(document["topic"], "fire")
            self.assertIsNone(document["agency"])
            self.assertIsNone(document["source_url"])
            self.assertTrue(document["ingest"])
            self.assertEqual(document["text"], original_text)

    def test_pdf_cache_document_keeps_registry_metadata_behavior(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_path = (
                knowledge_base / "markdown-cache" / "cpf" / "official-guide.md"
            )
            source_path.parent.mkdir(parents=True)
            original_text = "# Official guide\n\nConverted PDF content.\n"
            source_path.write_text(original_text, encoding="utf-8")

            with (
                patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base),
                patch.object(
                    ingest,
                    "SOURCE_URL_MAP",
                    {"cpf/official-guide.md": "https://example.test/official.pdf"},
                ),
            ):
                document = ingest.md_to_doc_obj(source_path)

            self.assertEqual(document["type"], "pdf_cache")
            self.assertEqual(document["agency"], "cpf")
            self.assertEqual(document["topic"], "official-guide")
            self.assertEqual(
                document["source_url"],
                "https://example.test/official.pdf",
            )
            self.assertTrue(document["ingest"])
            self.assertEqual(document["text"], original_text)

    def test_pdf_cache_superseded_by_manual_document_is_not_ingested(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            source_path = knowledge_base / "markdown-cache" / "cpf" / "rates.md"
            source_path.parent.mkdir(parents=True)
            source_path.write_text("# Source: rates.pdf\n\nGarbled table.\n", encoding="utf-8")

            with (
                patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base),
                patch.object(
                    ingest,
                    "registry_by_cache_path",
                    return_value={"cpf/rates.md": {"superseded_by": "manual/cpf/rates.md"}},
                ),
            ):
                document = ingest.md_to_doc_obj(source_path)
                documents = ingest.load_ingestable_documents([source_path])

            self.assertFalse(document["ingest"])
            self.assertEqual(document["superseded_by"], "manual/cpf/rates.md")
            self.assertEqual(documents, [])

    def test_split_by_headings_records_level_and_parent(self):
        text = "\n".join([
            "Intro line.",
            "## A. INTRODUCTION",
            "### A.4 AMOUNTS",
            "#### 10. How much can I invest?",
            "Up to $200,000.",
            "#### 11. Separate limits?",
            "No.",
            "## B. APPLYING",
            "#### 20. What do I need?",
            "A CDP account.",
        ])

        sections = ingest.split_by_headings(text)

        self.assertEqual([s["heading"] for s in sections], [
            "Introduction", "10. How much can I invest?", "11. Separate limits?", "20. What do I need?",
        ])
        self.assertEqual(sections[0]["level"], 0)
        self.assertIsNone(sections[0]["parent"])
        self.assertEqual(sections[1]["level"], 4)
        self.assertEqual(sections[1]["parent"], "A.4 AMOUNTS")
        self.assertEqual(sections[3]["parent"], "B. APPLYING")

    def test_sibling_merge_groups_small_questions_under_the_same_parent(self):
        sections = [
            {"heading": f"{i}. Q{i}?", "text": "x" * 300, "level": 3, "parent": "Part 1"}
            for i in range(1, 5)
        ]

        merged = ingest.merge_sibling_sections(sections, max_size=1200)

        self.assertEqual(len(merged), 2)
        self.assertTrue(merged[0]["heading"].startswith("Part 1: 1. Q1? / 2. Q2? / 3. Q3?"))
        self.assertIn("1. Q1?\n\n", merged[0]["text"])
        self.assertIn("3. Q3?\n\n", merged[0]["text"])
        self.assertLessEqual(len(merged[0]["text"]), 1200)
        self.assertEqual(merged[1], sections[3])

    def test_sibling_merge_flushes_at_parent_change_and_leaves_level_two_alone(self):
        sections = [
            {"heading": "A. INTRO", "text": "intro body", "level": 2, "parent": None},
            {"heading": "1. Q1?", "text": "a", "level": 4, "parent": "A. INTRO"},
            {"heading": "2. Q2?", "text": "b", "level": 4, "parent": "A. INTRO"},
            {"heading": "3. Q3?", "text": "c", "level": 4, "parent": "B. NEXT"},
        ]

        merged = ingest.merge_sibling_sections(sections)

        self.assertEqual(merged[0], sections[0])
        self.assertEqual(merged[1]["heading"], "A. INTRO: 1. Q1? / 2. Q2?")
        self.assertEqual(merged[2], sections[3])

    def test_merge_is_off_for_manual_documents_and_on_for_flagged_pdf_cache(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            knowledge_base = Path(temp_dir)
            manual_path = knowledge_base / "manual" / "fire" / "note.md"
            cache_path = knowledge_base / "markdown-cache" / "mas" / "faq.md"
            manual_path.parent.mkdir(parents=True)
            cache_path.parent.mkdir(parents=True)
            manual_path.write_text("# Note\n\nBody.\n", encoding="utf-8")
            cache_path.write_text("# Source: faq.pdf\n\nBody.\n", encoding="utf-8")

            with (
                patch.object(ingest, "KNOWLEDGE_BASE_PATH", knowledge_base),
                patch.object(ingest, "registry_by_cache_path", return_value={}),
                patch.object(
                    ingest,
                    "structure_for_cache_path",
                    return_value={"merge_sibling_sections": True},
                ),
            ):
                manual_document = ingest.md_to_doc_obj(manual_path)
                cache_document = ingest.md_to_doc_obj(cache_path)

        self.assertFalse(manual_document["merge_sibling_sections"])
        self.assertTrue(cache_document["merge_sibling_sections"])

    def test_unmerged_sections_keep_identical_chunk_keys(self):
        text = "## Only\n\nOne section body.\n\n## Other\n\nAnother body.\n"
        document = {"title": "Doc", "text": text}

        plain = ingest.split_document(text)
        merged = ingest.split_document(text, merge_siblings=True)

        self.assertEqual(
            [ingest.chunk_context_key(document, c["text"]) for c in plain],
            [ingest.chunk_context_key(document, c["text"]) for c in merged],
        )

    def test_default_chunk_limits_are_retrieval_sized(self):
        self.assertEqual(ingest.MAX_SECTION_SIZE, 1500)
        self.assertLessEqual(ingest.CHUNK_OVERLAP_MAX_CHARS, 300)

    def test_chunk_context_cache_supplies_headline_and_summary_without_model_calls(self):
        document = {
            "source": "markdown-cache/mas/ssb.md", "type": "pdf_cache", "title": "SSB FAQ",
            "agency": "mas", "topic": "ssb", "source_url": None,
            "text": "# Source: ssb.pdf\n\nYou can redeem in any month.\n",
        }
        key = ingest.chunk_context_key(document, "You can redeem in any month.")
        cache = {key: {"headline": "SSB redemption timing", "summary": "From the MAS SSB FAQ."}}

        chunks = ingest.create_ingestable_chunks(document, context_cache=cache, openai_client=None)

        self.assertEqual(chunks[0].metadata["headline"], "SSB redemption timing")
        self.assertTrue(chunks[0].page_content.startswith("SSB redemption timing\n\nFrom the MAS SSB FAQ."))
        self.assertTrue(chunks[0].page_content.endswith("You can redeem in any month."))

    def test_prune_removes_cache_entries_for_chunks_that_no_longer_exist(self):
        document = {
            "source": "manual/fire/x.md", "type": "manual", "title": "X",
            "agency": None, "topic": "fire", "source_url": None,
            "text": "# Withdrawal rate\n\nUse 3.5 percent.\n",
        }
        live_key = ingest.chunk_context_key(document, "Use 3.5 percent.")
        cache = {live_key: {"headline": "h", "summary": "s"}, "stale": {"headline": "old", "summary": ""}}

        removed = ingest.prune_chunk_context_cache(cache, [document])

        self.assertEqual(removed, 1)
        self.assertEqual(set(cache), {live_key})

    def test_real_headings_are_kept_alongside_generated_headlines(self):
        document = {
            "source": "markdown-cache/mas/ssb.md", "type": "pdf_cache", "title": "SSB FAQ",
            "agency": "mas", "topic": "ssb", "source_url": None,
            "text": "## B.1 GETTING STARTED\n\n### 20. What do I need to buy Savings Bonds?\n\nA CDP account.\n",
        }
        key = ingest.chunk_context_key(document, "A CDP account.")
        cache = {key: {"headline": "Requirements for buying Savings Bonds", "summary": "From the FAQ."}}

        chunks = ingest.create_ingestable_chunks(document, context_cache=cache, openai_client=None)

        self.assertEqual(
            chunks[0].metadata["headline"],
            "20. What do I need to buy Savings Bonds? | Requirements for buying Savings Bonds",
        )
        self.assertEqual(ingest.combine_headlines("Source: x.pdf", "Generated"), "Generated")
        self.assertEqual(ingest.combine_headlines("Definitions", ""), "Definitions")

    def test_missing_cache_entry_falls_back_to_heading_when_no_client(self):
        document = {
            "source": "manual/fire/x.md", "type": "manual", "title": "X",
            "agency": None, "topic": "fire", "source_url": None,
            "text": "# Withdrawal rate\n\nUse 3.5 percent.\n",
        }

        chunks = ingest.create_ingestable_chunks(document, context_cache={}, openai_client=None)

        self.assertEqual(chunks[0].metadata["headline"], "Withdrawal rate")
        self.assertEqual(chunks[0].page_content, "Withdrawal rate\n\nUse 3.5 percent.")

    def test_oversized_section_uses_previous_tail_as_overlap(self):
        section = {
            "heading": "CPF rules",
            "text": "\n\n".join(
                [
                    "first paragraph",
                    "overlap paragraph",
                    "next paragraph",
                ]
            ),
        }

        chunks = ingest.split_large_section(section, max_size=35)

        self.assertGreater(len(chunks), 1)
        self.assertEqual(chunks[0]["text"], "first paragraph\n\noverlap paragraph")
        self.assertTrue(chunks[1]["text"].startswith("overlap paragraph\n\nnext paragraph"))

    def test_overlap_skips_previous_tail_when_it_is_too_large(self):
        large_tail = "T" * (ingest.CHUNK_OVERLAP_MAX_CHARS + 1)
        section = {
            "heading": "CPF rules",
            "text": "\n\n".join(
                [
                    "first paragraph",
                    large_tail,
                    "next paragraph",
                ]
            ),
        }

        chunks = ingest.split_large_section(section, max_size=len(large_tail) + 20)

        self.assertGreater(len(chunks), 1)
        self.assertFalse(chunks[1]["text"].startswith(large_tail))
        self.assertEqual(chunks[1]["text"], "next paragraph")

    def test_chunks_stay_under_max_size_when_overlap_fits(self):
        section = {
            "heading": "CPF rules",
            "text": "\n\n".join(
                [
                    "A" * 20,
                    "B" * 20,
                    "C" * 20,
                    "D" * 20,
                ]
            ),
        }

        chunks = ingest.split_large_section(section, max_size=50)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk["text"]) <= 50 for chunk in chunks))

    def test_store_comparison_reports_missing_stale_and_invalid_rows(self):
        result = ingest.compare_chunk_store(
            [
                {"source_path": "kept.md", "chunk_index": 0},
                {"source_path": "stale.md", "chunk_index": 0},
                {"source_path": None, "chunk_index": 1},
            ],
            {("kept.md", 0), ("missing.md", 0)},
        )

        self.assertEqual(result["expected_count"], 2)
        self.assertEqual(result["stored_count"], 3)
        self.assertEqual(result["missing_keys"], {("missing.md", 0)})
        self.assertEqual(result["stale_keys"], {("stale.md", 0)})
        self.assertEqual(result["invalid_row_count"], 1)


if __name__ == "__main__":
    unittest.main()
