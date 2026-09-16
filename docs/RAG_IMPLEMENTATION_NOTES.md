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

## September 2026 improvement pass

Implemented on 2026-09-16 following `docs/RAG_EVALUATION_BASELINE.md`:

- Hand-authored CPF tables under `knowledge-base/manual/cpf/` (contribution
  rates, allocation rates, retirement sums 2017 to 2027, CPF LIFE payout
  examples). The matching PDFs stay in the registry with `superseded_by` so a
  change still alerts, but their garbled caches are no longer ingested. The
  table-defence prose was removed from the Ember system prompt.
- `pdf_to_md.py` rejects conversions under 800 bytes or that lose more than
  half the previous cache, drops registry `skip_pages` (the SSB FAQ table of
  contents), and appends Markdown tables for registry entries with
  `extract_tables`.
- Ingestion chunks at 1,500 characters with 300-character overlap and writes a
  cached, generated headline and summary per chunk
  (`knowledge-base/.chunk-context-cache.json`, keyed by chunk text hash).
- Retrieval expands Singapore finance acronyms (`rag/query_terms.py`), asks
  the RPC for 20 candidates per signal, and the RPC now uses the `english`
  text search configuration and returns `fused_score` and `signal_count`.
- The refusal gate accepts a chunk found by both keyword and vector search at
  `RAG_MIN_SIMILARITY_WITH_KEYWORD` (0.35) as well as any chunk at
  `RAG_MIN_SIMILARITY` (0.45).
- The planner writes a standalone `retrieval_query` for knowledge questions
  and can route exact-figure questions to the new `figure_lookup` tool over
  `rag/annual-figures.json`.
- Page hints are appended to retrieval only for questions of six words or
  fewer.
- `pdf_to_md.py` rejoins wrapped PDF lines into real paragraphs (a line with
  no sentence-ending punctuation is merged with the next when that line starts
  in lower case or the previous line is eight words or longer). Before this,
  every printed line was its own paragraph, so chunk boundaries and the
  one-paragraph overlap could cut a sentence such as "at least 3 - 6 months'
  worth ... rule of | thumb" in half.
- The hybrid RPC now returns the best chunk and one stitched sibling whole
  (up to 2,200 characters each) instead of cutting them to 1,150 and 550. The
  intermediate 900-character sibling cap still split a table section when the
  best-ranked chunk of a source was its introduction.
- The hand-authored CPF documents lead with the answer (the age-band rate
  table, the 2026 retirement sums) and carry provenance in a trailing "Source
  and review notes" section, because a provenance paragraph that names the
  document's topics otherwise outranks the section that holds the figures.
- The answer model must reply with a fixed sentinel sentence when the
  evidence does not answer the question. Cosine similarity cannot separate an
  in-scope topic that is absent from the corpus (GST rate, HDB grants) from
  one that is present, so the sentinel is the last line of the refusal path;
  the service converts it to the standard low-confidence refusal with no
  citations, and the evals detect it.
- `ember_service` runs the deterministic out-of-scope screen before the
  planner, so a coding or recipe request can no longer be turned into a
  clarification question by the planner.
- Evaluation: `required_substrings` and `history` per retrieval case,
  `substring_hit_rate`, in-scope-but-absent refusal cases, `--via-planner`
  answer runs, and `check_regression.py` with `baseline_thresholds.json` in CI.

## Latest Live Results

Retrieval version 9 (2026-09-16) across 45 questions, including 3 multi-turn
and 3 exact-figure cases:

- Hit@1: `0.8000`
- Hit@3: `0.9556`
- Hit@5: `1.0000`
- Recall@5: `0.9481`
- MAP@5: `0.8276`
- nDCG@5: `0.8756`
- MRR: `0.8841`
- Substring hit rate: `1.0000`

Answer version 8 (2026-09-16) across 12 supported questions and 11 refusal
questions, routed through the planner:

- Overall pass rate: `1.0000`
- Refusal accuracy: `1.0000`
- Required concept coverage: `1.0000`
- Exact numeric accuracy: `1.0000`
- Citation recall: `0.9722`
- Judge factual correctness: `1.0000`
- Judge groundedness: `1.0000`

Full history and metric definitions: `docs/RAG_EVALUATION_BASELINE.md`.

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

## Non-Goals

Reranking, RAGAS, Langfuse, guardrail frameworks, GraphRAG, and a vector
database migration remain out of scope. A cross-encoder reranker is the one
candidate worth testing next, measured on nDCG@3.

## Follow-Up Work

- The hosted Supabase project ("finance app") received the HNSW and three
  September 2026 RAG migrations plus a full re-ingest on 2026-09-16, and the
  retrieval eval matches the local numbers there. It is still missing the
  eight application migrations from August and September (accounts, income
  transactions, tags, dashboard foundation, retirement plans); decide
  separately whether to `db push` those.
- Label more than one acceptable document for the FIRE source-note cases, or
  merge those notes, to find out whether Hit@1 is a ranking or a labelling
  problem.
- Replace the in-memory rate limiter with shared storage before running multiple
  backend workers or instances.
