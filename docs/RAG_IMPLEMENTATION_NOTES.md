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

## Structure recovery and personalised answers (2026-09-16, second pass)

- The PDF registry gained a per-entry `structure` config. `pdf_to_md.py`
  strips repeated page headers before the wrapped-line join, promotes
  lettered sections (`A.`, `A.4`) and numbered FAQ questions to headings using
  a monotonic counter (a stray `1.` inside an answer stays body; a reset to 1
  starts a new titled part only when the registry names the parts), splits a
  question fused with its answer at the first question mark, and drops
  duplicated table rows. Applied to the SSB FAQ (70 questions, 23 sections),
  the MoneySense FAQ (4 parts, 21 questions) and the CPFIS products file. The
  five infographic PDFs stay size-chunked.
- Ingest merges runs of small sibling question sections under the same parent
  into groups of at most 1,200 characters, and keeps the document's own
  heading (the question list) in front of the generated headline so the
  weight-A keyword field still holds the question text. Replacing it with the
  generated headline alone cost one Hit@5 miss and 0.02 nDCG.
- Semantic (embedding-breakpoint) chunking was then measured head-to-head
  through the real RPC (`rag/evaluation/experiments/semantic_chunking_ab.py`):
  structured nDCG@5 0.8943 against semantic 0.8807, recall@5 0.9528 against
  0.9308, substring hit rate 1.0 against 0.9355, hit rates tied. Structured
  chunking stays. The earlier reasoning below still applies: after
  structure recovery the size-fallback path only serves infographic files with
  no sentence structure, and embedding-dependent boundaries would break the
  deterministic chunk cache. Revisit if a long-prose PDF without headings is
  added.
- Ember knowledge answers can now use the user's own data. The planner sets
  `personalise` (with a keyword fallback in `should_personalise`) and the
  service attaches `ember_personal_context.build_personal_context(user_id)`:
  one `build_financial_summary` call reduced to aggregates and the
  deterministic recommended action, at most 1,500 characters, never raw
  records. The answer returns mode `hybrid` with a `personal_context` evidence
  entry; the stream emits the evidence event before sources. A hybrid data plan
  now always explains when curated context was retrieved.
- New `eval_personal.py` suite runs the production planner path over the Jen
  demo account, computes expected facts from the deterministic tools at run
  time, and scores mode, facts, raw-record leakage, missing-data handling, and
  judge groundedness. CI enforces its thresholds through `check_regression.py`.
- 2026-09-17: personalisation became the default for every knowledge answer
  (`EMBER_PERSONALISE_MODE=always`; `auto` restores the planner-or-keyword
  behaviour) after "how can I improve my spending" returned generic advice.
  The snapshot gained a spending block (this month and last month totals and
  top categories) computed from the expense rows the summary already loads,
  and the prompt now requires spending answers to name the user's largest
  categories and compare months. The personal eval gained an
  improve-my-spending case.
- 2026-09-17: answer formatting. The prompt asks for short paragraphs and
  plain "- " bullets with no numbered lists, bold, italics or headings. The
  web renderer moved to `apps/web/src/app/emberRichText.tsx`, which strips
  inline emphasis markers, renders numbered items as plain bullets, keeps
  items separated by blank lines in one list (the old parser started a new
  list at every blank line, which is why numbering restarted at 1), and is
  now shared by the Ember page and the floating assistant.
- 2026-09-17: the web composer no longer locks while a reply streams. Both
  chat surfaces track in-flight requests with a counter so several answers
  can stream into their own messages; a still-streaming reply is excluded
  from the history sent with a follow-up question.

## Latest Live Results

Retrieval version 11 (2026-09-16) across 50 questions, including 3 multi-turn,
3 exact-figure and 5 FAQ-structure cases:

- Hit@1: `0.8200`
- Hit@3: `0.9600`
- Hit@5: `1.0000`
- Recall@5: `0.9400`
- MAP@5: `0.8404`
- nDCG@5: `0.8814`
- MRR: `0.8947`
- Substring hit rate: `1.0000`

Personal-data version 3 (2026-09-16) across 10 questions over the Jen demo
account: overall pass `1.0000`, leak-free `1.0000`, missing-data handling
`1.0000`, judge groundedness `1.0000`.

Answer version 10 (2026-09-16) across 12 supported questions and 11 refusal
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

## Source dating (2026-09-16, third pass)

### Keep document dates out of `rag_chunks`

The store had no date metadata, so nothing could distinguish the IRAS relief
leaflet (YA 2019 wording beside still-current rules) from a fresh source. The
obvious fix was `effective_year`, `last_reviewed` and `years_mentioned`
columns, a migration and a re-ingest.

That is the wrong shape. Currency is a property of a *document*, and after
deduplication the advisor sees at most one chunk per document, so per-chunk
dates buy nothing. With 24 ingested documents a generated lookup file is
cheaper, needs no migration, and cannot drift from the corpus because a test
asserts it covers every ingested document. `ingest.py` writes
`rag/source-metadata.json` from manual `last_reviewed` front matter and the
registry `published` field; `services/source_metadata.py` reads it;
`format_retrieved_context` emits an `As of:` line per source.

Ranking was not touched. Choosing between a stale and a current source is not a
ranking problem: both documents match the question, and the retriever is right
to return both. It is the answer model that needs the dates.

### Scope prompt guidance to the path it was written for

The year guidance was first added to every answer. The personal `next_action`
case then stopped returning the backend's own deterministic sentence and began
hedging, scoring 3/5 on groundedness. Data answers have no dated sources to
reason about, so the guidance is now added only when the evidence context
contains curated `[Source N]` blocks. Prompt additions need the same scoping
discipline as code.

### State a year only when the evidence states one

"Always state the year the value applies to" made the model write "This figure
applies to the year 2026" about a CPF LIFE table the source computes as of 2025
for members turning 65 in 2035. Instructing a model to be specific about dates
will make it invent them when the evidence has none. The wording now requires
the evidence to tie the value to the year, and otherwise asks for the source's
own stated basis.

## Figure coverage and source currency (2026-09-16, fourth pass)

### Check what a source says about itself before trusting it

Two traps in one pass. `InterestRate.pdf` on cpf.gov.sg is the obvious
canonical source for CPF interest rates and would have been a natural registry
entry; extracting it shows its last row is Jul-Sep 2024. And the IRAS relief
PDF already in the registry states "correct as at 18 Feb 2019" in its own
footer, yet had no `published` date, so it was being retrieved as current and
offering an expired tax rebate.

Both were caught by reading the document rather than the URL. The registry now
carries `published` dates, and a document whose stated date is old enough to
mislead is `superseded_by` a hand-authored current table.

### Not every number belongs in annual-figures.json

The Additional Wage ceiling is `$102,000 minus the year's Ordinary Wages
subject to CPF`. Adding it as a figure key crashed the formatter, which was the
right signal: `figure_lookup` returns one value for one year, and the planner
prompt already says to route anything that is not a single figure to the
knowledge path. It lives in a manual document instead.

### A hand-maintained file needs an automated alarm

`annual-figures.json` is the highest-stakes file in the RAG pipeline and
nothing automated ever checked it. `fetch_figures.py` had been writing an
independent extraction to `annual-figures.extracted.json` that nothing read.
`check_figure_drift.py` now compares them in the monthly workflow. It reports
rather than repairs: the extraction is a model reading a PDF and is not
authoritative either.
