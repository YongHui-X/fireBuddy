"""Exercise authenticated chat routes with two users in the fake database."""

import json
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

for path in (Path(__file__).resolve().parents[1], Path(__file__).resolve().parent):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from fake_supabase import FakeSupabase
from lib.auth import AuthenticatedUser, get_current_user
from main import app
from routers import rag
from services import ai_preference, ember_data_tools, ember_masking, ember_service
from services.ember_planner import EmberPlan


class EmberRouteIsolationTests(unittest.TestCase):
    def test_json_and_stream_hide_another_users_spending(self):
        """Both routes carry the authenticated identity through to real scoped queries."""
        store = FakeSupabase({
            'profiles': [
                {'id': 'user-a', 'ai_preference': 'personalised'},
                {'id': 'user-b', 'ai_preference': 'personalised'},
            ],
            'categories': [{'id': 'food', 'user_id': None, 'name': 'Food',
                            'category_type': 'expense', 'is_default': True}],
            'accounts': [], 'wealth_positions': [],
            'expenses': [
                {'id': 'mine', 'user_id': 'user-a', 'amount': '10.00', 'date': '2026-08-03',
                 'category_id': 'food', 'transaction_type': 'expense'},
                {'id': 'foreign', 'user_id': 'user-b', 'amount': '9999.00', 'date': '2026-08-03',
                 'category_id': 'food', 'transaction_type': 'expense'},
            ],
        })
        plan = EmberPlan(
            mode='data', tool='expense_summary', start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id='user-a')
        app.dependency_overrides[rag.get_stream_current_user] = lambda: AuthenticatedUser(id='user-a')
        self.addCleanup(app.dependency_overrides.clear)
        rag.advisor_rate_limiter.reset()
        self.addCleanup(rag.advisor_rate_limiter.reset)
        for module in (ai_preference, ember_data_tools, ember_masking):
            patcher = patch.object(module, 'supabase', store)
            patcher.start()
            self.addCleanup(patcher.stop)
        client = TestClient(app)
        with patch.object(ember_service, 'plan_ember_question', return_value=plan):
            for suffix in ('', '/stream'):
                with self.subTest(suffix=suffix):
                    response = client.post('/api/chat/financial-advisor' + suffix,
                                           json={'question': 'How much did I spend in August?', 'history': []})
                    self.assertEqual(response.status_code, 200, response.text)
                    if suffix:
                        chunks = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]
                        answer = ''.join(chunk.get('text', '') for chunk in chunks)
                    else:
                        answer = response.json()['answer']
                    self.assertIn('S$10.00', answer)
                    self.assertNotIn('9999', response.text)
                    self.assertNotIn('9,999', response.text)


if __name__ == '__main__':
    unittest.main()
