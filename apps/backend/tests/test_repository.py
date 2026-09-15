import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
TESTS_DIR = Path(__file__).resolve().parent
for path in (BACKEND_DIR, TESTS_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from fake_supabase import FakeSupabase
from lib.repository import fetch_all


class RepositoryTests(unittest.TestCase):
    def test_fetch_all_reads_each_page_in_order(self):
        """Collect all rows when a result spans several Data API pages."""

        supabase = FakeSupabase(
            {"items": [{"id": value} for value in range(5)]},
            max_rows=2,
        )

        rows = fetch_all(
            lambda: supabase.table("items").select("id").order("id"),
            page_size=2,
        )

        self.assertEqual([row["id"] for row in rows], [0, 1, 2, 3, 4])

    def test_fetch_all_rejects_invalid_page_size(self):
        """Fail before querying when pagination cannot make forward progress."""

        with self.assertRaisesRegex(ValueError, "positive integer"):
            fetch_all(lambda: None, page_size=0)


if __name__ == "__main__":
    unittest.main()
