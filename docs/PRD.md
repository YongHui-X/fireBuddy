# FireBuddy Product Requirements Document

Last updated: 3 October 2026

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

Secondary audiences are people building confidence with Singapore finance concepts and recruiters assessing a deployed portfolio project.

### 2.1 Platform direction

Decided 3 October 2026: **FireBuddy is a mobile app.** The Expo and React Native app in `apps/mobile` is the only active product surface, released Android first through Google Play. This replaces the 17 September 2026 plan to ship responsive web first and build the native app only once it needed the Play Store or a native capability.

The React and Vite web app in `apps/web` is **frozen**. It stays in the repository as a working reference implementation of every flow, and its tests must stay green when shared code changes. It receives no new features or design work and is not a launch target.

| Surface | Status | Rule |
| --- | --- | --- |
| `apps/mobile` (Expo, React Native) | **Active** | The product. All new user facing work starts here. |
| `apps/backend` (FastAPI) | **Active** | Unchanged role: protected data, deterministic calculations, AI routing, RAG. |
| `packages/shared` | **Active** | Business logic, contracts, and DouDou's art. New client logic lands here before either app uses it. |
| `apps/web` (React, Vite) | **Frozen** | Reference only. Fix it only when a shared change breaks it. |

Most business logic already lives in `packages/shared`, and the mobile app already has every main screen on local demo data. The remaining work is the DouDou consent and anonymous session, DouDou's art, and the store release, not a rewrite. Records stay on the phone, so there is no sign in and no backend data wiring (section 2.3). Phase 2 in section 14 defines it.

### 2.3 Mobile privacy and data

Decided 3 October 2026: **the phone collects nothing unless the user turns DouDou on.** This supersedes the managed cloud storage decision in section 11.1 for the mobile app.

1. **Records stay on the phone.** Every transaction, account, position, snapshot, contribution and plan lives in on device storage. The app never writes records to Supabase or the backend. Backup is a passphrase encrypted file the user saves themselves.
2. **No sign in screen.** Users never create an account or give a name or email.
3. **DouDou is one choice, Off or On.** The phone does not offer the web's three levels. Off is the default.

| | Off (default) | On |
| --- | --- | --- |
| Account | None | Invisible anonymous Supabase session, created when the user taps "Turn on DouDou" |
| Network | None | DouDou requests only |
| Leaves the phone | Nothing | The scrubbed question and recent history, plus masked figures only for the parts of the summary the question needs |
| Server keeps | Nothing | A random id, the level `personalised`, and the consent time |

4. **Relevant data only when needed, otherwise none.** The phone picks, per question, which snapshot sections the question needs: spending, cash flow, net worth, emergency fund, or FIRE. It sends only those, masked as tokens with a rough range. A general question sends no figures. If the phone cannot tell, it sends none. A section with no records behind it (no expenses, no wealth positions, no FIRE plan, or no budgets for a budget question) is never sent: when nothing is left, DouDou replies on the phone, with no network call, that the user has no recorded transactions (or wealth, plan, budgets) yet and where to add them; when some sections remain, the answer ends with the same note for the missing ones.
5. **No pass unless DouDou is turned on.** A user who never turns DouDou on never gets an anonymous session. Only a user who turned it on and later turns it off has one to remove: the phone stops AI at once, then deletes the anonymous user through `DELETE /account`.
6. **Why the anonymous session exists:** so the backend can rate limit each phone and check consent. It is a signed Supabase JWT, kept in the Keychain or Keystore, refreshed hourly, and sent over HTTPS in production.

The user facing consent text and full data flow live in `docs/PRIVACY.md`.

### 2.2 DouDou

Decided 3 October 2026: the mascot and the AI guide are one character, **DouDou** (豆豆, "little bean"), a lime sprout bean. DouDou replaces the earlier sun mark as the app icon and replaces the name Ember in every user facing string. Internal identifiers such as the `/ember` route, `ember_*` backend services, and `Ember*` files keep their old names. DouDou's poses, motion, and usage rules live in `DESIGN.md`, and its drawing is shared shape data in `packages/shared/src/doudou.ts`.

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
6. **One DouDou.** DouDou routes supported questions to deterministic analytics, FIRE calculations, scenario results, or curated Singapore finance retrieval.
7. **Human control.** AI suggestions are optional and reviewable. They never silently save or change financial records.
8. **Focused architecture.** Keep Expo and React Native for the app, FastAPI, Supabase Auth, Postgres, and shared TypeScript contracts.
9. **Private by default.** Every user owned record and calculation is authenticated and owner scoped.

## 5. Capability inventory

### 5.1 Current mobile app

The Expo app in `apps/mobile` has these **Current** capabilities, all running on records kept on the phone:

1. A four tab shell (Home, Transactions, Categories, Profile) with a centred lime Add tile, safe area aware on Android and iOS.
2. Home with the net worth hero, Money Pulse, category budgets, spending donut, and recent transactions, plus an app wide control that hides every amount.
3. Transactions with a period stepper, search, filters, a day grouped ledger, details, edit, duplicate, delete, tags, and CSV export through the system share sheet.
4. Categories with breakdown and add and edit, and the Add and Edit transaction sheet.
5. Secondary screens for Wealth, FIRE Planner and plan editing, Insights, Accounts, Plan (essential spending), the AI chat, and a Goals placeholder.
6. Records stored only on the phone in AsyncStorage, seeded from the shared demo dataset. Ledger maths, Insights series, CSV building, essential spending, and formatters come from `packages/shared`.
7. An AI chat that masks on the phone and calls the backend only when a developer API address and access token are configured, and a three level AI consent stored on the device.

These are **Next**, not Current, on mobile: the Off/On DouDou consent with an anonymous session and per question data selection (section 2.3), DouDou in place of Ember in user facing strings, and a Google Play release. Supabase sign in and FastAPI data for records are **Excluded** on mobile by section 2.3.

### 5.2 Frozen web app

The frozen web app implements these capabilities. They set the feature bar the mobile app must reach before release:

1. Supabase sign up, sign in, session recovery, reset password, and sign out.
2. Explicit demo only local state, separate from authenticated data.
3. CRUD for payment accounts. They identify where transactions occur but do not hold balances.
4. CRUD for typed income and expense transactions. Stored amounts are positive and `transaction_type` defines their meaning.
5. Read only system categories and CRUD for user owned custom categories.
6. Typed expense and income categories. Current `monthly_budget` applies to expenses, while income categories require zero.
7. Expense only Insights with Day, Week, Month, and Year ranges, charts, category share, and CSV export.
8. Optional expense category suggestions that require explicit user action and review before saving.
9. DouDou with an empty opening transcript, starter topics, streamed answers, per answer citations, and searchable local topic history in a responsive right rail or drawer.
10. Real data Home dashboard with net worth, savings rate, emergency fund runway, explainable FIRE progress, monthly spending, Monthly Money Pulse, one deterministic next action, and transparent recent transaction indicators.
11. Wealth position, dated snapshot, and contribution management, separate from payment accounts.
12. FIRE assumptions, essential expense category selection, and nonpersistent contribution or retirement spending scenarios.
13. Full versioned local demo state for wealth and FIRE records, clearly labelled as local demo data.

### 5.3 Current navigation, backend, and schema

The **Current** mobile navigation is exactly four tabs: Home, Transactions, Categories, and Profile, with Add transaction as the centred lime tile that opens a sheet. Wealth, FIRE Planner, Insights, Accounts, Plan, Goals, and the DouDou chat are secondary screens pushed over the tabs. Plan and Goals are honest Later placeholders. The frozen web app reaches the same destinations through a desktop sidebar.

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

### 5.4 Status summary

| Capability | Status | Notes |
| --- | --- | --- |
| Mobile app screens with records on the phone | **Current** | Every main and secondary screen exists in `apps/mobile` |
| Mobile Off/On DouDou consent, anonymous session, per question data selection, DouDou art, Google Play release | **Next** | Phase 2, the path to first release |
| Mobile sign in and backend record storage | **Excluded** | Section 2.3 keeps records on the phone |
| Auth, accounts, transactions, categories, Insights, AI suggestion, DouDou on the backend and frozen web app | **Current** | Implemented, subject to production configuration and smoke testing |
| Wealth positions, snapshots, contributions, financial summary, real FIRE dashboard | **Current** | Backend and frozen web app; mobile computes these on the phone from shared logic |
| Spending Plan and Life Goals | **Later** | Approved monthly planning milestone |
| CSV import, expanded analytics, drilldowns, recurring detection | **Later** | Data depth milestone |
| Unified data aware DouDou | **Later** | Requires deterministic services first |
| Saved scenarios, Coast FI, CPF layers, retirement income, sensitivity, resilience | **Later** | Planning depth |
| Bank connections, live feeds, payment execution, investment execution | **Excluded** | Outside planned scope |

## 6. Current: dashboard foundation before first release

The dashboard foundation is **Current** in the repository. Automated web, backend, calculation, migration, RLS, and local database checks pass. The first public release is the Android app. It is blocked until the mobile app runs on real records kept on the phone and passes the device acceptance in section 15.2. Existing tracker and DouDou behavior remain unchanged.

### 6.1 Target navigation

The app keeps exactly four tabs: Home, Transactions, Categories, and Profile. Add transaction remains the centred tile that opens a sheet, never a fifth tab. Plan, Goals, DouDou, Wealth, FIRE Planner, Accounts, and detailed Insights remain secondary screens. Ask DouDou is reached from Home.

The frozen web app keeps its sidebar order of Home, Transactions, Categories, Plan, Goals, Profile, then a separated Ask DouDou entry. It is not redesigned.

### 6.2 Target Home dashboard

The **Current** layout uses [design/firebuddy-dashboard-roadmap.png](design/firebuddy-dashboard-roadmap.png) as its primary visual reference. It is adapted responsively and accessibly rather than copied as fixed pixels.

The dashboard order is:

1. FIRE Progress with actual and projected paths, beside monthly spending breakdown.
2. Monthly Money Pulse with income, expenses, savings, one stacked income allocation bar, and one deterministic next move when available.
3. Recent transactions beside Monthly Money Pulse, with transparent anomaly indicators when enough evidence exists.

The monthly spending solid pie follows the supplied mobile chart reference and shows the four largest expense categories, combining the remainder into an `Others` segment. Every visible segment, including `Others`, must retain its complete category name and percentage connected to that exact segment by one straight radial leader line in the matching slice colour. The label and line endpoint follow the slice midpoint rather than a separately adjusted lane, keeping the connector geometrically straight. A visible gap separates each line endpoint from its text. Category names must never be cropped or shortened with an ellipsis. Narrow layouts wrap long names at a word boundary, and labels must remain inside the card without overlapping at desktop, tablet, and mobile widths. The total expense amount sits above the pie so the chart remains visually clear. Hovering or selecting a slice moves it, its straight connector, and its label slightly outward as one unit while exposing its exact SGD value. The movement must respect the user's reduced motion preference. View More opens the complete detailed Insights breakdown. The detailed view must repeat the same pie and include a matching row for every visible segment with its percentage, category name, colour, and actual SGD spending amount.

Home must not contain a large Goals or DouDou panel because both have dedicated pages. Compact contextual links are acceptable when they support a result or empty state.

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
| `positionType` | Extensible type such as cash, investment, property, mortgage, loan, credit card, CPF, or other |
| `interestRate`, `monthlyPayment`, `nextPaymentDate`, `originalPrincipal` | Optional debt terms, liabilities only. Rate is an annual fraction. They drive a deterministic payoff projection (payoff month, remaining interest, or a warning when the payment does not cover interest) and the monthly debt service counted in runway. Balance reductions are recorded as snapshots, never as contributions |
| `liquidityClass` | `liquid`, `less_liquid`, or `restricted` |
| `includeInFi` | Whether value contributes to investable FI assets |
| `isEmergencyFund` | Whether eligible liquid value contributes to emergency runway |
| `restrictionType` | `none`, `cpf`, or `other_restricted` |
| `currency` | `SGD` initially |
| `isArchived` | Preserves history while hiding an inactive position |
| `createdAt`, `updatedAt` | Audit timestamps |

`WealthPositionSnapshot` stores `id`, `userId`, `wealthPositionId`, `valueDate`, `amount`, `createdAt`, and `updatedAt`. Calculations use the latest snapshot on or before their effective date. Snapshots preserve actual net worth and FIRE history. Archiving or deletion must not silently erase historical totals.

### 6.4.1 Account-linked balances (mobile, Current since 8 Oct 2026)

**Problem.** Logging income or spending never moves net worth, because transactions and wealth balances are separate records. A new user who logs a salary sees net worth stay at "—" and reads it as a bug.

**Decision.** A cash or bank asset in Wealth can be *linked* to one of the user's FireBuddy accounts (the labels picked on each transaction, such as "DBS savings" or "Cash"). There is no bank connection, no bank login and no network call. Everything stays on the phone.

1. **Value rule.** A linked position's value on a date is its latest manual balance (snapshot) on or before that date, **plus** income and **minus** expenses recorded on the linked account dated after that snapshot and up to the date. Example: a S$5,000 balance on 1 Oct, then a S$3,000 salary on 3 Oct and S$50 lunch on 4 Oct, gives S$7,950 on 4 Oct.
2. **Derived, never stored.** The running value is computed from snapshots and transactions every time. Adding, editing, deleting or back-dating a transaction on the account changes the value at once, and nothing drifts out of step.
3. **Manual balance resets the starting point.** Entering a balance (for example, after checking the banking app) saves a snapshot as today. Transactions on or before that date are treated as already included, and only later ones are added.
4. **Linking (on by default since 9 Oct 2026).** The add and edit form for a cash asset has "Updates from", which starts on the user's default account when no other balance follows it. The other choices are any account not already followed, or "Separate money (not in an account)" for savings the user does not log transactions for, such as a fixed deposit; separate money is counted on its own. A balance includes transactions dated before it and those on its own date saved before it; anything saved later counts. One account links to at most one position.
5. **Unlinking, deleting or archiving.** Unlinking saves the current computed value as a snapshot dated today, so the balance does not jump, and the position goes back to manual. Deleting a linked account (whose transactions move to another account) unlinks it first in the same way. Archiving a position unlinks it.
5a. **Accounts count by themselves (owner, 8 Oct 2026).** Every account with transactions counts toward net worth even if the user never opens Wealth: logging +S$1,000 into Cash makes net worth S$1,000. Until a Wealth balance follows the account, its balance is all income minus all expenses on it, from S$0. It shows in Wealth's assets as the account's name with "Updates from [account]"; below zero it reads with a minus sign ("−S$50"), as does a negative net worth. Tapping it opens the edit form without storing anything; only Save turns it into a normal linked cash balance (its current value becomes today's starting balance). An automatic balance has no Archive: an account's money always counts, and deleting the account is how to remove it. The "Updates from" picker in Wealth can also create a new account ("New account…"), and adding or renaming an account warns when one with the same name already exists. Unlinking or archiving the balance that follows an account restarts the account's automatic balance from S$0 at that moment (`balanceFrom` on the account, owner 9 Oct 2026): the past money stays with the unlinked or archived balance, so nothing counts twice, and anything logged afterwards shows up. Accounts always count by themselves: the earlier rule that switched automatic balances off while any hand-entered cash existed was dropped on 9 Oct 2026, because it silently stopped new accounts from counting. The development demo shows accounts the way a real user sees them (owner, 13 Oct 2026): its savings are two Account assets in Wealth, **DBS Savings** (the emergency fund) and **OCBC 360**, each following its account, instead of one hand-entered "Cash reserve". Each has a balance entered on the 1st of every month for the last six months, as if the user updated it monthly after paying the card bill and investing, and the month's transactions on the account move it from there (the salary lands in DBS Savings). The starting balances (S$8,000 and S$6,000) keep the demo's cash near S$18,000 after this month's transactions. DBS Altitude (a card), GrabPay and Cash keep `trackBalance: false`: cards stay manual (item 6), and the wallets hold only spending, so they would show below zero. Phones holding the older demo see the change after Profile, Load demo data.
5b. **"Account" type in Wealth (owner, 10 Oct 2026).** On the phone, the cash asset type is shown as **Account**, and an Account is always tied to one FireBuddy account by name, in both directions. Adding one asks for a name and a current balance; as the name is typed, matching accounts are suggested, and a name that matches an existing account exactly (ignoring capitals and extra spaces) links to it, while a new name creates the account, which then appears in Accounts and when adding transactions. An account already followed by a Wealth balance cannot be added twice; the form says so. The row shows the account's live name, so renaming the account anywhere renames the row, and renaming the row in Wealth renames the account (with the same duplicate-name check). Accounts added elsewhere keep appearing in Wealth by themselves once they have a transaction. Separate money with no account, such as a fixed deposit, uses the "Other" type. Existing unlinked cash balances keep working and show as cash.
6. **Scope for the first release.** Only cash assets link. Investments, CPF, SRS, property and every debt stay manual. Credit cards stay manual for now: FireBuddy has no transfer type, so paying a card bill from a bank account would count as spending twice. Card linking waits for transfers.
7. **Everywhere uses the same value.** Net worth, the monthly net worth change, the emergency runway, FI progress, the FIRE Planner, Insights and DouDou's masked net worth section all read the linked value through one shared helper in `packages/shared`, so the screens always agree.
8. **What the user sees.** Kept minimal (owner, 8 Oct 2026):
   - The cash asset form has one optional "Updates from" picker.
   - A linked row shows "Updates from [account]" in place of its "As of" date.
   - The empty Home hero shows a small caption: "Add your savings in Wealth to see your net worth."
   - There are no other new buttons or messages.
9. **Implementation.** `withLinkedBalances` in `packages/shared/src/wealth.ts` adds a computed value on each transaction date. The mobile store exposes these as `balanceSnapshots`, which every balance calculation reads, while editing and history read the entered `snapshots`. Unlinking, archiving or deleting the account saves the current value as an entered balance dated today.
10. **Data and backups.** `WealthPosition` gains an optional `linkedAccountId` (null by default; mobile only, never sent anywhere). Older backups without it restore as unlinked. Wealth contributions are unchanged and never count as linked-account transactions.
11. **Not in this change.** No automatic linking, no transfers, no bank feeds, and no change to the frozen web app or the backend schema.

### 6.5 Wealth contributions

`WealthContribution` is a **Current** dedicated record with `id`, `userId`, `wealthPositionId`, `contributionDate`, `amount`, optional `note`, `createdAt`, and `updatedAt`.

Contributions are not expenses and are not generic transfers. This prevents invested totals from inflating spending. A later reconciliation may connect them to transaction evidence, but the first implementation must avoid double counting.

Contributions are never debt repayments. A repayment already appears as an expense transaction; the liability's falling balance is captured with a dated snapshot, and the payoff projection reads from that latest balance. The financial summary exposes a `debt` block (total monthly debt service, highest interest rate, debt-to-income, and a per-liability payoff summary), a `debtService` line in the Money Pulse, and `emergencyRunwayMonthsWithDebt`. The recommended action `pay_down_high_interest_debt` fires after emergency-fund rules when a liability charges more than 6% a year.

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

### 6.6.1 Mobile FIRE Planner (owner, 10 Oct 2026)

The phone runs the shared monthly engine (`calculateRetirement`) on the device. Rules added on 10 Oct 2026:

1. **One return by default.** Edit plan asks for one "Investment return". A "Lower return after I retire" switch reveals the separate after-retirement return for people who plan to move to safer investments. A plan whose two returns already differ opens with the switch on. The engine keeps both fields; with the switch off they are equal. New plans default to 5% (and 3% inflation).
2. **Investing that grows with pay.** An optional "Increase what you invest each year (%)" (`contributionGrowth`, default 0) raises the monthly investment once a year until retirement, the way TaxFly's "increase what you invest each year" and Omni's salary growth work. The required monthly investment is solved for the first year's amount on the same schedule.
3. **Barista income in today's money.** The part-time income is typed in today's money, like spending (`RetirementIncome.priceMonth` records the month it was typed). The engine inflates it to the retirement month, then grows it by "Yearly pay rise (%)", which defaults to the plan's inflation (keeps its buying power). Other incomes without `priceMonth` keep the old rule: the amount is in the money of the month it starts.
4. **Today's money only (owner, 10 Oct 2026).** Every amount on the Planner and in Try a scenario is in today's money: the engine's figure divided by inflation from the end of last month (`todaysMoney` in `hooks/use-fire-plan.ts`), so a S$3,000 budget typed this month reads S$3,000. There is no future-money view and no second set of numbers. The chart is named **FIRE Projection**.
5. **Readable chart.** Round axis ticks, no negative band unless the money runs out, and year labels that never overlap (the retirement label wins, then the depletion year, then the first and last years).
6. **Timeline at a glance.** Each event sits on its own row in date order with the date as the main figure, an age badge and a short "in 19 years" line, instead of one line joined by dots.
7. **Fewer words on screen.** Long explanations on the Planner and Edit plan move behind an (i) button beside the heading that opens the text in a small popup. Warnings, shortfalls and anything the person must act on stay visible.
8. **Year by year table removed.** The chart and the budget card carry the story.
9. **Try a scenario.** After "Compare scenario" the keyboard closes and the sheet scrolls to the comparison, which sits at the top of the sheet.
10. **Stage names follow FIRE calculators (owner, 10 Oct 2026).** Sources: DBS "Is FIRE for you", The Financial Coconut "Coast FIRE in Singapore" and A Brother Abroad's Coast calculator. They agree that Coast means you stop *investing* at the Coast age and keep working, for current expenses only, until the retirement age you choose. Shared `fireStages`:
    - **Lean, Regular, Fat, Custom:** "Retire: stop working".
    - **Coast:** "Coast age: stop investing" (`coastStartMonth`), then "Retire: stop working" at the typed age.
    - **Barista:** "Barista FIRE: go part-time" at the typed age, then "Stop part-time work".
    The stage at the typed age is `primary`. The hero leads with it ("Age 58" / "Stop working in 2045"), and the other stage sits in the hero's (i). There is no "Full retirement" label.
11. **The chosen age stays put** (replaced on 11 Oct 2026 by rule 29: the hero now leads with the realistic FIRE age). The stop-work age is the one the person chose, so investing more does not move it. What moves is "Earliest you could stop working", which the hero also shows when it comes before the chosen age.
12. **Chart colours you can tell apart.** Solid lines: recorded values grey, growth blue, drawdown teal. Dashed lines: each FIRE stage in dark ink, and the month the money runs out in red. Each dashed line has its year at the foot and its age at the top ("Age 47"); neither row of labels overlaps. The amount needed is a dark dot. The axis always starts at zero: when the money runs out the line rests on zero and the red line marks when, with no negative numbers.
13. **Apply a scenario.** After comparing, Try a scenario lists each figure as "Your plan → This scenario", one row per figure, with a change badge. Once something has changed, **Update plan** replaces Compare as the main button in the sheet's fixed footer, so it is always on screen. It saves the scenario to the plan, and changed spending is re-dated to this month.
14. **Calm hero.** The hero shows the FIRE type, then the primary stage: one big figure and one line, "Age 58" / "Stop working in 2045" (Barista: "Go part-time in 2045"). Below that:
    - **On track or Shortfall**, judged by the projection.
    - **A progress bar** of current net worth (Home's figure, `useWealth().netWorth`) against the amount needed, both in today's money, labelled "x% of the way there".
    - **Amount needed** and **Current net worth**, with an (i) on why the plan grows only the ticked assets.
    The projected amount moves to the "You're on track" card. The other stage (Coast age, or Stop part-time work), the earliest date and the inflation note sit behind the hero's (i). The Coast FIRE goal card was removed as confusing.
15. **Years, not months.** Edit plan asks for the year you were born and the years an income starts and stops. Try a scenario asks for the year you stop working, and the month follows the birth month so the age stays whole.
16. **Ideal FIRE timeline (owner, 10 Oct 2026).** "Your FIRE timeline" is the planned path, not a status list. It has one short row per event: label, date and age badge. The rows are:
    - the FIRE stages;
    - CPF LIFE payouts start (Singapore, when included);
    - Money runs out (only if it does);
    - Plan ends.
    A stage the current plan does not reach takes its **ideal date**: the date it would arrive by investing the required monthly amount (a second `useFireProjection` run with that contribution). The chart's dashed stage lines use the same dates. There are no "Not reached" rows, and the earliest date lives in the hero's (i).
17. **CPF LIFE payout in today's money.** The payout is typed as the CPF LIFE estimator shows it: in the dollars of the year payouts start. Edit plan shows "Worth about S$X a month in today's money, which is what your plan shows" under the field, with an (i) explaining why. The planner's budget (i) repeats this.

Rules 18 to 21 come from a review of SG FIRE Planner and Tree of Wealth (owner, 10 Oct 2026) and were built the same day. Scope rule: build only what is essential to the FIRE calculation, a major improvement, or a fix to a mistake in our maths; everything else is listed in section 10.1 with the reason it waits.

18. **Estimate CPF LIFE when the payout is unknown (fix).** Until now "Not sure" left CPF LIFE out entirely, so most Singapore plans needed far more than they should. "Not sure" becomes **Estimate it for me**: the person picks the retirement sum they expect to set aside at 55 (BRS, FRS or ERS; default FRS) and the plan type, and the phone fills the payout from CPF's own published table (shared `cpf-life.ts`, with the source and as-of date in the file). Figures were checked on 10 Oct 2026:
    - **Retirement sums by the year you turn 55** (cpf.gov.sg):

      | Year | BRS | FRS | ERS |
      | --- | --- | --- | --- |
      | 2024 | S$102,900 | S$205,800 | S$308,700 |
      | 2025 | S$106,500 | S$213,000 | S$426,000 |
      | 2026 | S$110,200 | S$220,400 | S$440,800 |
      | 2027 | S$114,100 | S$228,200 | S$456,400 |

      Sums after 2027 have not been announced. For later years they grow with the plan's inflation, a stated assumption.
    - **Payouts.** CPF's "How much CPF payouts can I get every month" (updated 16 Jun 2026) gives Standard plan payouts at 65 and at 70, for a male member, for six retirement account balances at 55. The phone interpolates between those points, so any balance works, not only the three sums:

      | Balance at 55 | From 65 | From 70 |
      | --- | --- | --- |
      | S$50,000 | S$490 | S$670 |
      | S$110,200 | S$950 | S$1,280 |
      | S$150,000 | S$1,250 | S$1,670 |
      | S$220,400 | S$1,780 | S$2,380 |
      | S$300,000 | S$2,380 | S$3,170 |
      | S$440,800 | S$3,440 | S$4,580 |

      For a later cohort the balance is scaled to 2026 money first and the payout scaled back.
    - **Starting later than 65.** CPF says "up to 7%" more for each year deferred, but its own table shows about 34% more at 70, about 6% a year compounded. The phone uses the table: start ages between 65 and 70 grow at the same compound rate. The start-age picker copy changes from "up to 7% more a year" to the table-based figure.
    - **Other plans.** CPF, DBS and POSB say Escalating starts "about 20% lower" than Standard, so the estimate is Standard × 0.8. CPF publishes no Basic figure; older CPF illustrations and third-party calculators put it about 10% below Standard, so the estimate is Standard × 0.9, labelled a rough estimate.
    - **Limits.** CPF's figures are for men; women's payouts are slightly lower. Since rule 22 the screens no longer say so (owner, 10 Oct 2026); they point to CPF's Retirement Payout Planner instead. The estimate is in the dollars of the year payouts start, as rule 17 expects, and is marked *assumed*; typing a figure from CPF's own estimator replaces it. Changing the start age re-estimates an estimated payout, never a typed one. The Planner's assumptions say which sum the estimate used and point to CPF's Retirement Payout Planner. A saved "Not sure" plan is stored as Standard with its plan marked *assumed*, and reads back as "Not sure". The estimate is recomputed whenever the plan runs (`withCpfEstimate`), so a scenario's inflation changes it too.
19. **Count the Basic plan (fix, reverses the 6 Oct 2026 choice).** Leaving Basic out treated its payouts as zero, which overstates the amount needed far more than the late-life decline understates it. CPF says Basic payouts "will get lower when your combined CPF balances eventually fall below $60,000" (CPF plan guide, updated 26 Aug 2026). The engine now counts the Basic payout as a level amount, with the warning "Basic payouts fall once your CPF balances drop below S$60,000, usually late in life. The plan treats them as level." The Python mirror and the shared Basic fixture change together so the parity tests still hold.
20. **Big costs and money coming in.** Edit plan gets a card for one-off amounts on a chosen year: costs (home downpayment, renovation, car, wedding, children's education) and money coming in (a policy or endowment payout, an inheritance, downsizing the home). Quick-add templates fill the label; the person sets the year, the amount in today's money and whether it goes out or comes in. Up to 20 items. They apply before and after retirement: a cost before retirement lowers the projected amount and raises the monthly investment needed; money coming in after retirement lowers the amount needed, but never funds an earlier shortfall (the rule in `docs/FIRE_PLANNER.md`). Stored as optional `lumpSums` on the plan, so plans without them give exactly the same results. The labels people type stay on the phone and never reach DouDou.
21. **Good and bad markets** (withdrawn 11 Oct 2026, rule 30; kept here for the record). The plan is also run 500 times on the phone, just after the Planner draws (a fixed seed so the numbers do not jump between visits), each with yearly returns that swing around the plan's return by "How much your investments swing (%)" (new Assumptions field, default 10%, with an (i)). The 10% default sits between a 60/40 shares-and-bonds mix (about 8–9% a year) and global shares alone (about 13–15%), per CFA Institute data. It matches the cautious 5% default return. A new Planner card says "Works in 78 of 100 markets" and, for a bad market (1 in 10), the age the money would run out, if it does. The chart adds a light band from a bad (1 in 10) to a good (9 in 10) market. The smooth line, the hero and every other figure stay the single expected path, so there is still one set of numbers; the card is how sure that path is. These are estimates from assumed swings, not a guarantee.

Rules 22 to 27 come from the owner's own run through SG FIRE Planner (owner, 10 Oct 2026). The owner chose to project CPF from real balances and to plan healthcare from a new Insurance category. All CPF figures were checked on 10 Oct 2026 and live with their sources in shared `cpf-projection.ts`.

22. **About you.**
    - **Age:** "Year you were born" shows "You're 34 this year" under it.
    - **Residency (Singapore mode):** Citizen, PR, or Neither (on a work pass).
      - **Neither** means no CPF at all. This fixes a mistake: such a person used to get an estimated CPF LIFE payout.
      - **PR** asks "PR since" (year). CPF's graduated rates then apply for the first two years.
      - Tax treatment is not modelled (section 10.1).
    - **CPF figures for men:** the screens no longer mention that CPF's published payouts are for men.
23. **Pay and spending now.** A new "Your pay and spending" card. These figures stay on the phone and never reach DouDou.
    - **Gross monthly pay.** Recorded Salary take-home is shown as a hint.
    - **"I get a bonus":** a toggle, then bonus months (0–24).
    - **Spending now:** pre-filled from the average of up to 12 completed months of records, excluding Insurance and Health, and editable.
    - Lean, Regular and Fat now multiply "Spending now". Retirement spending is labelled "excluding insurance and healthcare" (rule 25).
    - **Two lines on the Planner's "What to do" card:**
      - "You invest X% of your take-home pay." Take-home here means gross pay minus the employee's CPF.
      - "Saving 10% more of your pay (S$X a month) would let you stop working N years earlier." This compares the earliest funded date with and without the extra amount. If neither date exists, it says how much closer the extra brings you instead.
24. **CPF projected from your balances (Singapore, Citizen or PR).**
    - **Payout source.** "From my CPF balances" is the default once balances are typed. The other two choices are "From the retirement sum" (rule 18) and "I'll type CPF's figure".
    - **Inputs:**
      - OA, SA and MA today, dated this month.
      - The sum to set aside at 55.
      - "Do you own property?" (I own one, I plan to buy, No). Own or plan to buy asks for the OA used for the home loan each month, with its from and until years. Plan to buy also offers to add "Home downpayment" to Big costs.
      - "Take out CPF above my retirement sum at 55", off by default.
    - **Shared `projectCpf` works month by month until payouts start.** Figures checked 10 Oct 2026:
      - **Contribution rates from 1 Jan 2026** (cpf.gov.sg), as % of wage, total (employer + employee):

        | Age | Rate |
        | --- | --- |
        | 55 and below | 37% (17 + 20) |
        | Above 55 to 60 | 34% (16 + 18) |
        | Above 60 to 65 | 25% (12.5 + 12.5) |
        | Above 65 to 70 | 16.5% (9 + 7.5) |
        | Above 70 | 12.5% (7.5 + 5) |

      - **PR graduated rates** (G/G) for the first two years, unchanged since 2016 per CPF; table by age from cpfcalculatorsg.com, to be rechecked yearly:
        - Year 1 is 9% up to 60, then 8.5%.
        - Year 2 is 24% up to 55, 18.5% to 60, 11% to 65, then 8.5%.
      - **Allocation from 1 Jan 2026** (CPF allocation PDF, as a ratio of the contribution). MediSave is computed first, then SA or RA, and the rest goes to OA:

        | Age | OA | SA or RA | MA |
        | --- | --- | --- | --- |
        | 35 and below | 0.6217 | 0.1621 | 0.2162 |
        | Above 35 to 45 | 0.5677 | 0.1891 | 0.2432 |
        | Above 45 to 50 | 0.5136 | 0.2162 | 0.2702 |
        | Above 50 to 55 | 0.4055 | 0.3108 | 0.2837 |
        | Above 55 to 60 | 0.353 | 0.3382 | 0.3088 |
        | Above 60 to 65 | 0.14 | 0.44 | 0.42 |
        | Above 65 to 70 | 0.0607 | 0.303 | 0.6363 |
        | Above 70 | 0.08 | 0.08 | 0.84 |

        From 55, the RA share goes to the RA up to the FRS, then to OA.
      - **Wage ceilings:**
        - Ordinary wages: S$8,000 a month (the last planned step).
        - Annual: S$102,000, so the bonus attracts CPF only up to S$102,000 minus the year's ordinary wages.
        - After 2026, pay and ceilings grow with the plan's inflation (a stated assumption).
      - **Interest.**
        - Base rates: OA 2.5%; SA, MA and RA 4% (floor to 31 Dec 2027).
        - Below 55: an extra 1% on the first S$60,000 combined, with at most S$20,000 from OA.
        - From 55: an extra 2% on the first S$30,000 and 1% on the next S$30,000.
        - Extra interest on OA money goes to SA or RA.
        - Interest is credited yearly in the real system, but the phone credits it monthly. The difference is small.
      - **Basic Healthcare Sum:** S$79,000 in 2026, growing with inflation after. MediSave above it overflows to SA below 55 (OA once SA reaches the FRS), and to RA (then OA) from 55.
      - **At 55:** SA closes. The RA is formed from SA and then OA, up to the chosen sum (BRS, FRS or ERS for the cohort, rule 18 table). The rest of SA moves to OA.
      - **Stopping work:** contributions stop when the person stops full-time work. Barista income is treated as earning no CPF.
      - **Payout:** CPF LIFE uses the rule 18 table on the RA balance at the start age, discounted at 4% back to 55. It is then multiplied by the plan factor.
      - **Withdrawal at 55 (if on):** OA and the leftover SA above the chosen sum are added as money coming in at 55 (rule 20).
    - **Not modelled:** MediSave spent on premiums or bills, OA used for anything other than the home loan, and top-ups. The assumptions say so.
25. **Insurance and healthcare.**
    - **The figure:** Edit plan gets "Insurance and healthcare a month (today's money)", pre-filled from the 12-month average of the Insurance and Health categories.
    - **Its yearly rise:** defaults to the plan's inflation + 2%.
      - Singapore's healthcare prices have risen only a little faster than all prices: about 2.35% a year against 2.14% for 2005–2025 (SingStat via smartwealth.sg).
      - The extra 2% is for premiums and visits growing with age. It is an assumption with an (i).
    - **The engine:** adds it to retirement expenses at its own rate, (`healthcare` on the plan, TypeScript only like lump sums; no healthcare gives identical results).
    - **Big events:** surgery and hospital stays are mostly paid by MediShield Life or an Integrated Shield Plan plus MediSave. A known one goes in Big costs ("Medical procedure", new template).
    - **The Planner budget card:** shows a "Healthcare and insurance" row.
26. **Insurance category.** A new built-in expense category, "Insurance" (shield icon), on the phone.
    - New installs get it.
    - Existing installs get it once, unless they already have a category called Insurance.
    - The web is unchanged.
27. **Plan storage.**
    - **New optional plan fields:** `residency`, `prSinceYear`, `pay` {gross, bonusMonths}, `currentSpending`, `cpfBalances` {oa, sa, ma, month}, `property` {status, oaMonthly, fromMonth, untilMonth}, `cpfWithdrawAt55`, `healthcare` {monthlyAmount, growth, priceMonth}, and `cpfEstimate.source` ('balances' or 'sum').
    - **Older plans:** they lack every new field, so they give the same results as before.
28. **A step-by-step plan form (owner, 10 Oct 2026).** The one long Edit plan form became too much for a phone screen.
    - **Planner with no plan:** the empty state's title is "Set up your Financial Independence, Retire Early (FIRE) plan today!", with no message under it. It replaces "Review required".
      - A saved plan that no longer works keeps a warning: "Review your plan", plus what needs fixing.
    - **Screen title:**
      - "Set up plan" opens a screen called **Set up your plan**.
      - "Edit plan" keeps the title **Edit plan**.
    - **Five steps**, one per screen, with "Step 2 of 5" and a progress bar at the top:
      1. **About you:** birth year, retirement age, plan through age, citizen, PR or neither.
      2. **Spending:** pay and bonus, spending now, the kind of FIRE, retirement spending, and insurance and healthcare.
      3. **Investing:** what you have today, the monthly investment and its yearly increase.
      4. **Retirement income:** CPF LIFE (Singapore) and other income.
      5. **Extras (optional):** big costs, money coming in, and assumptions. Save plan is on this step.
    - **Moving between steps:**
      - **Continue** checks only that step's required fields, so mistakes show on the step where they were made.
      - **Back** returns to the previous step.
      - When editing a saved plan, the step labels can be tapped to jump straight to a step, and **Save** is on every step, so a quick change doesn't mean walking through all five (owner chose this, 11 Oct 2026).
      - **Start over:** editing a saved plan also offers "Start over". A confirmation explains that it clears the answers and goes back to step 1, and that the saved plan stays until the new one is saved.
    - **Fewer words on screen:**
      - Field descriptions move into (i) tooltips.
      - Captions stay only for live figures, such as the CPF estimate, your age and your recorded averages, and for warnings.

29. **Plan form and Planner refinements (owner, 11 Oct 2026).**
    - **Privacy note:** the Planner's intro (no plan yet) shows a small bold line under its title: "The information you provide is stored only on your phone." This was checked against `docs/PRIVACY.md`:
      - the plan is kept on the device, and the backend keeps no copy;
      - with DouDou on, only masked totals go with a question, and they are not stored.
    - **Gross monthly pay before CPF:** the new label for the pay field.
    - **Insurance and healthcare as two optional fields:**
      - "Insurance per month" is pre-filled from the Insurance category, and "Healthcare per month" from Health.
      - They share one yearly rise, and the engine adds them together (`healthcare.monthlyAmount`, with `insurance` and `medical` kept for the form).
    - **Required fields must be filled before Continue:**
      - **About you:** birth year, retirement age and plan-through age.
      - **Spending:** retirement spending above 0. Spending now as well, when Lean, Regular or Fat FIRE is chosen.
      - **Investing:** monthly investment (0 is allowed), plus the ticked assets or a typed total.
      - **Retirement income:** gross pay and OA, SA and MA, when CPF is worked out from balances.
      - **Extras:** returns and inflation.
      - A blank required field shows "Required" on the field itself.
    - **Typed total:** "As of which date" is removed. A typed total is dated the day it is saved, and an unchanged total keeps its date.
    - **CPF LIFE choices:**
      - **Two main choices:**
        - **Use my CPF balances:** OA, SA and MA come from Wealth and can't be edited here.
        - **I'll type my own figures:** the same three fields, typed by hand.
      - **"Don't know your balances?"** opens the two fallbacks:
        - **From the retirement sum** (rule 18);
        - **I'll type CPF's payout figure.**
      - Each choice has a short tooltip.
      - OA, SA and MA each sit on their own line, at the current field width.
    - **Wealth CPF accounts:** a CPF position in Wealth records which account it is: OA, SA (RA from 55) or MA (optional `cpfAccount` on the position). Adding CPF asks for no name: it shows three values, OA, SA and MA, each saved as its own line ("CPF OA", "CPF SA", "CPF MA"; rule 32). An account already in Wealth gets the new value as a dated entry instead of a duplicate. Editing a CPF line changes its account and value, and its name follows the account (owner, 11 Oct 2026).
      - The planner adds up the latest values for each account.
      - CPF positions without an account are left out, and the planner says how to fix it.
    - **Typical home prices (plan to buy):** a "Not sure how much? Here is an average" row opens prices for singles and couples. Figures were checked on 11 Oct 2026, before grants:

      | | Singles (from 35) | Couples |
      | --- | --- | --- |
      | BTO, 2026 launches | 2-room Flexi, S$137,000–S$444,000 | 4-room, S$302,000–S$810,000 |
      | Resale, Q2 2026 median | 3-room, S$440,000 | 4-room, S$630,000 |
      | Condo | New 2-bedroom, about S$1.1M (Tengah Garden Residences preview) | Median about S$1.99M (Aug 2026, all sizes) |

      Sources:
      - HDB Feb and Jun 2026 BTO annexes, via PropKaki;
      - HDB and PropKaki Q2 2026 resale medians;
      - Stacked Homes;
      - Homy.sg.

      Prices change every quarter, so the dates are shown.
      - **Purchase year (owner, 11 Oct 2026):** "Plan to buy" asks "Year you'll buy". That year also starts the OA home-loan payments, and the Home downpayment it offers to add falls in that year.
      - **How prices show:** each average is grown by the plan's inflation from 2026 to the purchase year ("about S$520,000 in 2031"), with today's money beside it.
      - **Which figure to type:** big costs are typed in today's money (rule 20), and the engine adds inflation itself, so the tooltip says to type the today's-money figure.
    - **Big costs:** amount and year line up. The labels are shorter ("Amount (S$)", with today's money explained in the tooltip), and the paired fields align at the bottom.
    - **Default return:** 7% for new plans (was 5%). Saved plans keep their figure.
    - **"Investment volatility (%)"** replaces "How much your investments swing". The tooltip explains it in plain words.
    - **Planner hero:**
      - It names the FIRE type plainly ("Regular FIRE").
      - **The headline:** the realistic FIRE age and year, i.e. the earliest month the plan is funded at the current monthly investment.
      - **Under the headline:** the goal age, and how much more a month reaches it ("To retire at 55 as planned, invest S$X more a month").
      - **When the goal is already reachable:** it says so, with the earliest date.
      - This reverses rule 11.
    - **Chart:** the "bad to good market" band and its key are removed. (The card went too, in rule 30.)

30. **Form and Planner clean-up (owner, 11 Oct 2026).**
    - **Insurance and healthcare are yearly inputs:**
      - "Insurance a year" and "Healthcare a year", with no "today's S$" in the label (today's money is explained in the tooltip).
      - The plan still stores monthly amounts (yearly ÷ 12).
    - **Field labels:** a long label wraps, and its "optional" tag and (i) sit right after the text, never past the card's edge. Long labels are shortened, with the detail in the tooltip.
    - **Thousands separators:** amount fields show commas as you type (120,000).
    - **Home is its own step.** The form has six steps: About you, Spending, Investing, Home, Retirement income, Extras.
      - The Home step asks whether you own property, plan to buy, or neither, and when.
      - It shows typical prices and offers to add the downpayment.
      - The OA home-loan payment is asked only for a Singapore citizen or PR.
    - **Typical prices, stacked:**
      - Each price sits on its own lines, so no text or number is left on its own line, cut off from the rest.
      - A purchase this year shows one figure; a later year shows that year's figure with today's beside it.
    - **Good and bad markets removed completely:** the Planner card, the market runs, the volatility field and the shared `fire-risk` module. Rule 21 is withdrawn.
    - **"You're on track" and "Remaining needed amount":** each becomes a short list of labelled figures instead of a paragraph. The pay lines become rows too.
      - On track lists: projected, needed, what you invest a month, and the least you could invest.
      - Shortfall lists: short by, invest instead, and the difference a month.
      - Pay lists: share of take-home invested, and saving 10% more of your pay.

31. **Home budget, Wealth clean-up and labels (owner, 11 Oct 2026).**
    - **Labels:** "Insurance annual premiums" and "Annual healthcare spending" (which has no tooltip). An (i) button's tap area no longer reaches into the field below it.
    - **Plan to buy** asks for:
      - **Home budget** (today's money), with a guide underneath: a 25% downpayment, and the monthly payment on a 25-year HDB loan for the remaining 75% at 2.6%. HDB's loan limit has been 75% since 20 Aug 2024, and the rate is 0.1% above the OA rate.
      - **Downpayment from OA** (citizen or PR): taken from OA in the year you buy, in the CPF projection.
      - **Cash upfront** (any downpayment not from CPF, plus renovation): the phone adds it as its own big cost in that year ("Home: cash downpayment and renovation"). It is not a card in the Big costs list.
      - **Monthly home loan** (paid from OA). It replaces "OA for your home loan a month", and the "Add a home downpayment" button goes.
    - **Wealth:**
      - Rows show no tags (Cash, Counts toward FI, Locked in CPF and so on) and no "As of" date.
      - **Net worth** leaves out CPF that has "Counts toward FI" switched off.
      - "Assets" becomes **Total assets**, which still includes all CPF.
      - The debts figure, the bar and the Debts card show only when there is a debt. Adding a debt stays in the + menu.
      - Home and the FIRE Planner use the same net worth.

32. **Home auto-fill, SA label and Total assets tooltip (owner, 11 Oct 2026).**
    - **CPF SA:** Wealth and the plan form say "SA", not "SA or RA". Few people adding CPF are past 55. Lines saved as "CPF SA or RA" are renamed "CPF SA" when the app loads.
    - **Total assets** has an (i) on Home and in Wealth. In Singapore mode it reads: everything you own, including CPF and your home; net worth leaves out any CPF switched off from counting toward FI. Home's line under net worth shows Debts only when there is a debt.
    - **Annual healthcare spending** gets its tooltip back, so the three healthcare fields line up. The tap-area fix from rule 31 stops the stray pop-up.
    - **Plan to buy:**
      - "Year you'll buy" becomes **Age you'll buy**; the purchase year is the birth year plus that age, shown as "That's 2031." under the field.
      - Typing the **Home budget** (or a reachable age) fills in the other figures, each still editable:
        - Downpayment: 25% of the budget.
        - **Downpayment from OA:** as much of that 25% as OA holds in the year you buy. OA comes from the CPF projection when balances are in, otherwise today's OA from Wealth or as typed. If OA is unknown, the whole downpayment is put on OA and the field asks for CPF balances.
        - **Cash upfront:** whatever OA doesn't cover. The person adds renovation on top.
        - **Monthly home loan:** the 25-year HDB loan at 2.6% on the other 75%, paid from OA. **Loan until** becomes the purchase year plus 25.
      - The OA downpayment is in today's money, so the CPF projection grows it with inflation to the purchase month. A home bought this year takes its downpayment in the first projected month.
33. **Planner wording, shortfall card and Coast age (owner, 11 Oct 2026).**
    - **Before a plan:** "The information you provide is stored only on your phone." is regular text, not bold.
    - **Home price averages** show today's amount only, the same money as the budget: no year-of-purchase price, no "today" line and no source date such as "2026 launches".
    - **Take out CPF above my retirement sum at 55** explains in its (i) that at 55 CPF moves SA, then OA, into a new Retirement Account up to the chosen sum, and anything above can be taken out as cash and added to investments.
    - **Hero:** "Stop working in 2055 on your current plan" becomes **Retirement in 2055** ("Part-time work in …" for Barista). The progress line reads "7% of the amount needed". The goal line names the FIRE type and the monthly amount: "To reach your goal of Coast FIRE at age 40, invest S$2,136 a month instead of S$2,000."
    - **Shortfall:** the "Remaining needed amount" card is removed; the hero's goal line says what to invest. The pay lines stay, in an "Investing from your pay" card. **Try a scenario** moves to the foot of the page, above Review assets and Edit plan.
    - **Coast age:** Coast FIRE asks **Age you'll stop investing** (`coastMonth`). Contributions stop that month and the portfolio only grows until the retirement age. The amount needed to invest each month is worked out over the months until the Coast age, and the goal line uses the Coast age. Before this, a shortfall dated Coast from the "invest just enough" path, which only reaches the goal at retirement, so Coast landed a year or less before retiring. Plans without a Coast age keep the old behaviour. The Python mirror has no Coast age; mobile plans never reach it.
34. **Hero shows progress, Recommended actions shows what to do (owner, 11 Oct 2026).** Replaces the hero and shortfall wording in 33.
    - **Hero:** the big "Age 60" figure and the "Retirement in 2045" line are replaced by one sentence: "You can achieve Regular FIRE by age 60 with your current progress." When the money never lasts, it reads "You're not on track for Regular FIRE yet. The recommended actions below can change that." The progress line becomes "8% achieved". The goal line moves out of the hero. The chip, progress bar, Amount needed, Current net worth and (i) stay.
    - **Recommended actions:** one card, shown whether or not the plan is on track, replacing both "You're on track" and "Investing from your pay". A lead-in, then bullet points (owner, 11 Oct 2026):
      - **Shortfall:** "To reach your goal of Regular FIRE at age 55, it is recommended to do the following:" • Invest S$3,295 a month instead of S$1,500. • Save 10% more of your pay (S$650 a month). No time saved is shown here.
      - **On track:** "You're on track for Regular FIRE at age 55.", the projected amount, the amount needed and what you invest, then "To reach FI faster:" • Save 10% more of your pay (S$650 a month): 1 year 6 months earlier to FI. The time saved appears only here.
      - **Out of reach by investing:** the lead-in says so and suggests a later age, with no bullets.
      - The "Share of take-home pay you invest" line is removed. An "increase your income" action is parked for later.
    - **Projection dip:** the Growing line falls only when money leaves the investments before retiring: a home's cash upfront or a big cost. The maths is right; the chart now marks each with a ring, named in the key with its year ("Home 2031", "Wedding 2029"), samples the months either side so it reads as a step rather than a year-long slope, and the chart's (i) explains it. A Coast plan whose return is below inflation also slopes gently down after the Coast age in today's money; that is real and left as is.
35. **Either-one actions and future dollars (owner, 12 Oct 2026).** Replaces the shortfall bullets in 34.
    - **Shortfall lead-in:** "To reach your goal of Regular FIRE at age 55, it is recommended to do either one of the following:". Every bullet reaches the goal on its own, so none is a partial step:
      - • Invest S$3,557 a month instead of S$1,500.
      - • Retire at age 58 instead of 55: the earliest date on the current monthly investment ("Go part-time at …" for Barista). When that is the same age, the month is named instead ("Retire in March 2056 instead of June 2055"). Not shown for Coast FIRE, whose goal is the age investing stops.
      - • Spend S$3,100 a month in retirement instead of S$4,000: the most monthly spending (today's money) the current plan pays for to the end age, found by searching the spending figure with everything else unchanged.
      - A bullet whose figure can't be found is left out. Then one closing line: "Or mix smaller steps of each in Try a scenario."
    - **Removed from the shortfall list:** "Save 10% more of your pay" (rarely enough alone, and when it is, it is a smaller "invest more") and "increase your income" (it only helps once invested, so it repeats "invest more"). Save 10% more stays in the on-track "To reach FI faster" list, unchanged.
    - **Out of reach by investing:** the same either-one lead-in with whichever of retire later and spend less exist. Only when neither does is it "Your goal of … can't be reached by investing more. Try a later age."
    - **Today's money stays the default** for monthly amounts, net worth and the progress bar. The retirement-date totals get a second row in the same label-and-amount style rather than a caption (owner, 12 Oct 2026): the hero shows "Amount needed (today's $)" and "Amount needed in 2049 (actual $)"; the on-track card shows "Projected by 2049" and "Amount needed" each as a today's $ row and an actual $ row. Actual $ is the figure the account would show in that year.
    - **FIRE Projection and Monthly budget in retirement** each get a **Today's $ | Actual $** switch, one shared choice on the screen, starting on Today's $ and not saved. Actual $ shows each month's amount in that year's dollars (no inflation taken out); the budget subtitle becomes "Per month, in the dollars of that year" and the (i) lines follow the choice.
36. **Typed total can join Wealth (owner, 12 and 13 Oct 2026).**
    - **Hero stays on net worth:** the progress bar and the "Current net worth" row keep Home's net worth (cash, investments and everything else, minus debts), because not everyone invests (owner, 13 Oct 2026; a short-lived "Investments in your plan" row was reverted). The row's (i) sits right after the label.
    - **Net worth (i):** when the plan starts from a typed total, it says the plan starts from the S$X typed on that date, which is not part of net worth, and that ticking "Also add this to Wealth" in Edit plan counts it.
    - **Typed total checkbox:** under the typed total on the Investing step, "Also add this to Wealth", unticked by default, with the hint "Counts in your net worth and updates when you update Wealth."
      - **Ticked, on save:** a Wealth investment called "Investments (from FIRE plan)" is created with the typed amount, dated today, and the plan switches to ticking that asset instead of a typed total, so the plan and net worth follow one figure. From then on it is an ordinary Wealth record. Save works once per visit, so a double press adds nothing twice.
      - **Unticked:** the total stays in the plan only and never counts in net worth, as before.
      - The checkbox shows only while "type your total" is chosen. Records stay on the device.

37. **Plan form: typed total, errors on the field, keyboard (owner, 13 Oct 2026).**
    - **No assets in Wealth:** with no asset that has a value, the Investing step shows the total field straight away and hides "Type my total myself".
    - **Typed total label:** "My total net worth today, excluding CPF" (general mode: "My total net worth today"), with an (i): everything you own minus what you owe, leaving out CPF, which the plan counts on its own. Ticking "Also add this to Wealth" creates "Net worth excluding CPF (from FIRE plan)".
    - **Errors on the field:** a save or Continue problem outlines the field it is about in red, with the message under the first such field (others are outlined only) and still beside the buttons. Income and big-cost cards with a problem get a red edge, and their year and amount fields an outline. Editing clears it.
    - **Keyboard:** on iOS the form scrolls the focused field above the keyboard, so "PR since" stays visible while typing; Android already resizes the window.
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

1. **Net worth.** Latest assets minus latest liabilities. Example: S$320,000 minus S$33,600 equals S$286,400. A cash asset linked to an account uses its linked value (section 6.4.1).
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
2. **Missing wealth data.** Do not show net worth, runway, or FI progress. Prompt for a position and snapshot; on the mobile Home hero this prompt is one caption-size line, not a button.
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

Life Goals are an approved **Later** capability with a dedicated Goals page. The mobile app has no Goals screen until this ships; the placeholder was removed before the first Play Store test. A goal stores target amount, target date, current progress, contributions, status, and an optional eligible wealth position link. Goal contributions do not automatically become expenses.

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

### 8.1 Future plans: Card and Rewards Optimizer

The Card and Rewards Optimizer is **out of scope for the initial beta** and remains a future planning capability. It would use a user's existing spending pattern, such as dining, groceries, transport, and shopping totals, to identify Singapore credit cards whose rewards rules fit that pattern. The purpose is to optimise rewards from existing spending in support of the FIRE goal, rather than encourage additional spending.

FireBuddy cannot know the actual Merchant Category Code (MCC) assigned by a card issuer or payment network when a user manually records a transaction. A future merchant knowledge base may provide an expected or likely category for known merchants, such as McDonald's or FairPrice, but must never present that estimate as the verified MCC of the user's card transaction. Merchants such as Grab may require transaction type or context because different services can map to different categories.

The future card rules dataset would need to represent reward categories, earn rates, minimum monthly spend, caps, exclusions, payment method requirements, eligibility conditions, and effective dates. Recommendations must show the assumptions and source freshness, and must not rely on expired promotions or stale rules. The primary output would be a comparison of cards that fit the user's observed spending, rather than a raw MCC display.

This capability depends on a carefully maintained and traceable Singapore card rewards data source. The calculator itself is expected to be straightforward; the difficult product and operational work is keeping issuer rules, exclusions, caps, minimum spends, and promotional periods accurate over time.

## 9. Current: routed DouDou

Routed DouDou is **Current**. It uses one structured planning call, one fixed read-only data tool when needed, optional curated retrieval, and at most one final answer generation call. It is a bounded orchestrator, not an autonomous or iterative agent.

| Question type | Authoritative source |
| --- | --- |
| Transaction total, monthly pulse, or savings rate | Deterministic analytics |
| Spending change or anomaly summary | Deterministic comparison or financial health tool |
| FI target, progress, or estimate | Deterministic FIRE result |
| Temporary comparison | Later deterministic scenario tool |
| Singapore finance concept | Curated Singapore finance RAG |

FastAPI supplies the authenticated user ID after JWT verification. The planner cannot supply identity fields or SQL, each tool scopes its queries to that server identity, and answer prompts receive aggregate facts rather than raw transaction rows. Browser conversation history is partitioned by account. DouDou explains structured results in plain language and never silently changes data. Answers identify periods and assumptions. Missing inputs produce a limitation or setup request.

### 9.1 Future plans: DouDou that calculates and plans (kept in view)

These ideas are **Later** and wait until after the first Google Play closed test. They come from an October 2026 review of an agent pipeline idea; only the parts that fit the privacy model and need no new provider were kept.

1. **The phone does the maths.** On mobile the AI only sees masked tokens and rough ranges, so it cannot answer "if I save S$500 more a month, when can I retire?" exactly. The planner would instead return which deterministic calculation to run and with which inputs changed; the phone runs it with the shared maths (`retirement.ts`, `essential.ts`) on the real records and shows the exact result. The provider still never sees a figure.
2. **Life Goals become plans.** Builds on item 1 and on section 7.2. A goal such as "4-room HDB flat in 2028, about S$40,000 down payment" turns into a monthly saving amount, its effect on the FIRE date, two or three next steps, and monthly progress tracking.
3. **Fresh official figures with sources.** Run `fetch_figures.py` on a schedule so CPF, HDB and IRAS figures stay current. Every answer that quotes one shows its source and as-of date, and DouDou says when a figure is older than its usual update cycle and links the official page.
4. **Visible steps.** While DouDou works, show short status lines such as "Checking official CPF figures" and "Running your numbers on this phone".

Suggested order: 1, 2, 3, 4. Considered and not planned: switching the planner to NVIDIA Nemotron on Nebius (no problem it solves; a new provider means new privacy terms and a full re-evaluation) and live web search through Tavily (a paid third party that receives questions, with results that still need checking; item 3 covers the need).

## 10. Later: planning depth

Approved **Later** capabilities are saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, resilience modelling, and deeper FIRE progress history.

CPF and other restricted balances remain distinct from pre retirement liquidity. Singapore statutory assumptions are versioned with official sources and effective dates. Probabilistic outputs are conditional estimates, not guarantees.

### 10.1 Future plans: FIRE planner (held back on 10 Oct 2026)

The 10 Oct 2026 review of SG FIRE Planner and Tree of Wealth found these as well. They are **Later** because they are not essential to the FIRE calculation, are a lot of work for the gain, or would make the short phone form feel like SG FIRE Planner's nine sections. Rules 18 to 21 in section 6.6.1 were built instead.

1. **Rest of the CPF picture.** The balance projection itself was built later on 10 Oct 2026 (rule 24). These parts still wait:
   - "FRS reached" milestones;
   - drawing on CPF if investments run out;
   - CPF top-ups (RSTU);
   - housing grants;
   - HDB Lease Buyback;
   - self-employed MediSave-only contributions;
   - MediSave spent on premiums.

   They wait because each adds its own yearly rules for a smaller gain.
2. **SRS account.** Balance, yearly top-up, drawdown and tax relief. Withdrawals are penalty-free, and only 50% taxed, from the statutory retirement age locked in at the first contribution:
   - 62 for a first contribution before 1 July 2022;
   - 63 for 1 July 2022 to 30 June 2026;
   - 64 from 1 July 2026.

   This waits because SRS can already be ticked as a Wealth asset in the plan; the only error left is that it can be spent before the drawdown age, which is small for most plans.
3. **Insurer premium tables.** Integrated Shield tier premiums by age and MediSave withdrawal limits. A monthly healthcare line with its own growth rate was built instead (rule 25). Premiums differ by insurer and change every year, so a fixed table would be wrong.
4. **Households.** A partner, dependents and parent support. Waits because it changes the plan's shape (two ages, two CPF accounts), not a field.
5. **Earnings detail.** Gross pay and bonus months were built (rule 23). Still waiting:
   - salary growth beyond inflation;
   - income tax, including citizen and PR tax treatment;
   - life events such as a career break or pay cut.

   They wait because the monthly investment and its yearly increase already stand in for them.
6. **Withdrawal strategies and history.** Guardrails, a variable percentage and similar spending rules, and a historical backtest. Waits for a simpler way to show "how sure is this?" than the good and bad markets card, withdrawn on 11 Oct 2026.
7. **Health check.** Emergency fund months, savings rate, insurance cover and debt ratios against MoneySense's rules of thumb. FireBuddy already has the transaction data, so this is a strong candidate for Home or Insights rather than the planner.
8. **Asset allocation.** A mix across asset classes that sets the return and swing, with a glide path towards safer assets. Waits because one return, an optional lower after-retirement return and one swing figure are enough for a phone plan.
9. **Display additions.** "CPF LIFE covers X% of your spending", an income split chart, a "work one more year" comparison and a plan completeness meter. Nice to have; the budget card already shows the split for two months.
10. **Clean-up.** Remove the "Spending based on N recorded months" line on the Planner, which never shows because the engine does not fill its spending baseline.

Mistakes seen in the two sites, to avoid: two different headline models on one screen with no explanation (a FIRE number of S$6.4M at age 125 next to S$275k at 45), locked CPF counted as spendable wealth at 55, and retirement sums several years out of date.

## 11. Design, architecture, and trust

The FireBuddy mockup is the primary visual reference. Preserve the green identity, warm professional tone, thin borders, rounded surfaces, whitespace, and sentence case. Phone screens are the design target, and the `DESIGN.md` mobile and touch rules apply: safe areas, thumb reachable controls, bottom sheets, and the four tabs. DouDou appears at most once per screen and only for moments such as welcomes, tips, empty states, errors, privacy, and milestones.

In the frozen web app, the **Current** DouDou chat route is a focused two region reading workspace. Its flexible conversation canvas uses distinct user and cited assistant surfaces with a grounded bottom composer. Searchable local conversation history sits in a right rail from `1180px` and becomes a keyboard accessible right drawer below that width. The dedicated answer guide panel is not part of this layout; essential scope and educational guidance remain visible in the empty state and composer note.

Charts need text summaries, keyboard reachable details, and non color distinctions. Currency defaults to Singapore dollars. Dates and assumptions use plain language.

All **Current**, **Next**, and **Later** work keeps these constraints:

1. Expo and React Native are the active frontend. The React and Vite web app is frozen.
2. FastAPI owns protected APIs, deterministic rules, AI routing, and RAG.
3. Supabase Auth remains the only authentication system.
4. Postgres remains the data store with RLS on every user facing table.
5. The app calls Supabase directly only for authentication and FastAPI for application data.
6. Shared client consumed contracts belong in `packages/shared`.
7. New user owned tables and derived services receive ownership and cross user isolation tests.
8. Financial records and secrets are not written to application logs.
9. AI output is educational. Projections are estimates, not guarantees or regulated advice.

### 11.1 Hosting, cost, and data protection plan

Decided 29 September 2026 after comparing managed cloud, a self hosted mini PC, and on device only storage for a production launch with real users. The target monthly platform cost is about 5 USD plus OpenAI usage.

| Piece | Choice | Tier | Monthly |
| --- | --- | --- | --- |
| Database, Auth, pgvector | Supabase, Singapore region (`ap-southeast-1`) | Free | 0 USD |
| FastAPI backend | Railway, Singapore region (existing `apps/backend/railway.toml`) | Hobby | 5 USD |
| Android app | Expo EAS Build free tier, Google Play Console with its one time 25 USD registration | Free | 0 USD |
| AI models | OpenAI `gpt-4o-mini` and `text-embedding-3-small`, bounded by the advisor and AI suggestion rate limits | Usage | 2 to 10 USD |

Why managed cloud: user financial records need in region storage, encryption at rest, row level security, and a recovery path that does not depend on one machine or one home network. A self hosted box on a residential connection fails uptime, exposure, and PDPA reasonable security expectations for other people's data. On device only storage would require a sync engine and account recovery before anything else and would remove the server side aggregates DouDou's data mode depends on.

Why the free Supabase tier is acceptable at launch: the knowledge base is well under 50 MB with its HNSW index, user rows are small against the 500 MB limit, and the 50,000 monthly active user Auth allowance is not a constraint. The free tier has two production gaps, and both are closed by requirements below rather than by paying for Pro.

Requirements before public launch:

1. The Supabase project runs in the Singapore region. If the current project is elsewhere, create a new project there and apply the migrations.
2. A nightly `pg_dump` of the Supabase database runs from a scheduled GitHub Actions workflow and uploads the compressed dump to free object storage (Cloudflare R2 or Backblaze B2). The workflow must not depend on the mini PC being online.
3. A restore of the latest dump into a local Supabase instance is tested and documented before launch, then repeated after any migration that changes user tables.
4. A scheduled GitHub Actions keep alive runs at least every three days and calls a backend route that touches the database, so the free project never pauses for inactivity.
5. The advisor and AI suggestion rate limits stay enabled in production because OpenAI usage is the only cost that scales with users.
6. Raw transactions, balances, and memos never leave the database for the AI layer. Implemented: aggregates are masked into placeholder tokens plus coarse bands before any OpenAI call, the question and history are scrubbed of amounts and user-entered names, the planner cannot emit SQL or user identifiers, every call sets `store=False`, and the invariant is stated in the privacy notice. AI is off per user until consented (`profiles.ai_preference`). See `docs/PRIVACY.md`.
7. Users can export their data and delete their account end to end, which the PDPA access and correction obligations require. Implemented: `GET /account/export` and `DELETE /account`, surfaced on Profile as Download my data and Delete account.

The mini PC is limited to workloads that never hold user data: staging, the eval suite, the monthly knowledge base refresh, and optional local model experiments. It does not serve production traffic and does not hold production backups as the only copy.

Superseded for mobile on 3 October 2026 by section 2.3: the phone keeps records on the device, and Supabase holds only the anonymous identity and consent of users who turn DouDou on. The table, rate limit and AI requirements above still apply to the backend and the frozen web app. Backup and restore requirements 2 and 3 now cover the knowledge base and consent rows, not mobile records.

Upgrade trigger: move Supabase to Pro (about 25 USD, daily backups, optional point in time recovery) the first time a day of lost user entries would be unacceptable, or when database size approaches 400 MB. The earlier plan to make on device storage only a **Later** opt in tier is replaced by section 2.3 for mobile.

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
7. Custom authentication or migration away from Expo, React Native, FastAPI, Supabase Auth, and Postgres
8. MCP tool sprawl, multiple user facing agent services, graph infrastructure, Kubernetes, Terraform, or multi cloud work added for feature count
9. Telegram integration and iOS App Store submission in the active roadmap
10. External product source copying or pixel for pixel replication
11. Serving production traffic or storing production user data on home hardware
12. On device only storage as the primary data store
13. New features or design work in the frozen web app

## 14. Delivery roadmap

### Phase 0: Current baseline

Maintain the **Current** tracker and DouDou functionality. Do not reintroduce illustrative FIRE figures as user results.

### Phase 1: Current dashboard foundation

Wealth positions, snapshots, contributions, financial summary, revised FIRE profile, deterministic calculations, temporary scenarios, and dashboard states are implemented in the backend, `packages/shared`, and the frozen web app.

### Phase 2: Next mobile release

Make the Expo app the real product and ship it to Google Play. In order:

1. **DouDou consent and anonymous session.** Replace the three levels with one Off/On choice and the plain language consent text. "Turn on DouDou" creates an anonymous Supabase session kept in secure device storage and saves `personalised` to the profile; turning it off deletes the anonymous user. Remove the developer access token path.
2. **Relevant data only.** Select snapshot sections per question on the phone, mask only those, and show what was used under each answer.
3. **Real records on the phone.** Start new installs with an empty store instead of demo data, keep demo mode clearly labelled, and keep encrypted file backup and restore as the recovery path.
4. **DouDou.** Rename Ember to DouDou in every user facing string, draw DouDou from the shared art with `react-native-svg`, and use the poses where `DESIGN.md` assigns them. Build the app icon, adaptive icon, and splash screen from DouDou.
5. **Release.** Remove every placeholder screen, build with EAS, run a Google Play closed test with at least 12 testers opted in for 14 consecutive days (required for new personal developer accounts before production access), fix what testers find, then publish to production.

Exit condition: section 15.2 passes on a physical Android phone, and no screen depends on illustrative data outside labelled demo mode.

### Phase 3: Later monthly planning

Evolve category budgets into Spending Plan and add Life Goals.

### Phase 4: Later data depth

Add reviewable CSV import, expanded analytics, drilldowns, anomaly depth, and recurring detection.

### Phase 5: Current routed DouDou

The bounded planner, expense tools, financial summary, FIRE projection, financial health review, hybrid RAG path, provenance UI, and account-scoped history are implemented. Supporting-record drilldowns and temporary scenario tools remain later.

### Phase 6: Later planning depth

Add saved scenarios, Coast FI, CPF layers, retirement income coverage, sensitivity ranges, and resilience modelling.

## 15. Test and acceptance plan

### 15.1 Documentation acceptance

1. Every capability is Current, Next, Later, or Excluded.
2. Current routes, migrations, scripts, and navigation match the repository.
3. Planned interfaces are not presented as implemented.
4. Local design references are versioned in the repository.
5. No WealthWise code, architecture, branding, or pixel specification is copied.

### 15.2 Acceptance before first release

1. Displayed net worth, savings rate, runway, invested total, FI target, FI progress, and projection reconcile with seeded real records and documented formulas.
2. Small and large Android phones preserve readable hierarchy, safe areas, the four tabs, and the Add sheet, in light and dark mode.
3. Empty, loading, missing setup, limited history, zero income, stale snapshot, unreachable FI, validation, and backend error states are tested.
4. Historical facts are visibly distinct from projections and warnings.
5. Data periods, snapshot dates, and FIRE assumptions are exposed.
6. Setup prompts replace unavailable figures.
7. Wealth contributions never increase expense spending.
8. Payment accounts remain unchanged and are never treated as balances.
9. Temporary scenarios do not mutate saved financial data.
10. Route and migration security tests prove account isolation for all new identifiers.
11. Mobile lint and typecheck, shared types, backend, migration, and DouDou regressions remain green, and the frozen web tests still pass.
12. A smoke journey on a physical Android phone against the staging backend covers transaction entry, wealth setup, snapshot update, contribution entry, FIRE assumptions, dashboard reconciliation, encrypted backup and restore, turning DouDou on, a general answer that sends no figures, a personal answer that sends only the matching masked sections, and turning DouDou off with the anonymous user removed.
13. With DouDou off, the app makes no network requests and no Supabase user exists.
14. The Google Play internal testing build installs and survives an app restart without losing records or the DouDou session.
15. The section 11.1 launch requirements that still apply are met: Singapore region confirmed, the keep alive workflow scheduled, rate limits enabled, anonymous sign ins enabled with their rate limit, and an HTTPS API address in the build.

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
> Built a Singapore focused personal finance app with authenticated transaction workflows, a dated asset and liability ledger, deterministic net worth and cash flow summaries, and an explainable FIRE projection, plus DouDou, a private hybrid RAG guide over Singapore finance sources.

Spending Plan, Life Goals, CSV import, recurring detection, and deeper planning remain future portfolio targets until implemented and verified. Once Phase 2 ships, the stack line becomes React Native (Expo), FastAPI, Supabase, OpenAI API, Supabase pgvector, and the description becomes a Singapore focused personal finance Android app. Until then the web app is the verified implementation.

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
