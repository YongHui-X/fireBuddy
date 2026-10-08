# DouDou mobile eval (v1)

Date 2026-10-04. 23/24 cases pass the automatic data checks.

## PASS · personal_current_spending

**Q:** How much have I spent this month so far? State the total and the covered period.

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 this month so far.
- The covered period is from 2026-10-01 to 2026-10-04.



## PASS · personal_top_categories

**Q:** What are my three largest spending categories this month? Give each category name and amount.

**Sections sent:** spending · **Mode:** hybrid

- Your three largest spending categories this month are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148



## PASS · personal_spending_comparison

**Q:** Compare my spending this month so far with last month. Give both totals and say whether the periods cover the same number of days.

**Sections sent:** spending · **Mode:** hybrid

- Your spending this month so far (from 2026-10-01 to 2026-10-04) totals S$1,176.
- Last month's total (from 2026-09-01 to 2026-09-30) was S$3,817.
- The periods do not cover the same number of days; this month has 4 days recorded, while last month had 30 days.



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
- Your investable assets are valued at S$65,000.

The summary does not include specific breakdowns of your asset categories, such as cash, equities, or other investments.



## FAIL · personal_debt_totals

**Q:** How much debt do I have in total, and what is my recorded monthly debt service?

**Sections sent:** netWorth · **Mode:** knowledge

I do not have enough reliable context in the FireBuddy knowledge base to answer that. Try asking about CPF, Singapore Savings Bonds, MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore investing basics.

**Problems:** missing liabilityTotal: expected one of S$365,000 | $365,000; missing monthlyDebtService: expected one of S$1,650 | $1,650

## PASS · personal_emergency_runway

**Q:** What is my emergency fund runway in months, and what average monthly essential spending is used for it?

**Sections sent:** spending, emergency · **Mode:** hybrid

- Your emergency fund runway is 17.1 months, which exceeds the recommended 3 to 6 months of expenses.
- Your average monthly essential spending is S$1,056. This figure is used to determine how much you should ideally have saved for emergencies.



## PASS · personal_essential_spending_targets

**Q:** Using my average monthly essential spending, state that monthly amount and my saved three-month and six-month emergency fund targets.

**Sections sent:** spending, cashflow, emergency · **Mode:** hybrid

- Your average monthly essential spending is S$1,056.
- Your three-month emergency fund target is S$3,167.
- Your six-month emergency fund target is S$6,333.



## PASS · personal_fire_target_progress

**Q:** What are my recorded FIRE target, progress percentage and funding status? Use the plan's recorded progress rather than recalculating it.

**Sections sent:** fire · **Mode:** hybrid

- Your recorded FIRE target is S$2,565,681.
- Your progress percentage towards that target is 94.7%.
- Your funding status is currently a shortfall.



## PASS · personal_fire_investment_and_year

**Q:** For my FIRE plan, state the required monthly investment and estimated retirement year. Are these a projection or a guarantee?

**Sections sent:** netWorth, fire · **Mode:** hybrid

- Your required monthly investment for your FIRE plan is S$2,136.
- Your estimated retirement year is 2055.
- These figures are projections, not guarantees.



## PASS · hybrid_emergency_moneysense

**Q:** Is my emergency fund enough by MoneySense's rule? State my runway in months and the saved lower and upper emergency targets, and explain the limits of that comparison.

**Sections sent:** cashflow, emergency · **Mode:** hybrid

- Your emergency runway is 17.1 months months, which is over 12 months.
- The lower target for a three-month emergency fund is S$3,167, and the upper target for a six-month emergency fund is S$6,333.

The MoneySense guideline suggests having at least 3 to 6 months' worth of expenses saved as an emergency fund. Since your runway exceeds 12 months, you are well above the recommended range. However, the adequacy of emergency funds can vary based on individual circumstances, such as income stability and personal financial situations.



## PASS · hybrid_srs_income

**Q:** Should I top up SRS given my recorded monthly income and savings amount? State both figures, explain the contribution caps and liquidity trade-off, and ask what else is needed before judging the tax benefit.

**Sections sent:** cashflow · **Mode:** hybrid

- Your recorded monthly income is S$5,200.
- Your recorded savings amount is S$4,024.

- The SRS has an annual contribution limit of $15,300 for Singapore Citizens and Permanent Residents. Contributions to the SRS reduce your taxable income for the following Year of Assessment, which can lead to significant tax benefits, especially for high-income earners.

- However, funds in the SRS are illiquid until retirement age, meaning they cannot be easily accessed without incurring penalties. Early withdrawals are fully taxable and incur a 5% penalty.

What additional information do you need to assess the potential tax benefit of topping up your SRS?



## PASS · hybrid_savings_guideline

**Q:** How does my current savings rate compare with the MoneySense guideline? State my savings rate and explain whether saving the money proves I meet that guideline.

**Sections sent:** cashflow · **Mode:** hybrid

- Your current savings rate is 77.4%.
- The MoneySense guideline recommends setting aside at least 10% of your income for investments.
- Since your savings rate significantly exceeds this guideline, you are well above the recommended minimum for saving and investing.



## PASS · hybrid_emergency_ssb_liquidity

**Q:** My emergency runway looks comfortable. State the runway and explain the liquidity trade-offs of keeping an emergency buffer in Singapore Savings Bonds rather than immediately accessible cash.

**Sections sent:** emergency · **Mode:** hybrid

Your emergency runway is recorded as 17.1 months, which indicates a comfortable buffer according to general financial guidelines.

Keeping an emergency buffer in Singapore Savings Bonds (SSBs) rather than immediately accessible cash involves some liquidity trade-offs:

- SSBs can be redeemed in any month without penalty, providing high liquidity for a bond.
- However, they cannot be traded or pledged as collateral, limiting immediate access to funds compared to cash.
- While SSBs offer step-up interest and are fully backed by the government, they may not be as liquid as cash in urgent situations.
- Cash provides immediate access without any redemption process, making it preferable for urgent expenses.

In your situation, while your runway is strong, consider how quickly you might need access to funds when deciding between cash and SSBs.



## PASS · hybrid_fire_cpf_bridge

**Q:** State my FIRE target and estimated retirement year, then explain why a Singapore FIRE plan needs a bridge before CPF LIFE begins. Do not assume my age or CPF balances.

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE target is S$2,565,681, and your estimated retirement year is July 2055.
- A Singapore FIRE plan needs a bridge before CPF LIFE begins because CPF LIFE payouts start at age 65, which may not align with your desired retirement age.
- This gap means you will need to rely on non-CPF assets to fund your expenses until CPF LIFE provides income, creating a need for a phased approach to manage your finances effectively during this period.



## PASS · hybrid_debt_priority

**Q:** Given my total debts and monthly debt service, what should I check before choosing which debt to repay first? State both recorded amounts and relate the answer to MoneySense guidance.

**Sections sent:** netWorth · **Mode:** hybrid

- Before choosing which debt to repay first, consider the interest rates on your debts, the total amount owed, and any penalties for early repayment.
- Your total liabilities are recorded as S$365,000, and your monthly debt service is S$1,650.
- MoneySense guidance suggests prioritizing high-interest debts, such as credit cards, as they can accumulate costs quickly.
- Additionally, ensure that repaying debt does not compromise your ability to meet essential expenses or savings goals.
- It's also wise to check if any of your debts have early repayment penalties, as this could affect your decision.



## PASS · knowledge_cpf_rates

**Q:** What are the CPF contribution rates from January 2026 by age for Singapore Citizens and PRs from their third year earning above $750 a month? Separate employer and employee shares.

**Sections sent:** none · **Mode:** knowledge

- From 1 January 2026, CPF contribution rates for Singapore Citizens and Permanent Residents earning more than $750 a month are as follows:

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

- The minimum purchase amount for Singapore Savings Bonds is $500, with subsequent investments in multiples of $500.
- The individual holding limit for Savings Bonds is $200,000 at any one time.
- There are no separate holding limits for cash and SRS purchases; the $200,000 limit applies to the total across both cash and SRS accounts.



## PASS · knowledge_cpf_frs_and_life_basis

**Q:** What is the Full Retirement Sum for members turning 55 in 2026, and when does CPF LIFE start? If quoting a payout example, distinguish its cohort and estimate date from the current FRS.

**Sections sent:** none · **Mode:** knowledge

- The Full Retirement Sum (FRS) for members turning 55 in 2026 is $220,400.
- CPF LIFE monthly payouts start at age 65, but members can defer them until as late as age 70 for higher payouts.



## PASS · knowledge_medisave_bhs

**Q:** What is the MediSave Basic Healthcare Sum for 2026, and does it keep rising after a member turns 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- The BHS increases annually for members under 65.
- Once a member turns 65, their BHS is fixed for life at the value for the year they turned 65.



## PASS · knowledge_emergency_guidance

**Q:** What emergency fund rule of thumb does MoneySense give, and how might it differ for someone with unpredictable freelance earnings?

**Sections sent:** none · **Mode:** knowledge

- MoneySense suggests setting aside at least 3 to 6 months' worth of expenses as an emergency fund, which is a widely accepted rule of thumb.
- This amount is generally considered sufficient to provide a buffer during emergencies such as medical incidents or job loss.
- For individuals with unpredictable freelance earnings, it may be advisable to set aside a higher amount than the standard 3 to 6 months to account for potential income fluctuations and unexpected lulls in work.



## PASS · edge_followup_without_fresh_snapshot

**Q:** And last month?

**Sections sent:** none · **Mode:** knowledge

I do not have enough reliable context in the FireBuddy knowledge base to answer that. Try asking about CPF, Singapore Savings Bonds, MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore investing basics.



## PASS · edge_unavailable_pet_care_category

**Q:** How much have I spent on Pet care this month? Give a figure only if that category is explicitly present; otherwise say the summary cannot establish it.

**Sections sent:** spending · **Mode:** hybrid

- The summary cannot establish how much you have spent on Pet care this month, as that category is not explicitly present in your spending records.


