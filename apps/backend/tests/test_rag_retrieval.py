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
    def setUp(self):
        retrieval.reset_rag_store_readiness_cache()

    def test_retrieval_uses_one_embedding_and_private_hybrid_rpc(self):
        supabase_client = MagicMock()
        supabase_client.table.return_value.select.return_value.limit.return_value.execute.return_value = SimpleNamespace(
            data=[{"id": "chunk-id"}]
        )
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

    def test_empty_store_fails_before_embedding_or_rpc(self):
        supabase_client = MagicMock()
        supabase_client.table.return_value.select.return_value.limit.return_value.execute.return_value = SimpleNamespace(
            data=[]
        )

        with patch.object(retrieval, "OpenAI") as openai:
            with patch.object(
                retrieval,
                "get_supabase_client",
                return_value=supabase_client,
            ):
                with self.assertRaises(retrieval.RagStoreUnavailableError):
                    retrieval.retrieve_chunks("What is CPF?")

        openai.assert_not_called()
        supabase_client.rpc.assert_not_called()

    def test_zero_rpc_rows_from_ready_store_is_unavailable(self):
        supabase_client = MagicMock()
        supabase_client.table.return_value.select.return_value.limit.return_value.execute.return_value = SimpleNamespace(
            data=[{"id": "chunk-id"}]
        )
        supabase_client.rpc.return_value.execute.return_value = SimpleNamespace(data=[])

        with patch.object(retrieval, "OpenAI"):
            with patch.object(
                retrieval,
                "get_supabase_client",
                return_value=supabase_client,
            ):
                with patch.object(retrieval, "embed_question", return_value=[0.1]):
                    with self.assertRaises(retrieval.RagStoreUnavailableError):
                        retrieval.retrieve_chunks("What is CPF?")


if __name__ == "__main__":
    unittest.main()
