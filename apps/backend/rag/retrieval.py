"""
Shared retrieval helpers for the FireBuddy RAG pipeline.

The production advisor service uses this module so embedding, Supabase RPC,
and source metadata handling stay separate from answer generation.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client
from tenacity import retry, stop_after_attempt, wait_exponential

  
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env", override=False)

EMBEDDING_MODEL = "text-embedding-3-small"
HYBRID_RETRIEVAL_RPC = "hybrid_match_rag_chunks"
INTERNAL_CANDIDATE_COUNT = 10
FULL_TEXT_RRF_WEIGHT = 0.6
SEMANTIC_RRF_WEIGHT = 1.0
RRF_SMOOTHING = 50
wait = wait_exponential(multiplier=1, min=10, max=240)
_rag_store_ready = False


class RagStoreUnavailableError(RuntimeError):
    """Signal that the curated RAG store cannot currently serve retrieval."""


def reset_rag_store_readiness_cache() -> None:
    """Clear the positive readiness cache for tests and explicit diagnostics."""

    global _rag_store_ready
    _rag_store_ready = False


def get_required_env(name: str) -> str:
    """
    Read a required environment variable and fail early if it is missing.

    RAG retrieval needs OpenAI and Supabase credentials. Failing here gives a
    clearer error than waiting for an API client to fail later.
    """

    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_supabase_client():
    """
    Create the Supabase client used for shared RAG knowledge-base retrieval.

    This uses backend/service-role credentials because RAG chunks are shared
    app content, not rows owned by a specific logged-in user.
    """

    supabase_url = get_required_env("SUPABASE_URL")
    supabase_key = (
        os.getenv("SUPABASE_SECRET_KEY", "").strip()
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    )

    if not supabase_key:
        raise RuntimeError(
            "Missing required environment variable: "
            "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
        )

    return create_client(supabase_url, supabase_key)


def ensure_rag_store_ready(supabase_client) -> None:
    """
    Confirm that at least one curated chunk exists before generating embeddings.

    A successful check is cached for the process lifetime. Empty results are not
    cached, so an explicit ingestion can recover the running backend immediately.
    """

    global _rag_store_ready
    if _rag_store_ready:
        return

    response = (
        supabase_client.table("rag_chunks")
        .select("id")
        .limit(1)
        .execute()
    )
    if not (response.data or []):
        raise RagStoreUnavailableError(
            "The FireBuddy RAG store is empty. Run knowledge-base ingestion."
        )

    _rag_store_ready = True


@retry(wait=wait, stop=stop_after_attempt(5))
def embed_question(client: OpenAI, question: str) -> list[float]:
    """
    Convert a question into a vector for similarity search.

    This must use the same embedding model as ingestion because the database
    stores `text-embedding-3-small` vectors in a 1,536-dimension pgvector column.
    """

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=question,
    )
    return response.data[0].embedding


def retrieve_chunks(question: str, match_count: int = 5) -> list[dict]:
    """
    Retrieve relevant chunks with vector and keyword reciprocal rank fusion.

    The private RPC ranks ten vector and keyword candidates, deduplicates source
    documents, and returns the best requested chunks with citation metadata.
    """

    supabase_client = get_supabase_client()
    ensure_rag_store_ready(supabase_client)

    openai_client = OpenAI()
    embedding = embed_question(openai_client, question)

    response = supabase_client.rpc(
        HYBRID_RETRIEVAL_RPC,
        {
            "query_text": question,
            "query_embedding": embedding,
            "match_count": match_count,
            "candidate_count": INTERNAL_CANDIDATE_COUNT,
            "full_text_weight": FULL_TEXT_RRF_WEIGHT,
            "semantic_weight": SEMANTIC_RRF_WEIGHT,
            "rrf_k": RRF_SMOOTHING,
        },
    ).execute()

    matches = response.data or []
    if not matches:
        raise RagStoreUnavailableError(
            "Hybrid retrieval returned no rows from a non-empty RAG store."
        )

    return matches
