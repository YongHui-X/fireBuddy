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
from services import ai_preference


USER_ID = "10000000-0000-4000-8000-000000000001"
UNKNOWN_USER_ID = "10000000-0000-4000-8000-000000000099"


class ProfileRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase({"profiles": [{
            "id": USER_ID, "email": "user@example.com",
            "ai_preference": "off", "ai_consented_at": None,
        }]})
        self.patcher = patch.object(ai_preference, "supabase", self.supabase)
        self.patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.patcher.stop()

    def test_get_profile_returns_off_and_null_consent(self):
        response = self.client.get("/profile")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["aiPreference"], "off")
        self.assertIsNone(response.json()["aiConsentedAt"])

    def test_put_guide_records_consent_and_off_clears_it(self):
        guide = self.client.put("/profile/ai-preference", json={"aiPreference": "guide"})
        self.assertEqual(guide.status_code, 200, guide.text)
        self.assertEqual(guide.json()["aiPreference"], "guide")
        self.assertIsNotNone(guide.json()["aiConsentedAt"])

        off = self.client.put("/profile/ai-preference", json={"aiPreference": "off"})
        self.assertEqual(off.status_code, 200, off.text)
        self.assertEqual(off.json()["aiPreference"], "off")
        self.assertIsNone(off.json()["aiConsentedAt"])

    def test_put_rejects_unknown_preference(self):
        response = self.client.put("/profile/ai-preference", json={"aiPreference": "bogus"})
        self.assertEqual(response.status_code, 422, response.text)

    def test_get_requires_authentication(self):
        app.dependency_overrides.clear()
        self.assertEqual(self.client.get("/profile").status_code, 401)

    def test_get_unknown_user_returns_not_found(self):
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=UNKNOWN_USER_ID)
        self.assertEqual(self.client.get("/profile").status_code, 404)


if __name__ == "__main__":
    unittest.main()
