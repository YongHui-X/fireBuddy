# DouDou mobile eval (fresh_final6)

Date 2026-10-05. 17/20 cases pass the automatic data checks.

## PASS · fresh_personal_food_category

**Q:** how much I spend on food this month ah

**Sections sent:** spending · **Mode:** hybrid

- Your spending on food this month so far is S$517.
- Last month's spending on food was S$541.
- This month, your food spending is less than last month by S$24.



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
- This figure represents your total assets after debts.



## PASS · fresh_personal_fire_month

**Q:** When does my plan say I could reach FI, month and year?

**Sections sent:** fire · **Mode:** hybrid

- Your plan indicates you could reach financial independence in July 2055.
- The estimated year for achieving FI is 2055.



## PASS · fresh_personal_debt_service

**Q:** What is my monthly debt payment recorded as?

**Sections sent:** netWorth · **Mode:** hybrid

- Your monthly debt payment is recorded as S$1,650.



## PASS · fresh_hybrid_cpf_topup

**Q:** I save a lot each month. Should I use some of that for a CPF cash top-up, and what should I watch?

**Sections sent:** cashflow · **Mode:** hybrid

- You can consider using some of your savings for a CPF cash top-up, especially since you earn a guaranteed 4% p.a. on top-ups to your Special Account (SA) or Retirement Account (RA).
- The CPF Cash Top-up Relief allows you to claim up to $8,000 per year for your own account and another $8,000 for family members, with a combined cap of $16,000.
- However, be mindful that once money is topped up into CPF, it becomes illiquid until you reach retirement age. This could create cash flow issues if you need funds before age 55 or 65.
- Given your savings rate of 77.4% and savings amount of S$4,024, ensure you balance your liquidity needs with the benefits of the guaranteed return from CPF.



## PASS · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- According to MoneySense, it is recommended to set aside at least 3 to 6 months' worth of expenses as emergency funds. This provides a sufficient buffer for most people during emergencies.
- Your derived emergency fund target for 3 months is S$3,167 and for 6 months is S$6,333.
- Your recorded emergency runway is 17.1 months.
- Your average monthly essential spending is S$1,056.
- Comparing your emergency runway of over 12 months with the 3 to 6 months guideline, your buffer significantly exceeds the recommended amount.



## PASS · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently facing a funding gap of S$135,383 and has a progress today of 2.5%.
- According to the evidence, a safer withdrawal rate for Singapore FIRE seekers is 3.5% due to longer retirement horizons.
- With a 50-year horizon, a 4% withdrawal rate has about a 90% historical success rate, making 3.5% a more conservative choice.
- The typical calculation for the FIRE number is annual spending divided by the withdrawal rate, with a 3.5% rate suggesting a target of about 28.6 times annual spending.
- Your estimated FIRE target is S$2,565,681, and your projected portfolio at retirement is S$2,430,297, indicating that you are close to meeting the target based on the projected share at retirement of 94.7%.



## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

Your FIRE plan should explicitly account for healthcare and insurance risks, as these can significantly impact your financial independence. Here are key considerations:

- MediShield Life and Integrated Shield Plan premiums increase with age, which can lead to higher costs as you retire.
- Long-term care risks, such as those covered by CareShield Life, need to be planned for, as they can strain your finances if not adequately addressed.
- Retiring early means losing employer health benefits, making you fully responsible for healthcare costs.
- It's essential to include healthcare expenses as a line item in your FIRE calculations rather than treating them as an afterthought.

Given your current situation, ensure that your FIRE plan incorporates these healthcare considerations to avoid potential financial strain in retirement.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

- Using CPF Ordinary Account (OA) for housing can impact your FIRE plan by locking up funds that could otherwise compound at 2.5% interest.
- The opportunity cost of using CPF OA for housing means those funds are not available for other investments, which could affect your future retirement balance.
- CPF should generally be viewed as a later-life income source rather than a means to fund early retirement years.
- If you have a mortgage or are renting, these obligations can increase your required monthly spending, potentially delaying your FIRE timeline.
- Upgrading your property can further delay FIRE as more cash and CPF OA are tied up in housing.
- Selling an HDB flat and downsizing can release equity, but this should be planned carefully considering transaction costs and market risks.

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
- The interest rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields from the month before.
- Holding a Savings Bond for the full 10 years provides an average return per year that matches the 10-year SGS yield at the time of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months, on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments on the 1st of April and October for the next 10 years, assuming these dates are business days.



## PASS · fresh_knowledge_retirement_sum_2025

**Q:** What were the CPF Basic and Full Retirement Sums for the 2025 cohort?

**Sections sent:** none · **Mode:** knowledge

- For the 2025 cohort, the Basic Retirement Sum (BRS) is $106,500.
- The Full Retirement Sum (FRS) is $213,000.



## PASS · fresh_knowledge_iras_topup_relief

**Q:** What CPF cash top-up tax relief can I get for myself and family, apart from SRS?

**Sections sent:** none · **Mode:** knowledge

- The CPF Cash Top-up Relief allows you to claim tax relief for cash top-ups to your own CPF account and to family members' accounts.
- You can receive a maximum of $8,000 per year for topping up your own account.
- Additionally, you can claim another $8,000 for topping up family members' accounts.
- The combined maximum relief for both your own and family members' accounts is $16,000 per year.
- This relief applies only to cash top-ups made to Special or Retirement Accounts; transfers from your own CPF account do not qualify.
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.
- Note that top-ups that qualify for Matched Retirement Savings Scheme or MediSave matching grants do not attract this relief.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- This amount is the maximum that can be held in the MediSave Account for members below 65.
- Once a member turns 65, their BHS is fixed at the value for the year they turned 65, which means they will retain the $79,000 for life if they turn 65 in 2026.
- MediSave savings above the BHS overflow to the Special Account before age 55 or to the Retirement Account from age 55, and these excess funds cannot be taken in cash on that basis alone.



## FAIL · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** spending · **Mode:** hybrid

- This month, your largest spending category is Food & Drink, with an amount of S$517, making up 44.0% of your total spending.
- Last month, the largest category was Travel, with an amount of S$2,340, which accounted for 61.3% of your total spending.
- Compared to last month, your spending in Food & Drink is less by S$24, while overall spending this month is less by S$2,642.

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


