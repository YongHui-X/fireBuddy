# RAG Implementation Notes

This document records implementation decisions, problems encountered, and
follow-up work for the FireBuddy RAG pipeline. It is separate from the
knowledge-base documents and must not be ingested as financial context.

## Current Scope

The current work focuses on deterministic ingestion:

```text
Markdown documents
-> source metadata
-> heading-based sections
-> paragraph fallback for oversized sections
-> Chunk objects
-> Ingestable_Chunk objects
-> OpenAI embeddings
-> Supabase rag_chunks upsert
```

The live advisor service in `apps/backend/services/rag_service.py` performs
retrieval and generates grounded answers only when context clears the configured
similarity threshold. `Implementation/answer.py` is a thin command-line entry
point over that same production service, not a second RAG implementation.

## Decisions

### Use a custom Markdown loader first

The knowledge base already has controlled Markdown input under
`apps/backend/rag/knowledge-base/`. A small custom loader keeps the first
working ingestion path easy to inspect. LangChain loaders can be reconsidered
if the pipeline later ingests mixed source formats directly.

### Include manual and PDF-cache documents

The knowledge base contains two useful source types:

- `manual/`: hand-written retrieval context
- `markdown-cache/`: text extracted from official PDFs

The loader records `source_type`, `agency`, and `topic` so retrieval results can
be traced and citations can distinguish official content from manual notes.

### Reuse the PDF registry for citation URLs

Official PDF URLs already live in `fetchAndConvert/check_pdfs.py`. The ingest
loader builds a Markdown-path-to-URL lookup from that registry rather than
duplicating URLs in another file. Manual documents retain `source_url: None`.

### Start with deterministic chunking

Manual notes preserve Markdown headings well. PDF-derived Markdown often does
not. The current strategy:

1. Split on Markdown headings.
2. Keep sections at or below `4,000` characters intact.
3. Split oversized sections into paragraph groups.

The `4,000` character threshold is an initial retrieval-oriented limit, roughly
`800-1,000` English tokens. It should be tuned later using retrieval tests.

### Keep exact finance figures separate

Exact annual values remain in `annual-figures.json` rather than the vector
store. Retrieval is intended for qualitative context; exact numerical facts
need a controlled lookup path.

## Problems Encountered

### Manual documents were initially treated like PDF cache documents

The first loader assumption used a single source shape. Scanning the full
knowledge base found manual FIRE and investing notes as well as cached PDFs.

Resolution: derive metadata from the relative path and label documents as
`manual`, `pdf_cache`, or `unknown`.

### Heading splitting was insufficient for PDF-derived Markdown

Manual notes split into focused sections, but many PDF cache files only contain
one generated `# Source:` heading. Some resulting sections exceeded `40,000`
characters.

Resolution: retain heading splitting and add paragraph grouping only for
oversized sections.

### Chunk sizes exceeded the configured limit slightly

The first paragraph fallback counted paragraph characters but did not count the
two newline characters inserted between paragraphs.

Resolution: include separator length when calculating the candidate chunk
size. The measured corpus now stays at or below `4,000` characters per chunk.

### Empty summaries produced extra blank lines

The deterministic baseline intentionally leaves `summary` empty. Concatenating
the empty field added unnecessary whitespace to `page_content`.

Resolution: join only non-empty content fields.

### PDF-derived chunks have generic headlines

PDF cache files usually have one generated Markdown heading such as
`# Source: singapore-savings-bonds-faqs.pdf`. Paragraph fallback chunks inherit
that heading, so multiple chunks from one PDF currently share the same generic
headline.

Resolution: keep the generic heading for the deterministic baseline. Revisit
descriptive chunk headlines only after retrieval testing shows whether they
improve recall enough to justify additional logic or LLM calls.

### Absolute source paths were not portable

The first storage-ready metadata used an absolute Windows path. That path would
be machine-specific if written to Supabase.

Resolution: store paths relative to the RAG knowledge-base directory using
forward slashes.

## Completed Wiring

- Created the `rag_chunks` pgvector table and `match_rag_chunks` RPC.
- Switched active embeddings to `text-embedding-3-small` so the 1,536-dimension
  vectors work with the pgvector `ivfflat` index.
- Added `ingest.py --dry-run` and `ingest.py --limit` for safe smoke tests.
- Successfully ingested the current 94 deterministic chunks into Supabase.
- Added `answer.py` end-to-end command-line testing through the production
  retrieval and answer service.
- Added `apps/backend/rag/evaluation/rag_questions.json` with 30 seed
  retrieval questions across CPF, MAS, MoneySense, IRAS, FIRE, and Singapore
  investing context.
- Added `apps/backend/rag/evaluation/eval_retrieval.py` for top-5 retrieval
  hit-rate checks. It prints misses, retrieved paths, topics, and similarities,
  and exits nonzero when any required source-path case fails.
- Added `RAG_MIN_SIMILARITY`, defaulting to `0.45`, so the advisor refuses weak
  retrieval results before calling the chat model.
- Added privacy-conscious RAG request logs with question hash, question length,
  top source paths, top similarities, source count, outcome, and latency. The
  raw question text is not logged.
- Added stale index cleanup after successful full ingestion. The cleanup compares
  current `(source_path, chunk_index)` keys with existing `rag_chunks` rows and
  deletes obsolete rows by id. Use `--skip-cleanup` to disable it. Cleanup is
  skipped automatically when `--limit` is used.
- Added `ingest.py --verify-store` to compare the complete deterministic local
  chunk key set with Supabase without creating embeddings or writing rows.
- Added a retrieval preflight that detects an empty store before generating a
  paid question embedding. Empty or anomalous stores now return the typed
  retryable `knowledge_base_unavailable` error instead of describing the user
  question as irrelevant.
- Added paragraph overlap for oversized deterministic chunks and unit coverage
  for overlap and maximum chunk size.
- Added persisted retrieval reports with Hit@k, Precision@k, Recall@k, MAP@k,
  nDCG@k, and MRR calculated over unique document paths.
- Added append-only report history. Major retrieval and answer runs create
  immutable Version 1, Version 2, and later JSON and Markdown artifacts, while
  the `*_latest` files remain convenience copies of the newest version.
- Added final-answer evaluation covering required concepts, exact numeric facts,
  citation recall, groundedness, correctness, and out-of-scope refusal behavior.
- Protected the advisor route with Supabase authentication, per-user rate
  limiting, bounded request fields, and sanitized upstream failure responses.
- Added explicit CORS configuration through `CORS_ALLOWED_ORIGINS`.
- Added a Supabase migration that enables RLS and restricts `rag_chunks` and
  `match_rag_chunks` to backend service-role clients.
- Added backend and RAG tests to CI and repaired the scheduled knowledge-base
  refresh paths for the current monorepo.

## Latest Live Results

The latest HNSW and hybrid RRF retrieval results across 30 representative questions are:

- Hit@1: `0.7667`
- Hit@3: `0.9667`
- Hit@5: `1.0000`
- Recall@5: `0.9167`
- MAP@5: `0.7750`
- nDCG@5: `0.8353`
- MRR: `0.8622`

Answer results across six supported questions and six out-of-scope questions:

- Overall pass rate: `1.0000`
- Refusal accuracy: `1.0000`
- Required concept coverage: `1.0000`
- Exact numeric accuracy: `1.0000`
- Citation recall: `0.9444`
- Judge factual correctness: `1.0000`
- Judge groundedness: `0.9667`

## RAG V1 Checks

Run local unit and syntax checks from the repo root:

```powershell
python -m unittest discover apps/backend/tests
python -m py_compile apps/backend/services/rag_service.py apps/backend/rag/retrieval.py apps/backend/rag/Implementation/ingest.py apps/backend/rag/Implementation/answer.py apps/backend/rag/evaluation/report_history.py apps/backend/rag/evaluation/eval_retrieval.py apps/backend/rag/evaluation/eval_answers.py
```

Run the live retrieval eval after configuring `apps/backend/.env` with
`OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` or
`SUPABASE_SERVICE_ROLE_KEY`:

```powershell
python apps/backend/rag/evaluation/eval_retrieval.py
python apps/backend/rag/evaluation/eval_answers.py
python apps/backend/rag/Implementation/answer.py "What is CPF?"
python apps/backend/rag/Implementation/ingest.py --verify-store
```

Add `--run-label "Description"` when recording a named major run. The shared
history index is written to `apps/backend/rag/evaluation/results/README.md`.

## V1 Non-Goals

This hardening pass intentionally does not add hybrid search, reranking, RAGAS,
Langfuse, guardrail frameworks, or vector database migration. Those should be
considered only after the initial retrieval eval results show where V1 fails.

## Follow-Up Work

- Decide whether deterministic empty summaries are sufficient after retrieval
  tests, or whether guarded LLM-generated summaries improve recall.
- Improve first-rank source authority before adding hybrid search or reranking.
- Replace the in-memory rate limiter with shared storage before running multiple
  backend workers or instances.
- Add regression thresholds and alerts around the persisted evaluation reports.
