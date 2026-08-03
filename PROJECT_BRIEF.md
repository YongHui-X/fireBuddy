# FireBuddy Project Brief

## Overview
FireBuddy is a Singapore-focused personal finance and FIRE tracker app. It is being built to fill the gap left by MyMoneySense shutting down, with CPF-specific workflows, local financial instruments, expense tracking, and later FIRE projection tools.

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
- `apps/web/` includes Supabase auth, dashboard, transactions, categories, profile, insights, accounts, add-expense modal, local fallback state, and backend sync for categories and expenses
- `apps/backend/` is a FastAPI backend with mounted expenses, categories, and financial advisor RAG routes
- `apps/mobile/` contains the earlier Expo implementation and is currently deferred
- `packages/shared/` contains shared TypeScript contracts, category data, add-expense helpers, and API route constants
- `supabase/` contains SQL migrations for the app schema, category visuals, and RAG pgvector storage
- `docs/Figmamake/` remains a visual reference, not production source code

Target repo state:
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
| AI - Current RAG | OpenAI embeddings and chat, Supabase pgvector | Financial advisor retrieval over Singapore finance context |
| AI - Categorisation | OpenAI API (GPT-4o mini) | Draft transaction parsing and category suggestion flow |
| AI - Later phases | OpenAI Vision, LlamaIndex or LangChain, Supabase pgvector | Receipt scanning and richer RAG over CPF or finance documents |
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
- Flat surfaces
- No gradients
- No drop shadows
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

Planned tables:
- `profiles`
- `categories`
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

Security rules:
- Enable RLS on all user-facing tables
- Users can only see their own profile
- Users can see system default categories and their own categories
- Users can only CRUD their own expenses
- RAG chunks are shared knowledge-base data and are managed through backend and Supabase setup scripts

Automation:
- `handle_new_user()` creates a profile row on signup
- `update_updated_at()` updates expense timestamps on change

## Auth And API Direction
Responsibility split:
- Supabase handles signup, login, sessions, and JWT issuance
- FastAPI verifies Supabase JWTs on protected requests
- Frontends call Supabase directly for auth and call FastAPI for application data and AI features

Mounted FastAPI routes:
- `GET /expenses`
- `POST /expenses`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`
- `GET /categories`
- `POST /categories`
- `PUT /categories/{id}`
- `DELETE /categories/{id}`
- `POST /api/chat/financial-advisor`

Present but not mounted:
- `POST /ai/parse-input`

## Screen Plan
Current web screens:
1. Auth
2. Dashboard
3. Transactions
4. Categories
5. Profile
6. Insights
7. Accounts
8. Add Expense modal

Next product focus:
1. Harden the web expense and category flows against real Supabase data
2. Mount and integrate transaction parsing only after the core CRUD flow is stable
3. Improve RAG answer quality and retrieval tests
4. Expand FIRE projections and analytics

Navigation:
- Bottom tab bar with `Home`, `Transactions`, `Categories`, and `Profile`
- `Add Expense` is launched from a floating action button, modal, or sheet flow rather than a main tab

## AI Roadmap
Current:
- Financial advisor RAG endpoint at `POST /api/chat/financial-advisor`
- Knowledge base under `apps/backend/rag/knowledge-base/`
- Ingestion script under `apps/backend/rag/Implementation/ingest.py`
- Retrieval helper under `apps/backend/rag/retrieval.py`
- Supabase pgvector schema in `supabase/migrations/003_rag_pgvector.sql`

Next:
- Transaction auto-categorisation from a user-entered description
- Flow: user enters description, backend asks OpenAI for a suggested category, user can accept or override before saving
- Model choice: `GPT-4o mini`
- `apps/backend/routers/ai.py` contains draft parse-input work, but it must be mounted in `main.py` before the API is live

Later phases:
- Natural language single-field parsing such as `Chicken rice $4.50`
- Receipt scanning with vision
- RAG over CPF and financial documents

## Delivery Phases
Completed baseline:
- Root monorepo layout exists
- Web, mobile, backend, shared, docs, and Supabase folders exist
- Supabase migrations exist for app data and RAG pgvector storage
- Web app has implemented screens and Supabase auth wiring
- Backend has mounted category, expense, and RAG advisor routes

Phase 1:
- Stabilise web expense and category CRUD against Supabase and FastAPI
- Keep local fallback behaviour only where it helps development
- Add focused tests or scripted checks around shared contracts and backend route behaviour

Phase 2:
- Mount and integrate transaction auto-categorisation
- Improve advisor retrieval quality with representative Singapore finance questions
- Deploy the web app and backend to public URLs

Phase 3:
- FIRE projections
- Spending analysis
- UI polish
- Broader feature refinement

Post-Phase 3:
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
npm run typecheck:shared
```

The web app is now ahead of mobile for current product direction. Treat `apps/mobile/` as preserved implementation reference unless the user explicitly asks for mobile work.

## Deployment Direction
- Web: Vercel is the simplest target for a public resume URL
- Backend: Railway or Render are the simplest initial FastAPI targets
- Android: EAS Build later
- iOS: out of scope for now

## Resume Framing
Full app:
> FireBuddy | React, FastAPI, Supabase, OpenAI API, Supabase pgvector
> Built a Singapore-focused personal finance app with a React web frontend, Supabase-backed expense tracking, FastAPI APIs, and a pgvector-powered financial advisor over CPF and Singapore finance documents.

Categorisation:
> Prototyped transaction parsing and auto-categorisation via OpenAI API. User inputs a description and the app suggests structured expense fields for review before saving.

RAG:
> Implemented a Supabase pgvector-based RAG pipeline with OpenAI embeddings to enable natural language querying over CPF and Singapore finance reference documents.

## Out Of Scope For Now
- Telegram bot integration
- iOS App Store submission
- AWS-heavy infrastructure work
- Analytics and account-depth features before the core flow is stable
- Income tracking before the core expense flow is solid
