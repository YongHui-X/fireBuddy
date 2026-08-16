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
from routers import accounts as accounts_router


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
DEFAULT_ACCOUNT_ID = "25000000-0000-4000-8000-000000000001"
OWN_ACCOUNT_ID = "25000000-0000-4000-8000-000000000002"
OTHER_ACCOUNT_ID = "25000000-0000-4000-8000-000000000003"
EXPENSE_ID = "30000000-0000-4000-8000-000000000001"


def account_row(account_id: str, user_id: str, name: str, is_default: bool) -> dict:
    """Build a complete account row for protected route tests."""

    return {
        "id": account_id,
        "user_id": user_id,
        "name": name,
        "type": "cash" if is_default else "bank",
        "color": "#E5B24A",
        "last_four": None,
        "is_default": is_default,
        "created_at": "2026-08-14T00:00:00+00:00",
        "updated_at": "2026-08-14T00:00:00+00:00",
    }


class AccountRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase(
            {
                "accounts": [
                    account_row(DEFAULT_ACCOUNT_ID, USER_ID, "Cash", True),
                    account_row(OWN_ACCOUNT_ID, USER_ID, "DBS", False),
                    account_row(OTHER_ACCOUNT_ID, OTHER_USER_ID, "Hidden", False),
                ],
                "expenses": [
                    {
                        "id": EXPENSE_ID,
                        "user_id": USER_ID,
                        "account_id": OWN_ACCOUNT_ID,
                    }
                ],
            }
        )
        self.patcher = patch.object(accounts_router, "supabase", self.supabase)
        self.patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()

    def test_lists_only_owned_accounts_and_creates_updates_account(self):
        list_response = self.client.get("/accounts")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(
            {row["id"] for row in list_response.json()},
            {DEFAULT_ACCOUNT_ID, OWN_ACCOUNT_ID},
        )

        create_response = self.client.post(
            "/accounts",
            json={
                "name": "GrabPay",
                "type": "ewallet",
                "color": "#3C8A61",
                "lastFour": None,
            },
        )
        self.assertEqual(create_response.status_code, 201)
        account_id = create_response.json()["id"]

        update_response = self.client.put(
            f"/accounts/{account_id}",
            json={"name": "GrabPay wallet", "lastFour": "1234"},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["lastFour"], "1234")

        delete_response = self.client.delete(f"/accounts/{account_id}")
        self.assertEqual(delete_response.status_code, 204)

    def test_hides_another_users_account(self):
        response = self.client.put(
            f"/accounts/{OTHER_ACCOUNT_ID}",
            json={"name": "Changed"},
        )

        self.assertEqual(response.status_code, 404)

    def test_rejects_deleting_default_or_referenced_account(self):
        default_response = self.client.delete(f"/accounts/{DEFAULT_ACCOUNT_ID}")
        referenced_response = self.client.delete(f"/accounts/{OWN_ACCOUNT_ID}")

        self.assertEqual(default_response.status_code, 409)
        self.assertEqual(referenced_response.status_code, 409)


if __name__ == "__main__":
    unittest.main()
