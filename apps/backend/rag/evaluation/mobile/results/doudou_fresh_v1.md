# DouDou mobile eval (fresh_v1)

Date 2026-10-04. 13/20 cases pass the automatic data checks.

## FAIL · fresh_personal_food_category

**Q:** how much I spend on food this month ah

**Sections sent:** spending · **Mode:** hybrid

- This month, your spending on food is recorded as S$517.
- Last month, your spending on food was S$541.

**Problems:** missing spending.currentMonth.topCategories.0.category: expected one of Food & Drink

## PASS · fresh_personal_previous_travel

**Q:** What was my biggest category last month, and how much was it?

**Sections sent:** spending · **Mode:** hybrid

- Your biggest spending category last month was Travel.
- The amount spent in that category was S$2,340.



## FAIL · fresh_personal_monthly_spend

**Q:** Can you tell me my spending number for October so far?

**Sections sent:** spending · **Mode:** hybrid

- Your total spending for October so far (from October 1 to October 4) is S$1,176.
- The top spending categories are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100

**Problems:** missing monthlyPulse.month: expected one of 2026-10

## PASS · fresh_personal_net_worth

**Q:** How much am I worth right now, after debts?

**Sections sent:** netWorth · **Mode:** hybrid

- Your current net worth is S$80,000.
- This figure represents your total assets after accounting for debts.



## FAIL · fresh_personal_fire_month

**Q:** When does my plan say I could reach FI, month and year?

**Sections sent:** fire · **Mode:** hybrid

- Your plan indicates you could reach financial independence (FI) in July 2055.
- The estimated year for achieving FI is 2055.

**Problems:** missing fire.earliestRetirementMonth: expected one of 2055-07

## PASS · fresh_personal_debt_service

**Q:** What is my monthly debt payment recorded as?

**Sections sent:** netWorth · **Mode:** hybrid

- Your monthly debt payment is recorded as S$1,650.



## FAIL · fresh_hybrid_cpf_topup

**Q:** I save a lot each month. Should I use some of that for a CPF cash top-up, and what should I watch?

**Sections sent:** cashflow · **Mode:** hybrid

- You can consider using some of your savings for a CPF cash top-up, particularly to your Special Account (SA) or Retirement Account (RA) if you are 55 or older. This can earn you 4% per annum and is eligible for income tax relief up to $8,000 per year for your own account and another $8,000 for family members' accounts.

- However, be aware that once money is topped up into CPF, it becomes illiquid until you reach retirement age. This could create cash flow issues if you need funds before age 55 or 65.

- Your current savings rate is 77.4%, which indicates you are saving a significant portion of your income. This could support a top-up, but ensure you maintain enough liquidity for your immediate needs.

- Consider balancing your liquidity needs against the guaranteed return of 4% from CPF top-ups. If you have not built sufficient cash reserves or taxable investments, aggressive top-ups may worsen your cash flow situation.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## PASS · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- According to MoneySense, it is recommended to set aside at least 3 to 6 months' worth of expenses as emergency funds.
- Your derived emergency fund target for 3 months is S$3,167 and for 6 months is S$6,333.
- Your average monthly essential spending is S$1,056.
- Your recorded emergency runway is 17.1 months, which is over 12 months.
- Since your emergency runway exceeds the 6-month target, it indicates that you have a sufficient buffer according to the guideline.



## PASS · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently showing a funding status of "shortfall" with a progress rate of 94.7%.
- The typical withdrawal rate for Singapore FIRE planners is between 3% and 3.5%, with 3.5% being recommended for longer retirement horizons.
- Given that your estimated FIRE target is S$2,565,681, you should consider how your current funding aligns with the 3.5% withdrawal rate approach.
- The 3.5% withdrawal rate suggests that you would need approximately 28.6 times your annual spending to be fully funded for retirement.
- Since your progress rate is close to full funding, you may need to assess your monthly investments, which are currently required at S$2,136, to meet your target effectively.



## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan should explicitly include healthcare costs, as they can significantly impact your financial independence.
- MediShield Life and Integrated Shield Plan premiums rise with age, and these should be budgeted as line items in your FIRE calculations.
- Long-term care risks, such as those covered by CareShield Life, also need to be considered, especially since retiring early means losing employer health benefits.
- It's important to ensure that your MediSave is at or near the Basic Healthcare Sum (BHS) of $79,000 in 2026 before retiring.
- Your current FIRE plan may not fully account for these healthcare and insurance risks, which could affect your overall funding status and progress rate.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF Ordinary Account (OA) funds for housing can significantly impact your FIRE plan in several ways:

- CPF OA can be used for housing but does not compound at the same rate as other CPF accounts, such as the Special Account (SA) or MediSave Account (MA), which earn higher interest.
- When you use CPF OA for mortgage payments, those funds are locked in and cannot be easily accessed for other investments or expenses, affecting your liquidity.
- There is an opportunity cost associated with using CPF OA for housing, as it can reduce your future retirement balance due to the accrued interest that must be returned to CPF upon selling the property.
- Upgrading your property can further delay your FIRE goals, as more cash and CPF OA are tied up in housing.
- A paid-off property can lower your FIRE number, while ongoing mortgage or rent obligations increase your required monthly spending.

Overall, while CPF can support housing needs, it is generally recommended to model CPF as a later-life income source rather than relying on it for early FIRE years.

**Problems:** missing fire.fiTarget: expected one of S$2,565,681 | $2,565,681

## PASS · fresh_knowledge_cpf_interest

**Q:** What interest do CPF OA, SA, MA and RA earn, and how does the extra interest work for someone below 55?

**Sections sent:** none · **Mode:** knowledge

- The interest rates for CPF accounts as of 2026 are:
  - Ordinary Account (OA): 2.5% per annum
  - Special Account (SA): 4% per annum
  - MediSave Account (MA): 4% per annum
  - Retirement Account (RA): 4% per annum

- For members below 55 years old, they can earn up to 5% per annum on the first $60,000 of combined balances, which includes:
  - The 4% floor rate plus an additional 1% extra interest.
  
- The extra interest is capped at $20,000 for the Ordinary Account balance.



## PASS · fresh_knowledge_ssb_stepup

**Q:** How does SSB step-up interest work, and when is the interest paid?

**Sections sent:** none · **Mode:** knowledge

- Singapore Savings Bonds (SSB) pay step-up interest that increases the longer the bond is held.
- Interest rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields from the month before.
- Holding a Savings Bond for the full 10 years provides an average return per year that matches the 10-year SGS yield at the time of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments made every April and October.



## PASS · fresh_knowledge_retirement_sum_2025

**Q:** What were the CPF Basic and Full Retirement Sums for the 2025 cohort?

**Sections sent:** none · **Mode:** knowledge

- For the 2025 cohort, the Basic Retirement Sum (BRS) is $106,500.
- The Full Retirement Sum (FRS) is $213,000.
- The Enhanced Retirement Sum (ERS) is $426,000, effective from 1 January 2025.



## PASS · fresh_knowledge_iras_topup_relief

**Q:** What CPF cash top-up tax relief can I get for myself and family, apart from SRS?

**Sections sent:** none · **Mode:** knowledge

- You can claim CPF Cash Top-up Relief for both your own account and your family members' accounts.
- The maximum relief amount for your own account is $8,000 per year.
- You can also claim up to $8,000 for cash top-ups to family members' accounts.
- The combined maximum relief for both your own and family members' accounts is $16,000 per year.
- This relief applies only to cash top-ups made to Special or Retirement Accounts, not to transfers between CPF accounts.
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000. 
- For members who turn 65 in 2026, this amount becomes fixed for the rest of their life. 
- Members below 65 can have their MediSave Account balance increase up to this BHS, but once they turn 65, their BHS is set at the value for the year they turned 65. 
- MediSave savings above the BHS overflow to the Special Account before age 55 or to the Retirement Account from age 55, and these excess funds cannot be taken in cash on that basis alone.



## FAIL · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** none · **Mode:** knowledge

I do not have enough reliable context in the FireBuddy knowledge base to answer that. Try asking about CPF, Singapore Savings Bonds, MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore investing basics.

**Problems:** sections sent [], expected [spending]; missing spending.previousMonth.total: expected one of S$3,817 | $3,817

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


