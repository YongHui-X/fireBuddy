"""
A/B experiment: semantic (embedding-breakpoint) chunking vs the structured chunker.

Both variants are built from the same knowledge-base documents, receive the
same generated headline and summary step, are embedded with the same model,
and are ranked by the real `hybrid_match_rag_chunks` function. The semantic
chunks are loaded into a temporary side table with a copy of the function so
the production `rag_chunks` rows are never touched.

Result on 2026-09-16 (53 cases): structured nDCG@5 0.8943 vs semantic 0.8807,
recall@5 0.9528 vs 0.9308, substring hit rate 1.0 vs 0.9355, hit rates tied.
Structured chunking was kept. See docs/RAG_EVALUATION_BASELINE.md.

Run from the repo root with the local Supabase instance up:

    docker exec -i supabase_db_fireBuddy psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
        < apps/backend/rag/evaluation/experiments/semantic_side_table_setup.sql
    python apps/backend/rag/evaluation/experiments/semantic_chunking_ab.py
    docker exec -i supabase_db_fireBuddy psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
        < apps/backend/rag/evaluation/experiments/semantic_side_table_teardown.sql

Costs: one embedding per sentence window (a few thousand), one chunk-context
call per semantic chunk (about 230), cached under the experiment cache
directory so a re-run is free.
"""

from __future__ import annotations

import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from openai import OpenAI

BACKEND_DIR = Path(__file__).resolve().parents[3]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from rag import retrieval  # noqa: E402
from rag.Implementation import ingest  # noqa: E402
from rag.evaluation import eval_retrieval as ev  # noqa: E402

CACHE_DIR = Path(__file__).resolve().parent / ".cache"
SEMANTIC_CONTEXT_CACHE = CACHE_DIR / "semantic-chunk-context-cache.json"
EMBED_CACHE = CACHE_DIR / "embedding-cache.json"
EMBED_MODEL = "text-embedding-3-small"
SIDE_TABLE = "rag_chunks_semantic"
SIDE_RPC = "hybrid_match_rag_chunks_semantic"
SENTENCE_SPLIT = re.compile(r"(?<=[.?!])\s+(?=[A-Z0-9•(\"'])")

client = OpenAI()
CACHE_DIR.mkdir(exist_ok=True)
embed_cache: dict[str, list[float]] = (
    json.loads(EMBED_CACHE.read_text(encoding="utf-8")) if EMBED_CACHE.exists() else {}
)


def embed_many(texts: list[str]) -> np.ndarray:
    """Embed texts with a local JSON cache; rows are unit-normalised."""

    missing = [t for t in dict.fromkeys(texts) if t not in embed_cache]
    for start in range(0, len(missing), 256):
        batch = missing[start:start + 256]
        response = client.embeddings.create(model=EMBED_MODEL, input=batch)
        for text, item in zip(batch, response.data):
            embed_cache[text] = item.embedding
    if missing:
        EMBED_CACHE.write_text(json.dumps(embed_cache), encoding="utf-8")
    matrix = np.array([embed_cache[t] for t in texts], dtype=np.float32)
    return matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-9)


def split_sentences(text: str) -> list[str]:
    sentences: list[str] = []
    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if paragraph.startswith("|") or len(paragraph) < 200:
            sentences.append(paragraph)
        else:
            sentences.extend(s.strip() for s in SENTENCE_SPLIT.split(paragraph) if s.strip())
    return sentences


def semantic_sections(
    text: str, *, percentile: float = 90, min_size: int = 300, max_size: int = 1500,
) -> list[str]:
    """
    Standard semantic chunker: buffered sentence embeddings, breakpoints where
    the cosine distance to the next sentence exceeds the document percentile,
    then a size clamp. Headings are treated as ordinary lines.
    """

    plain = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    sentences = split_sentences(plain)
    if len(sentences) <= 2:
        return ["\n\n".join(sentences)] if sentences else []

    buffered = [" ".join(sentences[max(0, i - 1): i + 2]) for i in range(len(sentences))]
    vectors = embed_many(buffered)
    distances = [1.0 - float(vectors[i] @ vectors[i + 1]) for i in range(len(sentences) - 1)]
    threshold = float(np.percentile(distances, percentile))
    breakpoints = {i for i, d in enumerate(distances) if d > threshold}

    groups: list[list[str]] = [[]]
    for i, sentence in enumerate(sentences):
        groups[-1].append(sentence)
        if i in breakpoints:
            groups.append([])
    merged: list[str] = []
    for group in (g for g in groups if g):
        block = "\n\n".join(group)
        if merged and len(merged[-1]) < min_size and len(merged[-1]) + 2 + len(block) <= max_size:
            merged[-1] += "\n\n" + block
        else:
            merged.append(block)
    final: list[str] = []
    for block in merged:
        if len(block) <= max_size:
            final.append(block)
            continue
        current: list[str] = []
        for sentence in block.split("\n\n"):
            if current and len("\n\n".join([*current, sentence])) > max_size:
                final.append("\n\n".join(current))
                current = [sentence]
            else:
                current.append(sentence)
        if current:
            final.append("\n\n".join(current))
    return final


def build_semantic_rows(documents: list[dict]) -> list[dict]:
    """Semantic chunks with the same generated headline and summary as production."""

    cache = (
        json.loads(SEMANTIC_CONTEXT_CACHE.read_text(encoding="utf-8"))
        if SEMANTIC_CONTEXT_CACHE.exists() else {}
    )
    rows = []
    for document in documents:
        for index, block in enumerate(semantic_sections(document["text"])):
            key = ingest.chunk_context_key(document, block)
            entry = cache.get(key)
            if entry is None:
                entry = ingest.generate_chunk_context(client, document, "(semantic chunk)", block).model_dump()
                cache[key] = entry
            rows.append({
                "source_path": document["source"], "source_type": document["type"],
                "source_title": document["title"], "source_url": document.get("source_url"),
                "agency": document.get("agency"), "topic": document["topic"],
                "chunk_index": index, "headline": entry["headline"][:300],
                "content": "\n\n".join(p for p in [entry["headline"], entry["summary"], block] if p),
                "text": block,
            })
    SEMANTIC_CONTEXT_CACHE.write_text(json.dumps(cache, indent=1), encoding="utf-8")
    return rows


def load_side_table(rows: list[dict]) -> int:
    supabase = retrieval.get_supabase_client()
    vectors = embed_many([row["content"] for row in rows])
    payload = [
        {key: value for key, value in row.items() if key != "text"} | {"embedding": [float(x) for x in vector]}
        for row, vector in zip(rows, vectors)
    ]
    for start in range(0, len(payload), 50):
        supabase.table(SIDE_TABLE).upsert(
            payload[start:start + 50], on_conflict="source_path,chunk_index",
        ).execute()
    return supabase.table(SIDE_TABLE).select("id", count="exact").execute().count or 0


def chunk_stats(rows: list[dict]) -> str:
    sizes = [len(r["text"]) for r in rows]
    return f"chunks={len(rows)} mean={int(statistics.mean(sizes))} median={int(statistics.median(sizes))}"


def evaluate(rpc: str, cases, queries):
    retrieval.HYBRID_RETRIEVAL_RPC = rpc
    retrieval.reset_rag_store_readiness_cache()
    results = ev.run_evaluation(cases, retrieval.retrieve_chunks, query_builder=lambda c: queries[c.id])
    return ev.calculate_metrics(results), results


def main() -> int:
    documents = ingest.load_ingestable_documents(ingest.find_md_files(ingest.KNOWLEDGE_BASE_PATH))
    semantic_rows = build_semantic_rows(documents)
    structured_count = sum(
        len(ingest.create_ingestable_chunks(d, context_cache=ingest.load_chunk_context_cache(), openai_client=None))
        for d in documents
    )
    print(f"structured chunks={structured_count}; semantic {chunk_stats(semantic_rows)}")
    print(f"side table rows: {load_side_table(semantic_rows)}")

    cases = ev.load_eval_cases()
    queries = {case.id: ev.planner_query_builder(case) for case in cases}
    outcomes = {
        "structured": evaluate("hybrid_match_rag_chunks", cases, queries),
        "semantic": evaluate(SIDE_RPC, cases, queries),
    }
    retrieval.HYBRID_RETRIEVAL_RPC = "hybrid_match_rag_chunks"

    keys = ["hit_rate@1", "hit_rate@3", "hit_rate@5", "recall@5", "map@5", "ndcg@5", "mrr", "substring_hit_rate"]
    print(f"\n{'metric (real RPC)':22} {'structured':>11} {'semantic':>10}")
    for key in keys:
        print(f"{key:22} {outcomes['structured'][0][key]:11.4f} {outcomes['semantic'][0][key]:10.4f}")

    print("\ncases where the variants differ:")
    structured_by_id = {r.case.id: r for r in outcomes["structured"][1]}
    for result in outcomes["semantic"][1]:
        other = structured_by_id[result.case.id]
        s_sub = all(other.substring_hits) if other.substring_hits else None
        r_sub = all(result.substring_hits) if result.substring_hits else None
        if other.first_relevant_rank != result.first_relevant_rank or s_sub != r_sub:
            print(
                f"  {result.case.id:45} structured={other.first_relevant_rank} sub={s_sub}"
                f"  semantic={result.first_relevant_rank} sub={r_sub}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
