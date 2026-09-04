---
source_title: SG FIRE Planner
source_url: https://sgfireplanner.com/
agency: SG FIRE Planner
topic: fire_calculators
ingest: true
---

# SG FIRE Planner

## Source role

SG FIRE Planner is a broad, Singapore specific retirement planning application. The public site and open source repository describe a lifecycle projection that combines income, expenses, investable assets, CPF, SRS, tax, healthcare, property, withdrawal strategies, and stress testing. Calculations run in the browser and plans are saved locally, with import, export, and share features.

Its scope is much wider than the recommended FireBuddy v1. It is most useful as a catalogue of later modelling concerns and as an example of keeping deterministic projections, Monte Carlo simulation, historical backtesting, and crisis replays in distinct analysis modes.

## Inputs and deterministic projection

The planner accepts personal and household details, income streams, expenses, current net worth, CPF balances and contributions, SRS, asset allocation, financial goals, healthcare, property, life events, retirement age, and end of plan age. It offers income growth and career phase models, asset allocation templates, and glide paths.

Its year by year projection presents salary, tax, CPF, savings, investment returns, retirement withdrawals, healthcare, and property effects. It can show real or nominal dollars. Withdrawal strategies include constant dollar, variable percentage withdrawal, guardrails, Vanguard dynamic spending, CAPE based rules, and floor and ceiling approaches. The current public materials also describe a larger strategy comparison catalogue.

## Probabilistic and historical analysis

The open source project describes 10,000 run Monte Carlo analysis with parametric, historical bootstrap, and fat tail Student t methods. It also describes Bengen style rolling historical windows across United States, Singapore, and blended datasets, plus crisis replays and sequence risk mitigations.

Monte Carlo percentiles answer how a stated stochastic return model distributes outcomes. Historical backtesting answers how the same plan behaved in recorded sequences. Crisis replays answer how selected shocks affect it. These are related but not interchangeable measures.

The basic landing page currently mentions 1,000 log normal simulations and 10th, 50th, and 90th percentile bands, while the current repository describes richer 10,000 run methods. FireBuddy should treat such differences as evidence that calculator methodology and version must be visible alongside results.

## Outputs and presentation

The tool presents a FIRE dashboard, year by year charts and tables, cash flow waterfalls, passive income coverage, CPF and SRS breakdowns, risk dimensions, Monte Carlo distributions, backtest results, stress tests, and withdrawal comparisons. It supports named scenario comparisons and instant numerical deltas when assumptions change.

The application says calculations remain client side, stores plans in browser local storage, and offers JSON, Excel, and URL sharing. Its public website also loads site analytics. A privacy statement should therefore distinguish private financial calculations from ordinary site telemetry.

## Useful concepts for FireBuddy

The strongest reusable ideas are phased cash flows, explicit liquidity, visible scenario deltas, and separate modes for baseline projection and stress analysis. CPF LIFE should enter the cash flow only from the selected payout age. SRS should be a separately constrained balance and withdrawal stream. Property equity should count only when the user explicitly models a sale, right sizing, rental income, or another monetisation event.

For FireBuddy v1, the planner's breadth would obscure the transaction derived spending story. FireBuddy should first ship a reproducible target and monthly accumulation path, then add CPF and probabilistic modules behind clearly labelled assumptions.

## Limitations and official checks

The calculator is educational and its projections depend on assumptions and historical datasets. Even extensive automated tests cannot make future return assumptions certain. Historical Singapore series are shorter than United States series, and simulated distributions remain model dependent.

CPF Board confirms that members may start CPF LIFE payouts from age 65 and defer up to age 70. The amount depends on Retirement Account savings, payout start age, interest assumptions, and mortality. The three plans are not equivalent: Escalating grows by 2 percent yearly, Standard is steady, and Basic can decline later. CPF values and retirement sums are cohort and date specific.

IRAS confirms that current yearly SRS contribution limits are S$15,300 for citizens and permanent residents and S$35,700 for foreigners. Penalty free retirement withdrawals can be spread over 10 years, with 50 percent of qualifying withdrawals subject to tax. These rules must be versioned rather than copied permanently from a third party calculator.
