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
from routers import expenses as expenses_router


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
DEFAULT_CATEGORY_ID = "20000000-0000-4000-8000-000000000001"
OWN_CATEGORY_ID = "20000000-0000-4000-8000-000000000002"
OTHER_CATEGORY_ID = "20000000-0000-4000-8000-000000000003"
OWN_ACCOUNT_ID = "25000000-0000-4000-8000-000000000001"
OTHER_ACCOUNT_ID = "25000000-0000-4000-8000-000000000002"
OWN_EXPENSE_ID = "30000000-0000-4000-8000-000000000001"
OTHER_EXPENSE_ID = "30000000-0000-4000-8000-000000000002"


def expense_row(expense_id: str, user_id: str, category_id: str, account_id: str) -> dict:
    """Build a complete expense row with deterministic UUID identifiers."""

    return {
        "id": expense_id,
        "user_id": user_id,
        "category_id": category_id,
        "account_id": account_id,
        "description": "Lunch",
        "amount": "8.50",
        "date": "2026-08-13",
        "transaction_type": "expense",
        "created_at": "2026-08-13T00:00:00+00:00",
        "updated_at": "2026-08-13T00:00:00+00:00",
    }


class ExpenseRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase(
            {
                "categories": [
                    {"id": DEFAULT_CATEGORY_ID, "user_id": None, "name": "Others", "category_type": "expense", "is_default": True},
                    {"id": OWN_CATEGORY_ID, "user_id": USER_ID, "name": "Coffee", "category_type": "expense", "is_default": False},
                    {"id": OTHER_CATEGORY_ID, "user_id": OTHER_USER_ID, "name": "Hidden", "category_type": "expense", "is_default": False},
                ],
                "accounts": [
                    {"id": OWN_ACCOUNT_ID, "user_id": USER_ID},
                    {"id": OTHER_ACCOUNT_ID, "user_id": OTHER_USER_ID},
                ],
                "expenses": [
                    expense_row(OWN_EXPENSE_ID, USER_ID, OWN_CATEGORY_ID, OWN_ACCOUNT_ID),
                    expense_row(OTHER_EXPENSE_ID, OTHER_USER_ID, OTHER_CATEGORY_ID, OTHER_ACCOUNT_ID),
                ],
            }
        )
        self.patcher = patch.object(expenses_router, "supabase", self.supabase)
        self.patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()

    def test_valid_expense_crud(self):
        create_response = self.client.post(
            "/expenses",
            json={
                "categoryId": DEFAULT_CATEGORY_ID,
                "accountId": OWN_ACCOUNT_ID,
                "description": "Dinner",
                "amount": "18.90",
                "date": "2026-08-13",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["accountId"], OWN_ACCOUNT_ID)
        expense_id = create_response.json()["id"]

        update_response = self.client.put(
            f"/expenses/{expense_id}",
            json={"categoryId": OWN_CATEGORY_ID, "description": "Dinner with friends"},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["description"], "Dinner with friends")

        delete_response = self.client.delete(f"/expenses/{expense_id}")
        self.assertEqual(delete_response.status_code, 204)

    def test_rejects_invalid_expense_and_category_uuids(self):
        invalid_path_response = self.client.delete("/expenses/not-a-uuid")
        invalid_category_response = self.client.post(
            "/expenses",
            json={
                "categoryId": "not-a-uuid",
                "accountId": OWN_ACCOUNT_ID,
                "description": "Lunch",
                "amount": "8.50",
                "date": "2026-08-13",
            },
        )

        self.assertEqual(invalid_path_response.status_code, 422)
        self.assertEqual(invalid_category_response.status_code, 422)

    def test_rejects_another_users_category(self):
        response = self.client.post(
            "/expenses",
            json={
                "categoryId": OTHER_CATEGORY_ID,
                "accountId": OWN_ACCOUNT_ID,
                "description": "Lunch",
                "amount": "8.50",
                "date": "2026-08-13",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("default category or your own category", response.json()["detail"])

    def test_rejects_missing_or_another_users_account(self):
        missing_response = self.client.post(
            "/expenses",
            json={
                "categoryId": DEFAULT_CATEGORY_ID,
                "description": "Lunch",
                "amount": "8.50",
                "date": "2026-08-13",
            },
        )
        other_response = self.client.post(
            "/expenses",
            json={
                "categoryId": DEFAULT_CATEGORY_ID,
                "accountId": OTHER_ACCOUNT_ID,
                "description": "Lunch",
                "amount": "8.50",
                "date": "2026-08-13",
            },
        )

        self.assertEqual(missing_response.status_code, 422)
        self.assertEqual(other_response.status_code, 400)
        self.assertIn("one of your accounts", other_response.json()["detail"])

    def test_hides_another_users_expense(self):
        response = self.client.put(
            f"/expenses/{OTHER_EXPENSE_ID}",
            json={"description": "Changed"},
        )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
