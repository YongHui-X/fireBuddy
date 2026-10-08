"""Regression checks for greeting routing and device-only answer generation."""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import ember_service, rag_service
from services.ember_masking import MaskingSession
from services.ember_personal_context import EmberPersonalContext
from services.ember_planner import EmberPlan


class EmberSmallTalkTests(unittest.TestCase):
    def test_greetings_and_acknowledgements_have_the_right_opener(self):
        for question, opener in (
            ('hi', 'Hi there!'), ('How are you', "I'm doing well, thanks for asking!"),
            ('Hello DouDou!', 'Hi there!'), ('thanks!', 'Glad to help!'), ('ok', 'Glad to help!'),
        ):
            with self.subTest(question=question):
                reply = ember_service.small_talk_reply(question)
                self.assertIsNotNone(reply)
                self.assertTrue(reply.startswith(opener), reply)

    def test_real_questions_are_not_small_talk(self):
        for question in ('How are my savings?', 'hi, what is SRS?', 'okay then what is CPF?'):
            with self.subTest(question=question):
                self.assertIsNone(ember_service.small_talk_reply(question))

    def test_hybrid_rules_question_does_not_become_data_only(self):
        plan = EmberPlan(
            mode='hybrid', tool='financial_summary', start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=True, clarification_question=None,
        )
        question = 'Is my emergency fund enough according to MoneySense rules?'
        with patch.object(ember_service, 'plan_ember_question', return_value=plan):
            routed, data_only = ember_service._plan(
                question, question, [], MaskingSession(), allow_personalise=True,
                client_masked=True, has_client_snapshot=True,
            )
        self.assertEqual(routed.mode, 'knowledge')
        self.assertFalse(data_only)


class DeviceDataAnswerTests(unittest.TestCase):
    def test_personal_data_block_strips_bands_only_for_data_only(self):
        block = 'Net worth {{M1}} (range: 50k-100k); runway {{N1}} (range: over 12 months).'
        self.assertEqual(rag_service.personal_data_block(block, False), block)
        self.assertEqual(rag_service.personal_data_block(block, True), 'Net worth {{M1}}; runway {{N1}}.')

    def test_data_only_answer_never_retrieves_and_has_no_sources(self):
        snapshot = EmberPersonalContext(
            facts={'netWorth': '{{M1}} (range: 50k-100k)'}, effective_date='2026-10-04',
        )
        with patch.object(rag_service, 'retrieve_chunks', side_effect=AssertionError('Unexpected retrieval')) as retrieve:
            with patch.object(rag_service, 'generate_grounded_answer', return_value='Your net worth is {{M1}}.') as model:
                answer = rag_service.answer_financial_advisor_question(
                    'What is my net worth?', personal_context=snapshot, skip_retrieval=True,
                )
        retrieve.assert_not_called()
        model.assert_called_once()
        self.assertIn('{{M1}}', model.call_args.args[1])
        self.assertNotIn('range:', model.call_args.args[1])
        self.assertEqual(answer.answer, 'Your net worth is {{M1}}.')
        self.assertEqual(answer.sources, [])
        self.assertEqual(answer.source_details, [])

    def test_data_only_stream_never_retrieves_and_has_no_sources(self):
        snapshot = EmberPersonalContext(
            facts={'netWorth': '{{M1}} (range: 50k-100k)'}, effective_date='2026-10-04',
        )
        with patch.object(rag_service, 'retrieve_chunks', side_effect=AssertionError('Unexpected retrieval')) as retrieve:
            with patch.object(rag_service, 'stream_grounded_answer', return_value=iter(['Your net worth is {{M1}}.'])) as model:
                events = list(rag_service.stream_financial_advisor_question(
                    'What is my net worth?', personal_context=snapshot, skip_retrieval=True,
                ))
        retrieve.assert_not_called()
        model.assert_called_once()
        self.assertNotIn('range:', model.call_args.args[1])
        self.assertEqual(next(event['data']['sources'] for event in events if event['event'] == 'sources'), [])
        self.assertEqual(events[-1]['event'], 'done')


if __name__ == '__main__':
    unittest.main()
