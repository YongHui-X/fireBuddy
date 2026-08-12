# AGENT.md — FireBuddy Codebase Instructions

This file tells AI coding agents (Claude Code, Cursor, Copilot, etc.) how to
work effectively in this repository. Read this before making any changes.

---

## What FireBuddy Is

FireBuddy is a Singapore personal finance web app targeting the gap left by
MyMoneySense shutting down. It helps users track expenses, plan for FIRE
(Financial Independence, Retire Early), and get answers to CPF, HDB, SRS,
and retirement planning questions via a RAG-powered financial advisor chatbot.

It is also the primary portfolio project of the developer (@myfirequest). Keep
code clean, well-commented, and interview-explainable. Avoid overengineering.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| Database | Supabase (PostgreSQL + pgvector + Auth + RLS) |
| RAG pipeline | LiteLLM, OpenAI embeddings, pdfplumber, Supabase pgvector |
| LLM calls | LiteLLM (model-agnostic), OpenAI as primary provider |
| Auth | Supabase Auth (JWT, Row Level Security) |
| Automation | GitHub Actions (monthly KB update cron) |
| Notifications | Telegram Bot API |

---

## Directory Structure

```
firebuddy/
├── frontend/                        # React/Vite app
│   ├── src/
│   │   ├── components/
│   │   │   └── chat/                # Financial advisor chat UI
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   │       └── supabaseClient.ts
│   └── vite.config.ts
│
├── backend/                         # FastAPI app
│   ├── main.py                      # FastAPI entry point, router registration
│   ├── routers/
│   │   ├── chat.py                  # POST /api/chat/financial-advisor
│   │   ├── expenses.py              # Expense CRUD
│   │   └── auth.py                  # Auth helpers
│   ├── rag/                         # RAG pipeline (read this section carefully)
│   │   ├── knowledge-base/          # RAG source and cache documents
│   │   │   ├── source-pdfs/         # Re-downloadable source PDFs
│   │   │   ├── markdown-cache/      # Committed PDF text cache files
│   │   │   ├── cpf/                 # Hand-authored CPF markdown
│   │   │   ├── srs/                 # SRS guides
│   │   │   ├── hdb/                 # HDB grant eligibility
│   │   │   ├── fire/                # FIRE concepts, MoneySense guides
│   │   │   └── tax/                 # Singapore income tax
│   │   ├── scripts/                 # Automation scripts (see Pipeline section)
│   │   │   ├── check_pdfs.py        # Download and hash-check source PDFs
│   │   │   ├── pdf_to_md.py         # Convert PDFs to .md text cache
│   │   │   ├── fetch_figures.py     # Extract annual figures into JSON via LLM
│   │   │   ├── notify.py            # Telegram notification
│   │   │   └── update_kb.py         # Orchestrator — run this to update KB
│   │   ├── ingest.py                # Chunk .md files and embed into Supabase
│   │   ├── answer.py                # RAG retrieval and answer generation
│   │   └── annual-figures.json      # Authoritative CPF/SRS/HDB/tax figures
│   └── requirements.txt
│
├── supabase/
│   └── migrations/                  # SQL migrations including pgvector setup
│
├── .github/
│   └── workflows/
│       └── update-knowledge-base.yml  # Monthly cron pipeline
│
└── AGENT.md                         # You are here
```

---

## Environment Variables

Never hardcode secrets. All secrets live in `.env` (local) and GitHub Actions
secrets (CI). Never commit `.env`.

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# LiteLLM model string (change here to swap models globally)
RAG_MODEL=openai/gpt-4.1-nano
EMBEDDING_MODEL=text-embedding-3-large

# Telegram (for KB update notifications)
TELEGRAM_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

---

## Supabase Schema (RAG-relevant tables)

```sql
-- pgvector extension (must be enabled first)
create extension if not exists vector;

-- RAG document store
create table documents (
  id        bigserial primary key,
  content   text        not null,
  metadata  jsonb       not null default '{}',
  embedding vector(3072) not null
);

-- Cosine similarity search function
create or replace function match_documents(
  query_embedding vector(3072),
  match_count     int
)
returns table(content text, metadata jsonb, similarity float)
language sql stable as $$
  select content, metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

All user-facing tables (expenses, profiles) use Row Level Security.
The `documents` table is read-only from the app (no RLS needed).

---

## RAG Pipeline — How It Works

This is the most important section. Read carefully before touching anything
in `backend/rag/`.

### Knowledge base update pipeline (runs via GitHub Actions monthly)

```
update_kb.py
  ├── check_pdfs.py    Download PDFs from gov.sg URLs, detect changes via SHA-256
  ├── pdf_to_md.py     Run pdfplumber ONLY on changed PDFs, save as .md cache
  ├── fetch_figures.py Read .md cache, extract numerical figures via LLM, update JSON
  ├── ingest.py        Read all .md files, LLM-chunk them, embed into Supabase pgvector
  └── notify.py        Send Telegram alert with diff summary
```

### Key design decisions (explain these in interviews)

**Why .md as a cache layer?**
pdfplumber is slow and only needed when a PDF changes (roughly once a year at
Singapore Budget in February). The .md files persist extracted text so ingest.py
never needs to touch pdfplumber again after the first run.

**What is annual-figures.json for?**
The refresh tooling can extract changing CPF, SRS, HDB, and tax figures into a
structured file. The current production answer service does not inject this
file into prompts. Answers currently rely on retrieved knowledge-base evidence.
Direct structured-figure injection remains future work and requires validation
before it should become authoritative.

**Why Supabase pgvector instead of ChromaDB?**
The vector store colocates with user financial data. This enables a future
upgrade path to personalised retrieval based on the user's actual CPF balance
and expense history. Single database, single connection pool.

**Why deterministic heading-based chunking?**
The current ingestion path splits controlled Markdown on headings and groups
paragraphs only when a section exceeds the size limit. This makes ingestion
repeatable and avoids additional model calls. LLM-generated summaries are a
possible future retrieval experiment, not current behavior.

**Current retrieval and answer strategy:**
1. Reject clearly unsupported questions before paid retrieval
2. Embed the original user question
3. Retrieve the top five chunks from Supabase pgvector
4. Refuse when the best match is below the similarity threshold
5. Build bounded context and deduplicated source citations
6. Generate a grounded answer through the production advisor service

Query rewriting, hybrid search, and reranking are not currently implemented.
They remain options if simpler retrieval improvements do not meet evaluation
targets.

### Current RAG constants

```python
MATCH_COUNT = 5
RAG_MIN_SIMILARITY = 0.45
```

---

## API Endpoints

```
POST /api/chat/financial-advisor
  Body:  { "question": str, "history": [{"role": str, "content": str}] }
  Returns: { "answer": str, "sources": [str] }

POST /api/expenses
GET  /api/expenses
PUT  /api/expenses/{id}
DELETE /api/expenses/{id}
```

---

## Common Tasks

### Bootstrap the knowledge base (first time setup)
```bash
cd backend
pip install -r requirements.txt
playwright install chromium

# downloads all PDFs, converts to .md, extracts figures, ingests into Supabase
python rag/scripts/update_kb.py
```

### Run the backend locally
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Run the frontend locally
```bash
cd frontend
npm install
npm run dev
```

### Manually trigger a KB update
```bash
python backend/rag/scripts/update_kb.py
```

### Add a new knowledge base document
1. Add the PDF URL to `PDFS` list in `check_pdfs.py` with a `dest` path
2. Add the same `md_cache` path to `SOURCES` in `fetch_figures.py` if it
   contains numerical figures worth extracting
3. Run `update_kb.py` — it will download, convert, and ingest automatically
4. Commit the new `.md` file and updated `pdf_hashes.json`

### Swap the LLM model
Change `RAG_MODEL` in `.env`. LiteLLM handles the abstraction.
Do not hardcode model strings in individual files.

---

## What NOT to Do

- Do not commit `.env`, `.pdf` files, or `*.pdf.bak` files
- Do not run `ingest.py` in isolation without running `pdf_to_md.py` first
  if you have new PDFs — the .md cache must exist first
- Do not add API keys or Supabase URLs to any source file
- Do not bypass Supabase RLS for user tables — always query through the
  authenticated client
- Do not use `SELECT *` on the `documents` table — it contains 3072-dimension
  vectors and will be very slow; always use `match_documents()` RPC instead
- Do not change `EMBEDDING_MODEL` without re-ingesting the entire knowledge base
  — embedding dimensions must match the pgvector column definition

---

## .gitignore Reference (RAG-specific)

```
# PDFs are re-downloadable, do not commit binaries
backend/rag/knowledge-base/source-pdfs/**/*.pdf
backend/rag/knowledge-base/source-pdfs/**/*.pdf.bak

# pdfplumber temp files
*.tmp

# .md cache files ARE committed (text, useful in repo)
# annual-figures.json IS committed (auto-updated by pipeline)
# pdf_hashes.json IS committed (needed for change detection)
```

---

## Domain Knowledge: Singapore Finance Terms

Agents working in this codebase should understand these terms to write
accurate comments, variable names, and system prompts.

| Term | Meaning |
|---|---|
| CPF | Central Provident Fund — Singapore mandatory savings scheme |
| OA | Ordinary Account — CPF account for housing, education, investment |
| SA | Special Account — CPF account for retirement (closed for 55+ from 2025) |
| MA | MediSave Account — CPF account for healthcare |
| RA | Retirement Account — created at 55 from OA/SA savings |
| FRS | Full Retirement Sum — minimum RA balance for standard CPF LIFE payout |
| BRS | Basic Retirement Sum — half of FRS, if property pledge given |
| ERS | Enhanced Retirement Sum — 4x BRS, for higher CPF LIFE payouts |
| CPF LIFE | CPF Lifelong Income For the Elderly — annuity scheme from age 65 |
| SRS | Supplementary Retirement Scheme — voluntary tax-deferred retirement savings |
| HDB | Housing Development Board — Singapore public housing authority |
| EHG | Enhanced CPF Housing Grant — income-tested grant for first-time buyers |
| OW | Ordinary Wages — monthly salary subject to CPF contributions |
| AW | Additional Wages — bonuses, subject to annual CPF ceiling |
| FIRE | Financial Independence, Retire Early |
| 4% rule | Withdraw 4% of portfolio annually; standard FIRE safe withdrawal rate |
| IRAS | Inland Revenue Authority of Singapore — tax authority |
| YA | Year of Assessment — Singapore tax year (YA2026 = income earned in 2025) |
