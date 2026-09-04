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
        app.dependency_overrides[
            rag_router.get_stream_current_user
        ] = lambda: AuthenticatedUser(id="test-user")
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

    def test_stream_authentication_failure_is_typed_sse(self):
        app.dependency_overrides.clear()

        response = self.client.post(
            "/api/chat/financial-advisor/stream",
            json={"question": "What is CPF?", "history": []},
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("text/event-stream", response.headers["content-type"])
        self.assertIn("event: error", response.text)
        self.assertIn('"code": "authentication"', response.text)

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

    def test_normalizes_history_whitespace_within_20_message_ceiling(self):
        history = [
            {
                "role": "user" if index % 2 == 0 else "assistant",
                "content": "  first\n  message  " if index == 0 else f"message {index}",
            }
            for index in range(20)
        ]

        with patch.object(
            rag_router,
            "answer_financial_advisor_question",
            return_value={"answer": "Answer", "sources": [], "source_details": []},
        ) as advisor:
            response = self.client.post(
                "/api/chat/financial-advisor",
                json={"question": "What is CPF?", "history": history},
            )

        self.assertEqual(response.status_code, 200)
        submitted_history = advisor.call_args.args[1]
        self.assertEqual(len(submitted_history), 20)
        self.assertEqual(submitted_history[0].content, "first message")

    def test_accepts_bounded_interface_context_and_passes_it_to_the_service(self):
        with patch.object(
            rag_router,
            "answer_financial_advisor_question",
            return_value={"answer": "Answer", "sources": [], "source_details": []},
        ) as advisor:
            response = self.client.post(
                "/api/chat/financial-advisor",
                json={
                    "question": "What should I review here?",
                    "history": [],
                    "appContext": {
                        "currentPage": "Transactions",
                        "currentPath": "/transactions",
                        "recentActions": [{
                            "type": "create",
                            "label": "  Added   a transaction  ",
                            "occurredAt": "2026-09-03T08:00:00.000Z",
                        }],
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        submitted_context = advisor.call_args.args[2]
        self.assertEqual(submitted_context.current_page, "Transactions")
        self.assertEqual(submitted_context.recent_actions[0].label, "Added a transaction")

    def test_rejects_more_than_five_interface_actions(self):
        response = self.client.post(
            "/api/chat/financial-advisor",
            json={
                "question": "What should I review?",
                "history": [],
                "appContext": {
                    "currentPage": "Home dashboard",
                    "currentPath": "/",
                    "recentActions": [
                        {
                            "type": "update",
                            "label": f"Action {index}",
                            "occurredAt": "2026-09-03T08:00:00.000Z",
                        }
                        for index in range(6)
                    ],
                },
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_rejects_more_than_20_history_messages(self):
        history = [
            {"role": "user", "content": f"message {index}"}
            for index in range(21)
        ]

        response = self.client.post(
            "/api/chat/financial-advisor",
            json={"question": "What is CPF?", "history": history},
        )

        self.assertEqual(response.status_code, 422)

    def test_rejects_blank_or_oversized_normalized_history_content(self):
        blank_response = self.client.post(
            "/api/chat/financial-advisor",
            json={
                "question": "What is CPF?",
                "history": [{"role": "user", "content": " \n\t "}],
            },
        )
        oversized_response = self.client.post(
            "/api/chat/financial-advisor",
            json={
                "question": "What is CPF?",
                "history": [{"role": "assistant", "content": "x" * 4001}],
            },
        )

        self.assertEqual(blank_response.status_code, 422)
        self.assertEqual(oversized_response.status_code, 422)

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
            "Ember is temporarily unavailable.",
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
        self.assertEqual(
            response.json()["detail"],
            "Ember request limit reached. Try again shortly.",
        )
        self.assertEqual(response.headers["retry-after"], "42")

    def test_streams_events_in_the_service_order(self):
        events = iter(
            [
                {
                    "event": "status",
                    "data": {"status": "searching", "message": "Searching curated sources"},
                },
                {
                    "event": "status",
                    "data": {"status": "preparing", "message": "Preparing a grounded answer"},
                },
                {"event": "delta", "data": {"text": "CPF answer"}},
                {
                    "event": "sources",
                    "data": {"sources": [{"title": "CPF", "url": None, "path": "cpf.md", "headline": None}]},
                },
                {"event": "done", "data": {}},
            ]
        )
        with patch.object(
            rag_router,
            "stream_financial_advisor_question",
            return_value=events,
        ):
            response = self.client.post(
                "/api/chat/financial-advisor/stream",
                json={"question": "What is CPF?", "history": []},
            )

        self.assertEqual(response.status_code, 200)
        names = ["status", "status", "delta", "sources", "done"]
        cursor = -1
        for name in names:
            cursor = response.text.find(f"event: {name}", cursor + 1)
            self.assertGreaterEqual(cursor, 0)

    def test_stream_sanitizes_service_failures_as_error_event(self):
        with patch.object(
            rag_router,
            "stream_financial_advisor_question",
            side_effect=RuntimeError("secret upstream detail"),
        ):
            response = self.client.post(
                "/api/chat/financial-advisor/stream",
                json={"question": "What is CPF?", "history": []},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("event: error", response.text)
        self.assertIn('"code": "unavailable"', response.text)
        self.assertNotIn("secret upstream detail", response.text)

    def test_stream_returns_rate_limit_as_typed_sse(self):
        with patch.object(
            rag_router.advisor_rate_limiter,
            "check",
            return_value=RateLimitDecision(False, 17),
        ):
            response = self.client.post(
                "/api/chat/financial-advisor/stream",
                json={"question": "What is CPF?", "history": []},
            )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["retry-after"], "17")
        self.assertIn('"code": "rate_limit"', response.text)

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
