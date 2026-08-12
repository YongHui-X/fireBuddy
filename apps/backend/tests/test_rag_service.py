import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import rag_service


class RagServiceTests(unittest.TestCase):
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

    def test_no_match_returns_no_match_answer(self):
        with patch.object(rag_service, "retrieve_chunks", return_value=[]):
            with patch.object(rag_service, "generate_grounded_answer") as chat:
                response = rag_service.answer_financial_advisor_question(
                    "What is not in the knowledge base?"
                )

        chat.assert_not_called()
        self.assertIn("could not find relevant information", response.answer)
        self.assertEqual(response.sources, [])
        self.assertEqual(response.source_details, [])

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


if __name__ == "__main__":
    unittest.main()
