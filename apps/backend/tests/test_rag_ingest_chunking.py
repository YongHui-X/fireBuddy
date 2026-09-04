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
