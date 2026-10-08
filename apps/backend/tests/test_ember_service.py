import sys
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import ember_service
from services.ember_data_tools import EmberDataResult
from services.ember_masking import UserNames
from services.ember_planner import EmberPlan
from schemas.rag import AdvisorClientSnapshot, ChatMessage


class EmberServiceTests(unittest.TestCase):
    def setUp(self):
        # A consenting account with no stored names, so the existing paths run unchanged.
        patches = [
            patch.object(ember_service, "load_ai_preference", return_value="personalised"),
            patch.object(ember_service, "load_user_names", return_value=UserNames()),
        ]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)

    def _client_snapshot(self) -> AdvisorClientSnapshot:
        return AdvisorClientSnapshot(effectiveDate="2026-10-03", facts={"netWorth": "{{M1}} (range: 50k-100k)"})

    def test_client_masked_request_skips_server_scrubbing_and_unmasking(self):
        question = "Is {{Q1}} enough from {{P1}}?"
        snapshot = self._client_snapshot()
        with patch.object(ember_service, "load_user_names", return_value=UserNames(accounts=("DBS Savings",))) as names, patch.object(
            ember_service, "plan_ember_question", return_value=self._knowledge_plan(False),
        ) as planner, patch.object(ember_service, "answer_financial_advisor_question") as answer:
            ember_service.answer_ember_question("user-a", question, client_masked=True, client_snapshot=snapshot)

        names.assert_not_called()
        self.assertEqual(planner.call_args.args[0], question)
        self.assertEqual(answer.call_args.args[0], question)
        self.assertIsNone(answer.call_args.kwargs["masking"])
        context = answer.call_args.kwargs["personal_context"]
        self.assertEqual(context.facts, snapshot.facts)
        self.assertIn("{{M1}}", context.context())
        self.assertNotIn("[figure unavailable]", context.context())

    def test_client_masked_data_plan_becomes_knowledge_with_the_snapshot(self):
        snapshot = self._client_snapshot()
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 10, 1), end_date=date(2026, 10, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool",
        ) as tool, patch.object(ember_service, "answer_financial_advisor_question") as answer:
            ember_service.answer_ember_question("user-a", "How much did I spend?", client_masked=True, client_snapshot=snapshot)

        tool.assert_not_called()
        answer.assert_called_once()
        self.assertEqual(answer.call_args.kwargs["personal_context"].facts, snapshot.facts)

    def test_client_masked_figure_lookup_still_runs(self):
        planned = EmberPlan(
            mode="data", tool="figure_lookup", start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
            figure_key="cpf_full_retirement_sum", figure_year=2026,
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned):
            response = ember_service.answer_ember_question(
                "user-a", "What is the FRS for 2026?", client_masked=True, client_snapshot=self._client_snapshot(),
            )

        self.assertEqual(response.mode, "data")
        self.assertIn("S$220,400", response.answer)

    def test_client_snapshot_is_ignored_at_guide_level(self):
        with patch.object(ember_service, "load_ai_preference", return_value="guide"), patch.object(
            ember_service, "plan_ember_question", return_value=self._knowledge_plan(False),
        ), patch.object(ember_service, "answer_financial_advisor_question") as answer:
            ember_service.answer_ember_question(
                "user-a", "What is CPF?", client_masked=True, client_snapshot=self._client_snapshot(),
            )

        self.assertIsNone(answer.call_args.kwargs["personal_context"])

    def test_stream_client_masked_passes_snapshot_and_no_masking(self):
        snapshot = self._client_snapshot()
        with patch.object(ember_service, "plan_ember_question", return_value=self._knowledge_plan(False)), patch.object(
            ember_service, "stream_financial_advisor_question", return_value=iter([{"event": "done", "data": {}}]),
        ) as stream:
            events = list(ember_service.stream_ember_question(
                "user-a", "Is {{Q1}} enough?", client_masked=True, client_snapshot=snapshot,
            ))

        self.assertEqual(events[-1]["event"], "done")
        self.assertIsNone(stream.call_args.kwargs["masking"])
        self.assertEqual(stream.call_args.kwargs["personal_context"].facts, snapshot.facts)

    def test_off_preference_returns_fixed_answer_without_planner_or_openai(self):
        with patch.object(ember_service, "load_ai_preference", return_value="off"), patch.object(
            ember_service, "plan_ember_question",
        ) as planner, patch.object(ember_service, "answer_financial_advisor_question") as answer:
            response = ember_service.answer_ember_question("user-a", "How much did I spend?")

        planner.assert_not_called()
        answer.assert_not_called()
        self.assertEqual(response.mode, "unsupported")
        self.assertIn("switched off", response.answer)

    def test_off_preference_stream_ends_with_done_and_no_evidence(self):
        with patch.object(ember_service, "load_ai_preference", return_value="off"), patch.object(
            ember_service, "plan_ember_question",
        ) as planner:
            events = list(ember_service.stream_ember_question("user-a", "How much did I spend?"))

        planner.assert_not_called()
        self.assertEqual(events[-1]["event"], "done")
        self.assertFalse(any(event["event"] == "evidence" for event in events))

    def test_guide_preference_never_personalises_knowledge_plans(self):
        with patch.object(ember_service, "load_ai_preference", return_value="guide"), patch.object(
            ember_service, "plan_ember_question", return_value=self._knowledge_plan(False),
        ), patch.object(ember_service, "build_personal_context") as build, patch.object(
            ember_service, "answer_financial_advisor_question",
        ) as answer:
            ember_service.answer_ember_question("user-a", "What is CPF?")

        build.assert_not_called()
        self.assertIsNone(answer.call_args.kwargs["personal_context"])

    def test_guide_preference_refuses_data_tools_without_running_them(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        with patch.object(ember_service, "load_ai_preference", return_value="guide"), patch.object(
            ember_service, "plan_ember_question", return_value=planned,
        ), patch.object(ember_service, "run_ember_data_tool") as tool:
            response = ember_service.answer_ember_question("user-a", "How much did I spend in August?")

        tool.assert_not_called()
        self.assertEqual(response.mode, "unsupported")
        self.assertIn("Guide", response.answer)

    def test_guide_preference_still_allows_figure_lookup(self):
        planned = EmberPlan(
            mode="data", tool="figure_lookup", start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
            figure_key="cpf_full_retirement_sum", figure_year=2026,
        )
        with patch.object(ember_service, "load_ai_preference", return_value="guide"), patch.object(
            ember_service, "plan_ember_question", return_value=planned,
        ):
            response = ember_service.answer_ember_question("user-a", "What is the FRS for 2026?")

        self.assertEqual(response.mode, "data")
        self.assertIn("S$220,400", response.answer)

    def test_explicit_preference_kwarg_bypasses_lookup(self):
        with patch.object(ember_service, "load_ai_preference", side_effect=RuntimeError("lookup called")) as lookup:
            response = ember_service.answer_ember_question("user-a", "What did I spend?", preference="off")

        lookup.assert_not_called()
        self.assertEqual(response.mode, "unsupported")
        self.assertIn("switched off", response.answer)

    def test_planner_and_model_receive_scrubbed_question_and_history(self):
        question = "Can I afford S$2,000 a month from DBS Savings?"
        history = [ChatMessage(role="user", content="I have S$5,000 in DBS Savings")]
        with patch.object(ember_service, "load_user_names", return_value=UserNames(accounts=("DBS Savings",))), patch.object(
            ember_service, "plan_ember_question", return_value=self._knowledge_plan(False),
        ) as planner, patch.object(ember_service, "build_personal_context", return_value=SimpleNamespace(facts={})), patch.object(
            ember_service, "answer_financial_advisor_question",
        ) as answer:
            ember_service.answer_ember_question("user-a", question, history)

        planner_question, planner_history = planner.call_args.args
        model_question, model_history = answer.call_args.args[:2]
        for text in (planner_question, model_question):
            self.assertIn("{{Q1}}", text)
            self.assertIn("{{P1}}", text)
            self.assertNotIn("2,000", text)
            self.assertNotIn("DBS Savings", text)
        for messages in (planner_history, model_history):
            self.assertIn("{{Q2}}", messages[0].content)
            self.assertIn("{{P1}}", messages[0].content)
            self.assertNotIn("5,000", messages[0].content)
            self.assertNotIn("DBS Savings", messages[0].content)

    def test_clarification_question_is_unmasked(self):
        planned = EmberPlan(
            mode="clarification", tool=None, start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question="Compare {{Q1}} with which month?",
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned):
            response = ember_service.answer_ember_question("user-a", "Compare S$200 with last month")

        self.assertEqual(response.mode, "clarification")
        self.assertIn("S$200", response.answer)

    def test_data_question_executes_one_tool_with_server_user_id(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult(
            tool="expense_summary", label="Expense summary", period="2026-08-01 to 2026-08-31",
            record_count=2, destination="/insights", facts={"total": "35.00"}, exact_answer="You spent S$35.00.",
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ) as tool:
            response = ember_service.answer_ember_question("user-a", "What did I spend in August?")

        tool.assert_called_once_with("user-a", planned)
        self.assertEqual(response.mode, "data")
        self.assertEqual(response.answer, "You spent S$35.00.")
        self.assertEqual(response.data_evidence.record_count, 2)

    def test_simple_data_answer_does_not_make_a_second_model_call(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult("expense_summary", "Expense summary", "August", 1, "/insights", {"total": "10.00"}, "S$10.00")
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ), patch.object(ember_service, "generate_grounded_answer") as generate:
            ember_service.answer_ember_question("user-a", "August total")

        generate.assert_not_called()

    def test_clearly_out_of_scope_question_is_refused_before_the_planner_runs(self):
        with patch.object(ember_service, "plan_ember_question") as planner:
            response = ember_service.answer_ember_question(
                "user-a", "Write Python code for a multiplayer game server."
            )
            events = list(ember_service.stream_ember_question(
                "user-a", "Give me a chicken rice recipe."
            ))

        planner.assert_not_called()
        self.assertEqual(response.mode, "unsupported")
        self.assertIn("only help with", response.answer)
        self.assertEqual(events[-1]["event"], "done")

    def test_knowledge_plan_passes_retrieval_query_through(self):
        planned = EmberPlan(
            mode="knowledge", tool=None, start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=True, clarification_question=None,
            retrieval_query="What are the CPF contribution rates for employees above 60 in 2026?",
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "build_personal_context", return_value=SimpleNamespace(facts={}),
        ), patch.object(ember_service, "answer_financial_advisor_question") as answer:
            ember_service.answer_ember_question("user-a", "And above 60?")

        self.assertEqual(answer.call_args.kwargs["retrieval_query"], planned.retrieval_query)

    def test_figure_lookup_answer_carries_the_figure_citation(self):
        planned = EmberPlan(
            mode="data", tool="figure_lookup", start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
            figure_key="cpf_full_retirement_sum", figure_year=2026,
        )
        with patch.object(ember_service, "plan_ember_question", return_value=planned):
            response = ember_service.answer_ember_question("user-a", "What is the FRS for 2026?")

        self.assertEqual(response.mode, "data")
        self.assertIn("S$220,400", response.answer)
        self.assertEqual(response.source_details[0].path, "manual/cpf/cpf-retirement-sums.md")
        self.assertEqual(response.data_evidence.tool, "figure_lookup")

    def _knowledge_plan(self, personalise: bool) -> EmberPlan:
        return EmberPlan(
            mode="knowledge", tool=None, start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=True, clarification_question=None,
            retrieval_query="Is my emergency fund large enough?", personalise=personalise,
        )

    def test_personalised_knowledge_plan_attaches_the_users_snapshot(self):
        snapshot = SimpleNamespace(facts={"netWorth": "1.00"})
        with patch.object(ember_service, "plan_ember_question", return_value=self._knowledge_plan(True)), patch.object(
            ember_service, "build_personal_context", return_value=snapshot,
        ) as build, patch.object(ember_service, "answer_financial_advisor_question") as answer:
            ember_service.answer_ember_question("user-a", "Is my emergency fund large enough?")

        build.assert_called_once_with("user-a")
        self.assertIs(answer.call_args.kwargs["personal_context"], snapshot)

    def test_snapshot_failure_degrades_to_plain_knowledge(self):
        with patch.object(ember_service, "plan_ember_question", return_value=self._knowledge_plan(True)), patch.object(
            ember_service, "build_personal_context", side_effect=RuntimeError("db down"),
        ), patch.object(ember_service, "answer_financial_advisor_question") as answer:
            ember_service.answer_ember_question("user-a", "Is my emergency fund large enough?")

        self.assertIsNone(answer.call_args.kwargs["personal_context"])

    def test_every_knowledge_answer_is_personalised_by_default(self):
        with patch.object(ember_service, "plan_ember_question", return_value=self._knowledge_plan(False)), patch.object(
            ember_service, "build_personal_context", return_value=SimpleNamespace(facts={}),
        ) as build, patch.object(ember_service, "answer_financial_advisor_question"):
            ember_service.answer_ember_question("user-a", "What are the CPF contribution rates for 2026?")

        build.assert_called_once_with("user-a")

    def test_hybrid_plan_explains_when_curated_context_was_retrieved(self):
        planned = EmberPlan(
            mode="hybrid", tool="financial_summary", start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult("financial_summary", "Financial summary", "2026-08-23", None, "/", {"netWorth": "1.00"}, "Net worth S$1.00.")
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ), patch.object(
            ember_service, "_retrieve_hybrid_context", return_value=("Curated text", []),
        ), patch.object(ember_service, "generate_grounded_answer", return_value="Explained") as generate:
            response = ember_service.answer_ember_question("user-a", "How is my net worth?")

        generate.assert_called_once()
        self.assertIn("Curated educational context", generate.call_args.args[1])
        self.assertEqual(response.answer, "Explained")

    def test_data_plan_keeps_the_exact_answer_when_the_model_declines(self):
        from services.rag_service import INSUFFICIENT_EVIDENCE_SENTINEL

        planned = EmberPlan(
            mode="data", tool="fire_projection", start_date=None, end_date=None,
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=True, clarification_question=None,
        )
        result = EmberDataResult("fire_projection", "FIRE projection", "2026-09-16", None, "/fire", {"fundingStatus": "review_required"}, "Review required: confirm the five FIRE Planner setup steps.")
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ), patch.object(ember_service, "generate_grounded_answer", return_value=INSUFFICIENT_EVIDENCE_SENTINEL):
            response = ember_service.answer_ember_question("user-a", "How long more to FIRE?")

        self.assertEqual(response.answer, result.exact_answer)
        self.assertEqual(response.mode, "data")

    def test_stream_personalised_knowledge_emits_status_then_delegates(self):
        snapshot = SimpleNamespace(facts={})
        with patch.object(ember_service, "plan_ember_question", return_value=self._knowledge_plan(True)), patch.object(
            ember_service, "build_personal_context", return_value=snapshot,
        ), patch.object(
            ember_service, "stream_financial_advisor_question", return_value=iter([{"event": "done", "data": {}}]),
        ) as stream:
            events = list(ember_service.stream_ember_question("user-a", "Is my emergency fund large enough?"))

        self.assertEqual([e["event"] for e in events], ["status", "status", "done"])
        self.assertEqual(events[1]["data"]["message"], "Breaking it down into steps")
        self.assertIs(stream.call_args.kwargs["personal_context"], snapshot)

    def test_stream_includes_aggregate_evidence_without_identity(self):
        planned = EmberPlan(
            mode="data", tool="expense_summary", start_date=date(2026, 8, 1), end_date=date(2026, 8, 31),
            comparison_start_date=None, comparison_end_date=None, category_name=None,
            requires_explanation=False, clarification_question=None,
        )
        result = EmberDataResult("expense_summary", "Expense summary", "August", 1, "/insights", {"total": "10.00"}, "S$10.00")
        with patch.object(ember_service, "plan_ember_question", return_value=planned), patch.object(
            ember_service, "run_ember_data_tool", return_value=result,
        ):
            events = list(ember_service.stream_ember_question("user-a", "August total"))

        evidence = next(event for event in events if event["event"] == "evidence")
        self.assertEqual(evidence["data"]["dataEvidence"]["tool"], "expense_summary")
        self.assertNotIn("user-a", str(events))


if __name__ == "__main__":
    unittest.main()
