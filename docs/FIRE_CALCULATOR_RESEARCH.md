# FIRE calculator research for FireBuddy

## Purpose and research method

Reviewed on 22 August 2026. This note translates nine public calculators, articles, and implementation sources into product guidance for FireBuddy's future deterministic Insights calculator. It does not implement the calculator.

Evidence is labelled in three ways:

* **Observed** means visible in the public interface, documentation, or client delivered calculation logic.
* **Publisher claim** means the source describes a feature or assumption that was not independently reproduced here.
* **Official check** means the claim was checked against current CPF Board or IRAS material.

The research sources are [FI Calc](https://ficalc.app/), [SG FIRE Planner](https://sgfireplanner.com/), the [SG FIRE Planner repository](https://github.com/RemarkRemedy/fireplanner), [RetireCan](https://retirecan.sg/), [Tree of Wealth](https://treeofwealth.sg/singapore-fire-planner/), [FinSight SG](https://finsight.sg/article-fire-number-singapore), [The Financial Coconut](https://www.thefinancialcoconut.com/blog/the-fire-spreadsheet-that-breaks-down-a-s4m-retirement-goal), [FIRE Path Lion](https://www.firepathlion.com/detail-of-my-planned-expenses-revising-my-fire-number/), and [Dr Wealth](https://drwealth.com/fire-movement/). Source specific RAG notes live under `apps/backend/rag/knowledge-base/manual/fire/sources/`.

## Executive recommendation

FireBuddy v1 should be smaller than the most capable tools reviewed. Its differentiator is not the number of assumptions. It is the trusted connection from completed expense transactions to an explainable FIRE target and a reproducible monthly accumulation projection.

The first version should answer four questions:

1. What annual retirement spending is being used, and where did it come from?
2. What target does that spending imply at the selected withdrawal rate?
3. How much of that target is covered by the selected liquid portfolio today?
4. Under one visible real return and monthly contribution assumption, when is the target reached?

CPF, SRS, property proceeds, Monte Carlo, historical backtesting, and retirement drawdown should come later as separate modules. Combining them prematurely would make the first result harder to verify and easier to misunderstand.

## Comparison matrix: inputs and calculation models

| Source | Type and primary question | Relevant inputs | Calculation model | Important assumptions |
|---|---|---|---|---|
| FI Calc | Historical retirement drawdown backtester. Would this portfolio and withdrawal rule have survived recorded starting years? | Retirement duration, starting portfolio, equities, bonds, cash, fees, rebalancing, glide path, withdrawal strategy, extra income, extra withdrawals, historical range | Rolling historical simulations using United States Shiller data. Withdrawal occurs at year start, then fees, growth, and dividends, then optional year end rebalance. No Monte Carlo | Historical United States assets and CPI are informative but not predictive. Cash has fixed growth. Taxes are user modelled through spending or cash flows |
| SG FIRE Planner | Full Singapore lifecycle planner. When can the user retire and how resilient is the plan? | Income, expenses, net worth, CPF, SRS, tax, asset allocation, goals, healthcare, property, life events, retirement horizon | Deterministic lifecycle projection plus Monte Carlo, rolling historical backtests, crisis replays, and multiple withdrawal strategies. Public materials describe parametric, bootstrap, and fat tail methods | Very broad model with time sensitive Singapore rules and multiple datasets. Landing page and repository currently describe different simulation counts, so version labels matter |
| SG FIRE Planner repository | Open source implementation reference. How are calculation, simulation, data, state, and export concerns organised? | Same broad planner domain, documented as modular income, expenses, CPF, tax, allocation, goals, healthcare, property, and life events | Separate deterministic calculation modules, Web Worker simulation, historical datasets, validation, and scenario state. README documents 10,000 path Monte Carlo, rolling backtests, and crisis replays | Repository and deployed site can be on different revisions. Dataset coverage differs by asset class. Code constants are not official policy |
| RetireCan | Guided retirement funding estimate. Is projected wealth enough for dated retirement cash flows? | Age, retirement age, retirement years, spending, inflation, current savings, contributions, returns, other income, CPF LIFE, optional partner, HDB proceeds, healthcare, SRS, CPF balances, one time costs | Present value of annual spending gaps, with CPF LIFE included only from age 65 in the observed logic. Smooth accumulation projection. Optional early return haircut | Constant annual assumptions. CPF, SRS, and property use approximations. The early return haircut is a deterministic stress, not a probability |
| Tree of Wealth | Singapore projection and present value planner with a simple simulation view | Age, retirement age, life expectancy, income, savings rate, liquid portfolio, CPF OA and SA, spending, inflation, pre and post retirement returns, volatility, CPF and SRS options, property proceeds | Annual deterministic accumulation, growing annuity present value, 1,000 path log normal accumulation Monte Carlo, simplified deterministic drawdown | Annual savings are added before growth in the observed formula. CPF and SRS rules are simplified. Monte Carlo covers accumulation in the reviewed code |
| FinSight SG | Article and linked local calculator. How should a Singapore FIRE number account for CPF and housing? | Retirement spending, CPF LIFE estimate, retirement age, withdrawal rate, liquid portfolio, housing context | Article uses spending divided by rate, then advocates a separate pre CPF LIFE and post CPF LIFE cash flow framing | Several lifestyle, healthcare, return, and tax statements are third party generalisations. A simple permanent CPF subtraction conflicts with its own bridge insight |
| The Financial Coconut | Article and spreadsheet framing. Which spending layers are funded? | Portfolio, withdrawal rate, itemised monthly and annual retirement expenses | Each category's annual expense divided by withdrawal rate, with progress bars and ordering strategies | Same portfolio cannot independently fund every category. A cumulative allocation order is required to avoid double counting progress |
| FIRE Path Lion | Personal case study. How does itemising retirement spending change a FIRE target? | Itemised retirement costs, buffer, personal withdrawal rate | Annual spending divided by 3.33 percent, compared with an earlier rough estimate | Personal 2019 era spending and a chosen rate. No CPF timing, return sequence, or drawdown engine |
| Dr Wealth | Introductory article. What is a basic FIRE number and how can it be reached? | Annual expenses, savings rate, income, investment behaviour | 25 times annual expenses, equivalent to dividing by 4 percent | Educational shortcut. Dated personal and CPF commentary should not be used as a current rule table |

## Comparison matrix: results, interaction, and trust

| Source | Outputs and charts | Warnings and limitations | Privacy approach | Transparency assessment |
|---|---|---|---|---|
| FI Calc | Historical success share, individual starting year paths, withdrawal and ending values, CSV export, shareable URL | Explicitly says 100 percent historical success is not certainty. Notes overfitting, missing taxes, United States data, and need to test other tools | Entered data stays on device. Google Analytics measures usage but reportedly not calculator inputs | High. Detailed guide documents data, formula order, strategies, real versus nominal values, and known limits |
| SG FIRE Planner | Dashboard, year by year chart and table, cash flow waterfall, CPF and SRS, withdrawal comparisons, Monte Carlo, backtests, stress tests, scenario deltas | Educational disclaimer and model dependent projections. Breadth increases assumption and version risk | Client side calculations, local storage, JSON and Excel export, shareable URLs. Public site also uses analytics | High because code is public and methods are described, but the visible method version should accompany every result |
| SG FIRE Planner repository | Projection and dashboard architecture, scenario comparison, JSON and Excel export, dataset tables, test suite, source modules | Test coverage verifies code behaviour, not market forecasts or current statutory accuracy. README and deployment can drift | Static client application, local storage, browser Web Worker, export and URL sharing. Shared URLs may reveal encoded assumptions | High. Public source and documented module boundaries allow formulas and data sources to be audited by revision |
| RetireCan | FIRE number, retirement spending, portfolio draw, projected portfolio, contribution required, surplus, trajectory, income waterfall, verdict, peer comparison, gated FIRE Score | Visible estimate and market risk warnings. Healthcare, CPF, housing, family, and sequence risk are acknowledged as incomplete | Inputs stay local unless user saves. Saving stores email and results. Anonymised usage data is reported | Medium. Several output explanations identify present value, but the proprietary score compresses inputs and is email gated |
| Tree of Wealth | Portfolio and target chart, CPF chart, SRS estimate, Monte Carlo percentile bands, drawdown balances, depletion warning | Page labels estimates and notes CPF LIFE uncertainty. Edge cases and simplified statutory rules are not fully explained | Calculator says calculations run locally. Host page loads analytics and marketing scripts | Medium to high. Main formulas are inspectable in delivered page code, but not all are explained in user facing prose |
| FinSight SG | Article examples and a linked calculator that claims two phase cash flows | Does not provide enough public detail in the article to reproduce the linked calculator. Some official claims need correction | Publisher says no login and app data stays on device | Medium for the article formula, low for reproducing the full linked calculator from the article alone |
| The Financial Coconut | Category capital and progress bars, sorting by essentials, smallest, or largest | Behavioural framing, not a drawdown test. The 3.25 percent rate is an example choice | Article and linked spreadsheet, no calculator privacy contract reviewed | High for the category formula, lower for downstream spreadsheet data handling |
| FIRE Path Lion | Itemised budget, revised target, and personal years saved estimate | Personal example with no simulation or statutory model | Public article and downloadable template context | High for the visible arithmetic, limited in scope |
| Dr Wealth | Basic target and educational steps, no calculator chart | Simplifies the evidence behind 4 percent and contains dated opinion | Public article, no financial input flow | High for the 25 times arithmetic, low as a detailed calculation specification |

## Concepts that must remain separate

### FIRE target

A target converts assumed annual retirement spending into a capital goal at a selected withdrawal rate:

`target = annual retirement spending / withdrawal rate`

It is easy to explain and compare. It does not prove that a particular portfolio will survive a particular sequence of returns.

### Accumulation projection

An accumulation projection grows a current portfolio and future contributions under a stated return assumption. It estimates when the portfolio reaches the target. It does not model withdrawals after retirement.

### Retirement drawdown

A drawdown model starts with capital at retirement and applies dated expenses, income, returns, fees, and withdrawals through an end age. A present value calculation is one deterministic version. A historical backtest and a Monte Carlo simulation test different sets of paths.

### Historical backtesting

Backtesting replays actual recorded return sequences. A success percentage is the share of tested historical starting windows that met the selected success condition. It is not the estimated probability of future success. Windows can overlap and the future can fall outside the historical sample.

### Monte Carlo simulation

Monte Carlo draws many return paths from an explicit statistical model or resampling method. Percentile bands describe that model's simulated distribution. Results depend on expected returns, volatility, correlations, tail model, fees, inflation, number of runs, and random seed. A Monte Carlo percentage and a historical success percentage must not share one unlabeled “success” field.

## Recommended FireBuddy v1 calculation contract

### 1. Retirement spending source

Default to completed expense transactions, excluding income and non completed records. The result must include:

* first and last transaction dates used
* number of completed calendar months or exact covered days
* included expense total
* annualisation method
* excluded records and reason
* category breakdown

Use completed calendar months when enough history exists. For example:

`monthly spending = included expenses / completed months`

`annual spending = monthly spending x 12`

Do not silently annualise a short partial month. If history is insufficient, require or recommend a manual annual retirement spending value and label the estimate as low confidence.

The user can override annual retirement spending. Preserve both values:

* `derived_annual_spending`
* `selected_annual_spending`
* `spending_source`, either `transactions` or `manual_override`

Show the numerical difference and never rewrite transaction history from the override.

### 2. FIRE target

Use a decimal withdrawal rate, validated above zero and below a product maximum:

`fire_target = selected_annual_spending / withdrawal_rate`

Equivalent display:

`target multiple = 1 / withdrawal_rate`

At 4 percent, the multiple is 25. At 3.25 percent, it is approximately 30.77. The selected rate is an assumption, not a safety guarantee.

### 3. Current portfolio and progress

V1 should use an explicitly entered liquid investable portfolio. Do not infer it from transaction accounts because the current product does not maintain authoritative investment balances.

`target_gap = fire_target - current_portfolio`

`remaining_gap = max(0, target_gap)`

`progress_percent = current_portfolio / fire_target x 100`

The numerical percentage may exceed 100. The visual progress bar can cap at 100 while the text preserves the true value. Negative portfolios should be rejected or separately modelled as liabilities, not silently treated as zero.

### 4. Real return

Ask for nominal annual return and annual inflation, then derive the real annual return:

`real_annual_return = (1 + nominal_annual_return) / (1 + inflation) - 1`

This is more accurate than subtracting inflation from nominal return. Convert the effective annual real return to an effective monthly rate:

`real_monthly_return = (1 + real_annual_return)^(1/12) - 1`

All rates and the fact that projections are in today's dollars must be visible. Reject inflation at or below negative 100 percent and any derived real return at or below negative 100 percent because the monthly conversion would be undefined.

### 5. Monthly portfolio projection

Use month end contributions. This timing must be documented and tested:

`portfolio[0] = current_portfolio`

`portfolio[m] = portfolio[m - 1] x (1 + real_monthly_return) + monthly_contribution`

The contribution does not earn a return in the month it is added. Evaluate the target after the contribution. Store or calculate points from month zero until the first month that meets or exceeds the target.

For zero real return:

`portfolio[m] = current_portfolio + m x monthly_contribution`

For a positive or negative rate other than zero, iterative calculation is preferred for v1 because it exactly matches chart values and handles validations consistently. A closed form can be used only if tests demonstrate identical timing.

### 6. Estimated FI status

Use explicit states rather than forcing every result into a date:

| State | Condition | Display |
|---|---|---|
| Reached | Current portfolio is at least the target | Reached now, plus amount above target |
| Projected | Projection reaches target within the supported horizon | Estimated month and year, months remaining |
| Not reached | Valid assumptions do not reach target within the horizon | Not reached within N years |
| Moving away | No contribution and return is zero or negative while below target | Target does not converge under these assumptions |
| Needs input | Spending, portfolio, return, inflation, or contribution input is invalid or missing | Explain the field to review |

Use a bounded horizon such as 100 years to avoid unbounded loops. A result beyond a reasonable human planning horizon should be reported as not reached within the horizon, not as a precise calendar promise.

### 7. Reproducibility payload

Every calculation result should be reproducible from stored structured inputs, without an AI model. At minimum record:

* spending source, period, and selected annual amount
* withdrawal rate
* current liquid portfolio
* monthly contribution
* nominal return and inflation
* derived real annual and monthly returns
* contribution timing convention
* calculation version and evaluation timestamp

The language model may explain a structured result later. It must not calculate or overwrite authoritative figures.

## Recommended Insights presentation

### Summary cards

Show four primary cards:

1. **FIRE target:** selected annual spending divided by withdrawal rate.
2. **Progress:** current liquid portfolio as a percentage and dollar amount of target.
3. **Estimated FI date or status:** month and year when projected, or a clear non date state.
4. **Savings gap:** remaining capital plus current monthly contribution. If a desired date is later added, show the additional monthly contribution required as a separate measure.

### Spending evidence

Directly under the cards, show whether spending came from transactions or a manual override. Include the completed transaction period and link to the supporting expense view. Display both the derived and selected amount when an override exists.

Historical facts and future estimates need different visual treatment:

* Historical fact: “S$36,240 of completed expenses from 1 August 2025 to 31 July 2026.”
* Derived fact: “S$3,020 average per completed month.”
* User assumption: “S$42,000 selected annual retirement spending.”
* Projection: “Target reached in June 2041 under these assumptions.”

### Portfolio trajectory

Use a line chart in today's dollars with:

* portfolio path from month zero
* visible horizontal FIRE target line
* current date and estimated crossing point
* tooltip with portfolio, target, contribution, and elapsed month
* a note that the line is a smooth deterministic estimate, not a confidence interval

Avoid charting nominal and real values on the same axis. V1 should use real values throughout so the target and path share today's purchasing power.

### Formula breakdown and editable assumptions

An expandable breakdown should show actual substituted numbers, not only generic formulas. For example:

`S$42,000 / 3.5% = S$1,200,000 target`

`(1 + 6.0%) / (1 + 2.0%) - 1 = 3.92% real annual return`

Assumptions should be editable in one place and resettable to saved baseline values. Changing an assumption must update the result deterministically and identify the changed field.

### One temporary scenario

V1 should support a baseline and one unsaved temporary scenario. Show numerical deltas for:

* annual spending
* target
* progress percentage points
* remaining gap
* estimated FI date or status
* months gained or lost

Do not present the temporary scenario as saved or mutate the baseline until the user explicitly chooses a future save action. A user should be able to reset all temporary changes at once.

## Warnings and validation

Warnings should be deterministic and tied to inputs:

* less than a configured minimum of completed spending history
* partial month excluded from annualisation
* manual spending override differs materially from transaction derived spending
* withdrawal rate outside the recommended product review range
* nominal return, inflation, or real return at an extreme value
* no monthly contribution while below target
* target not reached within projection horizon
* portfolio includes assets the user may not be able to liquidate
* future estimates do not include taxes, fees, healthcare shocks, CPF, SRS, or sequence risk in v1

Warnings must not silently change inputs. They should explain the impact and let the user edit the assumption.

## Later feature recommendations

### Expense category FI layers

Use:

`category capital = annual category expense / withdrawal rate`

Let the user order categories or mark them core and optional. Allocate the portfolio cumulatively across that order to prevent the same portfolio from appearing to fund every category independently. Link every layer to the supporting transaction period.

### CPF bridge and CPF LIFE phases

Add CPF only after the base calculator is trusted. Model at least:

1. Retirement to CPF withdrawal eligibility, using only liquid assets and genuine income.
2. Age 55 access events, only for amounts that meet current withdrawal conditions.
3. CPF LIFE payout start, selected from age 65 to 70.
4. Post payout cash flow using the selected plan's actual pattern.

[CPF Board](https://www.cpf.gov.sg/service/article/how-much-cpf-payouts-can-i-get-every-month) states that payout depends on RA balance and payout start age. [CPF Board's plan comparison](https://www.cpf.gov.sg/service/article/what-are-the-cpf-life-plans-available-and-which-is-the-right-plan-for-me) says Escalating rises by 2 percent yearly, Standard is steady, and Basic can decline later. Store the official source, effective date, cohort, and user override with every CPF assumption.

### SRS and property proceeds

Keep SRS as a separately constrained account with first contribution date, applicable retirement age, withdrawal window, and tax treatment. IRAS currently lists contribution caps of S$15,300 for citizens and permanent residents and S$35,700 for foreigners. Qualifying retirement withdrawals can be spread over 10 years, with 50 percent taxable. Current rules must be checked at implementation time against [IRAS contributions](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/srs-contributions) and [IRAS withdrawal tax](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/tax-on-srs-withdrawals).

Do not include HDB or other property equity by default. Add only explicit net sale proceeds, right sizing proceeds, lease monetisation, or net rental cash flow at a specified date. Deduct debt, transaction costs, replacement housing, and taxes where relevant.

### Monte Carlo and stress tests

When added, publish the return model, asset allocation, means, volatility, correlations, inflation treatment, fees, number of paths, random seed policy, and success condition. Show percentile ranges and failure paths, not only one success percentage. Include withdrawal stress tests and poor early return scenarios.

### Historical backtesting and dynamic withdrawals

Add historical backtesting as a separate view with source data, currency, inflation series, start and end years, and overlapping window warning. Let users inspect failure cohorts. Dynamic withdrawal strategies should report spending volatility, minimum and maximum real spending, and ending balances as well as survival.

## Features to avoid

* Opaque FIRE scores that hide dollars, rates, dates, or weighting.
* Language that treats 100 percent historical success as certainty.
* Automatically counting HDB equity, locked CPF, or constrained SRS as liquid assets.
* Subtracting CPF LIFE from every retirement year without modelling the bridge.
* Mixing deterministic projections, historical results, and Monte Carlo probabilities under one unlabeled result.
* Using peer medians as a recommendation without a documented sample and date.
* Hiding contribution timing, inflation convention, or whether values are real or nominal.
* Letting an AI model calculate authoritative totals, dates, or statuses.

## Suggested implementation sequence

1. Define and test the deterministic calculation contract in shared or backend business logic.
2. Persist a one per user FIRE profile with versioned assumptions.
3. Derive completed expense history and expose the evidence payload.
4. Add the target, progress, monthly path, status, warnings, and formula breakdown.
5. Add one temporary comparison scenario with deltas.
6. Validate edge cases and exact contribution timing with fixed test vectors.
7. Add category layers.
8. Design CPF, SRS, and property phases from current official rules.
9. Add probabilistic and historical modules only after deterministic results are stable.

This sequence follows the project brief: a transparent transaction connected FIRE core first, selective Singapore depth later, and AI used only to explain structured results.
