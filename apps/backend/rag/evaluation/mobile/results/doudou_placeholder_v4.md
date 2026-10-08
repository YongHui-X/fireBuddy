# DouDou mobile eval (placeholder_v4)

Date 2026-10-05. 8/10 cases pass the automatic data checks.

## PASS · ph_direct_spend

**Q:** How much have I spent this month?

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 this month so far, from 1 to 5 October 2026.
- Last month, you spent a total of S$3,817 from 1 to 30 September 2026.



## PASS · ph_savings_rate

**Q:** What is my savings rate this month?

**Sections sent:** cashflow · **Mode:** hybrid

- Your savings rate this month is 77.4%.
- Your income is S$5,200.
- Your spending is S$1,176.



## PASS · ph_emergency_vs_guideline

**Q:** Is my emergency fund within MoneySense's 3 to 6 months?

**Sections sent:** emergency · **Mode:** hybrid

- According to MoneySense, setting aside at least 3 to 6 months’ worth of expenses as emergency funds is generally an accepted rule of thumb.
- Your emergency runway is recorded as 17.1 months, which exceeds the 3 to 6 months guideline.
- Your average monthly essential spending is S$1,056, which means your emergency fund is well above the recommended target.
- The derived emergency fund targets are S$3,167 for 3 months and S$6,333 for 6 months.



## PASS · ph_order_months

**Q:** Did I spend more this month or last month?

**Sections sent:** spending · **Mode:** hybrid

- You spent less this month compared to last month.
- The total spending this month so far is S$1,176.
- The total spending last month was S$3,817.
- The difference in spending is S$2,642, indicating a decrease.



## PASS · ph_difference_months

**Q:** How much less did I spend this month than last month?

**Sections sent:** spending · **Mode:** hybrid

- You spent less this month than last month.
- The total spending difference is S$2,642.
- Your spending in the top categories also decreased:
  - Food & Drink: S$24 less than last month (last month amount: S$541)
  - Bills & Utilities: S$16 less than last month (last month amount: S$204)
  - Shopping: S$37 less than last month (last month amount: S$185)
  - Travel: S$2,220 less than last month (last month amount: S$2,340)
  - Transport: S$318 less than last month (last month amount: S$418)



## PASS · ph_order_same_band

**Q:** Did I spend more on Food & Drink this month or last month?

**Sections sent:** spending · **Mode:** hybrid

- You spent less on Food & Drink this month compared to last month.
- This month, your spending on Food & Drink is S$517.
- Last month, your spending on Food & Drink was S$541.



## PASS · ph_sum_assets

**Q:** What are my total assets?

**Sections sent:** netWorth · **Mode:** hybrid

- Your total assets amount to S$445,000.
- Your net worth is S$80,000.
- Your total liabilities are S$365,000.
- Your investable assets are S$65,000.



## PASS · ph_ratio_category_share

**Q:** What share of this month's spending went to Food & Drink?

**Sections sent:** spending · **Mode:** hybrid

- The share of this month's spending that went to Food & Drink is 44.0%.
- The amount spent on Food & Drink this month is S$517.



## FAIL · ph_difference_fi_gap

**Q:** How much more do I need to reach my FI target?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681.
- You currently have a funding gap of S$135,383.
- This means you need to accumulate an additional S$135,383 to reach your FIRE target.

**Problems:** missing phrase "2,500,681"

## FAIL · ph_ratio_debt_service

**Q:** What is my monthly debt service as a share of my income?

**Sections sent:** cashflow, netWorth · **Mode:** hybrid

- Your monthly debt service is S$1,650.
- Your income is S$5,200.
- The debt service as a share of your income is represented by the debtToIncome ratio of 31.7%.

**Problems:** contains forbidden "represented by"
