# DouDou mobile eval (fresh_v2)

Date 2026-10-04. 15/20 cases pass the automatic data checks.

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

**Problems:** missing monthlyPulse.month: expected one of 2026-10 | October 2026 | Oct 2026

## PASS · fresh_personal_net_worth

**Q:** How much am I worth right now, after debts?

**Sections sent:** netWorth · **Mode:** hybrid

- Your current net worth is S$80,000.
- This figure reflects your total assets after accounting for debts.



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

- You can consider using some of your savings for a CPF cash top-up, particularly to your Special Account (SA) or Retirement Account (RA), as it earns 4% p.a. and is eligible for tax relief.
- The maximum relief for CPF cash top-ups is $8,000 per year for your own account and another $8,000 for family members' accounts, with a combined cap of $16,000.
- Keep in mind that once the money is in CPF, it is illiquid until retirement age, which could create cash flow issues if you plan to retire early.
- Your current savings rate of 77.4% indicates a strong capacity to save, but ensure you balance liquidity needs against the benefits of the guaranteed return from CPF.
- FireBuddy's suggested next step may also guide you on how to optimize your savings strategy.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## FAIL · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** clarification

What is the amount of your emergency buffer and your monthly essential spending?

**Problems:** missing averageMonthlyEssentialSpending: expected one of S$1,056 | $1,056; missing emergencyRunwayMonths: expected one of 17.1 months | 17 months | 17.1

## PASS · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently in a shortfall status, with a progress rate of 94.7%.
- The typical withdrawal rate for Singapore FIRE planners is between 3% and 3.5%, with 3.5% being considered safer for longer retirement horizons.
- Given your funding status and progress, it may be beneficial to consider the implications of a 3.5% withdrawal rate for your long-term planning.
- The estimated FIRE target is S$2,565,681, which you are working towards funding with a required monthly investment of S$2,136.



## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

Your FIRE plan should explicitly account for healthcare and insurance risks, as these can significantly impact your financial independence.

- Healthcare costs, including MediShield Life and Integrated Shield Plan premiums, rise with age and should be included in your FIRE calculations.
- Long-term care risks, such as those covered by CareShield Life, are crucial to consider, especially since early retirees will not have employer health benefits.
- It's recommended to budget for Integrated Shield Plan premiums as a line item in your FIRE number calculations.
- MediSave can help fund some healthcare premiums but may not cover all costs, especially for comprehensive coverage.

Given your current funding status is a shortfall, it's important to ensure that your FIRE plan adequately addresses these healthcare expenses to avoid potential financial strain in retirement.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF OA for housing can significantly impact your FIRE plan in several ways:

- CPF OA funds used for housing do not compound at the 2.5% interest rate, which can reduce your overall retirement savings.
- There is an opportunity cost associated with using CPF OA for housing, as those funds are locked in and cannot be easily accessed for other investments or expenses.
- When you sell a property, CPF charges an "accrued interest" that must be returned, which can decrease the cash proceeds from the sale.
- If you have not built enough cash and taxable investments, aggressive CPF top-ups may worsen your liquidity before age 55, impacting your ability to fund early retirement.
- Housing obligations, such as mortgages or rent, can raise your required monthly spending, affecting your FIRE number and overall financial goals.

In your case, since your funding status is currently a shortfall, it's important to consider how your housing strategy aligns with your FIRE objectives and whether adjustments are needed to improve your liquidity and investment potential.

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

- For members aged 55 and above, the interest structure changes, allowing them to earn up to 6% per annum on the first $30,000 of their balances.



## PASS · fresh_knowledge_ssb_stepup

**Q:** How does SSB step-up interest work, and when is the interest paid?

**Sections sent:** none · **Mode:** knowledge

- Singapore Savings Bonds (SSB) pay step-up interest that increases the longer the bond is held.
- The interest rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields of the month before and are locked in for that issue.
- Holding a Savings Bond for the full 10 years gives an average return per year that matches the 10-year SGS yield at the point of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments made every April and October for the next 10 years, assuming those dates are business days.



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
- You can also claim up to $8,000 per year for topping up family members' accounts.
- The combined maximum relief for both your own and family members' accounts is $16,000 per year.
- This relief applies only to cash top-ups to Special or Retirement Accounts; transfers from your own CPF account do not qualify.
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.
- Top-ups that qualify for the Matched Retirement Savings Scheme or MediSave matching grants do not attract this relief.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- For members who turn 65 in 2026, their BHS will be fixed at this amount for the rest of their life.
- The BHS is the maximum amount that can be held in the MediSave Account and is raised annually for members under 65.



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


