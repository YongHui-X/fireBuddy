# DouDou mobile eval (placeholder_v1)

Date 2026-10-05. 4/10 cases pass the automatic data checks.

## PASS · ph_direct_spend

**Q:** How much have I spent this month?

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 this month from 1 to 5 October 2026.
- Your top spending categories for this period include:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100



## PASS · ph_savings_rate

**Q:** What is my savings rate this month?

**Sections sent:** cashflow · **Mode:** hybrid

- Your savings rate this month is 77.4%.
- Your total income is S$5,200.
- Your total spending is S$1,176.
- Your savings amount is S$4,024.



## PASS · ph_emergency_vs_guideline

**Q:** Is my emergency fund within MoneySense's 3 to 6 months?

**Sections sent:** emergency · **Mode:** hybrid

- According to MoneySense, it is generally accepted to set aside at least 3 to 6 months' worth of expenses as emergency funds.
- Your derived emergency fund target for 3 months is S$3,167, and for 6 months, it is S$6,333.
- Your recorded emergency runway is 17.1 months, which is over 12 months.
- Since your emergency runway exceeds the 6-month target, it is well above the MoneySense guideline.



## PASS · ph_order_months

**Q:** Did I spend more this month or last month?

**Sections sent:** spending · **Mode:** hybrid

- This month, your total spending from 1 to 5 October 2026 is S$1,176.
- Last month, your total spending from 1 to 30 September 2026 was S$3,817.
- I do not have enough reliable context in the FireBuddy knowledge base to answer that.



## FAIL · ph_difference_months

**Q:** How much less did I spend this month than last month?

**Sections sent:** spending · **Mode:** hybrid

- This month, your total spending is S$1,176.
- Last month, your total spending was S$3,817.
- The difference in spending between this month and last month is S$3,817 minus S$1,176.

**Problems:** missing phrase "2,642"

## FAIL · ph_order_same_band

**Q:** Did I spend more on Food & Drink this month or last month?

**Sections sent:** spending · **Mode:** hybrid

- This month, your spending on Food & Drink is S$517.
- Last month, your spending on Food & Drink was S$541.
- Since both amounts are under 1k, it's not clear which month had higher spending based on the ranges provided.

**Problems:** an internal range was written into the answer

## FAIL · ph_sum_assets

**Q:** What are my total assets?

**Sections sent:** netWorth · **Mode:** hybrid

- Your total assets are represented by your net worth, which is S$80,000.
- This figure accounts for your investable assets and liabilities.

**Problems:** missing phrase "445,000"

## FAIL · ph_ratio_category_share

**Q:** What share of this month's spending went to Food & Drink?

**Sections sent:** none · **Mode:** knowledge

I do not have enough reliable context in the FireBuddy knowledge base to answer that. Try asking about CPF, Singapore Savings Bonds, MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore investing basics.

**Problems:** missing phrase "44"

## FAIL · ph_difference_fi_gap

**Q:** How much more do I need to reach my FI target?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681.
- Currently, you are in a funding status of shortfall.
- Your progress rate is 94.7%, which is in the range of 90-100%.
- To reach your target, you need to make a required monthly investment of S$2,136.

**Problems:** an internal range was written into the answer; missing phrase "2,500,681"

## FAIL · ph_ratio_debt_service

**Q:** What is my monthly debt service as a share of my income?

**Sections sent:** cashflow, netWorth · **Mode:** knowledge

I do not have enough reliable context in the FireBuddy knowledge base to answer that. Try asking about CPF, Singapore Savings Bonds, MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore investing basics.

**Problems:** missing phrase "32"
