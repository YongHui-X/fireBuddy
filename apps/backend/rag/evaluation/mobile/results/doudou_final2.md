# DouDou mobile eval (final2)

Date 2026-10-04. 23/24 cases pass the automatic data checks.

## FAIL · personal_current_spending

**Q:** How much have I spent this month so far? State the total and the covered period.

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 from 1 to 4 October 2026.  
- This total falls within the range of 1k to 5k.

**Problems:** missing spending.currentMonth.period: expected one of 2026-10-01 to 2026-10-04; an internal range was written into the answer

## PASS · personal_top_categories

**Q:** What are my three largest spending categories this month? Give each category name and amount.

**Sections sent:** spending · **Mode:** hybrid

- Food & Drink: S$517
- Bills & Utilities: S$187
- Shopping: S$148



## PASS · personal_spending_comparison

**Q:** Compare my spending this month so far with last month. Give both totals and say whether the periods cover the same number of days.

**Sections sent:** spending · **Mode:** hybrid

- This month's spending period is from 1 to 4 October 2026.
- Last month's spending period was from 1 to 30 September 2026.
- The two periods do not cover the same number of days.

- Total spending this month so far: S$1,176.
- Total spending last month: S$3,817.



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
- Investable assets are valued at S$65,000.

The summary does not include specific breakdowns of your assets.



## PASS · personal_debt_totals

**Q:** How much debt do I have in total, and what is my recorded monthly debt service?

**Sections sent:** netWorth · **Mode:** hybrid

- Your total debt is recorded as S$365,000.
- Your monthly debt service is recorded as S$1,650.



## PASS · personal_emergency_runway

**Q:** What is my emergency fund runway in months, and what average monthly essential spending is used for it?

**Sections sent:** spending, emergency · **Mode:** hybrid

- Your emergency fund runway is 17.1 months.
- The average monthly essential spending used for it is S$1,056.



## PASS · personal_essential_spending_targets

**Q:** Using my average monthly essential spending, state that monthly amount and my saved three-month and six-month emergency fund targets.

**Sections sent:** spending, cashflow, emergency · **Mode:** hybrid

- Your average monthly essential spending is S$1,056.
- Your emergency fund target for three months is S$3,167.
- Your emergency fund target for six months is S$6,333.



## PASS · personal_fire_target_progress

**Q:** What are my recorded FIRE target, progress percentage and funding status? Use the plan's recorded progress rather than recalculating it.

**Sections sent:** fire · **Mode:** hybrid

- Your recorded FIRE target is S$2,565,681.
- Your progress percentage is 94.7%.
- Your funding status is a shortfall.



## PASS · personal_fire_investment_and_year

**Q:** For my FIRE plan, state the required monthly investment and estimated retirement year. Are these a projection or a guarantee?

**Sections sent:** netWorth, fire · **Mode:** hybrid

- Your required monthly investment for your FIRE plan is S$2,136.
- Your estimated retirement year is 2055.
- These figures are projections, not guarantees.



## PASS · hybrid_emergency_moneysense

**Q:** Is my emergency fund enough by MoneySense's rule? State my runway in months and the saved lower and upper emergency targets, and explain the limits of that comparison.

**Sections sent:** cashflow, emergency · **Mode:** hybrid

- Your emergency runway is 17.1 months.
- The lower emergency fund target for 3 months is S$3,167.
- The upper emergency fund target for 6 months is S$6,333.

According to MoneySense, it is recommended to set aside at least 3 to 6 months' worth of expenses for emergency funds. However, the adequacy of this amount can vary based on individual circumstances, such as income stability. Your emergency runway is based on essential spending, while MoneySense's guideline counts all monthly expenses, including loan repayments, insurance premiums, and taxes.



## PASS · hybrid_srs_income

**Q:** Should I top up SRS given my recorded monthly income and savings amount? State both figures, explain the contribution caps and liquidity trade-off, and ask what else is needed before judging the tax benefit.

**Sections sent:** cashflow · **Mode:** hybrid

Your recorded monthly income is S$5,200 and your savings amount is S$4,024.

- The annual contribution limits for the Supplementary Retirement Scheme (SRS) are:
  - $15,300 for Singapore Citizens and Permanent Residents
  - $35,700 for Foreigners
- Contributions to SRS reduce your taxable income for the following Year of Assessment, subject to an overall personal relief cap of $80,000.
- SRS funds grow tax-free until withdrawal, but only 50% of the amount withdrawn is taxable at retirement age (currently 63). Early withdrawals incur full taxation plus a 5% penalty.

Consider the liquidity trade-off: SRS funds are illiquid until retirement age, which could impact your cash flow if you need access to funds before then. 

What additional information do you need to assess the potential tax benefits of topping up your SRS?



## PASS · hybrid_savings_guideline

**Q:** How does my current savings rate compare with the MoneySense guideline? State my savings rate and explain whether saving the money proves I meet that guideline.

**Sections sent:** cashflow · **Mode:** hybrid

- Your current savings rate is 77.4%.
- According to MoneySense, a common guideline for savings rates is to aim for at least 10% of income for investments.
- While your savings rate is significantly higher than the 10% guideline, it is important to note that the MoneySense guideline counts income after CPF contributions, while your savings rate is based on your total income. 
- Therefore, while you are saving a substantial amount, the comparison with the guideline is not directly applicable as they measure different aspects.



## PASS · hybrid_emergency_ssb_liquidity

**Q:** My emergency runway looks comfortable. State the runway and explain the liquidity trade-offs of keeping an emergency buffer in Singapore Savings Bonds rather than immediately accessible cash.

**Sections sent:** emergency · **Mode:** hybrid

Your emergency runway is recorded as 17.1 months. 

Keeping an emergency buffer in Singapore Savings Bonds (SSBs) rather than immediately accessible cash involves several liquidity trade-offs:

- SSBs can be redeemed in any month without penalty, allowing access to your principal plus accrued interest by the 2nd business day of the following month.
- However, SSBs cannot be traded or pledged as collateral, which limits their liquidity compared to cash.
- While SSBs provide a step-up interest structure and are backed by the Singapore government, they are not as liquid as cash in a savings account, which can be accessed immediately.
- SSBs are suitable for medium-term low-risk assets, but for immediate emergencies, cash is preferable due to its instant availability. 

In your case, with an emergency runway exceeding 12 months, you have a comfortable buffer, but consider the timing of your potential cash needs when deciding between cash and SSBs.



## PASS · hybrid_fire_cpf_bridge

**Q:** State my FIRE target and estimated retirement year, then explain why a Singapore FIRE plan needs a bridge before CPF LIFE begins. Do not assume my age or CPF balances.

**Sections sent:** fire · **Mode:** hybrid

Your FIRE target is S$2,565,681, and your estimated retirement year is July 2055.

A Singapore FIRE plan needs a bridge before CPF LIFE begins for the following reasons:

- CPF LIFE provides lifetime monthly payouts starting from age 65, which means there is a gap between your intended retirement age and when CPF assets can support your spending.
- This gap requires you to rely on non-CPF investments to fund your expenses until CPF LIFE payouts commence.
- The two-phase strategy involves drawing from non-CPF investments until age 65, after which CPF LIFE payouts significantly reduce the required drawdown from your investment portfolio.



## PASS · hybrid_debt_priority

**Q:** Given my total debts and monthly debt service, what should I check before choosing which debt to repay first? State both recorded amounts and relate the answer to MoneySense guidance.

**Sections sent:** netWorth · **Mode:** hybrid

- Your total debts amount to S$365,000 and your monthly debt service is S$1,650. 

- According to MoneySense guidance, you should consider the interest rates of your debts, the repayment terms, and whether any debts have penalties for early repayment.

- Prioritize high-interest debts first, as they can accumulate costs more quickly.

- Also, check if any debts are secured against assets, as this may affect your financial stability.

- Finally, ensure that repaying a particular debt won't hinder your ability to cover essential expenses.



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

- The overall personal income tax relief cap is $80,000 per Year of Assessment.



## PASS · knowledge_ssb_limits

**Q:** What are the Singapore Savings Bonds minimum purchase and individual holding limit? Is there a separate holding limit for cash and SRS?

**Sections sent:** none · **Mode:** knowledge

- The minimum purchase amount for Singapore Savings Bonds is $500, with subsequent investments in multiples of $500.
- The individual holding limit for Singapore Savings Bonds is $200,000 at any one time.
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
- Once a member turns 65, their BHS is fixed for life at the value for the year they turned 65.



## PASS · knowledge_emergency_guidance

**Q:** What emergency fund rule of thumb does MoneySense give, and how might it differ for someone with unpredictable freelance earnings?

**Sections sent:** none · **Mode:** knowledge

- MoneySense recommends setting aside at least 3 to 6 months' worth of expenses as an emergency fund, which is generally considered sufficient for most people during emergencies such as medical incidents or job loss.

- For someone with unpredictable freelance earnings, it may be advisable to set aside a higher amount for emergency funds, potentially equivalent to 12 months of expenses, to account for unexpected lull periods in income.



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

- The summary cannot establish how much has been spent on Pet care this month. 
- Pet care is not listed among the top spending categories for the current month.


