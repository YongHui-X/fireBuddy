# Retrieval experiments

One-off experiments that compare an alternative pipeline against the current
one on the live retrieval cases. They are kept so a result can be reproduced
or re-run after the corpus changes. They never modify `public.rag_chunks`.

## Semantic chunking A/B (2026-09-16)

Question: would embedding-breakpoint ("semantic") chunking beat the current
structured chunker (headings recovered from the PDFs, small FAQ question
sections merged, generated headline and summary)?

Method: both variants come from the same documents, get the same generated
headline and summary, use the same embedding model, and are ranked by the
real `hybrid_match_rag_chunks` function. The semantic chunks live in a
temporary side table `rag_chunks_semantic` with a copy of the function that
reads it.

Result on 53 cases:

| Metric | Structured | Semantic |
|---|---:|---:|
| Chunks | 252 | 232 |
| Hit@1 / Hit@3 / Hit@5 | 0.8302 / 0.9623 / 1.0000 | 0.8302 / 0.9623 / 1.0000 |
| Recall@5 | 0.9528 | 0.9308 |
| nDCG@5 | 0.8943 | 0.8807 |
| MRR | 0.9038 | 0.8953 |
| substring_hit_rate | 1.0000 | 0.9355 |

Decision: keep structured chunking. Full discussion in
`docs/RAG_EVALUATION_BASELINE.md`.

Reproduce from the repo root with the local Supabase instance running:

```powershell
Get-Content -Raw apps/backend/rag/evaluation/experiments/semantic_side_table_setup.sql |
  docker exec -i supabase_db_fireBuddy psql -U postgres -d postgres -v ON_ERROR_STOP=1
python apps/backend/rag/evaluation/experiments/semantic_chunking_ab.py
Get-Content -Raw apps/backend/rag/evaluation/experiments/semantic_side_table_teardown.sql |
  docker exec -i supabase_db_fireBuddy psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

The script caches sentence and chunk embeddings and the generated chunk
contexts under `experiments/.cache/` (gitignored), so a second run makes no
model calls unless the corpus changed.

A note on method: an in-process Python replica of the ranker was tried first
and scored the structured variant about 0.06 nDCG below the real function,
because a plain BM25 undervalues the weighted headline field that structured
chunking fills with question text. Only results through the real function
are trustworthy for this comparison.
