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
from routers import categories as categories_router


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
DEFAULT_CATEGORY_ID = "20000000-0000-4000-8000-000000000001"
OWN_CATEGORY_ID = "20000000-0000-4000-8000-000000000002"
OTHER_CATEGORY_ID = "20000000-0000-4000-8000-000000000003"
INCOME_CATEGORY_ID = "20000000-0000-4000-8000-000000000004"


def category_row(
    category_id: str,
    user_id: str | None,
    name: str,
    is_default: bool,
    category_type: str = "expense",
) -> dict:
    """Build a complete category row with deterministic UUID identifiers."""

    return {
        "id": category_id,
        "user_id": user_id,
        "name": name,
        "icon": "others",
        "color": "#3C8A61",
        "monthly_budget": "100.00",
        "category_type": category_type,
        "is_default": is_default,
        "created_at": "2026-08-13T00:00:00+00:00",
    }


class CategoryRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase(
            {
                "categories": [
                    category_row(DEFAULT_CATEGORY_ID, None, "Others", True),
                    category_row(OWN_CATEGORY_ID, USER_ID, "Coffee", False),
                    category_row(OTHER_CATEGORY_ID, OTHER_USER_ID, "Hidden", False),
                    {**category_row(INCOME_CATEGORY_ID, None, "Salary", True, "income"), "monthly_budget": "0.00"},
                ]
            }
        )
        self.patcher = patch.object(categories_router, "supabase", self.supabase)
        self.patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()

    def test_list_returns_defaults_and_owned_categories_only(self):
        response = self.client.get("/categories")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {row["id"] for row in response.json()},
            {DEFAULT_CATEGORY_ID, OWN_CATEGORY_ID, INCOME_CATEGORY_ID},
        )

    def test_valid_category_crud(self):
        create_response = self.client.post(
            "/categories",
            json={
                "name": "Dining",
                "icon": "food",
                "color": "#67B47C",
                "monthlyBudget": "250.00",
                "categoryType": "expense",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        category_id = create_response.json()["id"]

        update_response = self.client.put(
            f"/categories/{category_id}",
            json={
                "name": "Dining out",
                "icon": "food",
                "color": "#67B47C",
                "monthlyBudget": "300.00",
                "categoryType": "expense",
            },
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["name"], "Dining out")

        delete_response = self.client.delete(f"/categories/{category_id}")
        self.assertEqual(delete_response.status_code, 204)

    def test_rejects_invalid_category_uuid(self):
        response = self.client.delete("/categories/not-a-uuid")

        self.assertEqual(response.status_code, 422)

    def test_rejects_editing_another_users_category(self):
        response = self.client.put(
            f"/categories/{OTHER_CATEGORY_ID}",
            json={
                "name": "Changed",
                "icon": "others",
                "color": "#3C8A61",
                "monthlyBudget": "0.00",
                "categoryType": "expense",
            },
        )

        self.assertEqual(response.status_code, 403)

    def test_filters_and_creates_zero_budget_income_categories(self):
        list_response = self.client.get("/categories?categoryType=income")
        create_response = self.client.post(
            "/categories",
            json={
                "name": "Freelance",
                "icon": "income",
                "color": "#3C8A61",
                "monthlyBudget": "0.00",
                "categoryType": "income",
            },
        )

        self.assertEqual({INCOME_CATEGORY_ID}, {row["id"] for row in list_response.json()})
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["categoryType"], "income")

        invalid_response = self.client.post(
            "/categories",
            json={
                "name": "Commission",
                "icon": "income",
                "color": "#3C8A61",
                "monthlyBudget": "25.00",
                "categoryType": "income",
            },
        )
        self.assertEqual(invalid_response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
