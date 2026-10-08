# DouDou mobile eval (fresh_final2)

Date 2026-10-04. 16/20 cases pass the automatic data checks.

## PASS · fresh_personal_food_category

**Q:** how much I spend on food this month ah

**Sections sent:** spending · **Mode:** hybrid

- Your spending on food this month is recorded as S$517.
- This period covers from 1 to 4 October 2026.
- Last month, your spending on food was S$541 for the period from 1 to 30 September 2026.



## PASS · fresh_personal_previous_travel

**Q:** What was my biggest category last month, and how much was it?

**Sections sent:** spending · **Mode:** hybrid

- Your biggest spending category last month was Travel.
- The amount spent in that category was S$2,340.



## PASS · fresh_personal_monthly_spend

**Q:** Can you tell me my spending number for October so far?

**Sections sent:** spending · **Mode:** hybrid

- Your total spending for October so far (from 1 to 4 October 2026) is S$1,176.
- The top spending categories are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100



## PASS · fresh_personal_net_worth

**Q:** How much am I worth right now, after debts?

**Sections sent:** netWorth · **Mode:** hybrid

- Your current net worth is S$80,000.
- This figure accounts for your total assets minus your liabilities. 
- Your liabilities total S$365,000.



## PASS · fresh_personal_fire_month

**Q:** When does my plan say I could reach FI, month and year?

**Sections sent:** fire · **Mode:** hybrid

- Your plan indicates that you could reach financial independence in July 2055. 
- The estimated FI year is 2055.



## PASS · fresh_personal_debt_service

**Q:** What is my monthly debt payment recorded as?

**Sections sent:** netWorth · **Mode:** hybrid

- Your monthly debt payment is recorded as S$1,650.



## FAIL · fresh_hybrid_cpf_topup

**Q:** I save a lot each month. Should I use some of that for a CPF cash top-up, and what should I watch?

**Sections sent:** cashflow · **Mode:** hybrid

- You can consider making a CPF cash top-up, especially to your Special Account (SA) or Retirement Account (RA), as it earns 4% per annum and is eligible for tax relief up to $8,000 per year for your own account and another $8,000 for family members' accounts.
- However, be aware that once money is topped up into CPF, it becomes illiquid until retirement age, which could create cash flow issues if you need funds before age 55 or 65.
- Your current savings rate is 77.4%, indicating a strong capacity to save, but ensure you balance your liquidity needs against the benefits of the guaranteed return from CPF.
- FireBuddy's suggested next step may also guide you on how to manage your savings effectively in relation to CPF contributions.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## PASS · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- According to the Basic Financial Planning Guide, it is recommended to set aside at least 3 to 6 months' worth of expenses as emergency funds. This provides a sufficient buffer for most people during emergencies. 

- Your derived emergency fund targets are:
  - 3-month target: S$3,167 
  - 6-month target: S$6,333 

- Your recorded emergency runway is 17.1 months, which is over 12 months.

- Your average monthly essential spending is S$1,056.

- Comparing your emergency runway of 17.1 months with the 3-month target of S$3,167 and the 6-month target of S$6,333, it appears that your emergency buffer exceeds the basic essential-spending guideline.



## PASS · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently experiencing a shortfall, with a progress rate of 94.7%.
- The typical withdrawal rate for Singapore FIRE planners is between 3% and 3.5%, with a preference for 3.5% due to longer retirement horizons.
- A 3.5% withdrawal rate is considered safer for those planning for early retirement, especially with a retirement horizon of 50+ years.
- The classic 4% withdrawal rate may not be as suitable for Singaporeans retiring early, as it has only ~90% historical success over long periods.
- Your estimated FIRE target is S$2,565,681, which aligns with the need for a conservative withdrawal strategy given your funding status.



## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

Your FIRE plan should explicitly account for healthcare and insurance risks, especially in Singapore. Here are some key points to consider:

- Healthcare expenses, including MediShield Life and Integrated Shield Plan premiums, should be included as a line item in your FIRE calculations.
- MediShield Life premiums increase with age, potentially reaching $2,000–$4,000 per year at age 70 and above.
- Integrated Shield Plans can lead to combined annual premiums exceeding $5,000–$10,000 for older ages.
- Retiring early means you will not have employer contributions to healthcare insurance, making costs fully self-funded.
- CareShield Life provides modest payouts for severe disability, which should be factored into your long-term care planning.
- It's important to ensure that your MediSave is at or near the Basic Healthcare Sum (BHS) of $79,000 in 2026 before retiring.

Given your current funding status is a shortfall, it may be beneficial to reassess your healthcare and insurance planning to ensure adequate coverage and budgeting for these essential costs.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF Ordinary Account (OA) for housing can significantly impact your FIRE plan in several ways:

- CPF OA funds used for housing do not compound at the 2.5% interest rate, which can reduce your overall retirement savings.
- There is an opportunity cost associated with using CPF OA for housing, as these funds are locked in and cannot be easily accessed for other investments or expenses.
- If you use CPF OA for mortgage payments, you must return the accrued interest to CPF upon selling the property, which can decrease the cash proceeds from the sale.
- Upgrading your property can delay your FIRE timeline because more cash and CPF OA are tied up in housing.
- A paid-off HDB flat can lower your FIRE number, but it should not be counted as a liquid asset unless you have a plan to monetize it.

Overall, while CPF OA can support housing needs, it may limit your liquidity and flexibility in achieving your FIRE goals.

**Problems:** missing fire.fiTarget: expected one of S$2,565,681 | $2,565,681

## PASS · fresh_knowledge_cpf_interest

**Q:** What interest do CPF OA, SA, MA and RA earn, and how does the extra interest work for someone below 55?

**Sections sent:** none · **Mode:** knowledge

- The interest rates for CPF accounts as of 2026 are:
  - Ordinary Account (OA): 2.5% per annum
  - Special Account (SA): 4% per annum
  - MediSave Account (MA): 4% per annum
  - Retirement Account (RA): 4% per annum

- For members below 55 years old:
  - They earn up to 5% per annum on the first $60,000 of combined balances, which includes the 4% floor plus an additional 1% extra interest.
  - The extra interest is capped at $20,000 for the Ordinary Account balance.



## PASS · fresh_knowledge_ssb_stepup

**Q:** How does SSB step-up interest work, and when is the interest paid?

**Sections sent:** none · **Mode:** knowledge

- Singapore Savings Bonds (SSB) pay step-up interest that increases the longer the bond is held.
- Interest rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields from the month before.
- Holding a Savings Bond for the full 10 years provides an average return per year that matches the 10-year SGS yield at the time of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments made every April and October for the next 10 years, assuming they are business days.



## PASS · fresh_knowledge_retirement_sum_2025

**Q:** What were the CPF Basic and Full Retirement Sums for the 2025 cohort?

**Sections sent:** none · **Mode:** knowledge

- For the 2025 cohort, the Basic Retirement Sum (BRS) is $106,500.
- The Full Retirement Sum (FRS) is $213,000.



## PASS · fresh_knowledge_iras_topup_relief

**Q:** What CPF cash top-up tax relief can I get for myself and family, apart from SRS?

**Sections sent:** none · **Mode:** knowledge

- For CPF Cash Top-up Relief, you can claim up to $8,000 for contributions to your own account and another $8,000 for contributions to family members' accounts, totaling a maximum of $16,000 per year.
- This relief applies only to cash top-ups made to Special or Retirement Accounts. 
- Transferring money from your own CPF account to another CPF account does not qualify for this relief.
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.
- Top-ups that qualify for Matched Retirement Savings Scheme or MediSave matching grants do not attract this relief.
- The overall personal income tax relief cap is $80,000 per Year of Assessment.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- This amount is the maximum that can be held in the MediSave Account for members below 65.
- Once a member turns 65, their BHS is fixed at the value for the year they turned 65, which means it will remain at $79,000 for those who turn 65 in 2026 for the rest of their life.



## FAIL · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** spending · **Mode:** hybrid

- This month, your largest spending category is Food & Drink with an amount of S$517.
- Last month, the largest category was Travel with an amount of S$2,340.
- In comparison, your spending on Food & Drink this month is higher than last month's spending in that category, which was S$541.

**Problems:** missing spending.previousMonth.total: expected one of S$3,817 | $3,817

## PASS · fresh_robust_exact_balance_name

**Q:** Tell me my exact account balance and the name on the account.

**Sections sent:** none · **Mode:** unsupported

DouDou can only help with the Singapore personal-finance topics covered by FireBuddy, such as CPF, MoneySense planning, Singapore Savings Bonds, IRAS reliefs, investing basics, and FIRE planning.



## PASS · fresh_robust_stock_tip

**Q:** Should I buy DBS shares today? Give me a guaranteed price target.

**Sections sent:** none · **Mode:** unsupported

DouDou can only help with the Singapore personal-finance topics covered by FireBuddy, such as CPF, MoneySense planning, Singapore Savings Bonds, IRAS reliefs, investing basics, and FIRE planning.



## PASS · fresh_robust_missing_cpf_oa

**Q:** How much is in my CPF OA right now?

**Sections sent:** none · **Mode:** data

CPF balances that cannot be invested under CPFIS for 2026: Ordinary Account S$20,000; Special Account S$40,000. This applies to the first balances protected in the Ordinary Account and Special Account. Source: Investing In Singapore.


