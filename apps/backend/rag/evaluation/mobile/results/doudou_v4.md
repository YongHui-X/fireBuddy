# DouDou mobile eval (v4)

Date 2026-10-04. 24/24 cases pass the automatic data checks.

## PASS · personal_current_spending

**Q:** How much have I spent this month so far? State the total and the covered period.

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 this month so far.
- The covered period is from 2026-10-01 to 2026-10-04.



## PASS · personal_top_categories

**Q:** What are my three largest spending categories this month? Give each category name and amount.

**Sections sent:** spending · **Mode:** hybrid

- Your largest spending categories this month are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148



## PASS · personal_spending_comparison

**Q:** Compare my spending this month so far with last month. Give both totals and say whether the periods cover the same number of days.

**Sections sent:** spending · **Mode:** hybrid

- This month's spending so far (from 2026-10-01 to 2026-10-04) totals S$1,176.
- Last month's total spending (from 2026-09-01 to 2026-09-30) was S$3,817.
- The periods do not cover the same number of days; this month has 4 days recorded, while last month had 30 days.



## PASS · personal_income_and_savings

**Q:** What are my recorded income, savings amount and savings rate this month?

**Sections sent:** cashflow · **Mode:** hybrid

- Your recorded income this month is S$5,200.
- Your recorded savings amount this month is S$4,024.
- Your savings rate this month is 77.4%.



## PASS · personal_net_worth_makeup

**Q:** Explain my net worth and its make-up: state net worth, total liabilities and investable assets, and say which asset breakdowns are not available in the summary.

**Sections sent:** netWorth · **Mode:** hybrid

- Your net worth is S$80,000.
- Total liabilities amount to S$365,000.
- Investable assets total S$65,000.
- The summary does not provide breakdowns of specific asset categories or details on the composition of your investable assets.



## PASS · personal_debt_totals

**Q:** How much debt do I have in total, and what is my recorded monthly debt service?

**Sections sent:** netWorth · **Mode:** hybrid

- Your total debt is recorded as S$365,000.
- Your recorded monthly debt service is S$1,650.



## PASS · personal_emergency_runway

**Q:** What is my emergency fund runway in months, and what average monthly essential spending is used for it?

**Sections sent:** spending, emergency · **Mode:** hybrid

- Your emergency fund runway is 17.1 months.
- The average monthly essential spending used for it is S$1,056.



## PASS · personal_essential_spending_targets

**Q:** Using my average monthly essential spending, state that monthly amount and my saved three-month and six-month emergency fund targets.

**Sections sent:** spending, cashflow, emergency · **Mode:** hybrid

- Your average monthly essential spending is S$1,056.
- Your three-month emergency fund target is S$3,167.
- Your six-month emergency fund target is S$6,333.



## PASS · personal_fire_target_progress

**Q:** What are my recorded FIRE target, progress percentage and funding status? Use the plan's recorded progress rather than recalculating it.

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681.
- Your progress percentage is 94.7%.
- Your funding status is a shortfall.



## PASS · personal_fire_investment_and_year

**Q:** For my FIRE plan, state the required monthly investment and estimated retirement year. Are these a projection or a guarantee?

**Sections sent:** netWorth, fire · **Mode:** hybrid

- Your required monthly investment is S$2,136.
- Your estimated retirement year is 2055.
- These figures are projections, not guarantees.



## PASS · hybrid_emergency_moneysense

**Q:** Is my emergency fund enough by MoneySense's rule? State my runway in months and the saved lower and upper emergency targets, and explain the limits of that comparison.

**Sections sent:** cashflow, emergency · **Mode:** hybrid

- Your emergency runway is 17.1 months.
- MoneySense recommends setting aside at least 3 to 6 months' worth of expenses as an emergency fund.
- Your derived emergency fund targets are:
  - 3 months: S$3,167
  - 6 months: S$6,333

The comparison is limited because your emergency runway is based on essential spending, while MoneySense's guideline counts all monthly expenses, including loan repayments, insurance premiums, and taxes.



## PASS · hybrid_srs_income

**Q:** Should I top up SRS given my recorded monthly income and savings amount? State both figures, explain the contribution caps and liquidity trade-off, and ask what else is needed before judging the tax benefit.

**Sections sent:** cashflow · **Mode:** hybrid

- Your recorded monthly income is S$5,200.
- Your recorded savings amount is S$4,024.

- The annual contribution limits for the Supplementary Retirement Scheme (SRS) are:
  - $15,300 for Singapore Citizens and Permanent Residents.
  - $35,700 for Foreigners.

- Contributions to the SRS reduce your taxable income for the following Year of Assessment, and investments within the SRS grow tax-free until withdrawal. However, early withdrawals (before retirement age) incur full taxation plus a 5% penalty.

- There is a liquidity trade-off: once money is contributed to the SRS, it becomes illiquid until retirement age, which may affect your cash flow if you need access to funds before then.

What else do you need to consider before judging the tax benefit?



## PASS · hybrid_savings_guideline

**Q:** How does my current savings rate compare with the MoneySense guideline? State my savings rate and explain whether saving the money proves I meet that guideline.

**Sections sent:** cashflow · **Mode:** hybrid

- Your current savings rate is 77.4%.
- According to MoneySense, the guideline recommends setting aside at least 10% of income for investments.
- Your savings rate significantly exceeds this guideline, indicating that you are saving a substantial portion of your income. However, saving the money does not equate to meeting the guideline for investments, as it specifically pertains to the percentage of income allocated for investment purposes.



## PASS · hybrid_emergency_ssb_liquidity

**Q:** My emergency runway looks comfortable. State the runway and explain the liquidity trade-offs of keeping an emergency buffer in Singapore Savings Bonds rather than immediately accessible cash.

**Sections sent:** emergency · **Mode:** hybrid

Your emergency runway is recorded as 17.1 months, which exceeds the three to six months target suggested for emergency funds.

Keeping an emergency buffer in Singapore Savings Bonds (SSBs) rather than immediately accessible cash involves several liquidity trade-offs:

- SSBs can be redeemed in any month without penalty, providing high liquidity, but they cannot be traded or pledged as collateral.
- While SSBs offer step-up interest and are fully backed by the Singapore government, they are not as liquid as cash since they require a redemption process.
- Cash is immediately accessible for urgent needs, while SSBs may take a couple of days to process the redemption and receive funds.
- SSBs are suitable for medium-term low-risk assets, but for immediate cash needs, cash reserves are preferable.



## PASS · hybrid_fire_cpf_bridge

**Q:** State my FIRE target and estimated retirement year, then explain why a Singapore FIRE plan needs a bridge before CPF LIFE begins. Do not assume my age or CPF balances.

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681, and your estimated retirement year is 2055. 

- A Singapore FIRE plan requires a bridge before CPF LIFE begins because CPF LIFE payouts start at age 65, meaning there is a gap where non-CPF assets must fund living expenses. 

- This gap necessitates a two-phase strategy: 
  - Phase 1 involves drawing from non-CPF investments until CPF LIFE begins.
  - Phase 2 starts at age 65 when CPF LIFE provides monthly payouts, reducing the reliance on non-CPF assets. 

- The pre-CPF LIFE gap can span many years, requiring careful planning to ensure sufficient funding until CPF LIFE becomes a significant income source.



## PASS · hybrid_debt_priority

**Q:** Given my total debts and monthly debt service, what should I check before choosing which debt to repay first? State both recorded amounts and relate the answer to MoneySense guidance.

**Sections sent:** netWorth · **Mode:** hybrid

- According to MoneySense guidance, when deciding which debt to repay first, consider the interest rates, terms, and any penalties for early repayment. 

- Your total debts are recorded as S$365,000.

- Your monthly debt service is recorded as S$1,650.

- Evaluating these factors can help you prioritize debts that may be costing you more in interest or have less favorable terms.



## PASS · knowledge_cpf_rates

**Q:** What are the CPF contribution rates from January 2026 by age for Singapore Citizens and PRs from their third year earning above $750 a month? Separate employer and employee shares.

**Sections sent:** none · **Mode:** knowledge

- From 1 January 2026, CPF contribution rates for Singapore Citizens and Permanent Residents (from the third year of PR status) earning more than $750 a month are as follows:

- For employees aged 55 and below:
  - Total CPF contribution: 37%
  - Employee's share: 20%
  - Employer's share: 17%

- For employees aged above 55 to 60:
  - Total CPF contribution: 34%
  - Employee's share: 18%
  - Employer's share: 16%

- For employees aged above 60 to 65:
  - Total CPF contribution: 25%
  - Employee's share: 12.5%
  - Employer's share: 12.5%

- For employees aged above 65 to 70:
  - Total CPF contribution: 16.5%
  - Employee's share: 7.5%
  - Employer's share: 9%

- For employees aged above 70:
  - Total CPF contribution: 12.5%
  - Employee's share: 5%
  - Employer's share: 7.5%



## PASS · knowledge_srs_caps

**Q:** What are the annual SRS contribution caps for Singapore Citizens or Permanent Residents and foreigners, and what overall personal tax relief cap applies?

**Sections sent:** none · **Mode:** knowledge

- Annual SRS contribution caps are:
  - Singapore Citizens & Permanent Residents: $15,300/year
  - Foreigners: $35,700/year

- The overall personal tax relief cap is $80,000 per Year of Assessment.



## PASS · knowledge_ssb_limits

**Q:** What are the Singapore Savings Bonds minimum purchase and individual holding limit? Is there a separate holding limit for cash and SRS?

**Sections sent:** none · **Mode:** knowledge

- The minimum investment amount for Singapore Savings Bonds is $500, and subsequent investments must be made in multiples of $500.
- The maximum individual holding limit for Singapore Savings Bonds is $200,000.
- There are no separate individual limits for cash and SRS purchases; the $200,000 limit applies to the total holdings across both cash and SRS accounts.



## PASS · knowledge_cpf_frs_and_life_basis

**Q:** What is the Full Retirement Sum for members turning 55 in 2026, and when does CPF LIFE start? If quoting a payout example, distinguish its cohort and estimate date from the current FRS.

**Sections sent:** none · **Mode:** knowledge

- For members turning 55 in 2026, the Full Retirement Sum (FRS) is $220,400.
- CPF LIFE monthly payouts begin at age 65, but members can defer the start to as late as 70 for higher payouts.



## PASS · knowledge_medisave_bhs

**Q:** What is the MediSave Basic Healthcare Sum for 2026, and does it keep rising after a member turns 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- The BHS increases annually for members under 65.
- Once a member turns 65, their BHS is fixed at the value for the year they turned 65 and does not rise thereafter.



## PASS · knowledge_emergency_guidance

**Q:** What emergency fund rule of thumb does MoneySense give, and how might it differ for someone with unpredictable freelance earnings?

**Sections sent:** none · **Mode:** knowledge

- MoneySense recommends setting aside at least 3 to 6 months' worth of expenses as an emergency fund, which is generally considered sufficient for most people during emergencies like job loss or medical incidents. 

- For someone with unpredictable freelance earnings, it may be advisable to set aside a higher amount, potentially equivalent to 12 months of expenses, to better account for unexpected income fluctuations and ensure a more robust financial buffer.



## PASS · edge_followup_last_month

**Q:** And last month?

**Sections sent:** spending · **Mode:** hybrid

Your recorded spending last month was S$3,817.

- Top categories for last month:
  - Travel: S$2,340
  - Food & Drink: S$541
  - Transport: S$418



## PASS · edge_unavailable_pet_care_category

**Q:** How much have I spent on Pet care this month? Give a figure only if that category is explicitly present; otherwise say the summary cannot establish it.

**Sections sent:** spending · **Mode:** hybrid

- The summary cannot establish how much has been spent on Pet care this month, as that category is not among the top categories listed.


