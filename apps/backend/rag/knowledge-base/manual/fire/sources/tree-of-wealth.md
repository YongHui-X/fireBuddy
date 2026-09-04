---
source_title: Tree of Wealth Singapore FIRE Planner
source_url: https://treeofwealth.sg/singapore-fire-planner/
agency: Tree of Wealth
topic: fire_calculators
ingest: true
---

# Tree of Wealth Singapore FIRE Planner

## Source role

Tree of Wealth publishes an interactive Singapore FIRE planner on a single page. Its calculation code is delivered with the page, making the main formulas directly inspectable. It combines a deterministic accumulation projection, a growing cash flow present value, simplified CPF and SRS estimates, accumulation Monte Carlo percentiles, and a deterministic retirement drawdown.

## Inputs

The page accepts current age, retirement age, life expectancy, citizenship or residency status, annual income, annual savings rate, current investable portfolio excluding CPF, CPF OA and SA balances, monthly retirement expenses, inflation, pre retirement return, post retirement return, and volatility.

Options include an annual CPF top up, maximum SRS contributions, CPF LIFE plan, a BRS, FRS, or ERS target, and property equity to unlock at retirement.

## Deterministic formulas

The observed accumulation loop adds annual savings at the beginning of each projected year and then applies the annual pre retirement return:

`next balance = (opening balance + annual income x savings rate) x (1 + return)`

The planner inflates annual expenses to retirement and uses a growing annuity present value:

`retirement spending at retirement = current annual spending x (1 + inflation)^years`

`retirement need = spending at retirement x [1 - ((1 + inflation) / (1 + post retirement return))^retirement years] / (post retirement return - inflation)`

This answers the present value of a finite, inflation growing spending stream under a smooth return assumption. It is different from the perpetual style target `annual spending / withdrawal rate`.

## Monte Carlo and drawdown

The Monte Carlo view runs 1,000 accumulation paths. Annual returns are sampled from a log normal model using the entered pre retirement return and volatility. It presents the 10th, 25th, 50th, 75th, and 90th percentile balance at each year. The simulation covers accumulation to retirement, not the full retirement drawdown in the reviewed code.

The deterministic drawdown begins with the projected investable portfolio. Expenses continue to inflate. CPF LIFE is included from age 65, SRS is drawn under a simplified rule, and the remaining gap is taken from the portfolio. Both balances then receive the fixed post retirement return. Outputs show remaining capital or a depletion age.

## Outputs

Outputs include projected investable portfolio, total wealth at retirement including selected CPF, SRS, and property values, retirement need, funding gap, portfolio and target chart, CPF OA, SA, and RA estimates, estimated CPF LIFE payout, SRS balance and draw, Monte Carlo percentile bands, drawdown chart, and a suggested withdrawal sequence.

The page states that calculations run locally. The broader WordPress page loads ordinary analytics and marketing scripts, so local calculation should not be interpreted as a promise that the page has no telemetry.

## Useful concepts for FireBuddy

The source clearly shows why contribution timing is part of a formula contract. FireBuddy's recommended v1 uses monthly contributions at month end, so it should not copy a beginning of year annual loop. It also demonstrates that percentile bands are useful only when the simulated phase and return distribution are labelled.

Its separate portfolio, CPF, SRS, and property series are preferable to one combined net worth number. Property should enter only when the user explicitly supplies proceeds that will become liquid.

## Limitations and official checks

The calculator uses simplified constant CPF contribution allocations, balances, retirement sums, CPF LIFE payout tables, tax savings, and SRS drawdown rules. These are third party model assumptions, not official calculations. The growing annuity formula also requires special handling when return equals inflation.

CPF Board states that actual CPF LIFE payouts depend on RA savings, payout start age, interest rates, and mortality. Payouts may start from 65 to 70. Plan behaviour differs: Escalating rises 2 percent yearly, Standard is steady, and Basic may decline.

IRAS rules do not imply one automatic annual SRS drawdown formula. The qualifying withdrawal age depends on the statutory retirement age when the first contribution was made. Qualifying retirement withdrawals may be spread over 10 years, with 50 percent taxable, while premature withdrawals are generally fully taxable and attract a 5 percent penalty.
