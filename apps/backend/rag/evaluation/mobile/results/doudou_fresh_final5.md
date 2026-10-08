# DouDou mobile eval (fresh_final5)

Date 2026-10-05. 17/20 cases pass the automatic data checks.

## PASS · fresh_personal_food_category

**Q:** how much I spend on food this month ah

**Sections sent:** spending · **Mode:** hybrid

- Your spending on Food & Drink this month so far is S$517.
- Last month, you spent S$541 on Food & Drink.
- This month, your spending on Food & Drink is less than last month by S$24.



## PASS · fresh_personal_previous_travel

**Q:** What was my biggest category last month, and how much was it?

**Sections sent:** spending · **Mode:** hybrid

- Your biggest spending category last month was Travel.
- The amount spent in that category was S$2,340.



## PASS · fresh_personal_monthly_spend

**Q:** Can you tell me my spending number for October so far?

**Sections sent:** spending · **Mode:** hybrid

- Your total spending for October so far (from 1 to 5 October 2026) is S$1,176.
- The top spending categories are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100.



## PASS · fresh_personal_net_worth

**Q:** How much am I worth right now, after debts?

**Sections sent:** netWorth · **Mode:** hybrid

- Your current net worth is S$80,000.
- This figure represents your total assets after accounting for debts.



## PASS · fresh_personal_fire_month

**Q:** When does my plan say I could reach FI, month and year?

**Sections sent:** fire · **Mode:** hybrid

- Your plan indicates you could reach financial independence in July 2055.
- The estimated year for achieving FI is 2055.



## PASS · fresh_personal_debt_service

**Q:** What is my monthly debt payment recorded as?

**Sections sent:** netWorth · **Mode:** hybrid

- Your monthly debt payment is recorded as S$1,650.



## FAIL · fresh_hybrid_cpf_topup

**Q:** I save a lot each month. Should I use some of that for a CPF cash top-up, and what should I watch?

**Sections sent:** cashflow · **Mode:** hybrid

- You can consider using some of your savings for a CPF cash top-up, especially since your savings rate is high at 77.4%.
- CPF cash top-ups to your Special Account (SA) earn 4% per annum and are eligible for income tax relief up to $8,000 per year for your own account and another $8,000 for family members.
- However, once money is topped up into CPF, it becomes illiquid until retirement age, which could create cash flow issues if you need funds before age 55 or 65.
- It's important to balance your liquidity needs with the benefits of the guaranteed return from CPF top-ups.
- Ensure you have sufficient cash reserves for emergencies and planned expenses before committing to aggressive CPF top-ups.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## PASS · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- Your emergency runway of 17.1 months is above the three to six months' worth of expenses that MoneySense suggests for emergency funds.
- The derived target for three months of essential spending is S$3,167, and for six months, it is S$6,333.
- Your average monthly essential spending is S$1,056.
- Since your emergency runway exceeds the six-month target, it indicates that your emergency buffer adequately covers the basic essential-spending guideline.



## PASS · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently facing a funding gap of S$135,383 and is categorized as a shortfall.
- The estimated FIRE target is S$2,565,681, and your projected portfolio at retirement is S$2,430,297.
- According to the evidence, Singapore FIRE seekers often use a withdrawal rate of 3–3.5% due to longer retirement horizons.
- A 3.5% withdrawal rate is considered safer for those with a retirement horizon of 50 years or more, which aligns with your situation of planning for retirement in 2055.
- Your projected share of the target at retirement is 94.7%, indicating you are close to meeting your goal under this withdrawal rate approach.



## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

Your FIRE plan should explicitly account for healthcare and insurance risks, especially in Singapore. Here are the key considerations:

- Healthcare expenses, including MediShield Life and Integrated Shield Plan premiums, should be included in your FIRE calculations.
- MediShield Life premiums increase with age and can reach $2,000–$4,000 per year at age 70 and older.
- Integrated Shield Plans can have combined annual premiums and rider costs exceeding $5,000–$10,000 per year for older ages.
- Retiring early means you will not have employer contributions to healthcare insurance, making costs fully self-funded.
- Long-term care risks, such as those covered by CareShield Life, should also be planned for, as payouts are modest.

Given your current funding gap of S$135,383, it is essential to ensure that healthcare costs are adequately budgeted in your overall FIRE plan.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF Ordinary Account (OA) for housing can have significant implications for your FIRE plan:

- CPF OA funds used for housing do not compound at the 2.5% interest rate, which can reduce your overall retirement savings.
- There is an opportunity cost associated with using CPF OA for housing, as those funds are locked in and cannot be easily accessed for other investments.
- When you sell a property, CPF charges an "accrued interest" that must be returned, which can diminish the cash proceeds from the sale.
- Upgrading your property can delay your FIRE timeline, as more cash and CPF OA are tied up in housing.
- It is essential to consider your housing obligations, such as mortgage payments, as they can increase your required monthly spending and affect your FIRE number.

In your case, with a funding gap of S$135,383 and a projected portfolio of S$2,430,297, it's crucial to assess how your housing decisions impact your overall financial strategy and liquidity as you work towards your FIRE goals.

**Problems:** missing fire.fiTarget: expected one of S$2,565,681 | $2,565,681

## PASS · fresh_knowledge_cpf_interest

**Q:** What interest do CPF OA, SA, MA and RA earn, and how does the extra interest work for someone below 55?

**Sections sent:** none · **Mode:** knowledge

- The interest rates for CPF accounts as of 2026 are:
  - Ordinary Account (OA): 2.5% per annum
  - Special Account (SA): 4% per annum
  - MediSave Account (MA): 4% per annum
  - Retirement Account (RA): 4% per annum

- For members below 55 years old, the interest earned is up to 5% per annum on the first $60,000 of combined balances. This includes:
  - 4% floor interest plus an additional 1% extra interest.

- The extra interest is capped at $20,000 for the Ordinary Account balance.



## PASS · fresh_knowledge_ssb_stepup

**Q:** How does SSB step-up interest work, and when is the interest paid?

**Sections sent:** none · **Mode:** knowledge

- Singapore Savings Bonds (SSB) pay step-up interest that increases the longer the bond is held.
- The interest rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields from the month before.
- Holding a Savings Bond for the full 10 years provides an average return per year that matches the 10-year SGS yield at the time of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments made every April and October for the next 10 years.



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
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.
- Contributions that qualify for Matched Retirement Savings Scheme or MediSave matching grants do not attract this relief.
- The overall personal income tax relief cap is $80,000 per Year of Assessment.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- For members who turn 65 in 2026, their BHS will be fixed at this amount for the rest of their life.
- Members below 65 can have their MediSave Account balance increase annually until they reach 65, at which point it becomes fixed.



## PASS · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** spending · **Mode:** hybrid

- This month, your largest spending category is Food & Drink, with an amount of S$517, making up 44.0% of your total spending.
- Last month, the largest category was Travel, with an amount of S$2,340, accounting for 61.3% of your total spending.
- Compared to last month, your spending in Food & Drink is S$24 less than the S$541 spent last month.
- Overall, your total spending this month so far is S$2,642 less than last month's total of S$3,817.



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


