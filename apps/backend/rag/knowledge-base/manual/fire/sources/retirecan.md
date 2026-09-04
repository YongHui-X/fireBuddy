---
source_title: RetireCan.sg Singapore Retirement Calculator
source_url: https://retirecan.sg/
agency: RetireCan.sg
topic: fire_calculators
ingest: true
---

# RetireCan.sg Singapore Retirement Calculator

## Source role

RetireCan provides a guided estimate of whether current savings and monthly contributions can fund retirement spending. Its most useful methodological feature is a present value calculation over annual retirement cash flows, including a separate gap before CPF LIFE begins. This is a retirement funding estimate, not a historical backtest or Monte Carlo probability.

The reviewed public calculator was updated in July 2026. Behaviour below is based on its displayed explanations and public client delivered calculation logic observed on 22 August 2026.

## Inputs

Inputs include current age, retirement age, years in retirement, monthly retirement expenses in today's dollars, inflation, current investable savings, monthly contributions, pre retirement and post retirement returns, other retirement income, and CPF LIFE plan or a custom payout.

Optional inputs include a partner CPF LIFE estimate, HDB downsizing proceeds, healthcare buffers, SRS contributions and an assumed marginal tax rate, CPF OA and SA balances, CPF top ups, parental support deducted from investable monthly savings, one time retirement costs, lower spending in a later phase, and an early sequence risk adjustment.

## Observed calculation method

The calculator first inflates current monthly spending to the retirement date. For each retirement year, it calculates spending for that year, reduces it by other income, and includes CPF LIFE only when the projected age is at least 65. It discounts each annual portfolio funded gap back to the retirement date using the assumed post retirement return. The sum is the displayed nest egg.

This is equivalent to a present value of a changing cash flow schedule:

`nest egg at retirement = sum of annual portfolio gaps / cumulative discount factor`

The public logic optionally reduces the assumed post retirement return by 3 percentage points during the first five retirement years as a simple sequence risk stress. This is a deterministic sensitivity, not a simulation of return sequences.

Current savings and monthly contributions are compounded to retirement using the pre retirement return. Enabled HDB proceeds, SRS value, and estimated spendable CPF above the modelled CPF LIFE premium are added, while one time costs are deducted. The tool also solves for the monthly contribution needed to close a projected shortfall.

## Outputs

Outputs include retirement date spending, portfolio draw before and after CPF LIFE, required nest egg, projected portfolio, surplus or shortfall, required monthly savings, a portfolio trajectory, a withdrawal waterfall, funding progress, warnings, and comparison with typical users.

It also presents a proprietary FIRE Score based on coverage, savings rate, and retirement age. The exact score is unlocked by providing an email. FireBuddy should prefer the underlying measures over a compressed score because users can verify dollars, rates, and dates directly.

RetireCan says calculator inputs stay in the browser. If users choose to save results, it stores the email and results, and it reports anonymised usage statistics. This conditional data flow is clearer than describing the entire service simply as local.

## Useful concepts for FireBuddy

The explicit pre CPF LIFE gap is valuable. A person retiring at 50 cannot apply an age 65 income stream to the first 15 years. A phased annual or monthly cash flow model captures that bridge, unlike subtracting lifelong income from all retirement years and dividing the remainder by one withdrawal rate.

The present value approach also distinguishes a finite retirement drawdown estimate from a simple FIRE target. FireBuddy v1 should still use the transparent spending divided by withdrawal rate target from the project brief. A later drawdown module can answer the different question of whether dated income and spending streams are funded through an end age.

## Limitations and official checks

The result is sensitive to retirement length, constant returns, inflation, CPF payout assumptions, and one time proceeds. A present value calculation using a smooth return does not show sequence risk unless separately stressed.

CPF Board confirms that CPF LIFE can start between ages 65 and 70, not necessarily at exactly 65. The payout depends on Retirement Account balance, payout start age, interest rates, and mortality. Official 2026 reference payouts are estimates for a specified cohort and plan, not universal constants.

CPF savings are not generally liquid before age 55. From age 55, withdrawable amounts depend on applicable retirement sum and property rules. HDB value should be excluded from liquid assets unless a concrete monetisation event and amount are enabled. SRS access and tax treatment must follow the retirement age tied to the user's first contribution and current IRAS rules.
