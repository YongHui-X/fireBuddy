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
from routers import user_account
from services import ai_preference


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"


class UserAccountRouteTests(unittest.TestCase):
    def setUp(self):
        # Each owned table has a caller row and a foreign row to detect leakage.
        rows = {
            table: [
                {"id": f"{table}-mine", "user_id": USER_ID},
                {"id": f"{table}-other", "user_id": OTHER_USER_ID},
            ]
            for table, _owner, _order in user_account.USER_TABLES
        }
        rows["categories"].append({"id": "category-default", "user_id": None, "is_default": True})
        rows["profiles"] = [
            {"id": USER_ID, "email": "mine@example.com", "ai_preference": "guide", "ai_consented_at": "2026-10-01T00:00:00+00:00"},
            {"id": OTHER_USER_ID, "email": "other@example.com", "ai_preference": "off", "ai_consented_at": None},
        ]
        self.supabase = FakeSupabase(rows)
        self.patchers = [
            patch.object(user_account, "supabase", self.supabase),
            patch.object(ai_preference, "supabase", self.supabase),
        ]
        for patcher in self.patchers:
            patcher.start()
        user_account.account_rate_limiter.reset()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        user_account.account_rate_limiter.reset()
        for patcher in reversed(self.patchers):
            patcher.stop()

    def test_export_contains_only_caller_rows_and_attachment_header(self):
        response = self.client.get("/account/export")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["format"], "firebuddy-export/1")
        self.assertEqual(body["profile"]["id"], USER_ID)
        self.assertEqual(body["profile"]["email"], "mine@example.com")
        self.assertIn("attachment;", response.headers["content-disposition"])
        self.assertEqual(set(body["tables"]), {table for table, _owner, _order in user_account.USER_TABLES})
        for table, _owner, _order in user_account.USER_TABLES:
            with self.subTest(table=table):
                self.assertEqual([row["id"] for row in body["tables"][table]], [f"{table}-mine"])

    def test_delete_removes_all_caller_rows_and_auth_user(self):
        response = self.client.delete("/account")
        self.assertEqual(response.status_code, 204, response.text)
        for table, _owner, _order in user_account.USER_TABLES:
            with self.subTest(table=table):
                remaining = self.supabase.rows[table]
                self.assertFalse(any(row.get("user_id") == USER_ID for row in remaining))
                self.assertTrue(any(row.get("user_id") == OTHER_USER_ID for row in remaining))
        self.assertEqual({row["id"] for row in self.supabase.rows["profiles"]}, {OTHER_USER_ID})
        self.assertEqual(self.supabase.deleted_users, [USER_ID])

    def test_delete_twice_is_idempotent(self):
        self.assertEqual(self.client.delete("/account").status_code, 204)
        self.assertEqual(self.client.delete("/account").status_code, 204)

    def test_auth_delete_failure_returns_503_after_rows_are_removed(self):
        self.supabase.fail_auth_delete = True
        response = self.client.delete("/account")
        self.assertEqual(response.status_code, 503, response.text)
        for table, _owner, _order in user_account.USER_TABLES:
            with self.subTest(table=table):
                self.assertFalse(any(row.get("user_id") == USER_ID for row in self.supabase.rows[table]))
        self.assertEqual({row["id"] for row in self.supabase.rows["profiles"]}, {OTHER_USER_ID})

    def test_export_and_delete_require_authentication(self):
        app.dependency_overrides.clear()
        self.assertEqual(self.client.get("/account/export").status_code, 401)
        self.assertEqual(self.client.delete("/account").status_code, 401)


if __name__ == "__main__":
    unittest.main()
