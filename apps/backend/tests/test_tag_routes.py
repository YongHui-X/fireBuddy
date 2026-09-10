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
from routers import tags as tags_router


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
TAG_ID = "40000000-0000-4000-8000-000000000001"
OTHER_TAG_ID = "40000000-0000-4000-8000-000000000002"
TRANSACTION_ID = "30000000-0000-4000-8000-000000000001"


def tag_row(tag_id: str, user_id: str, name: str) -> dict:
    return {
        "id": tag_id, "user_id": user_id, "name": name,
        "created_at": "2026-09-09T00:00:00+00:00",
        "updated_at": "2026-09-09T00:00:00+00:00",
    }


class TagRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase({
            "tags": [tag_row(TAG_ID, USER_ID, "Tax"), tag_row(OTHER_TAG_ID, OTHER_USER_ID, "Hidden")],
            "transaction_tags": [
                {"user_id": USER_ID, "transaction_id": TRANSACTION_ID, "tag_id": TAG_ID},
            ],
        })
        self.patcher = patch.object(tags_router, "supabase", self.supabase)
        self.patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()

    def test_lists_only_owned_tags_with_usage_counts(self):
        response = self.client.get("/tags")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([(TAG_ID, 1)], [(row["id"], row["usageCount"]) for row in response.json()])

    def test_creates_and_renames_normalized_tag(self):
        created = self.client.post("/tags", json={"name": "  Work   travel  "})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["name"], "Work travel")
        renamed = self.client.put(f"/tags/{created.json()['id']}", json={"name": "Claims"})
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["name"], "Claims")

    def test_rejects_case_insensitive_duplicate_and_separator(self):
        self.assertEqual(self.client.post("/tags", json={"name": "tax"}).status_code, 409)
        self.assertEqual(self.client.post("/tags", json={"name": "Tax | Work"}).status_code, 422)

    def test_requires_confirmation_and_detaches_without_deleting_transaction(self):
        self.supabase.rows["expenses"] = [{"id": TRANSACTION_ID, "user_id": USER_ID}]
        self.assertEqual(self.client.delete(f"/tags/{TAG_ID}").status_code, 400)
        self.assertEqual(self.client.delete(f"/tags/{TAG_ID}?confirm=true").status_code, 204)
        self.assertEqual(self.supabase.rows["transaction_tags"], [])
        self.assertEqual(len(self.supabase.rows["expenses"]), 1)

    def test_does_not_disclose_or_change_another_users_tag(self):
        self.assertEqual(self.client.put(f"/tags/{OTHER_TAG_ID}", json={"name": "Changed"}).status_code, 404)
        self.assertEqual(self.client.delete(f"/tags/{OTHER_TAG_ID}?confirm=true").status_code, 404)


if __name__ == "__main__":
    unittest.main()
