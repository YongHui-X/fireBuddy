# AGENT.md — FireBuddy RAG Instructions

This file tells AI coding agents (Claude Code, Cursor, Copilot, etc.) how the
Ember retrieval pipeline actually works. Read this before making any changes
under `apps/backend/rag/` or `apps/backend/services/`. It was rewritten on
2026-09-16 to match the code; the earlier version described a `documents`
table and LiteLLM that never shipped.

---

## What FireBuddy Is

FireBuddy is a Singapore personal finance web app. Ember is its RAG-powered
financial guide: it answers CPF, SRS, Singapore Savings Bonds, IRAS relief,
MoneySense planning, investing basics and FIRE questions from a curated
knowledge base, and explains the user's own FireBuddy aggregates through
allowlisted read-only tools. Keep code clean, commented, and
interview-explainable. Avoid overengineering.

---

## Tech Stack (RAG-relevant)

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11+ |
| Database | Supabase (PostgreSQL + pgvector + Auth + RLS), local via `npx supabase` |
| Embeddings | OpenAI `text-embedding-3-small`, 1,536 dimensions |
| Answer, planner, chunk-context, judge models | OpenAI SDK directly (no LiteLLM); default `gpt-4o-mini` |
| PDF extraction | pdfplumber |
| Automation | GitHub Actions monthly knowledge-base refresh; CI runs unit tests and the eval regression check |

---

## Directory Structure

```
apps/backend/
├── routers/rag.py                    # POST /api/chat/financial-advisor (+ /stream)
├── schemas/rag.py                    # AdvisorRequest / AdvisorResponse / sources
├── services/
│   ├── ember_service.py              # plan once, execute one branch
│   ├── ember_planner.py              # structured-output router (EmberPlan)
│   ├── ember_data_tools.py           # owner-scoped aggregate tools + figure_lookup dispatch
│   ├── ember_figure_tools.py         # exact-figure lookup over rag/annual-figures.json
│   └── rag_service.py                # retrieval gate, prompt, grounded answer, streaming
└── rag/
    ├── retrieval.py                  # embed + hybrid_match_rag_chunks RPC
    ├── query_terms.py                # Singapore finance acronym expansion
    ├── annual-figures.json           # curated exact figures with citations (hand-maintained)
    ├── Implementation/
    │   ├── ingest.py                 # chunk, contextualise, embed, upsert, stale cleanup
    │   └── answer.py                 # CLI over the production answer service
    ├── fetchAndConvert/
    │   ├── check_pdfs.py             # PDF registry (URLs, superseded_by, skip_pages, extract_tables)
    │   ├── pdf_to_md.py              # pdfplumber -> markdown cache, size guard
    │   ├── fetch_figures.py          # LLM extraction to annual-figures.extracted.json (comparison only)
    │   ├── notify.py                 # Telegram
    │   └── update_kb.py              # orchestrator
    ├── evaluation/
    │   ├── rag_questions.json        # retrieval cases (paths, required_substrings, history)
    │   ├── answer_eval_cases.json    # answer cases incl. refusals
    │   ├── eval_retrieval.py         # Hit/Precision/Recall/MAP/nDCG/MRR + substring_hit_rate
    │   ├── eval_answers.py           # concepts, numbers, citations, LLM judge, refusals
    │   ├── check_regression.py       # CI guard over committed *_latest.json
    │   ├── baseline_thresholds.json  # minimum metrics CI enforces
    │   └── results/                  # immutable versioned reports + *_latest copies
    └── knowledge-base/
        ├── manual/                   # hand-authored Markdown with front matter
        │   ├── cpf/                  # clean CPF rate, allocation, retirement-sum, CPF LIFE tables
        │   ├── fire/                 # FIRE notes and calculator source notes
        │   └── investing/
        ├── markdown-cache/           # committed pdfplumber output (some superseded by manual/)
        ├── source-pdfs/              # gitignored downloads
        └── .chunk-context-cache.json # committed cache of generated chunk headlines/summaries
```

---

## Environment Variables

```env
SUPABASE_URL=...                      # local: http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=...         # or SUPABASE_SECRET_KEY
SUPABASE_JWT_SECRET=...
OPENAI_API_KEY=sk-...
RAG_MODEL=gpt-4o-mini                 # answer model
EMBER_PLANNER_MODEL=gpt-4o-mini
RAG_CHUNK_CONTEXT_MODEL=gpt-4o-mini   # ingestion headline/summary writer
RAG_EVAL_MODEL=gpt-4o-mini            # judge
RAG_MIN_SIMILARITY=0.45
RAG_MIN_SIMILARITY_WITH_KEYWORD=0.35
```

Never hardcode secrets. `EMBEDDING_MODEL` is a constant in `retrieval.py` and
`ingest.py`; changing it requires a pgvector column change and full re-ingest.

---

## Supabase Schema (RAG-relevant)

Table `public.rag_chunks` (service-role only; RLS enabled, no public grants):

| Column | Notes |
|---|---|
| `id uuid` | primary key |
| `source_path text` | path relative to `knowledge-base/`, forward slashes |
| `source_type text` | `manual` or `pdf_cache` |
| `source_title`, `source_url`, `agency`, `topic` | citation metadata |
| `chunk_index integer` | unique with `source_path`; upsert conflict target |
| `headline text` | generated descriptive headline (or section heading) |
| `content text` | headline + summary + original text |
| `embedding vector(1536)` | HNSW index, `vector_cosine_ops` |
| `search_vector tsvector` | generated: title (`simple`, A), headline (`english`, A), topic (`english`, B), content (`english`, C); GIN index |

RPC `public.hybrid_match_rag_chunks(query_text, query_embedding, match_count,
candidate_count, full_text_weight, semantic_weight, rrf_k)` returns the chunk
columns plus `similarity` (1 minus cosine distance), `fused_score` (weighted
reciprocal rank fusion) and `signal_count` (1 or 2: how many of keyword and
vector search ranked the chunk). It deduplicates by `source_path`, stitches
the best chunk and one sibling of the same source whole into `content`, and
is granted to `service_role` only. Never use `SELECT *` on `rag_chunks` from
the app. Manual documents should lead with the answer and keep provenance in
a trailing section, so the best-ranked chunk is the useful one.

Migrations live in `supabase/migrations/`. Apply locally with
`npx supabase migration up --local`.

---

## Request Flow

```
routers/rag.py
  -> services/ember_service.py        plan_ember_question() once
       mode knowledge  -> rag_service.answer_financial_advisor_question(question, retrieval_query=plan.retrieval_query)
       mode data       -> ember_data_tools.run_ember_data_tool()   (expense_summary, spending_comparison,
                          financial_summary, fire_projection, financial_health_review, figure_lookup)
       mode hybrid     -> data tool + optional curated context
       mode clarification / unsupported -> fixed answers
```

Knowledge path in detail:

1. `is_clearly_out_of_scope()` screens obvious non-finance and live-price
   questions before any paid call. `ember_service` applies the same screen
   before the planner runs, so those questions never reach a model.
2. `retrieve_chunks(query)` expands acronyms (`query_terms.py`), embeds the
   expanded query, and calls the hybrid RPC with 20 candidates per signal.
   The planner's `retrieval_query` (standalone, history-resolved) is used when
   present; page hints are appended only to questions of six words or fewer.
3. `retrieval_is_confident()` refuses unless a chunk reaches
   `RAG_MIN_SIMILARITY`, or a chunk with `signal_count = 2` reaches
   `RAG_MIN_SIMILARITY_WITH_KEYWORD`.
4. `format_retrieved_context()` builds the evidence block and
   `build_unique_sources()` the citations.
5. `generate_grounded_answer()` / `stream_grounded_answer()` answer with the
   Ember system prompt, the last six history messages and interface context.
   If the evidence does not answer the question the model must reply with the
   verbatim `INSUFFICIENT_EVIDENCE_SENTINEL`; the service turns that into the
   standard low-confidence refusal with no citations. This is what refuses
   in-scope topics that are absent from the corpus, since cosine similarity
   cannot tell them apart from present ones.

Exact figures (rates, sums, caps) should go through `figure_lookup`: the
planner selects one of the keys in `ember_figure_tools.FIGURE_KEYS` and an
optional year; the tool answers deterministically from `annual-figures.json`
and cites the source document. Retrieval is the fallback.

---

## Ingestion

```
knowledge-base/**/*.md
  -> md_to_doc_obj()            metadata from path, manual front matter, registry superseded_by
  -> split_by_headings()        Markdown headings
  -> split_large_section()      paragraph groups <= 1,500 chars, 300-char overlap
  -> create_chunks()            headline + summary from .chunk-context-cache.json
                                (generated once per chunk text with RAG_CHUNK_CONTEXT_MODEL)
  -> embed_text()               text-embedding-3-small
  -> upsert on (source_path, chunk_index), then stale-row cleanup
```

Commands from the repo root:

```powershell
python apps/backend/rag/Implementation/ingest.py --dry-run          # no model calls, reuses cache
python apps/backend/rag/Implementation/ingest.py                    # generates missing contexts, embeds, upserts
python apps/backend/rag/Implementation/ingest.py --no-llm-context   # section headings only
python apps/backend/rag/Implementation/ingest.py --verify-store
```

PDF registry rules (`check_pdfs.py`):

- `superseded_by`: the PDF is still downloaded and hash-checked (so a change
  still alerts), but its cache is not ingested because a hand-authored file
  under `manual/` replaces it. All four CPF table PDFs are superseded.
- `skip_pages`: cover and table-of-contents pages dropped at conversion.
- `extract_tables`: opt-in pdfplumber table extraction for grid-style PDFs.
- `pdf_to_md.py` rejects a conversion under 800 bytes or one that loses more
  than half the previous cache text.

When a CPF PDF changes: update the matching `manual/cpf/*.md` and
`annual-figures.json` by hand, then re-run ingestion.

---

## Evaluation

```powershell
python apps/backend/rag/evaluation/eval_retrieval.py --run-label "..."   # planner used for multi-turn cases
python apps/backend/rag/evaluation/eval_answers.py --via-planner --run-label "..."
python apps/backend/rag/evaluation/check_regression.py
```

Every major run creates an immutable `results/<suite>/versions/vNNN.{json,md}`
and refreshes `*_latest`. `baseline_thresholds.json` holds the minimums CI
enforces on the committed latest reports; raise them when a run improves,
never lower them silently. Metric definitions and the recorded history are in
`docs/RAG_EVALUATION_BASELINE.md`.

---

## What NOT to Do

- Do not commit `.env` or PDFs.
- Do not put exact rates or sums only in prose; put them in the manual tables
  and `annual-figures.json` so both retrieval and `figure_lookup` can cite them.
- Do not bypass the planner allowlist; every tool is server-selected and
  owner-scoped. `figure_lookup` reads no user data.
- Do not change `EMBEDDING_MODEL` without a migration and full re-ingest.
- Do not lower `baseline_thresholds.json` to make CI pass.

---

## Domain Glossary

See `rag/query_terms.py` for the acronym expansion table used by retrieval
(CPF, OA, SA, MA, RA, BRS, FRS, ERS, CPFIS, SRS, SSB, SGS, HDB, EHG, OW, AW,
IRAS, MAS, YA, FIRE, SWR, ETF, REIT, CDP, PR, SPR). Keep it and the glossary
in the repo-root `AGENTS.md` in sync.
