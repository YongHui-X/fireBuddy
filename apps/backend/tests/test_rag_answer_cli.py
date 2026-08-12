import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag.Implementation import answer
from schemas.rag import AdvisorResponse, AdvisorSource


class RagAnswerCliTests(unittest.TestCase):
    def test_format_cli_response_includes_answer_and_numbered_sources(self):
        response = AdvisorResponse(
            answer="CPF is Singapore's social security savings system.",
            sources=["CPF guide - https://example.test/cpf"],
            source_details=[
                AdvisorSource(
                    title="CPF guide",
                    url="https://example.test/cpf",
                )
            ],
        )

        output = answer.format_cli_response(response)

        self.assertIn("CPF is Singapore's", output)
        self.assertIn("Sources:", output)
        self.assertIn("1. CPF guide - https://example.test/cpf", output)

    def test_main_reuses_the_production_answer_service(self):
        response = AdvisorResponse(
            answer="Grounded answer",
            sources=[],
            source_details=[],
        )

        with patch.object(
            answer,
            "answer_financial_advisor_question",
            return_value=response,
        ) as advisor:
            with patch("sys.stdout", new_callable=io.StringIO) as stdout:
                exit_code = answer.main(["What is CPF?"])

        advisor.assert_called_once_with("What is CPF?")
        self.assertEqual(exit_code, 0)
        self.assertEqual(stdout.getvalue().strip(), "Grounded answer")


if __name__ == "__main__":
    unittest.main()
