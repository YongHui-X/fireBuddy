# Google Play listing (draft, 13 Oct 2026)

Copy for the Play Console. Every privacy statement here must match `docs/PRIVACY.md` and the in-app policy in `packages/shared/src/legal.ts`; change them together.

## Store listing

**Developer name** (Play Console → Settings → Developer account → Account details; shown under the app on the store)

> DouDou Studios

**App name** (30 characters max)

> FireBuddy: Budget & FIRE

**Short description** (80 characters max)

> Track spending, grow your net worth and plan your FIRE date. Private by design.

**Full description** (4,000 characters max)

> Meet FireBuddy, the friendly money app that helps you see where your money goes today and when you could stop working for good.
>
> FIRE stands for Financial Independence, Retire Early. FireBuddy turns that big idea into a plan you can actually follow: log your spending, add what you own and owe, and watch your FIRE date move closer every month.
>
> 🔥 PLAN YOUR FIRE DATE
> • See the age you could retire, how much you need, and how far along you are
> • Choose your style: Regular, Lean, Fat, Coast or Barista FIRE
> • Plan for big moments like a home, a car or a wedding, and see how each one changes your date
> • Clear next steps, such as how much more to invest to stay on track
> • Built for Singapore: CPF LIFE payouts, CPF balances, SRS and HDB loans are part of the plan
>
> 💸 TRACK SPENDING IN SECONDS
> • Add a transaction in a few taps, with categories that make sense
> • Repeat bills and salary automatically with recurring transactions
> • Set monthly budgets and see what is left at a glance
> • Insights show your biggest categories and how this month compares with last
> • An optional 9pm reminder helps you keep the habit
>
> 📈 WATCH YOUR NET WORTH GROW
> • Add savings, investments, CPF, property and loans in one place
> • Bank accounts update as you log income and spending
> • Track debts and see when each one will be paid off
>
> 🐾 MEET DOUDOU
> DouDou is your golden money buddy. Ask questions like "Am I saving enough?" or "What is the CPF Full Retirement Sum?" and get plain-language answers based on trusted Singapore guides such as MoneySense and CPF. DouDou is off until you choose to turn it on.
>
> 🔒 PRIVATE BY DESIGN
> • No sign-up, no email, no password and no bank logins
> • Your records are saved on your phone, not on our servers
> • No ads, no analytics and no tracking
> • When you ask DouDou something, amounts and names are removed or masked on your phone first, and only the parts of your summary the question needs are sent
> • Back up with an encrypted file only you can open, or export to CSV anytime
> • Delete everything from Profile whenever you like
>
> 🌏 NOT IN SINGAPORE?
> FireBuddy works in your currency too. Outside Singapore it simply leaves out CPF, SRS and HDB.
>
> FireBuddy is a planning and education tool, not financial advice. Its projections are estimates based on the figures and assumptions you enter. For advice on your own situation, speak to a licensed financial adviser.
>
> Questions or ideas? Email firebuddyapp@gmail.com. We read every message.

**Category:** Finance
**Tags** (pick up to 5 in the console): Budget, Personal finance, Expense tracker, Retirement planner, Net worth
**Contact email:** firebuddyapp@gmail.com
**Privacy policy URL:** *needed before review; see "Still to do" below*

## Graphics (to make)

| Asset | Size | Notes |
|---|---|---|
| App icon | 512 x 512 PNG | `apps/mobile/assets/images/icon.png` scaled up |
| Feature graphic | 1024 x 500 PNG | Golden DouDou on navy with "Plan your FIRE date" |
| Phone screenshots | 2 to 8, 1080 x 1920 or similar | Suggested: FIRE Planner hero, Home, Add transaction, Wealth, Insights, DouDou chat. Use the demo data, never real figures |

## Data safety answers

Google counts data as "collected" when it leaves the phone, even if it is not kept. Only DouDou sends anything, and only after the user turns it on.

| Question | Answer |
|---|---|
| Does the app collect or share user data? | Yes (collect). Not shared: OpenAI and our hosts act as service providers |
| Is all collected data encrypted in transit? | Yes (HTTPS) |
| Can users ask for their data to be deleted? | Yes. Turning DouDou off deletes the anonymous ID; Delete all my data clears the phone |

Data types collected, all **optional** (only when DouDou is on), purpose **App functionality** unless noted:

| Data type | Why | Processed ephemerally? |
|---|---|---|
| Financial info → Other financial info | Masked figures from the summary, when a question is about the user's money | No. OpenAI may keep API requests up to 30 days for abuse monitoring (answer Yes only once zero data retention is approved) |
| App activity → Other user-generated content | The DouDou question, with amounts and names removed | No, for the same reason |
| Device or other IDs | The random anonymous ID; purposes App functionality and Fraud prevention, security and compliance | No, kept until DouDou is turned off |

Not collected: name, email, phone, location, contacts, photos, files, health, messages, web browsing, ads ID, crash logs, diagnostics.

## Other console declarations

| Declaration | Answer |
|---|---|
| Ads | No ads |
| App access | All functionality is available without special access (no login) |
| Target audience | 18 and over |
| Content rating | Complete the IARC questionnaire: no violence, no user-to-user sharing, no gambling, no purchases. Expected rating: Everyone / 3+ |
| Financial features | The app provides budgeting and financial planning tools only. It does not offer loans, payments, trading, banking or crypto |
| Government apps / health / news | No |

## Closed test release notes (500 characters max)

> Welcome to the first FireBuddy test! 🎉 Please try adding a few transactions, setting up your FIRE plan and turning DouDou on in Profile. Tell us anything that looks odd, feels confusing or crashes: email firebuddyapp@gmail.com or use the feedback link on Google Play. Thank you for helping us build a calmer way to reach FIRE.

## Still to do before the store review

1. **Privacy policy URL.** Google needs a public web page, not only the in-app policy. Options: a page on the deployed website, GitHub Pages, or a `/privacy` route on the Railway backend serving the text from `legal.ts`.
2. **Zero data retention** with OpenAI (`docs/PRIVACY.md` checklist). Until it is approved, the Data safety form says requests are not processed ephemerally.
3. **Screenshots and feature graphic.**
4. **Twelve testers** opted in to the closed test for 14 days in a row.
