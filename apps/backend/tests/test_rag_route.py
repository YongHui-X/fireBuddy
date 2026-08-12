import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from lib.auth import AuthenticatedUser, get_current_user
from main import app
from routers import rag as rag_router
from services.rate_limiter import RateLimitDecision


class RagRouteTests(unittest.TestCase):
    def setUp(self):
        rag_router.advisor_rate_limiter.reset()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
            id="test-user"
        )
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        rag_router.advisor_rate_limiter.reset()

    def test_requires_authentication(self):
        app.dependency_overrides.clear()

        response = self.client.post(
            "/api/chat/financial-advisor",
            json={"question": "What is CPF?", "history": []},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Missing bearer token")

    def test_returns_successful_advisor_response(self):
        with patch.object(
            rag_router,
            "answer_financial_advisor_question",
            return_value={
                "answer": "CPF is Singapore's social security savings system.",
                "sources": ["CPF"],
                "source_details": [],
            },
        ):
            response = self.client.post(
                "/api/chat/financial-advisor",
                json={"question": "What is CPF?", "history": []},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("CPF", response.json()["answer"])

    def test_rejects_blank_question(self):
        response = self.client.post(
            "/api/chat/financial-advisor",
            json={"question": "   ", "history": []},
        )

        self.assertEqual(response.status_code, 422)

    def test_rejects_oversized_question(self):
        response = self.client.post(
            "/api/chat/financial-advisor",
            json={"question": "x" * 2001, "history": []},
        )

        self.assertEqual(response.status_code, 422)

    def test_sanitizes_service_failures(self):
        with patch.object(
            rag_router,
            "answer_financial_advisor_question",
            side_effect=RuntimeError("secret upstream detail"),
        ):
            response = self.client.post(
                "/api/chat/financial-advisor",
                json={"question": "What is CPF?", "history": []},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"],
            "Financial advisor is temporarily unavailable.",
        )
        self.assertNotIn("secret upstream detail", response.text)

    def test_returns_rate_limit_with_retry_after(self):
        with patch.object(
            rag_router.advisor_rate_limiter,
            "check",
            return_value=RateLimitDecision(False, 42),
        ):
            response = self.client.post(
                "/api/chat/financial-advisor",
                json={"question": "What is CPF?", "history": []},
            )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["retry-after"], "42")

    def test_local_origin_receives_cors_headers(self):
        response = self.client.options(
            "/api/chat/financial-advisor",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["access-control-allow-origin"],
            "http://localhost:5173",
        )


if __name__ == "__main__":
    unittest.main()
