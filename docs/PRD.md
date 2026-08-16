# FireBuddy Product Requirements Document

Last updated: 15 August 2026

## 1. Purpose and ownership

This document defines FireBuddy's detailed product requirements, delivery sequence, and phased acceptance criteria. It adapts the useful product ideas from the downloaded `FireBuddy_PRD.md` draft to the repository that exists today. The downloaded draft is reference material after incorporation and is not a source of truth.

Documentation ownership is:

| Document | Responsibility |
| --- | --- |
| `PROJECT_BRIEF.md` | Current repository state, high level product direction, architecture, and roadmap summary |
| `docs/PRD.md` | Detailed product requirements, planned interfaces, scope boundaries, and phased acceptance criteria |
| `README.md` | Operational overview, repository diagrams, setup, routes, deployment configuration, and commands |
| `AGENTS.md` | Repository working conventions and implementation guardrails |

When the documents disagree with the file tree, mounted backend routes, or migrations, the implementation is the authority for current behavior. Update the owning document before relying on a conflicting claim.

## 2. Product position

> FireBuddy helps Singapore users understand their everyday finances and turn them into an explainable path toward financial independence.

FireBuddy is a balanced personal finance app with FIRE as its strongest differentiator. Everyday tracking must remain useful before a user completes a FIRE profile. FIRE results must connect historical spending to explicit assumptions and reproducible calculations.

The primary users are:

1. Singapore based working adults who want a clear view of income, expenses, category budgets, and accounts.
2. Early FIRE planners who want a transparent projection before considering more complex CPF assumptions.
3. Recruiters and hiring managers assessing a deployed, technically credible portfolio project.

The first public surface remains the React and Vite web app. The Expo mobile app remains deferred until web contracts and flows are stable.

## 3. Scope language

Every requirement in this PRD uses one of these labels:

| Label | Meaning |
| --- | --- |
| **Current** | Implemented in the repository now. Deployment may still require environment configuration and smoke testing. |
| **Next** | The next product milestone after the current baseline is deployed and verified. No implementation claim is implied. |
| **Later** | Accepted direction after the next milestone. It is not part of current functionality. |
| **Excluded** | Deliberately outside the product direction unless this PRD is revised. |

## 4. Product principles

1. **Balanced utility.** Transaction tracking, categories, accounts, and insights must provide value independently of FIRE setup.
2. **Explainable FIRE.** Every projection shows the inputs, formula assumptions, data period, and calculation status.
3. **Deterministic figures.** Backend functions calculate authoritative totals and projections. A language model may explain structured results but must not create the figures.
4. **Evidence with insights.** Derived analytics should identify their period and eventually link to the supporting transactions.
5. **One assistant.** Users interact with one FireBuddy assistant. Backend routing selects transaction analytics, FIRE calculations, or Singapore finance RAG.
6. **Progressive Singapore depth.** Start with a transparent model without CPF, then add carefully scoped local assumptions only when the base model is trusted.
7. **Human control.** AI category suggestions remain optional, reviewable, and manually overridable. They never save a transaction.
8. **Privacy by design.** Supabase Auth is the only authentication system. Application data is accessed through the backend with user scoping and database protections.
9. **Focused architecture.** Retain React, Vite, FastAPI, Supabase Auth, Postgres, shared TypeScript contracts, and the existing design system.

## 5. Current shipped baseline

### 5.1 Current user experience

The web app currently provides:

1. Supabase signup, sign in, session recovery, and sign out.
2. An explicitly labelled local demo mode that does not mix local sample state with signed in user data.
3. CRUD for persisted accounts. Accounts identify where a transaction occurred but do not store balances.
4. CRUD for typed income and expense transactions. Stored amounts are positive and `transaction_type` controls their meaning and display sign.
5. Read only system categories and CRUD for user owned custom categories.
6. Explicitly typed income and expense categories. Category budgets remain an expense feature and income categories use a zero budget.
7. Expense only Insights with local Day, Week, Month, and Year ranges, charts, category share, and CSV export of the selected expense view.
8. Optional expense category suggestions requested by the user and reviewed before saving.
9. Ember, FireBuddy's educational Singapore finance guide, with locally stored topic history and citations attached to each answer.
10. Clear validation, empty, loading, sync, and error states across the implemented flows where supported today.

The dashboard includes an **illustrative** FIRE snapshot backed by static reference data. It is not a calculation from the user's transactions, accounts, or investments and must not be described as a shipped FIRE calculator.

### 5.2 Current information architecture

Primary navigation remains:

1. Home
2. Transactions
3. Categories
4. Profile

Add transaction remains a modal flow opened from the desktop action or mobile floating action button. It is not a fifth primary tab.

Insights, Accounts, and Ember are secondary routes. Ember appears in the desktop sidebar and a compact Home card, while the mobile navigation remains limited to the four primary tabs. Accounts remains subordinate to Transactions. The routed web surfaces are Auth, Home, Transactions, Categories, Profile, Insights, Accounts, Ember, and Add transaction.

### 5.3 Current backend and data boundary

The current core tables are `profiles`, `categories`, `accounts`, `expenses`, and `rag_chunks`. The `expenses` table stores both income and expense records during the compatibility period.

The current mounted API surfaces are:

1. Public `GET /` and `GET /health` routes
2. `GET`, `POST`, `PUT`, and `DELETE` account routes under `/accounts`
3. `GET`, `POST`, `PUT`, and `DELETE` category routes under `/categories`
4. `GET`, `POST`, `PUT`, and `DELETE` typed transaction routes under `/transactions`
5. `GET`, `POST`, `PUT`, and `DELETE` compatibility routes under `/expenses`
6. `POST /ai/parse-input`
7. `POST /api/chat/financial-advisor`

`/transactions` is the primary typed income and expense API. `/expenses` remains a mounted expense only compatibility API until deliberately retired.

Supabase handles authentication and issues JWTs. Browser clients call Supabase directly only for authentication. FastAPI validates the bearer token, scopes application queries to the authenticated user, and accesses application tables with a backend only secret or service role credential. Row level security and ownership constraints provide an additional database boundary. `rag_chunks` and its retrieval functions are private to backend service role clients.

### 5.4 Current limitations

The following are not implemented:

1. CSV transaction import. The current Insights CSV behavior is export only.
2. A persisted FIRE profile.
3. Transaction derived retirement spending.
4. Deterministic FIRE target or projection calculations.
5. Saved or temporary FIRE scenario calculation endpoints.
6. Savings rate and period comparison APIs with transaction drilldowns.
7. Assistant tools for querying user transactions or FIRE results.
8. Account balances, net worth aggregation, transfers, or investment tracking.
9. Ember access to accounts or transactions, personal FIRE calculations, live prices, regulated financial advice, or action execution.

## 6. Next milestone: FIRE core

The FIRE core starts only after the current authentication, accounts, transactions, categories, insights, AI suggestion, and Ember RAG baseline is deployed and smoke tested.

### 6.1 Next milestone outcome

A signed in user can enter a small set of assumptions, see how transaction derived spending becomes a FIRE target, inspect an explainable projection, and compare one temporary alternative without losing access to the existing finance tracker.

Historical facts and future estimates must be visually distinct. Every derived spending figure must identify its source period. Projection copy must state that results are estimates and not financial advice.

### 6.2 Planned `FireProfile`

Add one `fire_profiles` row per user. The planned persisted fields are:

| Database field | Shared contract field | Requirement |
| --- | --- | --- |
| `id` | `id` | UUID primary key |
| `user_id` | `userId` | UUID owner with a unique constraint so each user has at most one profile |
| `invested_assets` | `investedAssets` | Nonnegative current invested assets entered by the user |
| `monthly_contribution` | `monthlyContribution` | Nonnegative month end investment contribution |
| `expected_return_rate` | `expectedReturnRate` | Expected nominal annual return |
| `inflation_rate` | `inflationRate` | Expected annual inflation |
| `withdrawal_rate` | `withdrawalRate` | Positive annual withdrawal rate used to calculate the target |
| `retirement_spending_override` | `retirementSpendingOverride` | Optional monthly retirement spending entered by the user |
| `birth_year` | `birthYear` | Optional birth year for age context, not a calculation requirement |
| `created_at` | `createdAt` | Creation timestamp |
| `updated_at` | `updatedAt` | Last update timestamp |

An absent spending override means the calculator attempts to use the transaction derived baseline. Existing account rows must not be interpreted as balances because the account model does not store balances.

Currency values are Singapore dollar amounts. Calculation contracts represent annual rates as decimal fractions, such as `0.07` for 7 percent. The API must reject ambiguous or invalid rate ranges, and the UI may display those values as percentages.

The table must follow the existing ownership model: RLS enabled, direct browser Data API grants revoked, backend service role access only, user scoping in FastAPI, and validation in both the API and database where practical.

### 6.3 Planned shared contracts and endpoints

Add shared TypeScript request and response contracts for these planned protected endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /fire/profile` | Return the authenticated user's saved profile or a clear not configured result |
| `PUT /fire/profile` | Create or replace the authenticated user's validated profile |
| `POST /fire/calculate` | Calculate the baseline from the saved profile and the applicable spending source |
| `POST /fire/scenario` | Calculate temporary overrides without modifying the saved profile |
| `GET /analytics/financial-summary` | Return deterministic income, expense, savings, and source period facts needed by FIRE and analytics views |

At minimum, the shared package should own `FireProfile`, `UpsertFireProfileRequest`, `FinancialSummary`, `FireCalculationRequest`, `FireScenarioRequest`, `FireCalculationResult`, `FireCalculationStatus`, and the associated assumption and spending source types. Python schemas must mirror these contracts.

### 6.4 Planned spending baseline

The default retirement spending input is derived as follows:

1. Use expense transactions only. Income never contributes to the spending baseline.
2. Exclude the current partial calendar month.
3. Use up to the last 12 completed calendar months for which transaction history is available.
4. With fewer than 12 completed months, annualise the available completed period and return a limited data warning.
5. Return the inclusive start and end dates, completed month count, expense total, annualised spending, and derivation warning with the result.
6. If no usable completed period exists, return an insufficient data status and prompt for a manual spending override.
7. When a manual override is present, use it and label the spending source as manual rather than transaction derived.

The implementation must define how the first available transaction determines the completed period and test empty months explicitly. The result must provide enough information for a user to reproduce the annualised value.

### 6.5 Planned deterministic calculation

The first calculation model is intentionally simple:

1. Calculate annual retirement spending from the chosen monthly spending input.
2. Calculate the FIRE target as annual retirement spending divided by the withdrawal rate.
3. Calculate real annual return as `(1 + nominal return) / (1 + inflation) - 1`.
4. Convert the real annual return to a monthly rate consistently and document the conversion in code and result assumptions.
5. Project one month at a time, applying portfolio growth first and the contribution at month end.
6. Stop when invested assets reach the target or after 1,200 projected months, which is the documented 100 year horizon.
7. Return a status of `already_reached`, `projected`, `unreachable`, or `insufficient_data` rather than forcing a date.
8. Return the FIRE target, current progress amount and percentage, estimated months to FI, estimated FI year, status, assumptions, warnings, and spending source period.
9. Handle zero contribution and zero or negative real return explicitly. A mathematically unreachable result must return `unreachable`.
10. Keep all currency calculations deterministic and use a documented rounding policy only at presentation or contract boundaries.

The first version excludes CPF, tax, asset allocation, investment account syncing, market data, and probabilistic or Monte Carlo modelling.

### 6.6 Planned temporary scenario

The first scenario flow allows the user to override monthly contribution and retirement spending, then compare baseline and scenario results side by side. Scenario calculation uses the same deterministic service as the baseline.

Running a scenario must not update the saved `FireProfile`, create a scenario row, or modify any transaction. Saved scenarios are a later feature.

### 6.7 FIRE core acceptance criteria

The milestone is complete when:

1. A tracker only user can continue using all current flows without completing a FIRE profile.
2. A user can create, view, and update the one per user FIRE profile.
3. The financial summary and FIRE endpoints validate JWTs and scope all queries to the authenticated user.
4. A user can distinguish transaction facts from future estimates.
5. Every derived spending result names the period and whether it was annualised.
6. The user can inspect assumptions and reproduce the displayed target and projection.
7. A manual spending override clearly replaces the derived baseline.
8. One unsaved scenario compares against the saved baseline without mutating it.
9. The static illustrative FIRE snapshot is replaced or unmistakably separated from the calculated result.
10. Empty, loading, validation, limited data, unreachable, and backend error states are designed and tested.

## 7. Later milestone: CSV import and analytics

### 7.1 Reviewable CSV import

CSV import follows the FIRE core. It must be a review workflow, not a blind file upload:

1. Support a documented FireBuddy template before adding bank specific presets.
2. Validate file size, content type, encoding, header presence, and row count.
3. Detect common column names and let the user map date, description, amount, transaction type, category, and account fields.
4. Support either one signed amount column or separate debit and credit columns with an explicit interpretation preview.
5. Preview valid and invalid rows before any insert.
6. Let the user exclude individual rows and correct reviewable mapping issues.
7. Detect likely duplicates with a documented fingerprint and show the reason for each match.
8. Commit only confirmed valid rows in an authenticated, user scoped backend operation.
9. Report created, skipped, duplicate, and invalid counts and retain enough batch metadata for an audit.
10. Keep imported transactions editable through the normal transaction flow.
11. Protect previews and future exports from spreadsheet formula injection.

### 7.2 Analytics depth

Add deterministic analytics for:

1. Total income and expenses over an explicit period.
2. Savings amount and savings rate with a documented zero income behavior.
3. Current and previous period comparisons.
4. Average monthly expense using a visible source period.
5. Category changes and material contributors.
6. Links or filters that open the exact supporting transactions for a derived result.

Historical calculations must remain expense aware: category budgets and current Insights spending views are expense only. Income is used for income totals and savings rate, not spending totals.

### 7.3 CSV and analytics acceptance criteria

1. Users can map, preview, validate, exclude, and commit rows from the supported template.
2. Duplicate candidates are visible before insertion and behavior is covered by tests.
3. The import report reconciles with the preview decisions and created transactions.
4. Analytics totals reconcile with the supporting transaction set.
5. Every comparison shows the current period, comparison period, and supporting transactions.
6. Empty, loading, invalid file, partial success, duplicate, and backend failure states are clear.

## 8. Later milestone: unified assistant

The current Ember RAG experience later evolves into one routed FireBuddy assistant. Deterministic transaction analytics and FIRE calculations remain later work and must be implemented as backend tools before Ember can explain them. It does not become a collection of user facing specialist agents.

| Question type | Authoritative source |
| --- | --- |
| Transaction total or savings rate | Deterministic database analytics |
| Spending change or supporting records | Deterministic comparison and transaction query |
| FIRE target or FI estimate | Deterministic FIRE calculation result |
| Temporary FIRE comparison | Deterministic scenario result |
| Singapore finance concept | Curated Singapore finance RAG |

The language model receives structured outputs and explains them in plain language. It must not calculate authoritative totals from raw transaction text, invent transactions, assumptions, or citations, or save changes without an explicit product flow.

Answers should identify the user data period and assumptions used. Relevant answers should link to supporting transactions. Educational RAG answers should preserve visible sources. Missing information must produce a clarification or limitation, not a guessed figure.

## 9. Later milestone: selective finance depth

After the unified assistant is reliable, selectively add:

1. Saved FIRE scenarios.
2. FIRE progress history.
3. Recurring transaction detection without initially building a payment scheduler.
4. Carefully scoped CPF balance or contribution assumptions that remain separate from the transparent base result.
5. Selected Singapore CSV presets after the general import workflow is stable.

Generic goal management, a second broad budgeting product, and generic portfolio management remain excluded. Existing category budgets continue to serve the budgeting need.

## 10. User experience and visual direction

FireBuddy keeps its existing information architecture and visual identity. WealthWise is not a visual reference.

The implemented identity includes:

1. A mobile first app column and fixed desktop sidebar.
2. Mobile bottom navigation with a centered Add transaction action.
3. Curved green headers, restrained gradients, overlapping cards, and subtle elevation.
4. The existing green palette, rounded controls, generous spacing, and sentence case copy.
5. Responsive transaction rows and cards, accessible form labels, and clear feedback states.

Future screens must reuse the current design system and hierarchy. FIRE should appear as a strong dashboard result without replacing Home, Transactions, Categories, or Profile. Accounts remains secondary. Insights remains a secondary route and can grow into the planned analytics without becoming a copied dashboard.

The UI must consistently provide:

1. A clear primary result before supporting detail.
2. Skeleton or loading feedback for remote work.
3. Helpful empty states with the next available action.
4. Field specific validation and non destructive recovery from errors.
5. Visually different treatment for historical facts, calculated estimates, warnings, and illustrative data.
6. Plain Singapore dollar formatting and understandable finance language.

## 11. Architecture, security, and trust

Current and planned work must preserve these constraints:

1. React and Vite remain the active web frontend.
2. FastAPI remains the business logic, protected data API, deterministic calculation, AI, and RAG layer.
3. Supabase Auth remains the only authentication system.
4. Postgres remains the data store, with RLS on every user facing table.
5. Frontends use Supabase directly for authentication only and use FastAPI for application data.
6. FastAPI validates Supabase JWTs and scopes every user data query even when using a backend only service role credential.
7. Shared request and response contracts belong in `packages/shared` when clients consume them.
8. Important behavior receives web, shared contract, backend service, route, and migration security tests in proportion to risk.
9. Financial records and secrets must not be written to application logs.
10. AI outputs are educational explanations and projections are labelled estimates, not guarantees or regulated financial advice.

## 12. Functional reference boundaries

[WealthWise](https://github.com/hoangsonww/WealthWise-Finance-Tracker) is a functional reference only.

FireBuddy adopts these ideas in its own architecture and design:

1. Reviewable CSV mapping, preview, validation, duplicate detection, and reporting.
2. Analytics that connect conclusions to supporting transactions.
3. Strong dashboard hierarchy and complete empty, loading, validation, and error states.
4. Shared contracts and comprehensive behavioral tests.
5. An assistant that uses deterministic data tools before explaining results.

FireBuddy deliberately does not copy WealthWise code, visual design, architecture, navigation, or feature breadth. Specifically excluded are:

1. MCP tool sprawl, graph context infrastructure, multiple agent services, or multiple user facing specialist advisors.
2. Kubernetes, Terraform, multi cloud deployment, or infrastructure added for feature count.
3. Custom authentication or migration to NextAuth, Express, MongoDB, or WealthWise's stack.
4. A separate broad budget system, generic financial goals, or a recurring payment scheduler.
5. Pixel for pixel UI copying or feature count competition.

## 13. Explicit product exclusions

The following are excluded from the planned delivery sequence:

1. Direct bank connections.
2. Live market feeds.
3. Investment execution or automated financial actions.
4. Generic portfolio management or account balance aggregation.
5. Detailed CPF LIFE modelling in the first FIRE model.
6. Tax calculations and probabilistic modelling in the first FIRE model.
7. Telegram bot integration.
8. Mobile product work before shared web contracts are stable.

## 14. Delivery roadmap

### Phase 1: Baseline release

Deploy and smoke test the existing authentication, accounts, typed transactions, categories, expense Insights, optional AI category suggestions, and Ember. Verify production environment configuration, JWT handling, ownership, CORS, empty states, citations, local topic history, and the main CRUD journeys.

Exit condition: the current tracker and Ember flows work against the production web, backend, and Supabase environment without mixing demo and authenticated data.

### Phase 2: FIRE core

Add the financial summary, one per user FIRE profile, deterministic calculation service, dashboard result, and one temporary comparison scenario described in section 6.

Exit condition: the FIRE core acceptance criteria and calculation tests pass, and the result remains useful and explainable with partial transaction history.

### Phase 3: CSV import and analytics

Add supported template import, column mapping, preview, validation, duplicate detection, import reporting, savings rate, period comparisons, and transaction drilldowns.

Exit condition: import and analytics acceptance criteria pass and all totals reconcile with persisted transactions.

### Phase 4: Unified assistant

Route questions among deterministic transaction analytics, deterministic FIRE results, and Singapore finance RAG. Add structured explanation cards, evidence links, data periods, assumptions, and safe limitation handling.

Exit condition: behavioral tests show that the correct source handles each supported intent and the model does not invent authoritative figures.

### Phase 5: Selective finance depth

Add saved FIRE scenarios, progress history, recurring transaction detection, and carefully scoped CPF assumptions. Continue deferring generic goals and a separate full budgeting product.

## 15. Test plan

### 15.1 Documentation checks

1. Every feature is identified as Current, Next, Later, or Excluded.
2. Current routes, tables, scripts, and navigation match the repository.
3. No future feature appears as completed portfolio work.
4. No copied WealthWise code or visual specification is introduced.

### 15.2 FIRE calculation tests

1. Normal projection with a positive real return and contribution.
2. User already at or above the FIRE target.
3. Zero monthly contribution.
4. Zero real return.
5. Negative real return.
6. Projection that is unreachable within 100 years.
7. Manual spending override.
8. Fewer than 12 completed months of transaction history.
9. Income excluded from the spending baseline.
10. Current partial month excluded from the spending baseline.
11. No usable history without an override.
12. Scenario calculation does not modify the saved profile or transactions.

### 15.3 Product acceptance

1. Users can understand the calculation inputs and reproduce the displayed result.
2. Historical facts and future estimates are visually distinct.
3. Every derived spending result identifies its transaction period.
4. AI explanations consume deterministic results and do not invent figures.
5. The existing finance tracker remains useful without a FIRE profile.
6. All user owned data remains inaccessible across users in route and migration security tests.

## 16. Resume framing

Resume claims must describe only implemented and verified functionality.

### Current, safe to claim

> FireBuddy | React, FastAPI, Supabase, OpenAI API, Supabase pgvector
>
> Built a Singapore focused personal finance app with authenticated account, category, income, and expense workflows, expense insights, optional category suggestions, and Ember, a private hybrid RAG guide over Singapore finance sources.

> Implemented a private hybrid retrieval pipeline using OpenAI embeddings, Supabase pgvector, Postgres full text search, and reciprocal rank fusion, with versioned retrieval and answer evaluations.

### Future portfolio targets, not current claims

After the relevant phases are implemented and verified, future bullets may describe:

1. Deterministic, transaction derived FIRE projections and temporary scenarios.
2. Reviewable CSV import with mapping, validation, duplicate detection, and reporting.
3. A routed assistant that explains database analytics, FIRE calculation outputs, and cited Singapore finance retrieval.

Until then, these remain target outcomes and must not be presented as shipped work.
