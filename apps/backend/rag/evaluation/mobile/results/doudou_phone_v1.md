# DouDou mobile eval (phone_v1)

Date 2026-10-04. 6/8 cases pass the automatic data checks.

## PASS · phone_spend_this_month_and_july

**Q:** How much did I spend this month and in july

**Sections sent:** spending · **Mode:** hybrid

- This month, from 1 to 4 October 2026, you spent a total of S$1,176.
- Your top spending categories this month include:
  - Food & Drink: S$517
  - Bills & Utilities: S$187
  - Shopping: S$148
  - Travel: S$120
  - Transport: S$100

- In July 2026, you spent a total of S$1,801.
- Your top spending categories in July included:
  - Healthcare: S$1,019
  - Food & Drink: S$372
  - Bills & Utilities: S$232



## FAIL · phone_spend_top_categories

**Q:** How much have I spent this month, and which categories are highest?

**Sections sent:** spending · **Mode:** hybrid

- You have spent a total of S$1,176 this month from 1 to 4 October 2026.
- Your highest spending categories this month are:
  - Food & Drink: S$517 (under 1k)
  - Bills & Utilities: S$187 (under 1k)
  - Shopping: S$148 (under 1k)
  - Travel: S$120 (under 1k)
  - Transport: S$100 (under 1k)

**Problems:** an internal range was written into the answer

## PASS · phone_how_are_you

**Q:** How are you

**Sections sent:** none · **Mode:** knowledge

I'm doing well, thanks for asking! I'm DouDou, your Singapore money guide. Ask me about your spending, CPF, SRS, Singapore Savings Bonds or your FIRE plan.



## PASS · phone_hi

**Q:** hi

**Sections sent:** none · **Mode:** knowledge

Hi there! I'm DouDou, your Singapore money guide. Ask me about your spending, CPF, SRS, Singapore Savings Bonds or your FIRE plan.



## PASS · phone_thanks

**Q:** thanks!

**Sections sent:** none · **Mode:** knowledge

Glad to help! Ask me about your spending, CPF, SRS or your FIRE plan whenever you like.



## PASS · phone_leetcode

**Q:** Do the leetcode two sum problem

**Sections sent:** none · **Mode:** unsupported

DouDou can only help with the Singapore personal-finance topics covered by FireBuddy, such as CPF, MoneySense planning, Singapore Savings Bonds, IRAS reliefs, investing basics, and FIRE planning.



## FAIL · phone_exact_net_worth

**Q:** What's my exact balance net worth

**Sections sent:** netWorth · **Mode:** hybrid

- Your exact balance net worth is S$80,000. 
- This falls within the range of 50k-100k.

**Problems:** an internal range was written into the answer

## PASS · phone_spend_in_may_and_march

**Q:** What did I spend in May and in March?

**Sections sent:** spending · **Mode:** hybrid

- In May 2026, your total spending was S$2,018.
  - Top categories included:
    - Food & Drink: S$730
    - Entertainment: S$332
    - Travel: S$320

- In March 2026, your total spending was S$2,668.
  - Top categories included:
    - Shopping: S$1,688
    - Food & Drink: S$466
    - Bills & Utilities: S$194


