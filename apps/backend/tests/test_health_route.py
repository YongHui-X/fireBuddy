import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app


class HealthRouteTests(unittest.TestCase):
    def test_health_is_public_and_minimal(self):
        response = TestClient(app).get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_responses_carry_security_headers(self):
        for path in ("/health", "/no-such-route"):
            with self.subTest(path=path):
                headers = TestClient(app).get(path).headers
                self.assertEqual(headers["x-content-type-options"], "nosniff")
                self.assertEqual(headers["x-frame-options"], "DENY")
                self.assertEqual(headers["cache-control"], "no-store")
                self.assertIn("default-src 'none'", headers["content-security-policy"])


if __name__ == "__main__":
    unittest.main()
