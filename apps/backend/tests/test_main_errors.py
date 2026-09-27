import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

import main


class UnexpectedErrorHandlingTests(unittest.TestCase):
    """Unhandled failures must reach the log, not the browser."""

    def test_unexpected_error_returns_fixed_body(self):
        @main.app.get("/__test_boom")
        def boom():
            raise RuntimeError("relation wealth_positions violates constraint secret_name")

        client = TestClient(main.app, raise_server_exceptions=False)
        with self.assertLogs(main.logger, level="ERROR") as logs:
            response = client.get("/__test_boom")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Something went wrong. Please try again."})
        self.assertNotIn("secret_name", response.text)
        self.assertTrue(any("/__test_boom" in line for line in logs.output))


if __name__ == "__main__":
    unittest.main()
