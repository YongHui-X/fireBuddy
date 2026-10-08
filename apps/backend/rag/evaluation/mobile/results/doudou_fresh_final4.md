# DouDou mobile eval (fresh_final4)

Date 2026-10-05. 14/20 cases pass the automatic data checks.

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
- The top spending categories this month are:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100.



## PASS · fresh_personal_net_worth

**Q:** How much am I worth right now, after debts?

**Sections sent:** netWorth · **Mode:** hybrid

- Your current net worth, after debts, is S$80,000.
- This figure represents your total assets minus your total liabilities.



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

- You can consider using some of your savings for a CPF cash top-up, particularly to your Special Account (SA) or Retirement Account (RA) if you are 55 or older. This can earn you 4% per annum and is eligible for income tax relief up to $8,000 per year for your own account and another $8,000 for family members' accounts.

- However, keep in mind that once money is deposited into CPF, it becomes illiquid until you reach retirement age. This could create cash flow issues if you need funds before age 55 or 65.

- Your current savings rate is 77.4%, which indicates a strong capacity to save. This may provide you with some flexibility to make a top-up while still maintaining liquidity for your needs.

- Be cautious about balancing your liquidity needs against the benefits of the guaranteed returns from CPF. Ensure you have enough cash available for emergencies and other immediate financial obligations.

**Problems:** missing monthlyPulse.savingsAmount: expected one of S$4,024 | $4,024

## FAIL · fresh_hybrid_essential_guideline

**Q:** Does my emergency buffer cover the basic essential-spending guideline?

**Sections sent:** spending, emergency · **Mode:** hybrid

- According to MoneySense, it is recommended to set aside at least 3 to 6 months’ worth of expenses as emergency funds.
- Your derived emergency fund targets are:
  - 3 months: S$3,167
  - 6 months: S$6,333
- Your recorded emergency runway is 17.1 months, which is over 12 months.
- Comparing your emergency runway of 17.1 months to the guideline, it exceeds the 3 to 6 months range suggested by MoneySense.

**Problems:** missing averageMonthlyEssentialSpending: expected one of S$1,056 | $1,056

## FAIL · fresh_hybrid_withdrawal_rate

**Q:** My FIRE plan is nearly funded. How does its progress compare with the 3.5 percent withdrawal-rate approach?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan is currently facing a funding gap of S$135,383 and is classified as having a shortfall.
- The estimated FIRE target is S$2,565,681, and your projected portfolio at retirement is S$2,430,297.
- According to the evidence, a withdrawal rate of 3.5% is considered safer for Singapore FIRE seekers due to longer retirement horizons, which can exceed 50 years.
- The projected share of your target at retirement is 94.7%, indicating that you are close to meeting your target based on current projections.
- It is important to consider that spending significantly influences the withdrawal rate target, and adjustments may be necessary to align with your financial goals.

**Problems:** fact fire.progressRate has no value in the snapshot

## FAIL · fresh_hybrid_insurance

**Q:** Is my FIRE plan accounting for healthcare and insurance risk?

**Sections sent:** fire · **Mode:** hybrid

- Your FIRE plan should explicitly include healthcare costs, as they can significantly impact your financial independence.
- MediShield Life and Integrated Shield Plan premiums rise with age, and these should be budgeted as line items in your FIRE calculations.
- Long-term care risks, such as those covered by CareShield Life, are crucial to consider, especially since retiring early means losing employer health benefits.
- Without employer contributions, you will need to fully self-fund your healthcare insurance costs after retirement.
- Ensure that your planning accounts for these healthcare expenses to avoid jeopardizing your FIRE goals.

**Problems:** missing fire.estimatedFiYear: expected one of 2055

## FAIL · fresh_hybrid_housing_oa

**Q:** If I am using CPF OA for housing, what can that do to my FIRE plan?

**Sections sent:** fire · **Mode:** hybrid

Using CPF Ordinary Account (OA) for housing can significantly impact your FIRE plan in several ways:

- CPF OA funds used for housing do not compound at the 2.5% interest rate, which could reduce your overall retirement savings.
- There is an opportunity cost associated with using CPF OA for housing, as those funds are locked in and cannot be easily accessed for other investments.
- If you have not built enough cash and taxable investments, aggressive CPF top-ups may worsen your liquidity before age 55.
- Selling your property later may require returning accrued interest to CPF, which can reduce the cash proceeds from the sale.
- Upgrading your property can delay your FIRE timeline because more of your cash and CPF OA are tied up in housing.

Overall, while CPF OA can support housing needs, it is essential to consider how it affects your liquidity and long-term retirement balance.

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
- Interest is paid every 6 months on the 1st business day of the month.
- The first interest payment occurs 6 months after receiving the Savings Bonds, with subsequent payments made on the 1st of April and October each year for the next 10 years.



## PASS · fresh_knowledge_retirement_sum_2025

**Q:** What were the CPF Basic and Full Retirement Sums for the 2025 cohort?

**Sections sent:** none · **Mode:** knowledge

- For the 2025 cohort, the Basic Retirement Sum (BRS) is $106,500.
- The Full Retirement Sum (FRS) is $213,000.



## PASS · fresh_knowledge_iras_topup_relief

**Q:** What CPF cash top-up tax relief can I get for myself and family, apart from SRS?

**Sections sent:** none · **Mode:** knowledge

- You can receive CPF Cash Top-up Relief for yourself and your family members, with a maximum of $8,000 per year for your own account and another $8,000 for family members' accounts.
- The total combined relief for CPF Cash Top-up is capped at $16,000 per year.
- This relief applies only to cash top-ups made to your Special or Retirement Accounts; transferring money from your own CPF account does not qualify.
- The family-member cap of $8,000 has been applicable since Year of Assessment 2023.
- Note that top-ups that qualify for Matched Retirement Savings Scheme or MediSave matching grants do not attract this relief.



## PASS · fresh_knowledge_medisave_limit

**Q:** What is the 2026 MediSave Basic Healthcare Sum, and what happens to it after age 65?

**Sections sent:** none · **Mode:** knowledge

- The MediSave Basic Healthcare Sum (BHS) for 2026 is $79,000.
- This amount is the maximum that can be held in the MediSave Account for members below 65.
- Once a member turns 65, their BHS is fixed at the value for the year they turned 65 and remains unchanged for the rest of their life.



## FAIL · fresh_robust_three_turn_followup

**Q:** And compared with the month before?

**Sections sent:** spending · **Mode:** hybrid

- This month, from 1 to 5 October 2026, your largest spending category is Food & Drink with an amount of S$517.
- Last month, from 1 to 30 September 2026, the largest category was Travel with an amount of S$2,340.
- Compared to last month, your spending in Food & Drink is less by S$24 than the last month's amount of S$541.
- Overall, your total spending this month so far is less by S$2,642 compared to last month.

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


