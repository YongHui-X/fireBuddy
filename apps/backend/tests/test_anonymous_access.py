import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from lib.auth import AuthenticatedUser, get_current_user
from main import app


ANONYMOUS_USER = AuthenticatedUser(id="10000000-0000-4000-8000-0000000000aa", is_anonymous=True)


class AnonymousAccessTests(unittest.TestCase):
    """The phone's anonymous DouDou session must stay out of the record routes."""

    def setUp(self):
        app.dependency_overrides[get_current_user] = lambda: ANONYMOUS_USER
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_record_routes_reject_anonymous_sessions(self):
        for path in ("/transactions", "/accounts", "/categories", "/tags", "/wealth/positions", "/fire/profile", "/analytics/summary"):
            with self.subTest(path=path):
                response = self.client.get(path, headers={"Authorization": "Bearer test"})
                # 404 would mean the path guess is wrong; any record route that exists must answer 403.
                if response.status_code != 404:
                    self.assertEqual(response.status_code, 403, path)

    def test_ai_suggestions_reject_anonymous_sessions(self):
        response = self.client.post("/ai/parse-input", json={"text": "coffee 5"}, headers={"Authorization": "Bearer test"})
        self.assertEqual(response.status_code, 403)

    def test_transactions_write_rejects_anonymous_sessions(self):
        response = self.client.post("/transactions", json={}, headers={"Authorization": "Bearer test"})
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
