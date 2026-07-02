"""
Retrieve FireBuddy RAG chunks for a user question.

This is a retrieval smoke-test layer, not the final answer-generation layer.

Run:
    python apps/backend/rag/Implementation/answer.py "What are CPF contribution rates in 2026?"
"""

import argparse
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from rag.retrieval import retrieve_chunks


def print_matches(matches: list[dict]) -> None:
    """
    Print retrieval results in a human-readable CLI format.

    The output includes similarity, source title, source URL, and a content
    preview so we can judge whether retrieval is returning sensible context.
    """

    if not matches:
        print("No matches found.")
        return

    for index, match in enumerate(matches, start=1):
        print(f"\n--- Match {index} ---")
        print(f"Similarity: {match.get('similarity'):.4f}")
        print(f"Title: {match.get('source_title')}")
        print(f"Headline: {match.get('headline')}")
        # `source_path` is the knowledge-base file that produced the chunk.
        # `source_url` is the official citation URL when ingestion knows it.
        print(f"Source path: {match.get('source_path')}")
        print(f"Source URL: {match.get('source_url')}")
        print("Content preview:")
        print((match.get("content") or "")[:700])


def main() -> None:
    """
    Run the command-line retrieval smoke test.

    This parses the question and match count, retrieves candidate chunks, and
    prints them without generating a final LLM answer.
    """

    parser = argparse.ArgumentParser(
        description="Retrieve FireBuddy RAG chunks for a question"
    )
    parser.add_argument("question", help="Question to retrieve context for")
    parser.add_argument(
        "--match-count",
        type=int,
        default=5,
        help="Number of matching chunks to return",
    )
    args = parser.parse_args()

    matches = retrieve_chunks(args.question, match_count=args.match_count)
    print_matches(matches)


if __name__ == "__main__":
    main()
