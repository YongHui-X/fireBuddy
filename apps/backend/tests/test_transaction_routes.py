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
from routers import expenses as expenses_router


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
EXPENSE_CATEGORY_ID = "20000000-0000-4000-8000-000000000001"
INCOME_CATEGORY_ID = "20000000-0000-4000-8000-000000000002"
OTHER_CATEGORY_ID = "20000000-0000-4000-8000-000000000003"
ACCOUNT_ID = "25000000-0000-4000-8000-000000000001"
OTHER_ACCOUNT_ID = "25000000-0000-4000-8000-000000000002"
EXPENSE_ID = "30000000-0000-4000-8000-000000000001"


def transaction_row() -> dict:
    """Build a complete typed transaction row for route tests."""

    return {
        "id": EXPENSE_ID,
        "user_id": USER_ID,
        "category_id": EXPENSE_CATEGORY_ID,
        "account_id": ACCOUNT_ID,
        "description": "Lunch",
        "amount": "8.50",
        "date": "2026-08-13",
        "transaction_type": "expense",
        "created_at": "2026-08-13T00:00:00+00:00",
        "updated_at": "2026-08-13T00:00:00+00:00",
    }


class TransactionRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase(
            {
                "categories": [
                    {"id": EXPENSE_CATEGORY_ID, "user_id": None, "is_default": True, "category_type": "expense"},
                    {"id": INCOME_CATEGORY_ID, "user_id": None, "is_default": True, "category_type": "income"},
                    {"id": OTHER_CATEGORY_ID, "user_id": OTHER_USER_ID, "is_default": False, "category_type": "income"},
                ],
                "accounts": [
                    {"id": ACCOUNT_ID, "user_id": USER_ID},
                    {"id": OTHER_ACCOUNT_ID, "user_id": OTHER_USER_ID},
                ],
                "expenses": [transaction_row()],
            }
        )
        self.patcher = patch.object(transactions_router, "supabase", self.supabase)
        self.patcher.start()
        self.expense_patcher = patch.object(expenses_router, "supabase", self.supabase)
        self.expense_patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()
        self.expense_patcher.stop()

    def test_income_crud_and_filters(self):
        create_response = self.client.post(
            "/transactions",
            json={
                "categoryId": INCOME_CATEGORY_ID,
                "accountId": ACCOUNT_ID,
                "description": "Salary",
                "amount": "5200.00",
                "date": "2026-08-14",
                "transactionType": "income",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["transactionType"], "income")
        transaction_id = create_response.json()["id"]

        list_response = self.client.get("/transactions?transactionType=income&startDate=2026-08-01")
        self.assertEqual([transaction_id], [row["id"] for row in list_response.json()])

        update_response = self.client.put(
            f"/transactions/{transaction_id}",
            json={"amount": "5300.00"},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["amount"], "5300.00")

        self.assertEqual(self.client.delete(f"/transactions/{transaction_id}").status_code, 204)

    def test_rejects_category_type_and_account_ownership_mismatches(self):
        wrong_type = self.client.post(
            "/transactions",
            json={
                "categoryId": EXPENSE_CATEGORY_ID,
                "accountId": ACCOUNT_ID,
                "description": "Salary",
                "amount": "5200.00",
                "date": "2026-08-14",
                "transactionType": "income",
            },
        )
        wrong_account = self.client.post(
            "/transactions",
            json={
                "categoryId": INCOME_CATEGORY_ID,
                "accountId": OTHER_ACCOUNT_ID,
                "description": "Salary",
                "amount": "5200.00",
                "date": "2026-08-14",
                "transactionType": "income",
            },
        )
        self.assertEqual(wrong_type.status_code, 400)
        self.assertEqual(wrong_account.status_code, 400)

    def test_legacy_expenses_api_excludes_income_rows(self):
        self.supabase.rows["expenses"].append(
            {
                **transaction_row(),
                "id": "30000000-0000-4000-8000-000000000002",
                "category_id": INCOME_CATEGORY_ID,
                "description": "Salary",
                "transaction_type": "income",
            }
        )

        response = self.client.get("/expenses")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([EXPENSE_ID], [row["id"] for row in response.json()])


if __name__ == "__main__":
    unittest.main()
