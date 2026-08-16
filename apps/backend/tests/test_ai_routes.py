import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
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
from routers import ai as ai_router
from services.rate_limiter import RateLimitDecision


USER_ID = "10000000-0000-4000-8000-000000000001"
CATEGORY_ID = "20000000-0000-4000-8000-000000000001"


def model_response(content: str):
    """Create the minimal OpenAI response shape consumed by the route."""

    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


class AiRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase(
            {
                "categories": [
                    {
                        "id": CATEGORY_ID,
                        "user_id": None,
                        "name": "Food & Drink",
                        "is_default": True,
                    }
                ]
            }
        )
        self.supabase_patcher = patch.object(ai_router, "supabase", self.supabase)
        self.supabase_patcher.start()
        self.key_patcher = patch.object(ai_router.settings, "openai_api_key", "test-key")
        self.key_patcher.start()
        ai_router.ai_suggestion_rate_limiter.reset()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        ai_router.ai_suggestion_rate_limiter.reset()
        self.key_patcher.stop()
        self.supabase_patcher.stop()

    def test_returns_valid_available_category_suggestion(self):
        client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **_kwargs: model_response(
                        '{"categoryId":"%s","confidence":"high","reason":"Meal"}'
                        % CATEGORY_ID
                    )
                )
            )
        )
        with patch.object(ai_router, "OpenAI", return_value=client):
            response = self.client.post(
                "/ai/parse-input",
                json={"description": "Chicken rice"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["categoryId"], CATEGORY_ID)
        self.assertEqual(response.json()["categoryName"], "Food & Drink")

    def test_rejects_blank_and_malformed_model_output(self):
        blank_response = self.client.post(
            "/ai/parse-input",
            json={"description": "   "},
        )
        client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **_kwargs: model_response("not-json")
                )
            )
        )
        with patch.object(ai_router, "OpenAI", return_value=client):
            malformed_response = self.client.post(
                "/ai/parse-input",
                json={"description": "Lunch"},
            )

        self.assertEqual(blank_response.status_code, 422)
        self.assertEqual(malformed_response.status_code, 502)
        self.assertNotIn("not-json", malformed_response.text)

    def test_discards_category_outside_available_list(self):
        client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **_kwargs: model_response(
                        '{"categoryId":"20000000-0000-4000-8000-000000000099",'
                        '"confidence":"high","reason":"Unknown"}'
                    )
                )
            )
        )
        with patch.object(ai_router, "OpenAI", return_value=client):
            response = self.client.post(
                "/ai/parse-input",
                json={"description": "Mystery purchase"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["categoryId"])
        self.assertEqual(response.json()["confidence"], "low")

    def test_returns_rate_limit_and_sanitizes_upstream_failure(self):
        with patch.object(
            ai_router.ai_suggestion_rate_limiter,
            "check",
            return_value=RateLimitDecision(False, 30),
        ):
            limited_response = self.client.post(
                "/ai/parse-input",
                json={"description": "Lunch"},
            )

        with patch.object(ai_router, "OpenAI", side_effect=RuntimeError("secret")):
            failure_response = self.client.post(
                "/ai/parse-input",
                json={"description": "Lunch"},
            )

        self.assertEqual(limited_response.status_code, 429)
        self.assertEqual(limited_response.headers["retry-after"], "30")
        self.assertEqual(failure_response.status_code, 502)
        self.assertNotIn("secret", failure_response.text)

    def test_reports_missing_configuration(self):
        with patch.object(ai_router.settings, "openai_api_key", ""):
            response = self.client.post(
                "/ai/parse-input",
                json={"description": "Lunch"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("OPENAI_API_KEY", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
