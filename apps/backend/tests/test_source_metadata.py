import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import source_metadata


class SourceMetadataTests(unittest.TestCase):
    def setUp(self):
        source_metadata.load_source_metadata.cache_clear()

    def tearDown(self):
        source_metadata.load_source_metadata.cache_clear()

    def test_committed_file_covers_every_ingested_document(self):
        """
        The generated file must not drift from the knowledge base.

        `ingest.py --write-source-metadata` regenerates it without credentials,
        so a document added without rerunning that command fails here rather
        than silently losing its date in production answers.
        """

        sys.path.insert(0, str(BACKEND_DIR / "rag" / "Implementation"))
        try:
            import ingest
        finally:
            sys.path.pop(0)

        documents = ingest.load_ingestable_documents(
            ingest.find_md_files(ingest.KNOWLEDGE_BASE_PATH)
        )
        expected = {document["source"] for document in documents}

        self.assertEqual(set(source_metadata.load_source_metadata()), expected)

    def test_manual_documents_all_carry_a_review_date(self):
        undated = [
            path
            for path, entry in source_metadata.load_source_metadata().items()
            if path.startswith("manual/") and not entry.get("as_of")
        ]

        self.assertEqual(undated, [])

    def test_unknown_source_returns_no_date(self):
        self.assertIsNone(source_metadata.source_as_of("manual/does/not-exist.md"))
        self.assertIsNone(source_metadata.source_as_of(None))

    def test_missing_file_degrades_to_an_empty_map(self):
        original = source_metadata.SOURCE_METADATA_PATH
        source_metadata.SOURCE_METADATA_PATH = BACKEND_DIR / "rag" / "absent.json"
        try:
            source_metadata.load_source_metadata.cache_clear()
            self.assertEqual(source_metadata.load_source_metadata(), {})
            self.assertIsNone(source_metadata.source_as_of("manual/cpf/sums.md"))
        finally:
            source_metadata.SOURCE_METADATA_PATH = original
            source_metadata.load_source_metadata.cache_clear()


if __name__ == "__main__":
    unittest.main()
