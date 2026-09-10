# Singapore FIRE Planner

Implemented calculation version: `sg-monthly.v2`. Inputs use schema version `2`. Source review: 7–8 September 2026.

## Product boundary

Home retains income, expenses, savings, net worth, emergency runway, recent transactions and the existing spending pie. Money Pulse occupies the former FIRE chart position, keeping the spending card in its original desktop column. Insights remains expense analysis. Essential category settings are on `/plan`. `/fire` owns retirement results and temporary scenarios; `/fire/setup` is the resumable five step setup. Desktop navigation places FIRE Planner after Goals. Mobile retains Home, Transactions, Categories and Profile, with FIRE Planner in secondary navigation.

Wealth positions remain separate. SRS and other restricted assets can be marked with the existing `other_restricted` classification. The retirement starting portfolio includes only confirmed, unrestricted assets with dated snapshots, and excludes CPF, property and designated emergency reserves regardless of the legacy FI flag. Missing selected snapshots block activation. A dated planning total replaces linked assets, never adds to them. Its exclusions are the user's responsibility. An empty confirmed asset selection represents zero capital.

## Monthly method

All internal balances are nominal SGD. Months follow the Singapore calendar, using integer month arithmetic. A calculation treats the effective month's beginning as its opening balance and applies a full month, even when the effective date is midmonth. The existing snapshot values are opening estimates, not daily market valuations.

Annual effective return `r` becomes monthly growth `(1+r)^(1/12)`. Before retirement, apply growth then the fixed nominal contribution at month end. Contributions stop in the retirement month. From retirement onward, apply growth, add retirement income, then subtract expenses. Surplus income stays invested. The birthday month at the selected end age is excluded.

Spending has an explicit `spendingMonth` purchasing-power basis. The first month end is one inflation period after that basis. Inflation applies once from that basis to each withdrawal, including when an active plan is recalculated later. Headline today's-money equivalents discount retirement-date amounts back to the calculation's effective month. A manual spending edit resets its purchasing-power basis to the current effective month.

CPF amounts are user estimates in commencement dollars. They receive no inflation before commencement. Standard is nominally constant; Escalating rises 2% after each twelve completed payout months. Unknown CPF and Basic are excluded and visibly labelled. Other income starts inclusively and ends exclusively, grows at its effective annual rate converted over fractional years, and is only received during retirement. Do not enter CPF again as other income.

For retirement month `t`, let `E` be expenses, `I` income, and `g` post-retirement monthly growth. Starting with terminal required capital zero, work backward:

`required[t] = max(0, (required[t+1] + E[t] - I[t]) / g)`

The nonnegative requirement at every month prevents later income covering an earlier shortage. Forward simulation of the required capital verifies no monthly shortfall. When later income exceeds all remaining expenses, retained surplus can produce a positive terminal balance despite a zero terminal *requirement*. Forcing that surplus away would contradict the requirement to keep income invested.

The same accumulation recurrence supplies the contribution factor and required monthly investment. Required monthly contributions round upward to cents; other amounts round only at the output boundary. At immediate retirement, a capital shortfall has no finite monthly contribution solution and displays Unavailable. Earliest funded retirement evaluates each candidate month's remaining cash flow requirements against its accumulated portfolio; it never compares current assets to a static future target.

Funding progress is projected portfolio at the selected retirement date divided by required portfolio at that same date. Zero required capital reports 100% and zero additional capital. Smooth returns do not capture sequence risk. Negative projected balances identify unfunded cash flows, not borrowing permission or a success probability. No funding guarantee extends beyond the selected end age.

## Inputs and persistence

`fire_profiles.draft_plan` stores `{step, inputs}`. Saving a step only updates this field. `active_plan` changes only on final confirmation, after server timeline and eligible owner-scoped asset validation. The backend writes only supplied fields, so draft requests cannot implicitly clear an active plan. Failed validation leaves existing results intact. Demo storage writes before updating React state so failed local writes cannot activate a plan in memory.

The additive migration retains legacy contribution, return, inflation, spending override, birth year, target date and withdrawal-rate columns. Existing records have null active plans and require review. Existing return/inflation values are suggested for confirmation; otherwise initial product assumptions are 5% before retirement, 3% after, 2.5% inflation and age 95. The old withdrawal-rate formula is no longer calculated, including through compatibility calculator entry points.

Recorded averages use up to twelve completed calendar months from the available expense history. Exact dates and shorter histories are displayed. These are averages of records, not claims of complete household spending; gaps do not prove zero expenses. Investment contributions are a suggestion, not a commitment, and savings are never automatically invested. Inputs retain recorded, user-entered or assumed provenance. Planning changes never modify transactions or wealth values.

Existing `/fire/profile`, `/fire/calculate` and `/fire/scenario` endpoints carry the versioned objects. Scenario overrides are restricted to retirement month, contributions, spending, returns and inflation, and never persist. Responses include version, effective date, plan/provenance, monthly cash flows, funding status and warnings. Ember receives bounded authoritative aggregates and model assumptions, never a competing target calculation or raw monthly records.

RLS and all four existing owner policies remain. Browser roles retain no direct application-table access. FastAPI verifies identity and scopes record access; only the backend service role can access the data API. Apply the migration before deploying the updated backend. It has been tested transactionally against local Postgres; it has not been applied to a remote database.

## Sources and exclusions

- [CPF Board CPF LIFE](https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life), reviewed 7 September 2026. Policy source for plan types and escalation, not for invented payout estimates.
- Optional in-app help: [CPF Board Retirement Payout Planner](https://www.cpf.gov.sg/member/tools-and-services/planners/cpf-planner-retirement-income). No competitor redirects or forced Home setup popup.
- [MoneySense retirement booklet, September 2024](https://www.moneysense.gov.sg/files/MoneySense_Retirement_Booklet__English____2024_Sep.pdf) informs the requested spending review. Direct retrieval returned 404 on 8 September 2026, although the search index still lists it. [MoneySense retirement planning](https://www.moneysense.gov.sg/legacy-planning/planning-for-retirement/) is the accessible current help page. No historical policy figures enter the engine.
- RetireCan's income gap, SG FIRE Planner's guided setup and inspectable flows, and Tree of Wealth's restricted-resource distinction are capability references only. No competitor code, formulas or defaults were copied.

Households, Monte Carlo, backtesting, automatic CPF balance projections, property monetisation, SRS tax optimisation and saved scenarios remain deferred. Legacy plans with a retirement date that has passed require review using a current retirement month and current assets.

## Verification

`packages/shared/fixtures/retirement.json` contains common inputs. Web parity tests invoke Python and compare every headline, warning and monthly cash flow across all eleven cases. Backend tests independently check the S$1,080,000 CPF bridge, S$1,620,000 no-CPF target, discounted present value, monthly timing, CPF commencement/escalation, invalid/missing inputs, stale overrides and contribution sufficiency. Route tests cover draft/active separation, invalid activation, owner isolation and unsaved scenarios. UI tests cover resume, failed save, activation and unknown CPF.

Run from the root:

```powershell
npm run test:web
npm run lint:web
npm run build:web
npm run typecheck:shared
python -m unittest discover apps/backend/tests -v
```

Web parity tests require the existing backend Python dependencies, which CI installs before web tests. `supabase/tests/retirement_plans.test.sql` verifies twelve access-control and schema assertions. Desktop/mobile screenshots and real browser keyboard/layout acceptance remain unverified because the browser runtime reported no available browsers. Signed-in production smoke and remote migration application are not performed by this implementation.
