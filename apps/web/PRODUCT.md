# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

FireBuddy primarily serves Singapore based emerging FIRE planners, roughly 25 to 39 years old, who want to understand their everyday finances and build a credible path toward financial independence.

Users must still receive useful account, transaction, category, spending, wealth, and insight workflows when they have not completed a FIRE profile.

## Product Purpose

FireBuddy helps Singapore users understand their everyday finances and turn them into an explainable path toward financial independence.

Success means users can keep their financial records current, understand their financial position, distinguish historical facts from projections, and identify practical next steps without needing specialist financial knowledge.

## Positioning

FireBuddy combines useful everyday personal finance tracking with deterministic, explainable FIRE planning and source backed Singapore finance education.

Its FIRE projections come from structured financial records and explicit assumptions. Ember explains curated Singapore finance sources, while authoritative totals and projections remain the responsibility of deterministic services rather than a language model.

## Operating Context

The active product is a responsive React web application used with Singapore dollar accounts, income and expense transactions, categories, wealth positions, dated wealth snapshots, invested contributions, and FIRE assumptions.

Users authenticate with Supabase, manage their records through the FastAPI application API, review dashboard summaries and insights, configure an explainable FIRE projection, test temporary scenarios, and ask Ember educational questions about topics such as CPF, CPFIS, Singapore Savings Bonds, IRAS reliefs, Singapore investing basics, and FIRE planning.

The web app is the current public product and portfolio surface. The Expo mobile app is deferred until the web experience and shared contracts are stable.

## Capabilities and Constraints

- Supabase Auth is the only authentication system.
- Signed in application data is stored in Supabase Postgres and accessed through authenticated FastAPI routes.
- Accounts, typed income and expense transactions, categories, wealth records, FIRE profiles, and essential category selections are scoped to the authenticated user.
- Stored transaction amounts remain positive. Clients apply the display sign using the transaction type.
- Payment accounts remain separate from balance sheet wealth positions.
- Invested contributions never count as expenses.
- FIRE projections use structured records and explicit assumptions, distinguish facts from estimates, and remain unavailable when required inputs are incomplete.
- Temporary FIRE scenarios do not save records.
- Expense category suggestions require an explicit user action, remain reviewable and overridable, and never save a transaction automatically.
- Ember provides cited educational answers from curated Singapore finance sources. It does not inspect personal accounts or transactions, calculate authoritative personal FIRE results, retrieve live prices, change records, or provide regulated financial advice.
- Explicit demo mode may use versioned browser local state. Normal signed in app data must not silently fall back to local storage.
- Plan and Goals are later product areas. They must not be represented as completed functionality until implemented.
- Direct bank connections, stored banking credentials, payment execution, investment execution, live market feeds, and recurring payment execution are outside the current scope.
- The first public deployment follows the required responsive browser acceptance and signed in account isolation smoke checks.

## Brand Commitments

The product name is FireBuddy. The current product descriptor is `SG FIRE Tracker`.

`@myfirequest` belongs to the same brand identity, but it should not be foregrounded in product surfaces, copy, or branding unless the user explicitly requests it.

The product voice should be clear, warm, practical, and careful with financial claims. It should explain limitations and uncertainty directly without presenting educational information as regulated advice.

## Evidence on Hand

- `PROJECT_BRIEF.md` is the repository level source of truth for current product direction, architecture, and roadmap.
- `docs/PRD.md` contains detailed product requirements, phased acceptance criteria, and backlog.
- `docs/design/firebuddy-dashboard-roadmap.png` is the primary dashboard visual reference.
- `apps/web/src` contains the implemented responsive web application and user facing copy.
- `packages/shared` contains shared contracts and deterministic financial calculation helpers.
- `apps/backend` contains the protected application APIs, analytics, FIRE services, AI categorisation, and Ember RAG services.
- `supabase/migrations` contains the application schema, ownership protections, row level security, and private RAG storage.
- Web, backend, shared contract, migration security, and versioned RAG evaluation coverage exists in the repository.
- No testimonials, customers, press coverage, investment performance claims, or regulated advisory credentials are established. Future work must not fabricate them.

## Product Principles

1. Everyday usefulness comes first. Core finance tracking must work without FIRE setup.
2. Explain the path. Show how records and assumptions produce summaries, projections, and recommended next steps.
3. Keep facts, estimates, and educational guidance distinct.
4. Preserve user control. AI may suggest or explain, but it must not silently change records or calculate authoritative totals.
5. Build for Singapore deliberately through relevant terminology, SGD based workflows, and traceable local finance sources.

## Accessibility & Inclusion

The responsive web experience must support keyboard interaction, visible focus states, semantic labels, readable contrast, reduced motion preferences where motion is introduced, and usable layouts across mobile and desktop widths.

Financial information should use plain language, explicit units, clear status labels, and understandable incomplete states so users are not required to infer whether a value is historical, projected, unavailable, or illustrative.
