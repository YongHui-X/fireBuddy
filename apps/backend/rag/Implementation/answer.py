"""Run the production FireBuddy RAG answer flow from the command line."""

import argparse
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from schemas.rag import AdvisorResponse
from services.rag_service import answer_financial_advisor_question


def format_cli_response(response: AdvisorResponse) -> str:
    """Format the generated answer and its citations for terminal output."""

    lines = [response.answer]
    if response.sources:
        lines.extend(["", "Sources:"])
        lines.extend(
            f"{index}. {source}"
            for index, source in enumerate(response.sources, start=1)
        )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    """Generate one answer through the same service used by the FastAPI route."""

    parser = argparse.ArgumentParser(
        description="Generate a grounded FireBuddy RAG answer"
    )
    parser.add_argument("question", help="Singapore personal-finance question")
    args = parser.parse_args(argv)

    response = answer_financial_advisor_question(args.question)
    print(format_cli_response(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
