# FireBuddy Project Brief

## Overview
FireBuddy is a balanced Singapore-focused personal finance app with FIRE as its strongest differentiator.

> FireBuddy helps Singapore users understand their everyday finances and turn them into an explainable path toward financial independence.

The primary audience is a Singapore based emerging FIRE planner, roughly 25 to 39 years old. Everyday account, transaction, category, budget, and insight workflows must remain useful without a FIRE profile.

The real data dashboard foundation is implemented with wealth positions, dated snapshots, contributions, deterministic financial summaries, and an explainable FIRE projection. The first public deployment waits for the remaining manual localhost browser and signed in account isolation smoke. Spending Plan, Life Goals, CSV import, recurring detection, unified Ember, and deeper Singapore planning follow in phases. `docs/PRD.md` owns the detailed requirements and backlog.

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
- `apps/web/` includes Supabase auth, income and expense tracking, read-only system categories, persisted accounts, expense-only insights, wealth and FIRE setup, a real data dashboard, optional expense category suggestions, Ember with streamed cited answers and a page-aware quick-chat launcher, and versioned demo-only local state
- `apps/backend/` is a FastAPI backend with mounted accounts, typed transactions, compatibility expenses, categories, wealth, FIRE, analytics, AI suggestion, health, and Ember JSON and SSE RAG routes
- `apps/mobile/` contains the earlier Expo implementation and is currently deferred
- `packages/shared/` contains shared TypeScript contracts, deterministic demo FIRE calculations, category data, add-expense helpers, and API route constants
- `supabase/` contains timestamped SQL migrations for the UUID-aligned app schema, persisted accounts, typed transactions, wealth and FIRE records, security, HNSW indexing, and private hybrid RAG retrieval
- `docs/Figmamake/` remains a visual reference, not production source code
- `docs/design/firebuddy-dashboard-roadmap.png` is the primary visual reference for the current dashboard

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

Dashboard roadmap reference:
- [`docs/design/firebuddy-dashboard-roadmap.png`](docs/design/firebuddy-dashboard-roadmap.png)
- The FireBuddy mockup is the visual authority. WealthWise is a functional benchmark only and must not be copied for code, architecture, branding, navigation, or pixel-level design.

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
- `wealth_positions`
- `wealth_position_snapshots`
- `wealth_contributions`
- `fire_profiles`
- `essential_expense_categories`
- `rag_chunks`

Current dashboard data boundary:
- Keep payment accounts unchanged and separate from balance sheet values
- Asset and liability wealth positions store liquidity, FI inclusion, emergency fund, and CPF or restricted classifications
- Dated wealth snapshots support current values and historical paths
- Dedicated wealth contributions never count as expenses
- Current investable assets derive from eligible wealth positions instead of a duplicated `FireProfile` value
- `WealthPosition`, `WealthPositionSnapshot`, `WealthContribution`, `FinancialSummary`, `MonthlyMoneyPulse`, `RecommendedAction`, and revised FIRE types are current shared contracts

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
- Accounts, transactions, wealth records, FIRE profiles, and essential category selections are always scoped to the authenticated user
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
- `GET /wealth/positions`
- `POST /wealth/positions`
- `GET /wealth/positions/{position_id}`
- `PUT /wealth/positions/{position_id}`
- `DELETE /wealth/positions/{position_id}`
- Snapshot CRUD under `/wealth/positions/{position_id}/snapshots`
- Contribution CRUD under `/wealth/contributions`
- `GET /analytics/financial-summary`
- `GET /fire/essential-categories`
- `PUT /fire/essential-categories`
- `GET /fire/profile`
- `PUT /fire/profile`
- `POST /fire/calculate`
- `POST /fire/scenario`
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
10. Wealth positions, snapshots, and contributions
11. FIRE setup and temporary scenario
12. Plan and Goals Later placeholders

Next product focus:
1. Complete manual responsive browser acceptance and a signed in two user isolation smoke
2. Deploy only after the dashboard foundation passes all localhost acceptance criteria

Later product focus:
1. Evolve category budgets into a period based Spending Plan and add Life Goals
2. Add reviewable CSV import, expanded analytics, transaction drilldowns, and recurring detection
3. Route Ember among deterministic analytics, FIRE results, scenarios, and Singapore finance RAG
4. Add saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, and resilience modelling

Navigation:
- Bottom tab bar with `Home`, `Transactions`, `Categories`, and `Profile`
- `Add transaction` is launched from a floating action button, modal, or sheet flow rather than a main tab
- Current desktop order is `Home`, `Transactions`, `Categories`, `Plan`, `Goals`, and `Profile`, followed by a separated `Ember` entry
- `Log out` and `Add Transaction` remain at the bottom of the desktop sidebar
- Mobile keeps the four primary tabs. Plan, Goals, Ember, Accounts, and detailed Insights remain secondary mobile flows
- Home does not use large Goals or Ember panels because they have dedicated pages

## AI Roadmap
Current:
- Ember RAG experience at `GET /ember` plus a persistent authenticated quick-chat launcher, backed by the streaming endpoint `POST /api/chat/financial-advisor/stream`. The JSON endpoint `POST /api/chat/financial-advisor` remains available for compatibility.
- Ember requests may include bounded interface context: the current route label and up to five generic action labels from the current browser session. This context never includes amounts, descriptions, account names, or record IDs, and is used only to tailor answer emphasis.
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

Current dashboard foundation before first deployment:
- Separate wealth positions, snapshots, and contributions are implemented
- The one-per-user FIRE profile derives investable assets from wealth positions
- Financial summary, Monthly Money Pulse, recommended action, FIRE target, progress, paths, and temporary scenarios are deterministic
- Setup prompts replace unavailable figures and facts, projections, warnings, and incomplete states are distinguished
- Automated local calculation, schema, RLS, build, and regression checks pass; manual responsive and signed in smoke checks remain before deployment

Later, monthly planning:
- Evolve existing category budgets into a period based Spending Plan with an overall limit, category limits, projection, and optional rollover
- Add Life Goals with target, date, progress, contributions, and status

Later, data depth:
- Add reviewable CSV mapping, preview, validation, duplicate detection, and import reporting
- Add expanded analytics, supporting transaction drilldowns, anomaly depth, and recurring subscription or bill detection
- Detect recurring records only. Do not schedule or execute payments

Later, unified Ember:
- Route one assistant between deterministic analytics, FIRE results, scenarios, and Singapore finance RAG
- Use the language model to explain structured results, never to calculate authoritative totals or change records

Later, planning depth:
- Add saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, resilience modelling, and progress history

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
- The first public deployment follows completion of the dashboard foundation and localhost acceptance in `docs/PRD.md`
- At deployment time, deploy Railway first, then set `VITE_API_BASE_URL` for Vercel and restrict `CORS_ALLOWED_ORIGINS` to production and required preview origins
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
- Direct bank connections, stored banking credentials, market feeds, payment execution, investment execution, and generic brokerage portfolio management
- Transfers and automatic reconciliation between payment accounts, wealth positions, and contributions in the first dashboard foundation
- Recurring payment scheduling or execution
- Ember account inspection, transaction aware claims, and personal FIRE calculations until deterministic services exist
- Regulated financial advice and silent AI changes to financial records
- MCP tool sprawl, graph context infrastructure, multiple agent services, Kubernetes, Terraform, and multi-cloud deployment
- Custom authentication or migration away from React, Vite, FastAPI, Supabase Auth, and Postgres
- Pixel-for-pixel copying of external products or feature-count competition
