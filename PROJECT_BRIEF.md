# FireBuddy Project Brief

## Overview
FireBuddy is a balanced Singapore-focused personal finance app with FIRE as its strongest differentiator.

> FireBuddy helps Singapore users understand their everyday finances and turn them into an explainable path toward financial independence.

The primary audience is a Singapore based emerging FIRE planner, roughly 25 to 39 years old. Everyday account, transaction, category, budget, and insight workflows must remain useful without a FIRE profile.

The real data dashboard foundation is implemented with wealth positions, dated snapshots, contributions, deterministic financial summaries, and an explainable FIRE projection. Ember now routes questions to bounded read-only data tools, curated Singapore finance RAG, or both. The first public deployment waits for the remaining manual localhost browser and signed in account isolation smoke. Spending Plan, Life Goals, CSV import, recurring detection, and deeper Singapore planning follow in phases. `docs/PRD.md` owns the detailed requirements and backlog.

The product supports:
- Primary role: AI Engineer
- Fallback role: SWE
- Brand tie-in: `@myfirequest`

Build strategy:
- Web first for early deployment and job applications
- Mobile is now the active focus (October 2026). Web work is paused until the owner resumes it; the web app stays deployed as is

## Mobile privacy direction (October 2026)

The phone app is private by default and collects nothing unless the user turns AI on.

- **Records stay on the phone.** Every transaction, account, position, snapshot and plan lives in on-device storage. The phone never writes records to Supabase, and there are no mobile data routes to wire. Backup is a passphrase-encrypted file the user saves themselves.
- **No sign-in screen.** Users never create an account or give an email. On first launch DouDou asks "How should we address you?"; the answer is a nickname (required on the welcome since 8 Oct 2026, with no Skip) stored only on the phone (`firebuddy_mobile_profile_v1`), never sent to DouDou or the backend, and kept when data is reset.
- **First run and tour.** After the launch intro, a welcome screen asks for the nickname, then the country (and currency), then offers an eight-step spotlight tutorial led by DouDou (Add, Wealth, Planner, Insights, DouDou, Transactions, Categories, Profile) with Skip, Back and Next. Home greets the user by nickname on every launch and shows one dismissible DouDou tip a day. Profile lets the user change the name, country and currency, and "Replay Tutorial".
- **Terms and privacy.** The welcome's first step has two stacked tick boxes, "I agree to the Terms of use" and "I've read the Privacy policy" (plus a "not financial advice" line); Continue stays off until both are ticked, each document ends with a Back button, and finishing the welcome records the accepted version on the phone. Installs that accepted an older version, or none, see a one-time "We've updated our terms" sheet with the same two tick boxes; its Continue stays off until both are ticked. Both documents open from Profile → About, which also has Contact us. The privacy policy leads with an "At a glance" summary: records stay on the phone, no account, no trackers, DouDou off until turned on. Copy lives in `packages/shared/src/legal.ts` and still needs legal review before public launch.
- **AI is one choice: Off or On.** The phone does not show the three web levels. Off is the default.
  - **Off:** no account exists and the app makes no network calls.
  - **On:** tapping "Turn on DouDou" after reading the consent text creates an invisible anonymous Supabase session. It holds a random id, the AI level (`personalised`) and the consent time, and exists only so the backend can rate-limit each phone and check consent. A user who never turns Ember on never gets a session; one who turns it on and later off has it deleted through `DELETE /account`.
- **AI gets relevant data only when needed, otherwise none.** The phone decides per question which parts of the aggregate snapshot the question needs (spending, cash flow, net worth, emergency fund, FIRE) and sends only those, masked as tokens with a rough range. A general question sends no figures at all. Transaction descriptions, account names and exact amounts never leave the phone.
- **Security of the anonymous session:** a signed Supabase JWT verified by FastAPI, kept in the phone's Keychain or Keystore, refreshed hourly, sent only over HTTPS in production. Anyone can mint anonymous sessions, so Supabase's per-IP anonymous sign-in limit applies now and a CAPTCHA on "Turn on DouDou" is the fallback if abuse appears.
- See `docs/PRIVACY.md` for the user-facing consent text and the data flow.

## Mobile direction update (6 October 2026)

Decided by the owner after the first-run test round. Mobile only; the web app is unchanged.

- **Singapore first, a general mode for everyone else.** The welcome asks "Where do you live?" right after the nickname. Singapore keeps the full app: CPF, SRS and HDB positions, CPF LIFE income in the FIRE Planner, Singapore tips and a Singapore DouDou. Any other country gets the general mode: the user confirms a currency (pre-filled from the country) and every amount is shown in it; CPF, SRS and HDB position types, the CPF LIFE block and Singapore tips are hidden; "Other retirement income" is labelled "Pension and other income"; DouDou answers from general principles, says its sources are Singapore-focused, and never applies CPF or SRS rules. Country and currency are stored on the phone with the nickname, sent to DouDou only as the country code, and can be changed in Profile. Existing users without a country are treated as Singapore. Per-country rule packs (for example Malaysia EPF) are a later option, not part of this change.
- **Real users start empty.** A new production install starts with no records (standard categories and one Cash account). The demo dataset, "Start fresh" and "Load demo data" exist only in development builds, for testing. Production Profile offers "Delete all my data" instead.
- **Recurring transactions.** When adding a transaction the user can set it to repeat weekly, monthly or yearly, with an optional end date (salary, rent, subscriptions). Due copies are added automatically and silently the next time the app opens, including any periods missed while the app was closed; a monthly rule on the 31st lands on the last day of shorter months. Rules are managed on the Transactions tab (a Recurring view): edit (including adding, changing or removing the end date), pause, resume or stop. Transactions created by a rule carry a small repeat mark. This records transactions only; FireBuddy never moves money.
- **Daily reminder.** An opt-in local notification at 9pm asks, in DouDou's playful voice, whether today's spending has been logged. It is skipped on days where something is already logged, never mentions amounts, and is scheduled on the phone (no push server, nothing leaves the device). It can be turned off in Profile. Expo Go (SDK 53+) cannot load `expo-notifications`, so the reminder, its prompt and its Profile switch exist only in development and release builds; in Expo Go they are hidden.
- **FIRE types.** The planner offers Lean (60% of recent spending), Regular (100%), Fat (150%), Coast, Barista and Custom, chosen from a dropdown and saved with the plan. Coast FIRE shows a Coast age, when you can stop investing (the first month your investments could grow to the full target by retirement with no further contributions; its ideal date when the current plan falls short), and the retirement age you typed, when you stop working. This follows DBS and The Financial Coconut. The Coast FIRE goal card was removed on 10 Oct 2026. Barista FIRE adds part-time income from retirement until a chosen age, which lowers the target. Since 10 Oct 2026 the birth date and income start and stop dates are years only (stored as YYYY-MM, January for a new value; an existing month is kept), and Try a scenario asks for the year you stop working. CPF LIFE copy and maths were checked against the CPF Board on 6 October 2026 ([CPF LIFE](https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life), [deferring payouts](https://www.cpf.gov.sg/member/infohub/educational-resources/should-you-defer-your-cpf-life-payouts)): payouts start from 65 and can be deferred to 70, about 34% more by 70 on CPF's own table; the Escalating plan starts lower and rises 2% a year for life; the Standard plan pays a level amount; the Basic plan pays less and may decline once balances run low; from the 10 Oct 2026 review it is counted as a level payout with a warning (PRD 6.6.1 rule 19), instead of being left out. Added from the same review of SG FIRE Planner and Tree of Wealth (PRD 6.6.1 rules 18 to 21): "Not sure" about CPF LIFE becomes an estimate from CPF's own payout table (checked 10 Oct 2026; S$1,780 a month from 65 or S$2,380 from 70 on the 2026 FRS of S$220,400, so deferring adds about 34% by 70, not quite 35%) and the start age, so CPF is no longer left out; one-off costs and money coming in (home downpayment, car, policy payout, downsizing) on a chosen year. Everything else from that review is listed in PRD 10.1. From the owner's own SG FIRE Planner run (PRD 6.6.1 rules 22 to 27), the planner also asks:
  - Citizen, PR or neither (neither means no CPF);
  - gross pay and bonus months;
  - spending now;
  - CPF OA, SA and MA balances, projected to 55 with CPF's 2026 rates;
  - property and the OA used for the home loan;
  - an insurance and healthcare line that grows faster than inflation.

  It shows the take-home savings rate and what saving 10% more of your pay does to the FIRE date. The phone also gains a built-in Insurance expense category.

  Since 10 Oct 2026 Edit plan asks for one 5% investment return (a switch adds a lower after-retirement return) and 3% inflation, both editable and deliberately conservative. Barista part-time income is typed in today's money and grows by a yearly pay rise (default: inflation). An optional yearly increase raises the monthly investment as pay grows. The Planner shows today's money first (PRD 6.6.1).
- **Debts.** A debt records the balance owed (each change is a dated value; re-saving a date replaces that day's value), an optional original loan amount (repaid = original minus owed, shown as "% repaid"; there is deliberately no separate "amount repaid" input), and an optional "Pay it off by" month. With an interest rate, FireBuddy works out the fixed monthly payment that clears the debt by that month (same monthly compounding as the payoff projection, rounded up to the cent) and compares it with the current payment.
- **Linked balances.** A cash or bank balance in Wealth can be linked to a FireBuddy account (a label such as "DBS savings", not a bank connection). Its value is the last balance the user entered plus income and minus expenses logged on that account since then, so logging a salary moves net worth. Every account with transactions also counts by itself (income minus expenses from S$0) until a Wealth balance follows it, so +S$1,000 into Cash shows S$1,000 net worth without opening Wealth. Entering a new balance resets the starting point. Investments, CPF, property, debts and credit cards stay manual for now. Until anything is in Wealth, the Home hero shows a small caption, "Add your savings in Wealth to see your net worth." Details in PRD 6.4.1.
- **Accounts.** Accounts can be added straight from the transaction form (always the last option in the account list), edited, made the default, and deleted. Deleting an account that transactions use, or the default, first asks which account takes its transactions over.

## Retirement planner update (September 2026)

Everyday finances now remain on Home and expense Insights. FIRE Planner at `/fire` owns versioned monthly cash flow projections, CPF income gaps, drawdown, assumptions and one unsaved scenario. `/fire/setup` provides five resumable steps with separate draft and active plans. Essential expense categories now live on `/plan`; wealth remains separate. Existing profiles require confirmation before producing new results. Desktop adds FIRE Planner after Goals; the four mobile tabs remain unchanged.

See [the implemented method and migration notes](docs/FIRE_PLANNER.md). The later roadmap descriptions below predate this update where they refer to CPF layers and a Plan placeholder. Browser visual acceptance remains pending; the new migration is local and has not been deployed.

## Current State Vs Target State
Current repo state:
- The repo now uses a root monorepo layout with `apps/`, `packages/`, and `docs/`
- `apps/web/` is the active React and Vite frontend
- `apps/web/` includes Supabase auth, income and expense tracking, read-only system categories, persisted accounts, expense-only insights, wealth and FIRE setup, a real data dashboard, optional expense category suggestions, Ember with streamed cited answers and a page-aware quick-chat launcher, and versioned demo-only local state
- `apps/backend/` is a FastAPI backend with mounted accounts, typed transactions, compatibility expenses, categories, wealth, FIRE, analytics, AI suggestion, health, and Ember JSON and SSE RAG routes
- `apps/mobile/` contains the Expo app: the design-system shell (four tabs with the gold Add tile, bottom sheets), Home, Transactions, Categories, Profile, Add transaction, Wealth, FIRE Planner, Insights, Accounts, Plan and Ember chat, with every record kept on the device. The mobile app ships no placeholder screens: Life Goals waits until after the first Play Store test, and the only notification is the opt-in 9pm logging reminder. Ember's Off/On consent, anonymous session and per-question data selection follow the mobile privacy direction above
- `packages/shared/` contains shared TypeScript contracts, deterministic demo FIRE calculations, category data, add-expense helpers, API route constants, the client-side masking session, the device snapshot builder, and the encrypted backup format
- `supabase/` contains timestamped SQL migrations for the UUID-aligned app schema, persisted accounts, typed transactions, wealth and FIRE records, security, HNSW indexing, and private hybrid RAG retrieval
- `docs/Figmamake/` remains a visual reference, not production source code
- `docs/design/firebuddy-dashboard-roadmap.png` is the primary visual reference for the current dashboard

Ongoing repo direction:
- `apps/web` remains the active React and Vite frontend
- `apps/mobile` is the active Expo and React Native app, local-only for records, with Ember as the only network feature
- `apps/backend` remains the FastAPI API, business logic, AI, and RAG layer
- `packages/shared` grows into the shared TypeScript type, helper, Supabase utility, and API wrapper layer used by both frontends

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend (web) | React + Vite (TypeScript) | Active public-facing web app and resume URL |
| Frontend (mobile) | Expo + React Native (TypeScript) | Active app; records on the device, Ember optional |
| Backend | FastAPI (Python) | API layer, business logic, and AI feature hosting |
| Database | Supabase (Postgres) | Data storage, auth, and row level security |
| AI - Current RAG | OpenAI embeddings and chat, Supabase pgvector, Postgres full text search | Ember, a source-backed educational Singapore finance guide |
| AI - Categorisation | OpenAI API (GPT-4o mini) | Optional expense category suggestions for user review |
| AI - Routed assistant | Structured-output planning, deterministic backend analytics and FIRE services, and current Ember RAG | One bounded assistant that explains structured results or uses Singapore finance RAG |
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
- **Mobile: Gold Standard (owner, 9 October 2026).** Navy `#001D3D` heroes (`#003566` in dark mode) on a cool white `#F6F7FA` canvas (charcoal `#212226` with `#27282D` cards in dark mode, from 10 Oct 2026), gold `#FFC300` for the Add tile and primary buttons with black text, gold `#FFD60A` highlights, near-black or white main text and solid grey secondary text. DouDou is a golden bean with green leaves, and the app icon is DouDou on navy. Details in `DESIGN.md` → "Mobile palette: Gold Standard". The values below are the paused web app's forest palette.
- Canvas (web): pale green-white `#F2F4EC`
- White work surfaces: `#FFFFFF`
- Primary text: `#202820`
- Secondary text: `#626B63`
- Forest actions and links: `#25543D`, with white action text
- Selected surfaces: `#E7EFE8`
- Borders: `#D8DFD7`
- Ember accent: `#B6532B`
- Keep income, expense, warning, and projection colors separate from brand colors
- `DESIGN.md` and the web CSS tokens specify dark mode and control states

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
- Keep payment accounts separate from balance sheet values, except that on mobile a cash asset may be linked to one account so its balance follows that account's transactions (PRD 6.4.1, 8 Oct 2026)
- Asset and liability wealth positions store liquidity, FI inclusion, emergency fund, and CPF or restricted classifications
- Liabilities (mortgage, loan, credit card, other) may carry optional debt terms: annual `interest_rate`, `monthly_payment`, `next_payment_date`, and `original_principal`. A check constraint keeps these null on assets. The shared `debt` helper in `packages/shared` and `services/debt_calculator.py` project the payoff month and remaining interest from the latest snapshot; the financial summary adds a `debt` block, pulse `debtService`, and `emergencyRunwayMonthsWithDebt`
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
- `GET /profile`
- `PUT /profile/ai-preference`
- `GET /account/export`
- `DELETE /account`

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
3. Expand Ember's deterministic tools to supporting-record drilldowns and temporary scenarios
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
- Ember uses one structured planning call to select a fixed read-only expense summary, spending comparison, financial summary, FIRE projection, financial health review, curated finance RAG, or a hybrid of data and RAG. FastAPI injects the authenticated user ID, tools scope every query to that ID, and only aggregate tool results can enter the answer prompt.
- Every AI call runs behind the user's consent level (`profiles.ai_preference`: `off` by default, `guide`, or `personalised`) and a per-request masking session (`services/ember_masking.py`). The question and history are scrubbed of amounts and the user's own account, position and custom category names; at `personalised` every figure in the aggregate snapshot and tool results becomes a placeholder token plus a coarse band, the model is told to copy tokens verbatim, and the backend restores the real values in the answer, including across streamed deltas. Exact figures, transaction descriptions and user-entered names never reach the provider. Every OpenAI call sets `store=False`. The phone goes one step further: it keeps every record on the device, computes and masks the snapshot itself (`buildPersonalSnapshot` and `MaskingSession` in `packages/shared`), sends `clientMasked` requests the backend forwards untouched, and offers a passphrase-encrypted backup file instead of cloud storage. On the phone the consent is a single Off/On choice stored as `off` or `personalised`, and only the snapshot sections a question needs are attached. See the mobile privacy direction above and `docs/PRIVACY.md`.
- Knowledge answers that would benefit from the user's own numbers (emergency fund sizing, savings rate, FIRE timeline, retirement adequacy, budgeting) attach a bounded aggregate snapshot built from one `build_financial_summary` call and return mode `hybrid` with a `personal_context` evidence entry. The snapshot holds aggregates and the deterministic recommended action only; never transactions, descriptions, or identifiers.
- Ember can explain saved deterministic personal results but cannot change records, generate SQL, run an iterative tool loop, retrieve live prices, or provide regulated financial advice.
- Authenticated category suggestions at `POST /ai/parse-input`, limited to 10 requests per user per 60 seconds by default, available only at the `personalised` level because the typed description leaves FireBuddy (amounts are scrubbed first)
- Knowledge base under `apps/backend/rag/knowledge-base/`
- Ingestion script under `apps/backend/rag/Implementation/ingest.py`
- Retrieval helper under `apps/backend/rag/retrieval.py`, using keyword and vector reciprocal rank fusion
- Source review and publication dates in the generated `apps/backend/rag/source-metadata.json`, surfaced to the answer model as an `As of` line per citation so a stale source loses to a fresher one
- Supabase pgvector schema in `supabase/migrations/20260702161557_rag_pgvector.sql`
- HNSW and private hybrid retrieval migrations in `supabase/migrations/20260814051717_replace_rag_ivfflat_with_hnsw.sql` and `supabase/migrations/20260814052904_add_private_hybrid_rag_retrieval.sql`
- Versioned evaluation reports that preserve each major run instead of overwriting its historical result

Suggestion flow:
- The user enters a description and explicitly requests a suggestion
- The backend can only return a category visible to that user
- The web selector is updated for review, never saved automatically, and remains manually overridable
- Model choice: `GPT-4o mini`

Later:
- Add supporting-record drilldowns and temporary scenario tools after their user experience is validated
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

Current, routed Ember:
- Route one bounded assistant between expense analytics, financial summaries, FIRE results, financial health reviews, and Singapore finance RAG
- Use the language model to plan and explain structured results, never to calculate authoritative totals, generate database queries, or change records

Later, planning depth:
- Add saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, resilience modelling, and progress history

Mobile, now:
- Ship the Off/On Ember consent, the anonymous session and per-question data selection in `apps/mobile`, keeping shared logic in `packages/shared`

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

Mobile now mirrors the web screens with records kept on the device. Ember on the phone needs a configured API base URL plus the Supabase URL and anon key; there is no sign-in screen, and the anonymous session is created only when the user turns Ember on. `apps/mobile/` shares the web design system and the shared demo dataset, so mobile work builds on that shell rather than on a preserved reference.

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
- Payment execution or bank-side scheduling (mobile recurring transactions only record entries on the phone)
- Ember write tools, generated SQL, autonomous tool loops, and access to raw records in answer prompts
- Regulated financial advice and silent AI changes to financial records
- MCP tool sprawl, graph context infrastructure, multiple agent services, Kubernetes, Terraform, and multi-cloud deployment
- Custom authentication or migration away from React, Vite, FastAPI, Supabase Auth, and Postgres
- Pixel-for-pixel copying of external products or feature-count competition
