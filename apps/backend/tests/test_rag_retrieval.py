import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag import retrieval


class RagRetrievalTests(unittest.TestCase):
    def test_retrieval_uses_one_embedding_and_private_hybrid_rpc(self):
        supabase_client = MagicMock()
        supabase_client.rpc.return_value.execute.return_value = SimpleNamespace(
            data=[{"source_path": "markdown-cache/cpf/example.md"}]
        )

        with patch.object(retrieval, "OpenAI") as openai:
            with patch.object(
                retrieval,
                "get_supabase_client",
                return_value=supabase_client,
            ):
                with patch.object(
                    retrieval,
                    "embed_question",
                    return_value=[0.1, 0.2],
                ) as embed:
                    matches = retrieval.retrieve_chunks("What is CPF?", match_count=5)

        embed.assert_called_once_with(openai.return_value, "What is CPF?")
        supabase_client.rpc.assert_called_once_with(
            retrieval.HYBRID_RETRIEVAL_RPC,
            {
                "query_text": "What is CPF?",
                "query_embedding": [0.1, 0.2],
                "match_count": 5,
                "candidate_count": retrieval.INTERNAL_CANDIDATE_COUNT,
                "full_text_weight": retrieval.FULL_TEXT_RRF_WEIGHT,
                "semantic_weight": retrieval.SEMANTIC_RRF_WEIGHT,
                "rrf_k": retrieval.RRF_SMOOTHING,
            },
        )
        self.assertEqual(matches[0]["source_path"], "markdown-cache/cpf/example.md")


if __name__ == "__main__":
    unittest.main()
