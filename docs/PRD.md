# FireBuddy Product Requirements Document

Last updated: 4 September 2026

## 1. Purpose and ownership

This document defines FireBuddy's detailed requirements, planned interfaces, delivery sequence, and acceptance criteria. `PROJECT_BRIEF.md` gives the concise repository and product direction. This PRD owns the detailed backlog.

| Document | Responsibility |
| --- | --- |
| `PROJECT_BRIEF.md` | Current repository state, architecture, product direction, and roadmap summary |
| `docs/PRD.md` | Detailed requirements, planned contracts, scope boundaries, calculations, and acceptance criteria |
| `README.md` | Operational overview, setup, routes, deployment configuration, and commands |
| `AGENTS.md` | Repository working conventions and implementation guardrails |

When documentation differs from the file tree, mounted backend routes, or migrations, the implementation is the authority for current behavior. A planned requirement never implies shipped functionality.

## 2. Product position and target user

> FireBuddy helps Singapore users understand their everyday finances and turn them into an explainable path toward financial independence.

The primary user is a Singapore based emerging FIRE planner, roughly 25 to 39 years old, who has begun earning, saving, or investing but lacks a reliable view of net worth, monthly momentum, or the path to financial independence. The product must also remain useful to a tracker only user who has not configured FIRE assumptions.

Secondary audiences are people building confidence with Singapore finance concepts and recruiters assessing a deployed portfolio project. The active surface is the React and Vite web app. Mobile remains deferred until shared web contracts and core flows are stable.

The dashboard must answer four questions in this order:

1. Where am I now?
2. When might I reach financial independence?
3. How am I doing this month?
4. What is the most useful next action?

## 3. Scope language

| Label | Meaning |
| --- | --- |
| **Current** | Implemented in the repository now. Production may still need configuration and smoke testing. |
| **Next** | Approved immediate followup that is not implemented yet. |
| **Later** | Approved direction after the dashboard foundation. Not current functionality. |
| **Excluded** | Outside the delivery sequence unless this PRD changes. |

## 4. Product principles

1. **Balanced utility.** Transactions, categories, payment accounts, and expense insights remain useful without FIRE setup.
2. **Explainable figures.** Deterministic services calculate authoritative totals and projections. The UI exposes periods, inputs, assumptions, and status.
3. **Evidence before advice.** Analytics and recommended actions identify their evidence and a relevant product action.
4. **Honest data states.** Historical facts, projections, warnings, and incomplete data are visibly distinct. Illustrative numbers never appear as user results.
5. **Singapore relevance.** Currency, CPF classification, and educational content reflect a Singapore context without regulated advice claims.
6. **One Ember.** Ember routes supported questions to deterministic analytics, FIRE calculations, scenario results, or curated Singapore finance retrieval.
7. **Human control.** AI suggestions are optional and reviewable. They never silently save or change financial records.
8. **Focused architecture.** Keep React, Vite, FastAPI, Supabase Auth, Postgres, and shared TypeScript contracts.
9. **Private by default.** Every user owned record and calculation is authenticated and owner scoped.

## 5. Capability inventory

### 5.1 Current web experience

Repository inspection confirms these **Current** capabilities:

1. Supabase sign up, sign in, session recovery, reset password, and sign out.
2. Explicit demo only local state, separate from authenticated data.
3. CRUD for payment accounts. They identify where transactions occur but do not hold balances.
4. CRUD for typed income and expense transactions. Stored amounts are positive and `transaction_type` defines their meaning.
5. Read only system categories and CRUD for user owned custom categories.
6. Typed expense and income categories. Current `monthly_budget` applies to expenses, while income categories require zero.
7. Expense only Insights with Day, Week, Month, and Year ranges, charts, category share, and CSV export.
8. Optional expense category suggestions that require explicit user action and review before saving.
9. Ember with an empty opening transcript, starter topics, streamed answers, per answer citations, and searchable local topic history in a responsive right rail or drawer.
10. Real data Home dashboard with net worth, savings rate, emergency fund runway, explainable FIRE progress, monthly spending, Monthly Money Pulse, one deterministic next action, and transparent recent transaction indicators.
11. Wealth position, dated snapshot, and contribution management, separate from payment accounts.
12. FIRE assumptions, essential expense category selection, and nonpersistent contribution or retirement spending scenarios.
13. Full versioned local demo state for wealth and FIRE records, clearly labelled as local demo data.

### 5.2 Current navigation, backend, and schema

The **Current** desktop navigation is Home, Transactions, Categories, Plan, Goals, and Profile, with Ember visually separated. Plan and Goals are honest Later placeholders. Mobile keeps exactly Home, Transactions, Categories, and Profile. Insights, Accounts, Wealth, and FIRE setup are secondary routes. Add transaction is a desktop action and mobile floating action.

The **Current** core tables are `profiles`, `categories`, `accounts`, `expenses`, `wealth_positions`, `wealth_position_snapshots`, `wealth_contributions`, `fire_profiles`, `essential_expense_categories`, and `rag_chunks`. The `expenses` table stores typed income and expense transactions during compatibility.

The **Current** mounted API surfaces are:

1. `GET /` and `GET /health`
2. Account CRUD under `/accounts`
3. Category CRUD under `/categories`
4. Primary typed transaction CRUD under `/transactions`
5. Expense only compatibility CRUD under `/expenses`
6. `POST /ai/parse-input`
7. `POST /api/chat/financial-advisor`
8. `POST /api/chat/financial-advisor/stream`
9. Wealth position and snapshot CRUD under `/wealth/positions`
10. Wealth contribution CRUD under `/wealth/contributions`
11. `GET /analytics/financial-summary`
12. Essential category selection and FIRE profile under `/fire/essential-categories` and `/fire/profile`
13. Saved baseline and temporary scenario calculations under `/fire/calculate` and `/fire/scenario`

Supabase Auth issues JWTs. The frontend uses Supabase directly for authentication only. FastAPI validates bearer tokens and scopes application queries. Row level security and ownership checks provide a second boundary. RAG storage and retrieval remain private to backend service role clients.

### 5.3 Status summary

| Capability | Status | Notes |
| --- | --- | --- |
| Auth, accounts, transactions, categories, Insights, AI suggestion, Ember | **Current** | Implemented, subject to production configuration and smoke testing |
| Wealth positions, snapshots, contributions, financial summary, real FIRE dashboard | **Current** | Implemented locally; manual responsive browser smoke remains before deployment |
| Spending Plan and Life Goals | **Later** | Approved monthly planning milestone |
| CSV import, expanded analytics, drilldowns, recurring detection | **Later** | Data depth milestone |
| Unified data aware Ember | **Later** | Requires deterministic services first |
| Saved scenarios, Coast FI, CPF layers, retirement income, sensitivity, resilience | **Later** | Planning depth |
| Bank connections, live feeds, payment execution, investment execution | **Excluded** | Outside planned scope |

## 6. Current: dashboard foundation before first deployment

The dashboard foundation is **Current** in the repository. Automated web, backend, calculation, migration, RLS, and local database checks pass. The first public deployment remains blocked until the manual localhost browser journey and signed in two user smoke complete. Existing tracker and Ember behavior remain unchanged.

### 6.1 Target navigation

The **Current** desktop sidebar order is Home, Transactions, Categories, Plan, Goals, Profile, then a visually separated Ember entry. Log out and Add Transaction remain at the bottom.

Mobile keeps exactly four tabs: Home, Transactions, Categories, and Profile. Add transaction remains a floating action, modal, or sheet. Plan, Goals, Ember, Accounts, and detailed Insights remain secondary mobile flows.

### 6.2 Target Home dashboard

The **Current** layout uses [design/firebuddy-dashboard-roadmap.png](design/firebuddy-dashboard-roadmap.png) as its primary visual reference. It is adapted responsively and accessibly rather than copied as fixed pixels.

The dashboard order is:

1. FIRE Progress with actual and projected paths, beside monthly spending breakdown.
2. Monthly Money Pulse with income, expenses, savings, one stacked income allocation bar, and one deterministic next move when available.
3. Recent transactions beside Monthly Money Pulse, with transparent anomaly indicators when enough evidence exists.

The monthly spending solid pie follows the supplied mobile chart reference and shows the four largest expense categories, combining the remainder into an `Others` segment. Every visible segment, including `Others`, must retain its complete category name and percentage connected to that exact segment by one straight radial leader line in the matching slice colour. The label and line endpoint follow the slice midpoint rather than a separately adjusted lane, keeping the connector geometrically straight. A visible gap separates each line endpoint from its text. Category names must never be cropped or shortened with an ellipsis. Narrow layouts wrap long names at a word boundary, and labels must remain inside the card without overlapping at desktop, tablet, and mobile widths. The total expense amount sits above the pie so the chart remains visually clear. Hovering or selecting a slice moves it, its straight connector, and its label slightly outward as one unit while exposing its exact SGD value. The movement must respect the user's reduced motion preference. View More opens the complete detailed Insights breakdown. The detailed view must repeat the same pie and include a matching row for every visible segment with its percentage, category name, colour, and actual SGD spending amount.

Home must not contain a large Goals or Ember panel because both have dedicated pages. Compact contextual links are acceptable when they support a result or empty state.

When real data is unavailable, cards show setup prompts and direct actions such as Add a wealth position, Categorise transactions, or Set FIRE assumptions. They never substitute mockup figures.

### 6.3 Visual data states

| State | Meaning | Required presentation |
| --- | --- | --- |
| Historical fact | Persisted records for a named period or date | Solid treatment, visible period or date, drilldown where relevant |
| Projection | Facts plus explicit assumptions | Distinct line or surface, estimate label, assumptions access |
| Warning | Result exists but needs attention | Amber treatment, reason, recovery action |
| Incomplete data | A trustworthy result cannot be produced | No invented number, setup prompt, missing inputs |

Forecasts expose the spending period, wealth snapshot dates, nominal return, inflation, real return, withdrawal rate, contribution timing, and horizon. Warnings must not rely on color alone.

### 6.4 Wealth positions and snapshots

The **Current** implementation stores wealth positions separately from existing payment accounts. Payment accounts and transaction ownership remain unchanged. A wealth position represents an asset value or outstanding liability for balance sheet and FIRE calculations.

| `WealthPosition` field | Requirement |
| --- | --- |
| `id`, `userId` | UUID identity and owner |
| `name` | User facing name |
| `positionKind` | `asset` or `liability`; liabilities store positive outstanding amounts |
| `positionType` | Extensible type such as cash, investment, property, mortgage, loan, CPF, or other |
| `liquidityClass` | `liquid`, `less_liquid`, or `restricted` |
| `includeInFi` | Whether value contributes to investable FI assets |
| `isEmergencyFund` | Whether eligible liquid value contributes to emergency runway |
| `restrictionType` | `none`, `cpf`, or `other_restricted` |
| `currency` | `SGD` initially |
| `isArchived` | Preserves history while hiding an inactive position |
| `createdAt`, `updatedAt` | Audit timestamps |

`WealthPositionSnapshot` stores `id`, `userId`, `wealthPositionId`, `valueDate`, `amount`, `createdAt`, and `updatedAt`. Calculations use the latest snapshot on or before their effective date. Snapshots preserve actual net worth and FIRE history. Archiving or deletion must not silently erase historical totals.

### 6.5 Wealth contributions

`WealthContribution` is a **Current** dedicated record with `id`, `userId`, `wealthPositionId`, `contributionDate`, `amount`, optional `note`, `createdAt`, and `updatedAt`.

Contributions are not expenses and are not generic transfers. This prevents invested totals from inflating spending. A later reconciliation may connect them to transaction evidence, but the first implementation must avoid double counting.

### 6.6 FIRE profile and current contracts

`FireProfile` remains one row per user but no longer stores duplicated current investable assets. That value comes from eligible wealth snapshots.

Planned fields are `id`, `userId`, `monthlyContribution`, `expectedReturnRate`, `inflationRate`, `withdrawalRate`, optional `retirementSpendingOverride`, optional `targetFiDate`, optional `birthYear`, `createdAt`, and `updatedAt`.

Current shared TypeScript contracts are:

1. `WealthPosition`
2. `WealthPositionSnapshot`
3. `WealthContribution`
4. `FinancialSummary`
5. `MonthlyMoneyPulse`
6. `RecommendedAction`
7. Revised `FireProfile`, `FireCalculationRequest`, `FireScenarioRequest`, `FireCalculationResult`, `FireCalculationStatus`, assumption, warning, and spending source types

Python schemas mirror client consumed contracts. `FinancialSummary` reports its effective date, net worth components, investable assets, emergency eligible assets, savings facts, essential spending source, runway, FI progress, freshness, warnings, and source periods. `MonthlyMoneyPulse` reports month, income, spending, savings amount, savings rate status, invested amount, and completeness. `RecommendedAction` contains one action type, title, rationale, evidence, direct product destination, limitations, and stable rule identifier.

### 6.7 Current protected endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /wealth/positions` | List owned positions and latest snapshot summaries |
| `POST /wealth/positions` | Create a position |
| `GET /wealth/positions/{position_id}` | Return one owned position |
| `PUT /wealth/positions/{position_id}` | Update classification or metadata |
| `DELETE /wealth/positions/{position_id}` | Archive or safely delete under history rules |
| `GET /wealth/positions/{position_id}/snapshots` | List owned dated snapshots |
| `POST /wealth/positions/{position_id}/snapshots` | Record a dated value |
| `PUT /wealth/positions/{position_id}/snapshots/{snapshot_id}` | Correct an owned snapshot |
| `DELETE /wealth/positions/{position_id}/snapshots/{snapshot_id}` | Remove a snapshot when history rules permit |
| `GET /wealth/contributions` | List contributions by period or position |
| `POST /wealth/contributions` | Record a contribution without creating an expense |
| `PUT /wealth/contributions/{contribution_id}` | Correct an owned contribution |
| `DELETE /wealth/contributions/{contribution_id}` | Remove an owned contribution |
| `GET /analytics/financial-summary` | Return dashboard facts, Monthly Money Pulse, and one recommended action |
| `GET /fire/profile` | Return the saved profile or not configured state |
| `PUT /fire/profile` | Create or replace the validated profile |
| `POST /fire/calculate` | Calculate the saved baseline |
| `POST /fire/scenario` | Calculate temporary overrides without saving them |

All endpoints validate the Supabase JWT, scope queries to the user, reject cross user identifiers, and return explicit missing or stale data states.

### 6.8 Deterministic definitions and examples

Currency calculations keep stored precision. Display rounding occurs only at contract or presentation boundaries under one documented policy.

1. **Net worth.** Latest assets minus latest liabilities. Example: S$320,000 minus S$33,600 equals S$286,400.
2. **Monthly net worth change.** Effective date net worth minus comparable prior month end net worth. Both dates and missing positions are disclosed.
3. **Savings amount.** Income minus expense spending for the month. Wealth contributions do not count as expenses.
4. **Savings rate.** `(income - expense spending) / income`. Example: `(S$6,200 - S$3,180) / S$6,200 = 48.7%`. With zero income, return `unavailable`.
5. **Essential spending.** Expense transactions in user confirmed essential categories over a disclosed completed period.
6. **Emergency runway.** Emergency eligible liquid assets divided by average monthly essential spending. Example: S$31,200 divided by S$6,000 equals 5.2 months.
7. **FI Target.** Annual retirement spending divided by withdrawal rate. Example: S$48,000 divided by `0.04` equals S$1,200,000.
8. **FI progress.** Included investable assets divided by FI Target. Cap the visual bar at 100 percent but preserve the uncapped result. Example: S$223,200 divided by S$1,200,000 equals 18.6 percent.
9. **Real annual return.** `(1 + nominal return) / (1 + inflation) - 1`.
10. **Monthly rate.** `(1 + real annual return)^(1/12) - 1`.
11. **Required monthly investment.** For `n` months and end of month contributions, use `((target - current * (1 + r)^n) * r) / ((1 + r)^n - 1)`, with a zero rate branch. Example: S$223,200 current assets, S$1,200,000 target, 7 percent nominal return, 2 percent inflation, and 16 years requires about S$2,501 monthly.

The FIRE projection applies growth first and contribution at month end, projects monthly, and stops at the target or 1,200 months. Status is `already_reached`, `projected`, `unreachable`, or `insufficient_data`. Results include actual and projected points, target, progress, estimated months and year when available, assumptions, warnings, periods, and effective dates.

### 6.9 Spending baseline

The **Current** retirement spending baseline:

1. Uses expenses only.
2. Excludes the current partial month.
3. Uses up to 12 completed calendar months.
4. Annualises fewer completed months and returns a limited history warning.
5. Returns start and end dates, completed month count, expense total, annualised spending, and status.
6. Returns insufficient data when no completed month is usable and prompts for a manual override.
7. Labels a manual override clearly and never presents it as transaction derived.

### 6.10 Recommended action and transaction indicators

The **Current** dashboard returns at most one recommended action. Rules consider completeness first, then urgent warnings, runway, contribution gap, and FIRE setup. The response names its evidence period and one direct action. The versioned rule engine is deterministic. An LLM does not choose the action or estimate its impact.

Recent transaction anomaly indicators are transparent flags, not fraud claims. Initial rules may identify likely duplicates or amounts materially above a category baseline when sufficient history exists. Each flag exposes its rule, period, and supporting values. With insufficient history, no claim appears.

### 6.11 Required edge states

1. **Zero income.** Show savings amount, return savings rate as unavailable, and explain why.
2. **Missing wealth data.** Do not show net worth, runway, or FI progress. Prompt for a position and snapshot.
3. **Insufficient transaction history.** Show supported current month facts but mark annualised spending, runway, anomaly, and FIRE dependencies as limited or unavailable.
4. **Unreachable FI.** Return `unreachable` after 1,200 months, show no invented year, and identify assumptions that can be reviewed.
5. **Stale snapshot.** A latest applicable snapshot older than 35 calendar days is stale. Show its date and an update action. Keep calculable summaries visible with a warning.
6. **Mixed snapshot dates.** Show the effective date and individual position dates.
7. **No FIRE profile.** Show available historical facts and a setup prompt instead of a projected path.
8. **Backend or validation error.** Preserve entered values, identify the failed operation, and offer a non destructive retry.

## 7. Later: monthly planning

### 7.1 Spending Plan

The existing category `monthly_budget` evolves into a **Later** period based Spending Plan. This is an incremental migration, not a second disconnected budget system.

`SpendingPlan` supports a calendar period, overall expense limit, category limits, projected spending, optional rollover, status, and actual expense totals. Income and wealth contributions stay outside expense plan totals. Migration preserves existing user category limits and documents their first period mapping.

### 7.2 Life Goals

Life Goals are an approved **Later** capability with a dedicated Goals page. A goal stores target amount, target date, current progress, contributions, status, and an optional eligible wealth position link. Goal contributions do not automatically become expenses.

Initial statuses are `draft`, `on_track`, `at_risk`, `achieved`, and `paused`. Emergency fund designation may support an emergency goal, but the underlying value has one authoritative source.

### 7.3 Monthly planning acceptance

1. Overall and category limits reconcile with expense transactions for a named period.
2. Projected spending identifies evidence and differs visually from actual spending.
3. Optional rollover is explicit and testable.
4. Existing category budgets migrate without silent loss.
5. Goal progress and contributions reconcile with source records.
6. Recommended actions may link to Plan or Goals but never silently change them.

## 8. Later: data depth

CSV import is **Later** and follows a review workflow: supported template, column mapping, amount preview, validation, row exclusion, duplicate candidates, confirmed commit, and reconciliation report. It protects previews and exports from spreadsheet formula injection and keeps imported transactions editable.

Expanded analytics are **Later**. They include explicit period totals, savings trends, comparisons, average monthly expense, material category changes, and links to exact supporting transactions. Spending and plan totals remain expense only.

Recurring detection is **Later**. It identifies likely subscriptions and bills using reviewable merchant, amount, and interval evidence. It does not create, schedule, or execute payments.

## 9. Current: routed Ember

Routed Ember is **Current**. It uses one structured planning call, one fixed read-only data tool when needed, optional curated retrieval, and at most one final answer generation call. It is a bounded orchestrator, not an autonomous or iterative agent.

| Question type | Authoritative source |
| --- | --- |
| Transaction total, monthly pulse, or savings rate | Deterministic analytics |
| Spending change or anomaly summary | Deterministic comparison or financial health tool |
| FI target, progress, or estimate | Deterministic FIRE result |
| Temporary comparison | Later deterministic scenario tool |
| Singapore finance concept | Curated Singapore finance RAG |

FastAPI supplies the authenticated user ID after JWT verification. The planner cannot supply identity fields or SQL, each tool scopes its queries to that server identity, and answer prompts receive aggregate facts rather than raw transaction rows. Browser conversation history is partitioned by account. Ember explains structured results in plain language and never silently changes data. Answers identify periods and assumptions. Missing inputs produce a limitation or setup request.

## 10. Later: planning depth

Approved **Later** capabilities are saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, resilience modelling, and deeper FIRE progress history.

CPF and other restricted balances remain distinct from pre retirement liquidity. Singapore statutory assumptions are versioned with official sources and effective dates. Probabilistic outputs are conditional estimates, not guarantees.

## 11. Design, architecture, and trust

The FireBuddy mockup is the primary visual reference. Preserve the green identity, warm professional tone, curved headers, restrained gradients, thin borders, rounded surfaces, whitespace, and sentence case. Desktop follows the target sidebar. Tablet and mobile reflow the same hierarchy without changing the four mobile tabs.

The **Current** Ember route is a focused two region reading workspace. Its flexible conversation canvas uses distinct user and cited assistant surfaces with a grounded bottom composer. Searchable local conversation history sits in a right rail from `1180px` and becomes a keyboard accessible right drawer below that width. The dedicated answer guide panel is not part of this layout; essential scope and educational guidance remain visible in the empty state and composer note.

Charts need text summaries, keyboard reachable details, and non color distinctions. Currency defaults to Singapore dollars. Dates and assumptions use plain language.

All **Current**, **Next**, and **Later** work keeps these constraints:

1. React and Vite remain the active web frontend.
2. FastAPI owns protected APIs, deterministic rules, AI routing, and RAG.
3. Supabase Auth remains the only authentication system.
4. Postgres remains the data store with RLS on every user facing table.
5. The frontend calls Supabase directly only for authentication and FastAPI for application data.
6. Shared client consumed contracts belong in `packages/shared`.
7. New user owned tables and derived services receive ownership and cross user isolation tests.
8. Financial records and secrets are not written to application logs.
9. AI output is educational. Projections are estimates, not guarantees or regulated advice.

## 12. Functional reference boundaries

[WealthWise](https://github.com/hoangsonww/WealthWise-Finance-Tracker) is a functional benchmark only. FireBuddy may learn from its dashboard hierarchy, budgets, goals, recurring detection, analytics, CSV review, and data grounded assistance.

FireBuddy must not copy WealthWise source code, architecture, branding, navigation, or pixel level design. FireBuddy retains its own design, Singapore focus, FIRE differentiation, React and FastAPI architecture, and phased scope.

## 13. Explicit exclusions

These capabilities are **Excluded**:

1. Direct bank connections or stored banking credentials
2. Live market feeds
3. Payment scheduling or execution
4. Investment execution or automated record changes
5. Generic brokerage portfolio management
6. Regulated financial advice
7. Custom authentication or migration from React, Vite, FastAPI, Supabase Auth, and Postgres
8. MCP tool sprawl, multiple user facing agent services, graph infrastructure, Kubernetes, Terraform, or multi cloud work added for feature count
9. Telegram integration and iOS App Store submission in the active roadmap
10. External product source copying or pixel for pixel replication

## 14. Delivery roadmap

### Phase 0: Current baseline

Maintain the **Current** tracker and Ember functionality. Do not reintroduce illustrative FIRE figures as user results.

### Phase 1: Current dashboard foundation before first deployment

Wealth positions, snapshots, contributions, financial summary, revised FIRE profile, deterministic calculations, temporary scenarios, dashboard states, and target navigation are implemented. Complete the remaining manual localhost browser and signed in account isolation smoke before public deployment.

Exit condition: section 15.2 passes and no dashboard metric depends on illustrative data.

### Phase 2: Later monthly planning

Evolve category budgets into Spending Plan and add Life Goals.

### Phase 3: Later data depth

Add reviewable CSV import, expanded analytics, drilldowns, anomaly depth, and recurring detection.

### Phase 4: Current routed Ember

The bounded planner, expense tools, financial summary, FIRE projection, financial health review, hybrid RAG path, provenance UI, and account-scoped history are implemented. Supporting-record drilldowns and temporary scenario tools remain later.

### Phase 5: Later planning depth

Add saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, and resilience modelling.

## 15. Test and acceptance plan

### 15.1 Documentation acceptance

1. Every capability is Current, Next, Later, or Excluded.
2. Current routes, migrations, scripts, and navigation match the repository.
3. Planned interfaces are not presented as implemented.
4. Local design references are versioned in the repository.
5. No WealthWise code, architecture, branding, or pixel specification is copied.

### 15.2 Localhost acceptance before first deployment

1. Displayed net worth, savings rate, runway, invested total, FI target, FI progress, and projection reconcile with seeded real records and documented formulas.
2. Desktop, tablet, and mobile preserve readable hierarchy and required navigation.
3. Empty, loading, missing setup, limited history, zero income, stale snapshot, unreachable FI, validation, and backend error states are tested.
4. Historical facts are visibly distinct from projections and warnings.
5. Data periods, snapshot dates, and FIRE assumptions are exposed.
6. Setup prompts replace unavailable figures.
7. Wealth contributions never increase expense spending.
8. Payment accounts remain unchanged and are never treated as balances.
9. Temporary scenarios do not mutate saved financial data.
10. Route and migration security tests prove account isolation for all new identifiers.
11. Existing web, shared type, backend, migration, and Ember regressions remain green.
12. A localhost smoke journey covers auth, transaction entry, wealth setup, snapshot update, contribution entry, FIRE assumptions, dashboard reconciliation, responsive layouts, and sign out.

### 15.3 Calculation tests

1. Assets and liabilities net worth
2. Historical net worth with mixed snapshot dates
3. Month change with missing comparable snapshots
4. Savings rate with positive and zero income
5. Emergency runway with zero essential spending
6. Manual and transaction derived retirement spending
7. Fewer than 12 completed transaction months and no usable history
8. Already reached, projected, unreachable, and insufficient FIRE statuses
9. Zero contribution and zero or negative real return
10. Required investment with positive and zero monthly rates
11. Stale and current snapshots
12. Contributions remaining separate from expenses
13. Scenario calculation without persistence
14. Recommended action precedence and stable evidence

## 16. Resume framing

Resume claims describe only **Current** implemented and verified functionality.

> FireBuddy | React, FastAPI, Supabase, OpenAI API, Supabase pgvector
>
> Built a Singapore focused personal finance app with authenticated transaction workflows, a dated asset and liability ledger, deterministic net worth and cash flow summaries, and an explainable FIRE projection, plus Ember, a private hybrid RAG guide over Singapore finance sources.

Spending Plan, Life Goals, CSV import, recurring detection, data aware Ember, and deeper planning remain future portfolio targets until implemented and verified. Public deployment still requires the manual localhost acceptance steps in section 15.2.

## 17. FireBuddy user stories

| Rank | User Story | Priority |
| --- | --- | --- |
| 1 | As a user, I want to **add income and expense transactions** so that I can keep track of my finances. | Must |
| 2 | As a user, I want to **import transactions via CSV** so that I don't have to enter everything manually. | Must |
| 3 | As a user, I want to see my **monthly income, expenses and savings** so that I can understand my cash flow. | Must |
| 4 | As a user, I want to see my **current net worth** so that I can understand my overall financial position. | Must |
| 5 | As a user, I want to **set a FIRE target** so that I have a financial-independence goal to work toward. | Must |
| 6 | As a user, I want to see my **progress toward my FIRE target** so that I know how close I am to financial independence. | Must |
| 7 | As a user, I want to see my **spending by category** so that I can understand where my money goes. | Must |
| 8 | As a user, I want to **ask FireBuddy questions about my financial data in natural language** so that I can easily understand my finances. | Must |
| 9 | As a user, I want FireBuddy to provide **personalized insights based on my financial data** so that I can improve my FIRE progress. | Must |
| 10 | As a user, I want to **set monthly/category budgets** so that I can control my spending. | Should |
| 11 | As a user, I want to see **budget vs actual spending** so that I know whether I'm staying within my budget. | Should |
| 12 | As a user, I want to see my **net worth over time** so that I can understand my long-term financial progress. | Should |
| 13 | As a user, I want to **compare spending across different months** so that I can identify changes in my spending habits. | Should |
| 14 | As a user, I want FireBuddy to **detect duplicate CSV transactions** so that importing files doesn't create duplicate records. | Should |
| 15 | As a user, I want to **search and filter my transactions** so that I can quickly find specific financial records. | Should |
| 16 | As a user, I want to **export my transactions to CSV with their assigned tags/categories** so that I can back up, analyze, or reuse my financial data outside FireBuddy. | Should |
| 17 | As a user, I want to **edit or delete transactions** so that I can correct mistakes in my financial records. | Should |
| 18 | As a user, I want to **preview transactions before importing a CSV** so that I can verify the data before adding it. | Could |
| 19 | As a user, I want to receive **warnings when I am approaching or exceeding my budget** so that I can adjust my spending. | Could |
| 20 | As a user, I want to **adjust my FIRE assumptions** so that my FIRE projections reflect my circumstances. | Could |
| 21 | As a user, I want FireBuddy to explain **why my spending or savings changed compared with previous months** so that I can understand changes in my financial behaviour. | Could |
