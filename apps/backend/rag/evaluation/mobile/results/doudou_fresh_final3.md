# DouDou mobile eval (fresh_final3)

Date 2026-10-04. 16/20 cases pass the automatic data checks.

## PASS · fresh_personal_food_category

**Q:** how much I spend on food this month ah

**Sections sent:** spending · **Mode:** hybrid

- Your spending on food this month (from 1 to 4 October 2026) is recorded as S$517.
- Last month's spending on food (from 1 to 30 September 2026) was S$541.



## PASS · fresh_personal_previous_travel

**Q:** What was my biggest category last month, and how much was it?

**Sections sent:** spending · **Mode:** hybrid

- Your biggest spending category last month was Travel.
- The amount spent in that category was S$2,340.



## PASS · fresh_personal_monthly_spend

**Q:** Can you tell me my spending number for October so far?

**Sections sent:** spending · **Mode:** hybrid

- Your total spending for October so far (from 1 to 4 October 2026) is S$1,176.
- Your top spending categories are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100



## PASS · fresh_personal_net_worth

**Q:** How much am I worth right now, after debts?

**Sections sent:** netWorth · **Mode:** hybrid

- Your current net worth, after debts, is S$80,000.
- This figure takes into account your total liabilities of S$365,000 and your investable assets of S$65,000.



## PASS · fresh_personal_fire_month

**Q:** When does my plan say I could reach FI, month and year?

**Sections sent:** fire · **Mode:** hybrid

- Your plan indicates that you could reach financial independence in July 2055.
- The estimated year for achieving FI is 2055.



## PASS · fresh_personal_debt_service

**Q:** What is my monthly debt payment recorded as?

**Sections sent:** netWorth · **Mode:** hybrid

- Your monthly debt payment is recorded as S$1,650.



## FAIL · fresh_hybrid_cpf_topup

**Q:** I save a lot each month. Should I use some of that for a CPF cash top-up, and what should I watch?

**Sections sent:** cashflow · **Mode:** hybrid

- You can consider a CPF cash top-up, especially to your Special Account (SA) or Retirement Account (RA), as it earns 4% per annum and is eligible for tax relief up to $8,000 per year for your own account and another $8,000 for family members' accounts.

- However, keep in mind that once money is contributed to CPF, it becomes illiquid until retirement age. This could create cash flow issues if you are planning to retire early.

- Your current savings rate is 77.4%, which indicates a strong capacity to save. This could support a CPF top-up, but ensure you balance this with your immediate liquidity needs.

- Consider your overall financial situation, including your monthly income of S$5,200 and spending of S$1,176, to determine how much you can afford to top up without compromising your cash flow.

- FireBuddy's suggested next step may also provide guidance on how to proceed with your savings strategy.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## PASS · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- According to MoneySense, it is generally accepted to set aside at least 3 to 6 months’ worth of expenses as emergency funds to provide a sufficient buffer during emergencies.

- Your derived emergency fund targets are:
  - 3 months: S$3,167
  - 6 months: S$6,333

- Your recorded emergency runway is 17.1 months, which exceeds the 6-month guideline.

- Your average monthly essential spending is S$1,056.

- Since your emergency runway is over 12 months, it comfortably covers the basic essential-spending guideline of 3 to 6 months.



## PASS · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently at a progress rate of 94.7%, indicating that you are close to your target.
- According to the evidence, many Singapore FIRE community members prefer a withdrawal rate of 3–3.5% due to longer retirement horizons.
- The 3.5% withdrawal rate is considered safer for those with a retirement horizon of 50 years or more, which is relevant for early retirees like yourself.
- Your estimated FIRE target is S$2,565,681, and you are currently facing a funding shortfall.
- To meet your target, you have a required monthly investment of S$2,136.



## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

Your FIRE plan should explicitly account for healthcare and insurance risks, as these can significantly impact your financial independence. Here are key points to consider:

- Healthcare costs, including MediShield Life and Integrated Shield Plan premiums, rise with age and should be included as a line item in your FIRE calculations.
- Long-term care risks, such as those covered by CareShield Life, can also affect your financial planning, especially if you retire early and lose employer health benefits.
- After retirement, you will need to fully self-fund healthcare insurance, as there will be no employer contributions.
- It's important to ensure that your MediSave is at or near the Basic Healthcare Sum (BHS) of $79,000 in 2026 before retiring.
- Budgeting for Integrated Shield Plan premiums is essential, as these can exceed $5,000 to $10,000 per year for older ages.

Given your current funding status of a shortfall, it may be beneficial to reassess your healthcare and insurance planning to ensure you are adequately prepared for these expenses in your FIRE journey.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF Ordinary Account (OA) for housing can significantly impact your FIRE plan in several ways:

- CPF OA funds used for housing do not compound at the 2.5% interest rate, which can reduce your overall retirement savings.
- There is an opportunity cost associated with using CPF OA for housing, as those funds are locked in and cannot be easily accessed for other investments or expenses.
- When you sell a property, CPF charges an "accrued interest" that must be returned, which can lower the cash proceeds from the sale.
- If you have a mortgage or rental obligation, it raises your required monthly spending, which can delay your FIRE timeline.
- Upgrading your property can further lock in cash and CPF OA, making it harder to reach your FIRE goals.

Overall, while CPF OA can support housing needs, it is essential to consider how it affects your liquidity and long-term retirement balance.

**Problems:** missing fire.fiTarget: expected one of S$2,565,681 | $2,565,681

## PASS · fresh_knowledge_cpf_interest

**Q:** What interest do CPF OA, SA, MA and RA earn, and how does the extra interest work for someone below 55?

**Sections sent:** none · **Mode:** knowledge

- The interest rates for CPF accounts as of 2026 are as follows:
  - Ordinary Account (OA): 2.5% per annum
  - Special Account (SA): 4% per annum
  - MediSave Account (MA): 4% per annum
  - Retirement Account (RA): 4% per annum

- For members below 55 years old, they can earn up to 5% per annum on the first $60,000 of combined balances. This includes:
  - The 4% floor rate plus an additional 1% extra interest.

- The extra interest is capped at $20,000 for the Ordinary Account balance.



## PASS · fresh_knowledge_ssb_stepup

**Q:** How does SSB step-up interest work, and when is the interest paid?

**Sections sent:** none · **Mode:** knowledge

- Singapore Savings Bonds (SSB) pay step-up interest, meaning the interest rate increases the longer the bond is held.
- The rates are fixed for each monthly issue based on the average Singapore Government Securities (SGS) yields from the month before and are locked in for that issue.
- Holding a Savings Bond for the full 10 years gives an average return per year that matches the 10-year SGS yield at the time of investment.
- If redeemed early, the average return will be lower, similar to an SGS of the same tenor.
- Interest is paid every 6 months on the 1st business day of the month, starting 6 months after receiving the Savings Bonds.
- For example, if a Savings Bond is issued on 1 Oct, interest payments will be made on 1 Apr and 1 Oct of each subsequent year for the next 10 years, as long as the bond is held.



## PASS · fresh_knowledge_retirement_sum_2025

**Q:** What were the CPF Basic and Full Retirement Sums for the 2025 cohort?

**Sections sent:** none · **Mode:** knowledge

- For the 2025 cohort, the Basic Retirement Sum (BRS) is $106,500.
- The Full Retirement Sum (FRS) is $213,000.
- The Enhanced Retirement Sum (ERS) is $426,000.



## PASS · fresh_knowledge_iras_topup_relief

**Q:** What CPF cash top-up tax relief can I get for myself and family, apart from SRS?

**Sections sent:** none · **Mode:** knowledge

- The CPF Cash Top-up Relief allows you to claim tax relief for cash top-ups made to your own CPF account and to family members' accounts.
- The maximum relief you can claim for your own account is $8,000 per year.
- You can also claim an additional $8,000 for top-ups to family members' accounts.
- The combined maximum relief for both your own and family members' accounts is $16,000 per year.
- This relief applies only to cash top-ups made to Special or Retirement Accounts; transfers from your own CPF account do not qualify.
- The family-member cap of $8,000 has been applicable from Year of Assessment 2023.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- This amount applies to members below 65 years old.
- Once a member turns 65, their BHS is fixed for life at the value for the year they turned 65.



## FAIL · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** spending · **Mode:** hybrid

- This month, your largest spending category is Food & Drink with an amount of S$517.
- Last month, the largest category was Travel, with an amount of S$2,340.
- In comparison, your spending in Food & Drink has increased from S$541 last month.

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


