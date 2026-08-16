# FireBuddy Project Brief

## Overview
FireBuddy is a balanced Singapore-focused personal finance app with FIRE as its strongest differentiator.

> FireBuddy helps Singapore users understand their everyday finances and turn them into an explainable path toward financial independence.

Everyday account, transaction, category, budget, and insight workflows must remain useful without a FIRE profile. The next product milestone will connect transaction-derived spending to a transparent FIRE projection. Carefully scoped CPF support comes later, after the base calculation is trusted.

The product supports:
- Primary role: AI Engineer
- Fallback role: SWE
- Brand tie-in: `@myfirequest`

Build strategy:
- Web first for early deployment and job applications
- Mobile later, after the core web experience and shared contracts are stable

## Current State Vs Target State
Current repo state:
- The repo now uses a root monorepo layout with `apps/`, `packages/`, and `docs/`
- `apps/web/` is the active React and Vite frontend
- `apps/web/` includes Supabase auth, income and expense tracking, read-only system categories, persisted accounts, expense-only insights, optional expense category suggestions, a card-based dashboard, Ember with empty opening topics, streamed answers, local topic history, and per-answer citations, and demo-only local fallback state
- `apps/backend/` is a FastAPI backend with mounted accounts, typed transactions, compatibility expenses, categories, AI suggestion, health, and Ember JSON and SSE RAG routes
- `apps/mobile/` contains the earlier Expo implementation and is currently deferred
- `packages/shared/` contains shared TypeScript contracts, category data, add-expense helpers, and API route constants
- `supabase/` contains timestamped SQL migrations for the UUID-aligned app schema, persisted accounts, typed income and expense transactions, security, HNSW indexing, and private hybrid RAG retrieval
- `docs/Figmamake/` remains a visual reference, not production source code

Ongoing repo direction:
- `apps/web` remains the active React and Vite frontend
- `apps/mobile` remains the Expo and React Native mobile app after web-first flows are stable
- `apps/backend` remains the FastAPI API, business logic, AI, and RAG layer
- `packages/shared` grows into the shared TypeScript type, helper, Supabase utility, and API wrapper layer used by both frontends

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend (web) | React + Vite (TypeScript) | Active public-facing web app and resume URL |
| Frontend (mobile) | Expo + React Native (TypeScript) | Mobile app after the web version is established |
| Backend | FastAPI (Python) | API layer, business logic, and AI feature hosting |
| Database | Supabase (Postgres) | Data storage, auth, and row level security |
| AI - Current RAG | OpenAI embeddings and chat, Supabase pgvector, Postgres full text search | Ember, a source-backed educational Singapore finance guide |
| AI - Categorisation | OpenAI API (GPT-4o mini) | Optional expense category suggestions for user review |
| AI - Later assistant | Current Ember RAG plus deterministic backend analytics and FIRE services | One routed assistant that explains structured results or uses Singapore finance RAG |
| Monorepo tooling | Turborepo | Coordinates web, mobile, backend, and shared packages |

## Architecture Principles
- Keep components dumb. UI components should render and delegate logic to hooks, lib modules, backend services, or shared packages.
- Frontend data shapes should drive backend contracts for the first iterations.
- Shared logic should be extracted so web and mobile can reuse hooks, types, and API wrappers later.
- Supabase Auth remains the only auth system. Do not build custom auth.
- Figma Make is a visual reference only. Do not copy-paste its generated code directly into the product architecture.

## Design Direction
Visual style:
- Clean and professional
- Warm, not corporate
- Revolut-inspired restraint

Colour palette:
- Primary background: `#F5F8F4`
- Primary accent: `#3C8A61`
- Deep green: `#25543D`
- Secondary green: `#67B47C`
- Surface cards: `#FFFFFF`
- Muted surfaces: `#EEF5EF`
- Soft mint: `#DCEBDD`
- Text primary: `#1F3D2E`
- Text secondary: `#6B8577`
- Borders and dividers: `#D7E3D8`
- Lime accent, use sparingly: `#CBEA63`
- Chart support gold, use sparingly: `#E5B24A`

Design language:
- Mobile-first app column with a fixed desktop sidebar
- Curved green headers with restrained gradients
- Overlapping cards and subtle elevation
- Thin borders
- `12px` border radius on cards and buttons
- Generous whitespace
- Bottom tab navigation
- Sentence case throughout

Figma reference:
- https://www.figma.com/make/jTSdUVMcEefft60bnt4vig/Firebuddy

## Data Model Notes
Key decisions:
- Use UUID primary keys for app tables so IDs stay consistent across auth, frontend types, and backend APIs
- Use `NUMERIC(10,2)` for money values
- Use `TIMESTAMPTZ DEFAULT NOW()` for timestamps
- Use `DATE` for transaction dates
- `categories.user_id` is nullable so system defaults and user-created categories can coexist
- `is_default` distinguishes system categories from user-owned ones
- `categories.category_type` explicitly separates expense and income categories
- `expenses.transaction_type` explicitly separates expenses and income while retaining the existing table for a safe additive migration
- All stored amounts remain positive. Clients apply the display sign from `transaction_type`

Current core tables:
- `profiles`
- `categories`
- `accounts`
- `expenses`
- `rag_chunks`

Seed default categories:
- Food & Drink
- Transport
- Shopping
- Bills & Utilities
- Healthcare
- Entertainment
- Travel
- Others
- Salary
- Bonus
- Dividends
- Interest
- Other income

Security rules:
- Enable RLS on all user-facing tables
- Frontends use Supabase only for authentication and do not receive direct Data API access to application tables
- FastAPI validates the Supabase JWT, scopes every user data query, and uses a backend-only secret or service-role key for application data access
- System default categories are read-only, while users can manage only their own custom categories
- Accounts and transactions are always scoped to the authenticated user
- RAG chunks and retrieval RPCs are private to backend service-role clients

Automation:
- `handle_new_user()` creates a profile and default Cash account on signup
- `update_updated_at()` updates account and expense timestamps on change
- Expense ownership triggers validate both category availability and account ownership
- Transaction triggers also require category and transaction types to match

## Auth And API Direction
Responsibility split:
- Supabase handles signup, login, sessions, and JWT issuance
- FastAPI verifies Supabase JWTs on protected requests
- Frontends call Supabase directly for auth and call FastAPI for application data and AI features

Mounted FastAPI routes:
- `GET /`
- `GET /health`
- `GET /accounts`
- `POST /accounts`
- `PUT /accounts/{account_id}`
- `DELETE /accounts/{account_id}`
- `GET /expenses`
- `POST /expenses`
- `PUT /expenses/{expense_id}`
- `DELETE /expenses/{expense_id}`
- `GET /transactions`
- `POST /transactions`
- `PUT /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`
- `GET /categories`
- `POST /categories`
- `PUT /categories/{category_id}`
- `DELETE /categories/{category_id}`
- `POST /ai/parse-input`
- `POST /api/chat/financial-advisor`
- `POST /api/chat/financial-advisor/stream`

API compatibility:
- `/transactions` is the primary API for typed income and expense records
- `/expenses` remains mounted for the current expense-only compatibility period

## Screen Plan
Current web screens:
1. Auth
2. Dashboard
3. Transactions
4. Categories
5. Profile
6. Insights
7. Accounts
8. Add transaction modal
9. Ember Singapore finance guide

Next product focus:
1. Deploy and smoke test the public web MVP on Vercel, Railway, and the existing Supabase project
2. Replace the illustrative FIRE snapshot with a small persisted profile, deterministic financial summary and FIRE calculation, explainable dashboard results, and one temporary scenario
3. Add reviewable CSV import, savings-rate analytics, period comparisons, and transaction drilldowns
4. Route one FireBuddy assistant between deterministic analytics, deterministic FIRE results, and Singapore finance RAG
5. Add selective depth through saved FIRE scenarios, progress history, recurring-transaction detection, and carefully scoped CPF assumptions

Navigation:
- Bottom tab bar with `Home`, `Transactions`, `Categories`, and `Profile`
- `Add transaction` is launched from a floating action button, modal, or sheet flow rather than a main tab
- Ember is a secondary desktop navigation item and Home card, while mobile keeps the four primary tabs

## AI Roadmap
Current:
- Ember RAG experience at `GET /ember`, backed by the authenticated streaming endpoint `POST /api/chat/financial-advisor/stream`. The JSON endpoint `POST /api/chat/financial-advisor` remains unchanged for compatibility.
- Ember opens with an empty transcript and supported starter questions. It streams search status, grounded answer text, and citations without automatically submitting a starter or greeting the user.
- Ember uses curated CPF, CPFIS, Singapore Savings Bonds, MoneySense, IRAS relief, Singapore investing, and FIRE planning sources plus recent conversation context. It does not inspect accounts or transactions, calculate personal FIRE results, retrieve live prices, or provide regulated financial advice.
- Authenticated category suggestions at `POST /ai/parse-input`, limited to 10 requests per user per 60 seconds by default
- Knowledge base under `apps/backend/rag/knowledge-base/`
- Ingestion script under `apps/backend/rag/Implementation/ingest.py`
- Retrieval helper under `apps/backend/rag/retrieval.py`, using keyword and vector reciprocal rank fusion
- Supabase pgvector schema in `supabase/migrations/20260702161557_rag_pgvector.sql`
- HNSW and private hybrid retrieval migrations in `supabase/migrations/20260814051717_replace_rag_ivfflat_with_hnsw.sql` and `supabase/migrations/20260814052904_add_private_hybrid_rag_retrieval.sql`
- Versioned evaluation reports that preserve each major run instead of overwriting its historical result

Suggestion flow:
- The user enters a description and explicitly requests a suggestion
- The backend can only return a category visible to that user
- The web selector is updated for review, never saved automatically, and remains manually overridable
- Model choice: `GPT-4o mini`

Later:
- Route one FireBuddy assistant between deterministic transaction analytics, deterministic FIRE calculations, and the existing Singapore finance RAG
- Require the language model to explain structured results rather than calculate authoritative totals
- Continue expanding curated Singapore finance coverage only with traceable sources and preserved evaluations

## Delivery Phases
Current implemented baseline:
- Root monorepo layout exists
- Web, mobile, backend, shared, docs, and Supabase folders exist
- Supabase migrations exist for app data and RAG pgvector storage
- Web app has implemented screens and Supabase auth wiring
- Backend has mounted account, transaction, compatibility expense, category, AI suggestion, health, and Ember RAG routes

Current public MVP implementation:
- UUID-first accounts, categories, and expenses with legacy identifier mappings retained for one compatibility release
- Persisted account CRUD and required expense account ownership
- Typed income and expense UI with positive API/database amounts
- Optional AI category suggestions with manual override
- Web and backend regression tests plus Vercel and Railway configuration
- Private HNSW and hybrid RRF retrieval improved the 30-question retrieval evaluation from MRR `0.7861` to `0.8622`, while Hit@5 remained `1.0000`

Next, baseline release:
- Deploy and smoke test the implemented web, backend, and Supabase flows
- Verify authentication, ownership, CORS, CRUD, Insights, AI suggestions, and Ember in production

Next, FIRE core:
- Add a one-per-user FIRE profile and deterministic financial summary
- Derive retirement spending from completed expense history with a manual override
- Add an explainable FIRE target, progress, projection, and one unsaved comparison scenario

Later, CSV and analytics:
- Add reviewable CSV mapping, preview, validation, duplicate detection, and import reporting
- Add savings rate, period comparisons, and links to supporting transactions

Later, unified assistant:
- Route one FireBuddy assistant between deterministic transaction analytics, deterministic FIRE results, and Singapore finance RAG
- Use the language model to explain structured results, never to calculate authoritative totals

Later, selective finance depth:
- Add saved FIRE scenarios, progress history, recurring-transaction detection, and carefully scoped CPF assumptions
- Continue using category budgets instead of adding a separate broad budgeting product

After shared web contracts are stable:
- Continue evolving the Expo app in `apps/mobile` around shared logic extracted into `packages/shared`

## Local Development Direction
Use root scripts as the main entrypoints:

```powershell
npm run dev:web
npm run dev:backend
npm run dev:mobile
```

Useful checks:

```powershell
npm run build:web
npm run lint:web
npm run lint:mobile
npm run typecheck:mobile
npm run typecheck:shared
npm run test:web
python -m unittest discover apps/backend/tests -v
```

The web app is now ahead of mobile for current product direction. Treat `apps/mobile/` as preserved implementation reference unless the user explicitly asks for mobile work.

## Deployment Direction
- Web: Vercel Hobby, built from the repository root using `vercel.json`
- Backend: Railway Hobby using `apps/backend/railway.toml`, Railpack, Python 3.11, `/health`, and the Singapore region
- Deploy Railway first, then set `VITE_API_BASE_URL` for Vercel and restrict `CORS_ALLOWED_ORIGINS` to the production and required preview origins
- Android: EAS Build later
- iOS: out of scope for now

## Resume Framing
Full app:
> FireBuddy | React, FastAPI, Supabase, OpenAI API, Supabase pgvector
> Built a Singapore-focused personal finance app with a React web frontend, Supabase-backed expense tracking, FastAPI APIs, and Ember, a pgvector-powered guide over CPF and Singapore finance documents.

Categorisation:
> Implemented authenticated expense category suggestions via OpenAI API. The user requests a suggestion from a description, reviews the result, and can override it before saving.

RAG:
> Implemented a private hybrid RAG pipeline with OpenAI embeddings, Supabase pgvector, Postgres full text search, and reciprocal rank fusion over CPF and Singapore finance reference documents.

## Out Of Scope For Now
- Telegram bot integration
- iOS App Store submission
- AWS-heavy infrastructure work
- Account balances, transfers, and full net-worth aggregation before the core flow is stable
- Direct bank connections, market feeds, investment execution, and generic portfolio management
- Generic financial goals, a separate full budgeting system, and a recurring payment scheduler
- Ember account inspection, transaction-aware claims, personal FIRE calculations, and regulated financial advice
- MCP tool sprawl, graph context infrastructure, multiple agent services, Kubernetes, Terraform, and multi-cloud deployment
- Custom authentication or migration away from React, Vite, FastAPI, Supabase Auth, and Postgres
- Pixel-for-pixel copying of external products or feature-count competition
