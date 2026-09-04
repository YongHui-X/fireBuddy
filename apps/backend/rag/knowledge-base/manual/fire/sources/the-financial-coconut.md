---
source_title: The Financial Coconut, The FIRE Spreadsheet That Breaks Down a S$4M Retirement Goal
source_url: https://www.thefinancialcoconut.com/blog/the-fire-spreadsheet-that-breaks-down-a-s4m-retirement-goal
agency: The Financial Coconut
topic: fire_calculators
ingest: true
---

# The Financial Coconut on expense based FI layers

## Source role

This February 2026 article describes a spreadsheet inspired by FIRE Path Lion. Instead of showing only one large FIRE target, it converts each retirement expense category into the capital needed to support it. The idea is motivational and explanatory. It does not replace a full retirement drawdown analysis.

## Inputs and formula

The spreadsheet begins with current portfolio value, a chosen withdrawal rate, and itemised retirement expenses. Each expense has a monthly amount, annual amount, required capital, and progress percentage.

For each category:

`annual category expense = monthly category expense x 12`

`category FI capital = annual category expense / withdrawal rate`

At a 3.25 percent withdrawal rate, the article's S$10,800 annual food example requires about S$332,000. A S$200 monthly lifestyle increase adds S$2,400 annual spending and about S$73,846 of capital at the same rate.

The total of category capital requirements equals the normal FIRE target when every category uses the same withdrawal rate and there are no overlapping adjustments.

## Outputs and interaction

The source presents progress bars for categories such as housing, food, utilities, transport, insurance, family support, travel, and subscriptions. Categories can be ordered by priority, smallest required capital, or largest required capital.

The article frames completed essential categories as partial or survival FI and optional categories as later lifestyle layers. This makes the tradeoff between ongoing spending and required capital visible.

## Useful concepts for FireBuddy

FireBuddy already stores typed expense categories. A later Insights view can use completed expense history to calculate category level annual spending and FI capital. The interface should let the user distinguish core and optional spending without silently deciding that a category is essential.

Category progress needs an allocation rule. Simply comparing the full portfolio with every category target would show many categories at 100 percent simultaneously and double count the same assets. A meaningful layered view can allocate the portfolio cumulatively in a stated order, such as user priority, then show how far the remaining capital funds the next layer.

The category view should link back to the transaction period used, explain annualisation, and recalculate when the withdrawal rate changes. It should show that these are components of one target, not separate pools of money unless the user has actually earmarked assets.

## Limitations and official checks

The chosen 3.25 percent withdrawal rate is a personal assumption from the example. The article also mentions CPF LIFE, property, healthcare, and Singapore tax features, but it does not model their timing or legal constraints in the category formula.

CPF LIFE cannot be subtracted from every category or every retirement year when payouts have not started. A later FireBuddy version could assign a dated income stream to selected essential expenses, while retaining a pre payout bridge.

Property value should not make a category appear funded unless explicit liquid proceeds are part of the scenario. CPF and SRS balances should remain separate from immediately investable assets until access and timing rules are modelled.

The source is commentary and behavioural framing, not official financial guidance. Its examples should be presented as examples rather than recommended spending or withdrawal rates.
