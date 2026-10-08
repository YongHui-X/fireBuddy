# DouDou mobile eval (fresh_final)

Date 2026-10-04. 16/20 cases pass the automatic data checks.

## PASS · fresh_personal_food_category

**Q:** how much I spend on food this month ah

**Sections sent:** spending · **Mode:** hybrid

- Your spending on food this month is recorded as S$517.
- Last month, your spending on food was S$541.



## PASS · fresh_personal_previous_travel

**Q:** What was my biggest category last month, and how much was it?

**Sections sent:** spending · **Mode:** hybrid

- Your biggest spending category last month was "Travel."
- The amount spent in that category was S$2,340.



## PASS · fresh_personal_monthly_spend

**Q:** Can you tell me my spending number for October so far?

**Sections sent:** spending · **Mode:** hybrid

- Your total spending for October so far (from October 1 to October 4) is S$1,176.
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
- This figure represents your total assets after accounting for debts.



## PASS · fresh_personal_fire_month

**Q:** When does my plan say I could reach FI, month and year?

**Sections sent:** fire · **Mode:** hybrid

- Your plan indicates that you could reach financial independence (FI) in July 2055.
- The estimated year for achieving FI is 2055.



## PASS · fresh_personal_debt_service

**Q:** What is my monthly debt payment recorded as?

**Sections sent:** netWorth · **Mode:** hybrid

- Your monthly debt payment is recorded as S$1,650.



## FAIL · fresh_hybrid_cpf_topup

**Q:** I save a lot each month. Should I use some of that for a CPF cash top-up, and what should I watch?

**Sections sent:** cashflow · **Mode:** hybrid

- You can consider using some of your savings for a CPF cash top-up, especially since you have a high savings rate of 77.4%.
- CPF cash top-ups to your Special Account (SA) or Retirement Account (RA) earn 4% p.a. and are eligible for income tax relief up to $8,000 per year for your own account and another $8,000 for family members' accounts.
- However, be aware that once money is topped up into CPF, it becomes illiquid until you reach retirement age. This could create cash flow issues if you need funds before age 55 or 65.
- Balance your liquidity needs with the guaranteed return from CPF. Ensure you have enough cash or other liquid assets to cover your expenses before you can access CPF funds.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## PASS · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- According to the Basic Financial Planning Guide, it is recommended to set aside at least 3 to 6 months' worth of expenses as emergency funds.
- Your derived emergency fund targets are:
  - 3 months: S$3,167
  - 6 months: S$6,333
- Your recorded emergency runway is 17.1 months, which exceeds the 6-month guideline.
- Your average monthly essential spending is S$1,056, which aligns with the guideline for emergency funds.
- Therefore, your emergency buffer covers the basic essential-spending guideline effectively.



## FAIL · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently at a progress rate of 94.7%, indicating that you are close to your target.
- The typical withdrawal rate used by Singapore FIRE planners is between 3% and 3.5%, with a preference for 3.5% due to longer retirement horizons.
- A 3.5% withdrawal rate is considered safer for those with a retirement horizon of 50+ years, which applies to your situation as you are planning for retirement around 2055.
- To align with the 3.5% withdrawal rate, your FIRE target would be approximately 28.6 times your annual spending.
- Since your funding status is currently a shortfall, you may need to adjust your investment strategy or savings rate to meet your target effectively.

**Problems:** missing fire.fiTarget: expected one of S$2,565,681 | $2,565,681

## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

Your FIRE plan should explicitly account for healthcare and insurance risks, as these can significantly impact your financial independence.

- Healthcare expenses, including MediShield Life and Integrated Shield Plan premiums, should be included in your FIRE calculations.
- MediShield Life premiums rise with age and can reach $2,000–$4,000/year at age 70 and older.
- Integrated Shield Plans can lead to combined annual premiums exceeding $5,000–$10,000/year for older ages.
- Retiring early means you will not have employer contributions to healthcare insurance, making costs fully self-funded.
- CareShield Life provides modest payouts for severe disability, which should also be factored into your planning.
- It's essential to budget for these healthcare costs as a line item in your FIRE number calculations, not as an afterthought.

Given your current funding status is a shortfall, it may be crucial to reassess how healthcare costs are integrated into your overall FIRE strategy.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF OA for housing can significantly impact your FIRE plan in several ways:

- CPF OA is primarily intended for housing and earns a lower interest rate of 2.5% compared to other CPF accounts.
- When you use CPF OA for mortgage payments, those funds do not compound at the OA interest rate, which can reduce your overall retirement savings.
- There is an opportunity cost associated with using CPF OA for housing, as those funds could have been invested elsewhere for potentially higher returns.
- CPF charges an "accrued interest" that must be returned upon the sale of the property, which can diminish the cash proceeds from any future sale.
- If you have not built sufficient cash and taxable investments, aggressive CPF top-ups may worsen your liquidity before age 55, impacting your ability to fund early retirement.

In summary, while CPF OA can support housing needs, it may limit your liquidity and future retirement balance, which are critical factors in your FIRE strategy.

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
  - They earn up to 5% per annum on the first $60,000 of combined balances, which includes:
    - 4% floor rate
    - 1% extra interest
  - The extra interest is capped at $20,000 for the Ordinary Account balance.



## PASS · fresh_knowledge_ssb_stepup

**Q:** How does SSB step-up interest work, and when is the interest paid?

**Sections sent:** none · **Mode:** knowledge

- Singapore Savings Bonds (SSB) pay step-up interest that increases the longer the bond is held.
- Interest rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields of the month before and are locked in for that issue.
- Holding a Savings Bond for the full 10 years gives an average return per year that matches the 10-year SGS yield at the point of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months, on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments made every 6 months thereafter.



## PASS · fresh_knowledge_retirement_sum_2025

**Q:** What were the CPF Basic and Full Retirement Sums for the 2025 cohort?

**Sections sent:** none · **Mode:** knowledge

- For the 2025 cohort, the Basic Retirement Sum (BRS) is $106,500.
- The Full Retirement Sum (FRS) is $213,000.



## PASS · fresh_knowledge_iras_topup_relief

**Q:** What CPF cash top-up tax relief can I get for myself and family, apart from SRS?

**Sections sent:** none · **Mode:** knowledge

- The CPF Cash Top-up Relief allows for tax relief on cash top-ups to your own CPF account and to family members' accounts.
- You can claim up to $8,000 per year for topping up your own account.
- Additionally, you can claim another $8,000 per year for topping up family members' accounts.
- The combined maximum relief for both your own and family members' accounts is $16,000 per year.
- This relief applies only to cash top-ups made to Special or Retirement Accounts; transfers from your own CPF account do not qualify.
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- For members who turn 65 in 2026, their BHS will be fixed at this amount for the rest of their life.
- The BHS is the maximum amount that can be held in the MediSave Account.
- MediSave savings above the BHS will overflow to the Special Account before age 55, or to the Retirement Account from age 55, and cannot be taken in cash on that basis alone.



## PASS · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** spending · **Mode:** hybrid

- This month, your largest spending category is Food & Drink with an amount of S$517.
- Last month, the largest category was Travel with an amount of S$2,340.
- Your total spending this month is S$1,176, while last month's total was S$3,817.



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


