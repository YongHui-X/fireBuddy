# DouDou mobile eval (final5)

Date 2026-10-05. 23/24 cases pass the automatic data checks.

## PASS · personal_current_spending

**Q:** How much have I spent this month so far? State the total and the covered period.

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 this month so far.
- The covered period is from 1 to 5 October 2026.



## PASS · personal_top_categories

**Q:** What are my three largest spending categories this month? Give each category name and amount.

**Sections sent:** spending · **Mode:** hybrid

- Food & Drink: S$517
- Bills & Utilities: S$187
- Shopping: S$148



## PASS · personal_spending_comparison

**Q:** Compare my spending this month so far with last month. Give both totals and say whether the periods cover the same number of days.

**Sections sent:** spending · **Mode:** hybrid

- This month's spending so far is from 1 to 5 October 2026.
- Last month's spending was from 1 to 30 September 2026.
- The total spending this month so far is S$1,176.
- The total spending last month was S$3,817.
- The periods do not cover the same number of days.



## PASS · personal_income_and_savings

**Q:** What are my recorded income, savings amount and savings rate this month?

**Sections sent:** cashflow · **Mode:** hybrid

- Your recorded income this month is S$5,200.
- Your savings amount this month is S$4,024.
- Your savings rate this month is 77.4%.



## PASS · personal_net_worth_makeup

**Q:** Explain my net worth and its make-up: state net worth, total liabilities and investable assets, and say which asset breakdowns are not available in the summary.

**Sections sent:** netWorth · **Mode:** hybrid

- Your net worth is S$80,000.
- Total liabilities amount to S$365,000.
- Investable assets total S$65,000.

The summary does not include breakdowns of specific asset categories or details about individual liabilities.



## PASS · personal_debt_totals

**Q:** How much debt do I have in total, and what is my recorded monthly debt service?

**Sections sent:** netWorth · **Mode:** hybrid

- Your total debt is S$365,000.
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



## FAIL · personal_fire_target_progress

**Q:** What are my recorded FIRE target, progress percentage and funding status? Use the plan's recorded progress rather than recalculating it.

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681.
- Your progress percentage is not provided in the context.
- Your funding status indicates a shortfall.
- The funding gap from today's assets is S$2,500,681.

**Problems:** missing fire.projectedShareOfTargetAtRetirement: expected one of 94.7% | 95%

## PASS · personal_fire_investment_and_year

**Q:** For my FIRE plan, state the required monthly investment and estimated retirement year. Are these a projection or a guarantee?

**Sections sent:** netWorth, fire · **Mode:** hybrid

- Your required monthly investment for your FIRE plan is S$2,136.
- Your estimated retirement year is 2055.
- These figures are projections based on your current financial data and assumptions, not guarantees.



## PASS · hybrid_emergency_moneysense

**Q:** Is my emergency fund enough by MoneySense's rule? State my runway in months and the saved lower and upper emergency targets, and explain the limits of that comparison.

**Sections sent:** cashflow, emergency · **Mode:** hybrid

- Your emergency runway is 17.1 months.
- According to MoneySense, the recommended emergency fund target is to set aside at least 3 to 6 months' worth of expenses.
- Your derived emergency fund targets are:
  - 3 months: S$3,167
  - 6 months: S$6,333

The comparison is limited because your emergency runway is based on essential spending, while MoneySense's guideline considers all monthly expenses, including loan repayments, insurance premiums, and taxes.



## PASS · hybrid_srs_income

**Q:** Should I top up SRS given my recorded monthly income and savings amount? State both figures, explain the contribution caps and liquidity trade-off, and ask what else is needed before judging the tax benefit.

**Sections sent:** cashflow · **Mode:** hybrid

- Your recorded monthly income is S$5,200 and your savings amount is S$4,024.
- The annual contribution cap for the Supplementary Retirement Scheme (SRS) is $15,300 for Singapore Citizens and Permanent Residents, and $35,700 for foreigners.
- Contributions to the SRS reduce your taxable income for the following Year of Assessment, subject to an overall personal relief cap of $80,000.
- SRS funds grow tax-free until withdrawal, but if withdrawn before retirement age, the full amount is taxable plus a 5% penalty.
- There is a liquidity trade-off: once money is contributed to the SRS, it is illiquid until retirement age, which may impact cash flow for early retirees.

What additional information do you need to assess the tax benefit of topping up your SRS?



## PASS · hybrid_savings_guideline

**Q:** How does my current savings rate compare with the MoneySense guideline? State my savings rate and explain whether saving the money proves I meet that guideline.

**Sections sent:** cashflow · **Mode:** hybrid

- Your current savings rate is 77.4%.
- According to MoneySense, the guideline recommends setting aside at least 10% of income for investments.
- Your savings rate significantly exceeds this guideline, indicating that you are saving a substantial portion of your income.
- However, the guideline specifically counts savings as a percentage of income after CPF contributions, which is not directly reflected in your current records.



## PASS · hybrid_emergency_ssb_liquidity

**Q:** My emergency runway looks comfortable. State the runway and explain the liquidity trade-offs of keeping an emergency buffer in Singapore Savings Bonds rather than immediately accessible cash.

**Sections sent:** emergency · **Mode:** hybrid

- Your emergency runway is 17.1 months, which exceeds the recommended target of 3 to 6 months' worth of expenses for a comfortable buffer during emergencies.

- Keeping an emergency buffer in Singapore Savings Bonds (SSBs) offers some liquidity benefits, as they can be redeemed in any month without penalty, allowing you to access your capital quickly.

- However, SSBs cannot be traded or pledged as collateral, which limits their flexibility compared to cash.

- While SSBs provide a step-up interest rate and are backed by the government, they may not be as immediately accessible as cash in a bank account, especially in urgent situations where you need funds right away.

- It's essential to weigh the benefits of earning interest against the need for immediate access to funds when deciding how to allocate your emergency buffer.



## PASS · hybrid_fire_cpf_bridge

**Q:** State my FIRE target and estimated retirement year, then explain why a Singapore FIRE plan needs a bridge before CPF LIFE begins. Do not assume my age or CPF balances.

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681.
- Your estimated retirement year is July 2055.

A Singapore FIRE plan needs a bridge before CPF LIFE begins due to the following reasons:

- CPF LIFE provides monthly payouts starting from age 65, which means there is a gap between your intended retirement age and when CPF LIFE can support your expenses.
- For example, if you retire before age 65, you will need to rely on non-CPF investments to cover your living expenses during this period.
- This gap requires careful planning to ensure you have sufficient liquid assets to fund your lifestyle until CPF LIFE payouts commence.
- A phased cash flow model is essential to manage spending gaps effectively, rather than simply applying a withdrawal rate to all retirement years.



## PASS · hybrid_debt_priority

**Q:** Given my total debts and monthly debt service, what should I check before choosing which debt to repay first? State both recorded amounts and relate the answer to MoneySense guidance.

**Sections sent:** netWorth · **Mode:** hybrid

- Before choosing which debt to repay first, consider the interest rates of your debts, the total amount owed, and your monthly debt service.
- Your total liabilities are recorded as S$365,000 and your monthly debt service is S$1,650.
- According to MoneySense guidance, prioritize paying off high-interest debts, such as credit cards, as they can accumulate significant interest over time.
- Additionally, assess whether there are any early repayment penalties associated with your loans, especially for housing loans, as this can affect your repayment strategy.
- It's also advisable to ensure that repaying a debt won't impact your ability to meet essential expenses or other financial commitments.



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
- The maximum amount of Savings Bonds that each investor may hold at any one time is $200,000.
- There are no separate individual limits for cash and SRS purchases; the $200,000 limit applies to the total holdings across both cash and SRS accounts.



## PASS · knowledge_cpf_frs_and_life_basis

**Q:** What is the Full Retirement Sum for members turning 55 in 2026, and when does CPF LIFE start? If quoting a payout example, distinguish its cohort and estimate date from the current FRS.

**Sections sent:** none · **Mode:** knowledge

- For members turning 55 in 2026, the Full Retirement Sum (FRS) is $220,400.
- CPF LIFE monthly payouts begin at age 65, but members can defer the start to as late as age 70 for higher payouts.



## PASS · knowledge_medisave_bhs

**Q:** What is the MediSave Basic Healthcare Sum for 2026, and does it keep rising after a member turns 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- The BHS increases annually for members under 65.
- Once a member turns 65, their BHS is fixed for life at the value for the year they turned 65.



## PASS · knowledge_emergency_guidance

**Q:** What emergency fund rule of thumb does MoneySense give, and how might it differ for someone with unpredictable freelance earnings?

**Sections sent:** none · **Mode:** knowledge

- MoneySense suggests setting aside at least 3 to 6 months' worth of expenses as an emergency fund, which is generally considered sufficient for most people during emergencies such as job loss or medical incidents.

- For someone with unpredictable freelance earnings, it may be advisable to set aside a higher amount for emergency funds, potentially equivalent to 12 months of expenses, to account for unexpected income fluctuations.



## PASS · edge_followup_last_month

**Q:** And last month?

**Sections sent:** spending · **Mode:** hybrid

- Your recorded spending last month was S$3,817.
- The spending period for last month was from 1 to 30 September 2026.



## PASS · edge_unavailable_pet_care_category

**Q:** How much have I spent on Pet care this month? Give a figure only if that category is explicitly present; otherwise say the summary cannot establish it.

**Sections sent:** spending · **Mode:** hybrid

- The summary cannot establish your spending on Pet care this month.


