---
source_title: RemarkRemedy fireplanner source repository
source_url: https://github.com/RemarkRemedy/fireplanner
agency: RemarkRemedy
topic: fire_calculators
ingest: true
---

# RemarkRemedy fireplanner source repository

## Source role

This is the open source implementation repository linked to SG FIRE Planner. It provides stronger evidence about intended architecture, calculation modules, historical datasets, privacy, exports, and test coverage than the public landing page alone. It is still a changing software project, so the repository revision and deployed website may differ at any point in time.

## Inputs and deterministic engine

The repository describes guided inputs for income, expenses, net worth, CPF, asset allocation, financial goals, healthcare, property, and life events. Income can use simple growth, career phases, or benchmark based models. Asset allocation supports eight classes, templates, portfolio statistics, correlations, and glide paths.

The year by year projection combines salary, tax, CPF, savings, investment returns, and retirement withdrawals. The README lists constant dollar, variable percentage withdrawal, guardrails, Vanguard dynamic, CAPE based, and floor and ceiling strategies. Results can be viewed in real or nominal dollars and as charts or detailed tables.

The code layout separates FIRE, CPF, tax, income, withdrawal, and projection calculations from simulation, data, and validation modules. That separation is a useful FireBuddy precedent: authoritative calculations should live in deterministic business logic, not UI components or an AI prompt.

## Simulation and historical methods

The repository describes three distinct forms of uncertainty analysis:

* Monte Carlo with 10,000 paths and parametric, historical bootstrap, or fat tail Student t methods, run in a browser Web Worker.
* Bengen style rolling historical backtests using United States, Singapore, or blended datasets.
* Sequence risk stress tests that replay named crises and compare mitigations.

The documented historical sources include United States equities from NYU Stern beginning in 1928, United States Treasury data, STI data beginning in 1987, MSCI World beginning in 1970, REITs beginning in 1972, gold beginning in 1968, cash beginning in 1928, and Singapore CPI beginning in 1961. Different start dates mean a multi asset backtest may have a shorter common history or need an explicit data policy.

## Outputs and scenario workflow

The repository describes headline FIRE metrics, risk assessment across several dimensions, passive income coverage, a cash flow waterfall, one more year analysis, projection tables, Monte Carlo percentiles, backtest results, crisis replays, and withdrawal comparisons.

Its what if explorer changes income, expenses, returns, and withdrawal rate with instant deltas. Up to five named scenarios can be compared. FireBuddy v1 should adopt only the baseline versus one temporary scenario pattern, keeping the input and numerical delta visible.

## Privacy and reproducibility

The application is described as a static, client side site. Calculations and heavy simulations run in the browser. Plans persist in local storage and can be exported or imported as JSON. Detailed projections can be exported to Excel, and key parameters can be encoded in a shareable URL.

Local execution reduces server side financial data collection, but local storage and shareable URLs have their own risks. A shared URL can expose assumptions to anyone who receives it. FireBuddy should document exactly which fields leave the device and should avoid placing sensitive account data in URLs.

The README reports more than 1,400 automated tests. Test volume is useful evidence of engineering effort, but it does not validate future market assumptions or guarantee that deployed code matches current official rules.

## Useful concepts for FireBuddy

The repository supports four strong design choices:

1. Separate deterministic formulas from simulation and presentation.
2. Version historical datasets and expose their coverage.
3. Run scenario comparisons from structured inputs and show deltas.
4. Keep real, nominal, deterministic, probabilistic, and historical results explicitly labelled.

The repository's broad scope should not become the FireBuddy v1 backlog. The product brief calls for transaction derived spending, one deterministic monthly projection, and one temporary scenario first.

## Limitations and official checks

The repository is not an official Singapore rules source. CPF rates, account transitions, retirement sums, CPF LIFE estimates, income tax, SRS, healthcare, and property policies are time sensitive. A code constant can be internally consistent and still be outdated.

CPF Board confirms that CPF LIFE payout estimates depend on Retirement Account savings, payout start age, interest assumptions, and mortality. IRAS confirms that SRS limits and withdrawal tax treatment have specific eligibility and timing rules. FireBuddy should store the official source URL, effective date, cohort where relevant, and calculation version for every future Singapore statutory assumption.

Historical and Monte Carlo outputs remain conditional. A larger number of paths reduces sampling noise under the chosen model but does not make the model itself correct. Historical backtests are limited by the available series and do not turn past survival into certainty.
