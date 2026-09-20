import os
import sys
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import rag_service
from schemas.rag import AdvisorAppContext, ChatMessage


class RagServiceTests(unittest.TestCase):
    def test_answer_model_is_identified_as_ember(self):
        client = MagicMock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="Answer"))]
        )

        with patch.object(rag_service, "OpenAI", return_value=client):
            answer = rag_service.generate_grounded_answer(
                "What is CPF?", "Retrieved CPF context"
            )

        self.assertEqual(answer, "Answer")
        system_prompt = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn(
            "Ember, FireBuddy's educational Singapore finance guide",
            system_prompt,
        )

    def test_answer_prompt_uses_interface_context_without_treating_it_as_financial_data(self):
        app_context = AdvisorAppContext.model_validate({
            "currentPage": "FIRE setup",
            "currentPath": "/fire",
            "recentActions": [{
                "type": "update",
                "label": "Updated FIRE assumptions",
                "occurredAt": "2026-09-03T08:00:00.000Z",
            }],
        })

        messages = rag_service.build_answer_messages(
            "What should I review here?",
            "Retrieved planning guidance",
            [],
            app_context,
        )

        self.assertIn("Current page: FIRE setup", messages[1]["content"])
        self.assertIn("Updated FIRE assumptions", messages[1]["content"])
        self.assertIn("never claim that interface activity is financial evidence", messages[0]["content"])
        self.assertIn("Only a clearly labelled trusted FireBuddy data block", messages[0]["content"])

    def test_contextual_retrieval_uses_page_and_generic_action_hints(self):
        app_context = AdvisorAppContext.model_validate({
            "currentPage": "FIRE setup",
            "currentPath": "/fire",
            "recentActions": [{
                "type": "update",
                "label": "Updated FIRE assumptions",
                "occurredAt": "2026-09-03T08:00:00.000Z",
            }],
        })

        query = rag_service.build_contextual_retrieval_question(
            "What should I review here?",
            app_context,
        )

        self.assertIn("Singapore FIRE assumptions", query)
        self.assertIn("Updated FIRE assumptions", query)

    def test_page_hints_are_not_added_to_questions_that_carry_their_own_topic(self):
        app_context = AdvisorAppContext.model_validate({
            "currentPage": "Wealth",
            "currentPath": "/wealth",
            "recentActions": [],
        })
        question = "How does redeeming a Singapore Savings Bond work?"

        query = rag_service.build_contextual_retrieval_question(question, app_context)

        self.assertEqual(query, question)

    def test_planner_retrieval_query_drives_retrieval_but_not_the_answer(self):
        matches = [{
            "source_title": "CPF Guide", "source_url": None, "source_path": "cpf.md",
            "headline": "CPF", "content": "Relevant context", "similarity": 0.9,
        }]
        with patch.object(rag_service, "retrieve_chunks", return_value=matches) as retrieve:
            with patch.object(rag_service, "generate_grounded_answer", return_value="Answer") as chat:
                rag_service.answer_financial_advisor_question(
                    "And for someone over 60?",
                    retrieval_query="What are the CPF contribution rates for employees above 60?",
                )

        retrieve.assert_called_once_with(
            "What are the CPF contribution rates for employees above 60?"
        )
        self.assertEqual(chat.call_args.args[0], "And for someone over 60?")

    def test_confidence_gate_accepts_keyword_backed_match_at_lower_cosine(self):
        with patch.dict(os.environ, {"RAG_MIN_SIMILARITY": "0.45", "RAG_MIN_SIMILARITY_WITH_KEYWORD": "0.35"}):
            self.assertTrue(rag_service.retrieval_is_confident([
                {"similarity": 0.38, "signal_count": 2},
                {"similarity": 0.30, "signal_count": 1},
            ]))
            self.assertFalse(rag_service.retrieval_is_confident([
                {"similarity": 0.38, "signal_count": 1},
                {"similarity": 0.30, "signal_count": 2},
            ]))
            self.assertTrue(rag_service.retrieval_is_confident([
                {"similarity": 0.31},
                {"similarity": 0.82},
            ]))
            self.assertFalse(rag_service.retrieval_is_confident([]))

    def test_model_insufficient_evidence_sentinel_becomes_a_refusal_without_sources(self):
        matches = [{
            "source_title": "CPF Guide", "source_url": None, "source_path": "cpf.md",
            "headline": "CPF", "content": "Relevant context", "similarity": 0.9,
        }]
        sentinel = f'"{rag_service.INSUFFICIENT_EVIDENCE_SENTINEL}"\n'

        with patch.object(rag_service, "generate_grounded_answer", return_value=sentinel):
            response = rag_service.answer_financial_advisor_question(
                "What is the GST rate?", retrieved_matches=matches,
            )
        self.assertEqual(response.answer, rag_service.LOW_CONFIDENCE_ANSWER)
        self.assertEqual(response.sources, [])
        self.assertEqual(response.source_details, [])

        with patch.object(
            rag_service, "stream_grounded_answer", return_value=iter([sentinel[:20], sentinel[20:]]),
        ):
            events = list(rag_service.stream_financial_advisor_question(
                "What is the GST rate?", retrieved_matches=matches,
            ))
        sources_event = next(event for event in events if event["event"] == "sources")
        self.assertEqual(sources_event["data"]["sources"], [])
        self.assertEqual(events[-1]["event"], "done")

    def test_personalised_context_makes_the_answer_hybrid_with_evidence(self):
        from services.ember_personal_context import EmberPersonalContext

        snapshot = EmberPersonalContext(
            facts={"emergencyRunwayMonths": "5.200000", "averageMonthlyEssentialSpending": "6000.00"},
            effective_date="2026-08-23",
        )
        matches = [{
            "source_title": "MoneySense FAQ", "source_url": None, "source_path": "faq.md",
            "headline": "Emergency funds", "content": "3 to 6 months of expenses.", "similarity": 0.9,
        }]

        with patch.object(rag_service, "generate_grounded_answer", return_value="Tailored answer") as chat:
            response = rag_service.answer_financial_advisor_question(
                "Is my emergency fund large enough?",
                retrieved_matches=matches,
                personal_context=snapshot,
            )

        self.assertEqual(response.mode, "hybrid")
        self.assertEqual(response.data_evidence.tool, "personal_context")
        self.assertTrue(chat.call_args.kwargs["personalised"])
        context = chat.call_args.args[1]
        self.assertTrue(context.rstrip().endswith("}"))
        self.assertIn("3 to 6 months of expenses.", context.split("---")[0])
        self.assertIn("Trusted FireBuddy data", context.split("---")[-1])
        self.assertIn("5.200000", context)

        with patch.object(rag_service, "generate_grounded_answer", return_value="Plain answer"):
            plain = rag_service.answer_financial_advisor_question(
                "Is my emergency fund large enough?", retrieved_matches=matches,
            )
        self.assertEqual(plain.mode, "knowledge")
        self.assertIsNone(plain.data_evidence)

    def test_personalised_refusal_keeps_knowledge_mode_without_evidence(self):
        from services.ember_personal_context import EmberPersonalContext

        snapshot = EmberPersonalContext(facts={}, effective_date="2026-08-23")
        matches = [{"source_path": "x.md", "content": "irrelevant", "similarity": 0.9}]
        with patch.object(
            rag_service, "generate_grounded_answer", return_value=rag_service.INSUFFICIENT_EVIDENCE_SENTINEL,
        ):
            response = rag_service.answer_financial_advisor_question(
                "What is the GST rate?", retrieved_matches=matches, personal_context=snapshot,
            )

        self.assertEqual(response.mode, "knowledge")
        self.assertIsNone(response.data_evidence)

    def test_stream_emits_evidence_before_sources_when_personalised(self):
        from services.ember_personal_context import EmberPersonalContext

        snapshot = EmberPersonalContext(facts={"netWorth": "1.00"}, effective_date="2026-08-23")
        matches = [{"source_title": "Guide", "source_path": "g.md", "content": "Guidance", "similarity": 0.9}]
        with patch.object(rag_service, "stream_grounded_answer", return_value=iter(["Tailored"])) as stream:
            events = list(rag_service.stream_financial_advisor_question(
                "Is my savings rate good?", retrieved_matches=matches, personal_context=snapshot,
            ))

        self.assertEqual(
            [e["event"] for e in events],
            ["status", "status", "delta", "evidence", "sources", "done"],
        )
        self.assertEqual(events[3]["data"]["mode"], "hybrid")
        self.assertEqual(events[3]["data"]["dataEvidence"]["tool"], "personal_context")
        self.assertTrue(stream.call_args.kwargs["personalised"])

    def test_personalised_guidance_only_appears_when_requested(self):
        plain = rag_service.build_answer_messages("Q", "context", [])
        tailored = rag_service.build_answer_messages("Q", "context", [], personalised=True)

        self.assertNotIn("must be tailored to those numbers", plain[0]["content"])
        self.assertIn("must be tailored to those numbers", tailored[0]["content"])
        self.assertIn("largest categories with their amounts", tailored[0]["content"])
        self.assertIn("Never present projections", tailored[0]["content"])

    def test_answer_prompt_instructs_the_sentinel_refusal(self):
        messages = rag_service.build_answer_messages("What is CPF?", "context", [])

        self.assertIn(rag_service.INSUFFICIENT_EVIDENCE_SENTINEL, messages[0]["content"])

    def test_answer_prompt_no_longer_carries_table_defence_rules(self):
        messages = rag_service.build_answer_messages("What is CPF?", "context", [])

        self.assertNotIn("plus sign", messages[0]["content"])
        self.assertNotIn("Ordinary Wages", messages[0]["content"])
        self.assertIn("own row and column", messages[0]["content"])

    def test_build_unique_sources_deduplicates_by_url_then_path(self):
        matches = [
            {
                "source_title": "CPF Guide",
                "source_url": "https://example.test/cpf.pdf",
                "source_path": "markdown-cache/cpf/a.md",
                "headline": "First",
            },
            {
                "source_title": "CPF Guide",
                "source_url": "https://example.test/cpf.pdf",
                "source_path": "markdown-cache/cpf/a.md",
                "headline": "Second",
            },
            {
                "source_title": "Manual Note",
                "source_url": None,
                "source_path": "manual/fire/fire-planning-singapore.md",
                "headline": "Planning",
            },
        ]

        sources = rag_service.build_unique_sources(matches)

        self.assertEqual(len(sources), 2)
        self.assertEqual(sources[0].url, "https://example.test/cpf.pdf")
        self.assertEqual(sources[1].path, "manual/fire/fire-planning-singapore.md")

    def test_low_confidence_refuses_without_calling_chat_model(self):
        matches = [
            {
                "source_title": "Weak Match",
                "source_url": None,
                "source_path": "manual/fire/FIRE.md",
                "headline": "FIRE",
                "content": "Some context",
                "similarity": 0.12,
            }
        ]

        with patch.dict(os.environ, {"RAG_MIN_SIMILARITY": "0.45"}):
            with patch.object(rag_service, "retrieve_chunks", return_value=matches):
                with patch.object(rag_service, "generate_grounded_answer") as chat:
                    response = rag_service.answer_financial_advisor_question(
                        "Can you answer a weakly matched question?"
                    )

        chat.assert_not_called()
        self.assertIn("not have enough reliable context", response.answer)
        self.assertEqual(response.sources, [])
        self.assertEqual(response.source_details, [])

    def test_no_match_is_treated_as_an_unavailable_store(self):
        with patch.object(rag_service, "retrieve_chunks", return_value=[]):
            with patch.object(rag_service, "generate_grounded_answer") as chat:
                with self.assertRaises(rag_service.RagStoreUnavailableError):
                    rag_service.answer_financial_advisor_question(
                        "What is not in the knowledge base?"
                    )

        chat.assert_not_called()

    def test_similarity_gate_uses_the_strongest_fused_match(self):
        matches = [
            {
                "source_title": "Keyword result",
                "source_path": "keyword.md",
                "content": "Keyword context",
                "similarity": 0.31,
            },
            {
                "source_title": "Semantic result",
                "source_path": "semantic.md",
                "content": "Strong semantic context",
                "similarity": 0.82,
            },
        ]

        with patch.object(
            rag_service,
            "generate_grounded_answer",
            return_value="Grounded answer",
        ) as chat:
            response = rag_service.answer_financial_advisor_question(
                "How does CPF work?",
                retrieved_matches=matches,
            )

        chat.assert_called_once()
        self.assertEqual(response.answer, "Grounded answer")

    def test_clearly_out_of_scope_question_refuses_before_retrieval(self):
        with patch.object(rag_service, "retrieve_chunks") as retrieve:
            response = rag_service.answer_financial_advisor_question(
                "Can you give me a chicken rice recipe?"
            )

        retrieve.assert_not_called()
        self.assertIn("only help with", response.answer)
        self.assertEqual(response.sources, [])

    def test_live_market_price_question_refuses_before_retrieval(self):
        with patch.object(rag_service, "retrieve_chunks") as retrieve:
            response = rag_service.answer_financial_advisor_question(
                "What is the Bitcoin price right now?"
            )

        retrieve.assert_not_called()
        self.assertIn("Singapore personal-finance topics", response.answer)

    def test_context_formatting_includes_source_metadata_and_truncates_content(self):
        long_content = "A" * (rag_service.MAX_CONTEXT_CHARS_PER_CHUNK + 20)
        context = rag_service.format_retrieved_context(
            [
                {
                    "source_title": "CPF Retirement Sums",
                    "source_url": "https://example.test/cpf.pdf",
                    "source_path": "markdown-cache/cpf/cpf-retirement-sums.md",
                    "headline": "Retirement sums",
                    "content": long_content,
                }
            ]
        )

        self.assertIn("[Source 1]", context)
        self.assertIn("Title: CPF Retirement Sums", context)
        self.assertIn("Path: markdown-cache/cpf/cpf-retirement-sums.md", context)
        self.assertIn("URL: https://example.test/cpf.pdf", context)
        self.assertIn("Content:", context)
        self.assertTrue(context.endswith("..."))
        self.assertLess(len(context), len(long_content) + 300)

    def test_answer_prompt_states_today_and_how_to_pick_a_year(self):
        messages = rag_service.build_answer_messages(
            "What is the Full Retirement Sum?",
            "[Source 1]\nTitle: CPF\nContent:\nBody",
            [],
            today=date(2026, 9, 16),
        )
        system_prompt = messages[0]["content"]

        self.assertIn("Today is 2026-09-16.", system_prompt)
        self.assertIn("answer with the current year's value", system_prompt)
        # The year instruction must stay conditional. An unconditional
        # "always state the year" made the model stamp the current year
        # onto a CPF LIFE table the source computes as of an earlier one.
        self.assertIn("only when the evidence itself ties it", system_prompt)
        self.assertIn("never restate it as the current year", system_prompt)
        self.assertIn("use the one with the later date", system_prompt)

    def test_answer_prompt_defaults_to_the_singapore_calendar_date(self):
        with patch.object(
            rag_service, "singapore_today", return_value=date(2027, 1, 1)
        ):
            messages = rag_service.build_answer_messages("Q", "[Source 1]\nContent:", [])

        self.assertIn("Today is 2027-01-01.", messages[0]["content"])

    def test_data_only_answers_do_not_receive_source_dating_guidance(self):
        """
        A personal data answer often repeats the backend's own deterministic
        sentence. Year guidance there made the model elaborate and hedge, which
        the personal evaluation scored as ungrounded.
        """

        messages = rag_service.build_answer_messages(
            "What is my suggested next step?",
            "FireBuddy data block\nSavings rate: 51.4%",
            [],
            today=date(2026, 9, 16),
        )

        self.assertNotIn("Today is", messages[0]["content"])
        self.assertNotIn("As of", messages[0]["content"])

    def test_context_formatting_reports_the_source_review_date(self):
        with patch.object(
            rag_service,
            "source_as_of",
            side_effect=lambda path: "2026-09-15" if path == "manual/cpf/sums.md" else None,
        ):
            context = rag_service.format_retrieved_context(
                [
                    {
                        "source_path": "manual/cpf/sums.md",
                        "source_title": "CPF Retirement Sums",
                        "headline": "Sums by year",
                        "content": "Body",
                    },
                    {
                        "source_path": "markdown-cache/iras/tax-relief-individuals.md",
                        "source_title": "IRAS reliefs",
                        "headline": "Reliefs",
                        "content": "Body",
                    },
                ]
            )

        self.assertIn("As of: 2026-09-15", context)
        # An undated source is reported as unknown rather than omitted, so the
        # model can see that it has nothing to compare against.
        self.assertIn("As of: Date unknown", context)

    def test_answer_generation_receives_only_the_latest_six_history_messages(self):
        history = [
            ChatMessage(
                role="user" if index % 2 == 0 else "assistant",
                content=f"message {index + 1}",
            )
            for index in range(8)
        ]
        matches = [
            {
                "source_title": "CPF Guide",
                "source_url": "https://example.test/cpf.pdf",
                "source_path": "markdown-cache/cpf/cpf-guide.md",
                "headline": "CPF",
                "content": "Relevant CPF context",
                "similarity": 0.9,
            }
        ]

        with patch.object(
            rag_service,
            "generate_grounded_answer",
            return_value="Grounded answer",
        ) as generate:
            rag_service.answer_financial_advisor_question(
                "How does CPF work?",
                history,
                retrieved_matches=matches,
            )

        generated_history = generate.call_args.args[2]
        self.assertEqual(len(generated_history), rag_service.MAX_HISTORY_MESSAGES)
        self.assertEqual(generated_history[0].content, "message 3")
        self.assertEqual(generated_history[-1].content, "message 8")
        self.assertEqual(len(history), 8)

    def test_streams_grounded_supported_topics_with_sources_and_done(self):
        matches = [
            {
                "source_title": "Official Singapore finance guide",
                "source_url": "https://example.test/guide",
                "source_path": "markdown-cache/guide.md",
                "headline": "Official guide",
                "content": "Relevant official context",
                "similarity": 0.91,
            }
        ]
        questions = [
            "How does CPF work?",
            "How do Singapore Savings Bonds work?",
            "What does MoneySense suggest for planning?",
            "What IRAS reliefs should I understand?",
            "What are the basics of FIRE planning?",
        ]

        for question in questions:
            with self.subTest(question=question):
                with patch.object(
                    rag_service,
                    "stream_grounded_answer",
                    return_value=iter(["Grounded ", "answer"]),
                ):
                    events = list(
                        rag_service.stream_financial_advisor_question(
                            question,
                            retrieved_matches=matches,
                        )
                    )

                self.assertEqual(
                    [event["event"] for event in events],
                    ["status", "status", "delta", "delta", "sources", "done"],
                )
                self.assertEqual(events[-2]["data"]["sources"][0]["title"], "Official Singapore finance guide")

    def test_streams_no_match_as_unavailable_and_refusal_as_completed(self):
        with patch.object(rag_service, "retrieve_chunks", return_value=[]):
            no_match_events = list(
                rag_service.stream_financial_advisor_question(
                    "Explain an unknown finance scheme"
                )
            )
        refusal_events = list(
            rag_service.stream_financial_advisor_question(
                "Give me a chicken rice recipe"
            )
        )

        self.assertEqual(no_match_events[-1]["event"], "error")
        self.assertEqual(
            no_match_events[-1]["data"]["code"],
            "knowledge_base_unavailable",
        )
        self.assertEqual(no_match_events[-1]["data"]["status"], 503)
        self.assertEqual(refusal_events[-1]["event"], "done")
        self.assertNotIn("error", [event["event"] for event in refusal_events])

    def test_stream_reports_an_empty_model_answer(self):
        matches = [
            {
                "source_title": "CPF Guide",
                "source_url": None,
                "source_path": "cpf.md",
                "headline": "CPF",
                "content": "Relevant context",
                "similarity": 0.9,
            }
        ]
        with patch.object(rag_service, "stream_grounded_answer", return_value=iter([])):
            events = list(
                rag_service.stream_financial_advisor_question(
                    "How does CPF work?",
                    retrieved_matches=matches,
                )
            )

        self.assertEqual(events[-1]["event"], "error")
        self.assertEqual(events[-1]["data"]["code"], "empty_response")

    def test_stream_reports_retrieval_failure_without_exposing_details(self):
        with patch.object(
            rag_service,
            "retrieve_chunks",
            side_effect=RuntimeError("private database detail"),
        ):
            events = list(
                rag_service.stream_financial_advisor_question(
                    "How does CPF work?"
                )
            )

        self.assertEqual(events[-1]["event"], "error")
        self.assertEqual(events[-1]["data"]["code"], "retrieval")
        self.assertNotIn("private database detail", events[-1]["data"]["message"])


if __name__ == "__main__":
    unittest.main()
