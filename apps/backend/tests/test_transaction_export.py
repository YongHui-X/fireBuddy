import csv
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
TESTS_DIR = Path(__file__).resolve().parent
for path in (BACKEND_DIR, TESTS_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from fake_supabase import FakeSupabase
from lib.auth import AuthenticatedUser, get_current_user
from main import app
from routers import transactions as transactions_router


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
CATEGORY_ID = "20000000-0000-4000-8000-000000000001"
ACCOUNT_ID = "25000000-0000-4000-8000-000000000001"
TAG_A = "40000000-0000-4000-8000-000000000001"
TAG_B = "40000000-0000-4000-8000-000000000002"


def transaction_row(index: int, transaction_type: str = "expense") -> dict:
    return {
        "id": f"30000000-0000-4000-8000-{index:012d}", "user_id": USER_ID,
        "category_id": CATEGORY_ID if index != 2 else None, "account_id": ACCOUNT_ID,
        "description": "=SUM(1,2)" if index == 1 else f"Record {index}\nline",
        "amount": "8.5" if transaction_type == "expense" else "5200",
        "date": f"2026-09-{index:02d}", "transaction_type": transaction_type,
        "created_at": f"2026-09-{index:02d}T01:00:00+00:00",
        "updated_at": f"2026-09-{index:02d}T02:00:00+00:00",
    }


class TransactionExportTests(unittest.TestCase):
    def setUp(self):
        rows = [transaction_row(2, "income"), transaction_row(1)]
        self.supabase = FakeSupabase({
            "expenses": rows + [{**transaction_row(3), "user_id": OTHER_USER_ID}],
            "categories": [{"id": CATEGORY_ID, "user_id": None, "is_default": True, "name": "Food, dining"}],
            "accounts": [{"id": ACCOUNT_ID, "user_id": USER_ID, "name": "Cash"}],
            "tags": [
                {"id": TAG_A, "user_id": USER_ID, "name": "zeta"},
                {"id": TAG_B, "user_id": USER_ID, "name": "Alpha"},
            ],
            "transaction_tags": [
                {"user_id": USER_ID, "transaction_id": rows[0]["id"], "tag_id": TAG_A},
                {"user_id": USER_ID, "transaction_id": rows[0]["id"], "tag_id": TAG_B},
            ],
        })
        self.patcher = patch.object(transactions_router, "supabase", self.supabase)
        self.patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()

    def parse(self, response):
        self.assertTrue(response.content.startswith(b"\xef\xbb\xbf"))
        return list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"), newline="")))

    def test_exports_portable_shape_order_amounts_and_safe_text(self):
        response = self.client.get("/transactions/export")
        rows = self.parse(response)
        self.assertEqual(rows[0], transactions_router.EXPORT_COLUMNS)
        self.assertEqual([row[1] for row in rows[1:]], ["2026-09-01", "2026-09-02"])
        self.assertEqual(rows[1][3], "'=SUM(1,2)")
        self.assertEqual(rows[1][4], "-8.50")
        self.assertEqual(rows[2][4], "5200.00")
        self.assertEqual(rows[2][5:7], ["Uncategorised", ""])
        self.assertEqual(rows[2][9], "Alpha | zeta")
        self.assertEqual(rows[2][10], f"{TAG_B} | {TAG_A}")
        self.assertIn("attachment; filename=", response.headers["content-disposition"])
        self.assertIn(b"\r\n", response.content)

    def test_supports_every_filter_and_search(self):
        expense = self.parse(self.client.get("/transactions/export?transactionType=expense"))
        date_range = self.parse(self.client.get("/transactions/export?startDate=2026-09-02&endDate=2026-09-02"))
        category = self.parse(self.client.get(f"/transactions/export?categoryId={CATEGORY_ID}"))
        account = self.parse(self.client.get(f"/transactions/export?accountId={ACCOUNT_ID}"))
        tag = self.parse(self.client.get(f"/transactions/export?tagId={TAG_A}"))
        search = self.parse(self.client.get("/transactions/export?search=food"))
        self.assertEqual(len(expense), 2)
        self.assertEqual(len(date_range), 2)
        self.assertEqual(len(category), 2)
        self.assertEqual(len(account), 3)
        self.assertEqual(len(tag), 2)
        self.assertEqual(len(search), 2)

    def test_reads_histories_larger_than_one_database_page(self):
        self.supabase.rows["expenses"] = [
            {**transaction_row((index % 28) + 1), "id": f"30000000-0000-4000-9000-{index:012d}"}
            for index in range(transactions_router.EXPORT_PAGE_SIZE + 7)
        ]
        rows = self.parse(self.client.get("/transactions/export"))
        self.assertEqual(len(rows) - 1, transactions_router.EXPORT_PAGE_SIZE + 7)

    def test_requires_authentication(self):
        app.dependency_overrides.pop(get_current_user, None)
        try:
            self.assertEqual(self.client.get("/transactions/export").status_code, 401)
        finally:
            app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)


if __name__ == "__main__":
    unittest.main()
