import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.Implementation import ingest


class RagIngestChunkingTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
