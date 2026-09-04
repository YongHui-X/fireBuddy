# Dashboard Two-Lens Wireframe

Status: Draft for design review before implementation.

The dashboard is divided into two clear questions:

1. **How am I living right now?** Monthly income, spending, and transaction behaviour.
2. **Am I getting closer to my goal?** Wealth position and progress toward financial independence.

The user-facing section names below are working labels. The two-lens structure is the important decision.

## Desktop layout

```mermaid
flowchart TB
  Header["Dashboard header<br/>Greeting and transaction search"]

  Header --> CashFlow

  subgraph CashFlow["THIS MONTH: Cash flow lens"]
    direction TB
    Period["Reporting month<br/>Previous | September 2026 | Next"]

    subgraph CashMetrics["Immediate monthly snapshot"]
      direction LR
      Income["Income<br/>S$6,200"]
      Spent["Spent<br/>S$3,011"]
      Flow["Net cash flow<br/>+S$3,189"]
      Category["Top category<br/>Housing"]
    end

    subgraph CashDetails["Monthly behaviour"]
      direction LR
      Breakdown["Monthly spending breakdown<br/>Category donut and labels"]
      Transactions["Recent transactions<br/>Latest activity and anomaly indicators"]
    end

    Period --> CashMetrics
    CashMetrics --> CashDetails
  end

  CashFlow --> Wealth

  subgraph Wealth["LONG-TERM PROGRESS: Wealth and FI lens"]
    direction TB
    AsOf["Latest wealth snapshot<br/>As of 1 September 2026"]

    subgraph WealthMetrics["Trajectory snapshot"]
      direction LR
      NetWorth["Net worth<br/>S$286,400"]
      Invested["Invested assets<br/>S$192,850"]
      FI["FI progress<br/>18.6%"]
      Runway["Emergency runway<br/>5.2 months"]
    end

    Progress["FIRE progress<br/>Historical and projected path"]
    Action["Recommended next action<br/>One deterministic action with evidence"]

    AsOf --> WealthMetrics
    WealthMetrics --> Progress
    Progress --> Action
  end
```

## Mobile reading order

```mermaid
flowchart TB
  MobileHeader["Dashboard header"]
  MobilePeriod["Reporting month<br/>Previous | September 2026 | Next"]

  MobileHeader --> MobilePeriod
  MobilePeriod --> CashTitle["THIS MONTH"]
  CashTitle --> CashRowOne["Income  |  Spent"]
  CashRowOne --> CashRowTwo["Net cash flow  |  Top category"]
  CashRowTwo --> MobileBreakdown["Spending breakdown"]
  MobileBreakdown --> MobileTransactions["Recent transactions"]

  MobileTransactions --> WealthTitle["LONG-TERM PROGRESS"]
  WealthTitle --> WealthRowOne["Net worth  |  Invested assets"]
  WealthRowOne --> WealthRowTwo["FI progress  |  Emergency runway"]
  WealthRowTwo --> MobileProgress["FIRE progress"]
  MobileProgress --> MobileAction["Recommended next action"]
```

## Time and interaction rules

| Area | Time scope | Behaviour |
| --- | --- | --- |
| Income, Spent, Net cash flow, Top category | Selected reporting month | All four update when the month changes |
| Spending breakdown | Selected reporting month | Uses the same month as the cash flow metrics |
| Recent transactions | Selected reporting month | Shows the latest transactions within that month |
| Net worth, Invested assets, FI progress, Emergency runway | Latest available snapshot | Does not change with the reporting month |
| FIRE progress and recommended action | Latest available financial summary | Keeps its evidence date visible |

## Layout intent

- Use compact metric cards with reduced padding, four columns on desktop and two columns on mobile.
- Keep the reporting month inside the cash flow section because it does not control wealth metrics.
- Replace Savings rate with Net cash flow so the result is expressed as an immediate dollar amount.
- Keep Emergency runway, but place it in the long-term section instead of the first dashboard row.
- Preserve one recommended action and keep its evidence and destination explicit.
