---
source_title: FI Calc
source_url: https://ficalc.app/
agency: FI Calc
topic: fire_calculators
ingest: true
---

# FI Calc

## Source role

FI Calc is a retirement drawdown backtester. It starts with a portfolio at retirement and asks how a withdrawal plan would have behaved across historical market starting years. It is not primarily an accumulation calculator and it does not calculate a Singapore FIRE target from current transactions.

The accompanying guide is unusually explicit about methods and limitations. It states that historical success is evidence about the tested periods, not a promise about the future, and that FI Calc does not currently run Monte Carlo simulations.

## Inputs and configuration

Observed inputs include retirement duration, initial portfolio value, equities, bonds and cash allocation, asset fees, cash growth, rebalancing frequency, optional allocation glide paths, and a selected historical date range. Users can add recurring or timed income and extra withdrawals.

The tool supports many spending rules, including constant dollar, percent of portfolio, 1 divided by remaining years, variable percentage withdrawal, Guyton Klinger, the 95 percent rule, CAPE based spending, sensible withdrawals, Hebeler Autopilot II, and Vanguard dynamic spending. Different strategies pursue different objectives, so their spending paths should not be reduced to one generic success score.

## Historical simulation method

FI Calc replays each eligible historical retirement start through the selected duration using Robert Shiller's United States data from 1871 onward. Stocks and bonds use historical data. Cash instead uses a user supplied fixed annual growth rate.

Within each simulated year, the observed order is:

1. Apply the year's withdrawal, income, and any extra withdrawal at the start of the year.
2. Apply fees, asset growth, and dividends at year end to the remaining assets.
3. Rebalance at year end when enabled.

The results therefore test sequence risk directly. The same total returns in a different order can produce a different retirement outcome because withdrawals during an early decline leave less capital to recover.

## Outputs

The calculator reports the number and share of historical simulations that sustained the selected plan. A user can inspect individual starting year paths and compare withdrawal amounts, ending values, and failure cases. Results can be exported together or per simulation as CSV. Results are shown in real dollars, while CSV data also exposes nominal values.

Shareable URLs encode a calculation. FI Calc states that entered financial data stays on the device and is not stored, while Google Analytics measures app usage without tracking calculator inputs.

## Useful concepts for FireBuddy

The most useful pattern is separation of questions. A FIRE target answers how much capital a spending rule implies. A drawdown backtest asks whether a completed portfolio and withdrawal strategy survived particular historical sequences. FireBuddy should not present one as if it answered the other.

FI Calc also demonstrates why users need to inspect weak paths, minimum spending, taxes, healthcare, retirement length, and individual failures rather than seeing only an aggregate success percentage.

## Limitations and fact checking

The source uses United States assets, CPI, and dollars. Its own guide warns that this may not represent a non United States investor. It does not automatically model taxes, CPF, CPF LIFE, SRS, Singapore inflation, or Singapore dollar currency effects.

A 100 percent historical success result means only that none of the tested historical windows ran out of money. It does not mean a zero chance of future failure. Historical windows overlap, the available history contains only a limited set of crises, and tuning a strategy to the same dataset creates overfitting risk.

This source makes no Singapore statutory claim that FireBuddy should treat as official. CPF and SRS phases would need separate, current official inputs before adapting its drawdown ideas to Singapore.
