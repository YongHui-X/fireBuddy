---
source_title: FIRE calculator research source registry
agency: FireBuddy
topic: fire_calculators
ingest: false
---

# FIRE calculator research source registry

Reviewed on 22 August 2026. This file is a human readable registry and is excluded from RAG ingestion. Each reviewed source has a separate, attributable extract under `manual/fire/sources/`.

The extracts paraphrase the sources. They distinguish observed calculator behaviour, publisher claims, and facts checked against official Singapore sources. A source's inclusion does not make its assumptions official guidance.

| Source | Supplied URL | Purpose | Extract |
|---|---|---|---|
| FI Calc | https://ficalc.app/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAb21jcATpS75wZG9mAmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDzU2NzA2NzM0MzM1MjQyNwABp3f5jNI-cjsRDvoynDet-0RoV5lEVYtYZfIo3v0im_MvxgkIYaxApndCRZV2_aem_L-YhX4HvGZAuuNYL_k0Szg | Historical retirement drawdown backtesting, withdrawal strategies, and clear interpretation warnings | [fi-calc.md](sources/fi-calc.md) |
| SG FIRE Planner | https://sgfireplanner.com/ | Singapore specific lifecycle projection, CPF, SRS, tax, property, Monte Carlo, historical backtesting, and stress tests | [sg-fire-planner.md](sources/sg-fire-planner.md) |
| SG FIRE Planner repository | https://github.com/RemarkRemedy/fireplanner | Open source calculation architecture, dataset provenance, browser privacy model, exports, and test coverage | [sg-fire-planner-repository.md](sources/sg-fire-planner-repository.md) |
| RetireCan | https://retirecan.sg/ | Guided Singapore estimate using present value retirement cash flows and a CPF bridge | [retirecan.md](sources/retirecan.md) |
| Tree of Wealth | https://treeofwealth.sg/singapore-fire-planner/ | Transparent deterministic projection, growing cash flow present value, CPF and SRS estimates, and accumulation Monte Carlo bands | [tree-of-wealth.md](sources/tree-of-wealth.md) |
| FinSight SG | https://finsight.sg/article-fire-number-singapore | Third party argument for a Singapore adjusted FIRE number and separate pre CPF LIFE and post CPF LIFE phases | [finsight-sg.md](sources/finsight-sg.md) |
| The Financial Coconut | https://www.thefinancialcoconut.com/blog/the-fire-spreadsheet-that-breaks-down-a-s4m-retirement-goal | Expense category capital requirements and partial FI milestones | [the-financial-coconut.md](sources/the-financial-coconut.md) |
| FIRE Path Lion | https://www.firepathlion.com/detail-of-my-planned-expenses-revising-my-fire-number/ | Original personal example of replacing a rough spending estimate with category level retirement expenses | [fire-path-lion.md](sources/fire-path-lion.md) |
| Dr Wealth | https://drwealth.com/fire-movement/ | Introductory FIRE concepts, the 25 times rule, savings rate, income, and investing | [dr-wealth.md](sources/dr-wealth.md) |

## Official fact checking references

Official sources used to check CPF and SRS statements:

* CPF Board, [How much CPF payouts can I get every month?](https://www.cpf.gov.sg/service/article/how-much-cpf-payouts-can-i-get-every-month)
* CPF Board, [What CPF LIFE plans are available?](https://www.cpf.gov.sg/service/article/what-are-the-cpf-life-plans-available-and-which-is-the-right-plan-for-me)
* CPF Board, [Withdrawing for immediate retirement needs](https://www.cpf.gov.sg/member/retirement-income/retirement-withdrawals/withdrawing-for-immediate-retirement-needs)
* CPF Board, [What are the retirement sums?](https://www.cpf.gov.sg/service/article/what-are-the-retirement-sums-basic-retirement-sum-brs-full-retirement-sum-frs-and-enhanced-retirement-sum-ers)
* IRAS, [SRS contributions and tax relief](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/srs-contributions)
* IRAS, [Tax on SRS withdrawals](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/tax-on-srs-withdrawals)

Official values are time sensitive. A production calculator should version dated assumptions and ask the user to review them instead of treating this registry as a permanent rate table.
