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
from services.ember_planner import EmberPlan


class EmberServiceTests(unittest.TestCase):
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

    def test_auto_mode_uses_the_keyword_fallback_only(self):
        with patch.object(ember_service, "PERSONALISE_MODE", "auto"), patch.object(
            ember_service, "plan_ember_question", return_value=self._knowledge_plan(False),
        ), patch.object(
            ember_service, "build_personal_context", return_value=SimpleNamespace(facts={}),
        ) as build, patch.object(ember_service, "answer_financial_advisor_question"):
            ember_service.answer_ember_question("user-a", "Is my emergency fund large enough?")
            build.assert_called_once()
            build.reset_mock()
            ember_service.answer_ember_question("user-a", "What are the CPF contribution rates for 2026?")
            build.assert_not_called()

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
        self.assertEqual(events[1]["data"]["message"], "Reading your FireBuddy data")
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
