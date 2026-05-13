# FireBuddy Project Brief

## Overview
FireBuddy is a Singapore-focused personal finance and FIRE tracker app. It is being built to fill the gap left by MyMoneySense shutting down, with CPF-specific workflows, local financial instruments, expense tracking, and later FIRE projection tools.

The product supports:
- Primary role: AI Engineer
- Fallback role: SWE
- Brand tie-in: `@myfirequest`

Build strategy:
- Web first for early deployment and job applications
- Mobile later, after the core web experience is working

## Current State Vs Target State
Current repo state:
- The repo now uses a root monorepo layout with `apps/`, `packages/`, and `docs/`
- `apps/mobile/` contains the current Expo implementation
- `apps/web/` and `apps/backend/` are scaffolded target surfaces that will replace ad hoc experimentation over time

Target repo state:
- `apps/web` for the active React + Vite frontend
- `apps/mobile` for the Expo + React Native mobile app
- `apps/backend` for FastAPI
- `packages/shared` for shared TypeScript types, hooks, Supabase helpers, and API-call wrappers

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend (web) | React + Vite (TypeScript) | Public-facing web app and resume URL |
| Frontend (mobile) | Expo + React Native (TypeScript) | Mobile app after the web version is established |
| Backend | FastAPI (Python) | API layer, business logic, and AI feature hosting |
| Database | Supabase (Postgres) | Data storage, auth, and row level security |
| AI - Phase 1 | OpenAI API (GPT-4o mini) | Transaction auto-categorisation from text descriptions |
| AI - Later phases | OpenAI Vision, LlamaIndex or LangChain, FAISS or Chroma | Receipt scanning and RAG over CPF or finance documents |
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

Automation:
- `handle_new_user()` creates a profile row on signup
- `update_updated_at()` updates expense timestamps on change

## Auth And API Direction
Responsibility split:
- Supabase handles signup, login, sessions, and JWT issuance
- FastAPI verifies Supabase JWTs on protected requests
- Frontends call Supabase directly for auth and call FastAPI for application data and AI features

Planned FastAPI routes:
- `GET /expenses`
- `POST /expenses`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`
- `GET /categories`
- `POST /categories`
- `DELETE /categories/{id}`
- `POST /ai/parse-input`

## Screen Plan
Build order:
1. Add Expense
2. Dashboard
3. Transactions
4. Categories
5. Profile
6. Analytics

Navigation:
- Bottom tab bar with `Home`, `Transactions`, `Categories`, and `Profile`
- `Add Expense` is launched from a floating action button, modal, or sheet flow rather than a main tab

## AI Roadmap
Phase 1:
- Transaction auto-categorisation from a user-entered description
- Flow: user enters description, backend asks OpenAI for a suggested category, user can accept or override before saving
- Model choice: `GPT-4o mini`

Later phases:
- Natural language single-field parsing such as `Chicken rice $4.50`
- Receipt scanning with vision
- RAG over CPF and financial documents

## Delivery Phases
Phase 0:
- Establish the repo direction and core scaffolding
- Run a working frontend flow that can write an expense through the intended stack
- Confirm Supabase schema, RLS, and seed data are in place

Phase 1:
- Add transaction auto-categorisation
- Keep the flow end to end and functional before polishing

Phase 2:
- Build and validate a standalone RAG prototype first
- Then integrate CPF and financial document Q&A into the app
- Deploy the web app to a public URL

Phase 3:
- FIRE projections
- Spending analysis
- UI polish
- Broader feature refinement

Post-Phase 3:
- Continue evolving the Expo app in `apps/mobile` around shared logic extracted into `packages/shared`

## Local Development Direction
During the target-state workflow, expect three concurrent dev surfaces:

```bash
# backend
cd apps/backend
uvicorn main:app --reload

# web
cd apps/web
npm run dev

# mobile, later
cd apps/mobile
npx expo start
```

Until the web-first migration is complete, expect the implemented mobile surface in `apps/mobile/` to be ahead of `apps/web/` in raw UI coverage.

## Deployment Direction
- Web: Vercel is the simplest target for a public resume URL
- Backend: Railway or Render are the simplest initial FastAPI targets
- Android: EAS Build later
- iOS: out of scope for now

## Resume Framing
Full app:
> FireBuddy | React, FastAPI, Supabase, OpenAI API, LlamaIndex, FAISS
> Built a Singapore-focused personal finance app featuring transaction auto-categorisation via OpenAI API and a RAG-powered CPF and financial documents Q&A chatbot.

Categorisation:
> Implemented transaction auto-categorisation via OpenAI API. User inputs a description and the app suggests a category in real time using GPT-4o mini.

RAG:
> Implemented a RAG pipeline using LlamaIndex and FAISS to enable natural language querying over financial documents.

## Out Of Scope For Now
- Telegram bot integration
- iOS App Store submission
- AWS-heavy infrastructure work
- Analytics and account-depth features before the core flow is stable
- Income tracking before the core expense flow is solid
