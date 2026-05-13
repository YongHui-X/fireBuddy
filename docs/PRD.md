# FireBuddy Product Requirements Document

## 1. Product Summary
FireBuddy is a Singapore-focused personal finance and FIRE tracker. The first public surface is the React and Vite web app in `apps/web`, with mobile deferred until the core web workflow is stable.

The product helps users capture everyday expenses, understand category spend, and keep FIRE progress visible without turning the app into a complex investment dashboard too early.

## 2. Source Material
- Product source of truth: `PROJECT_BRIEF.md`
- Active UI layout source for the current web pass: `docs/Figmamake`
- Palette guidance: `docs/Figmamake/src/imports/pasted_text/figma-color-update.md`
- Current frontend target: `apps/web`

For the current web correction, `docs/Figmamake` is the active layout source. The implementation should adapt that layout into the repo rather than copy the generated project wholesale.

## 3. Target Users
- Singapore-based working adults tracking day-to-day spending.
- Early FIRE planners who want CPF-aware and Singapore-relevant language later.
- Recruiters or hiring managers evaluating the project as a public portfolio app.

## 4. MVP Goals
- Provide a polished web-first expense tracking flow.
- Keep the navigation simple: Home, Transactions, Categories, Profile.
- Launch Add expense from a modal, sheet, or floating action button rather than a fifth tab.
- Use shared expense categories and account options so web and mobile can reuse the same contracts later.
- Keep FIRE progress visible as a lightweight snapshot before full projection logic is implemented.

## 5. MVP Screens
### Home
- Show current month spend.
- Show recent transactions.
- Show spending breakdown as a pie chart without a separate category list below it.
- Show a lightweight FIRE snapshot with current net worth, target, progress percentage, invested amount, cash, emergency months, and projected FIRE year.

### Add Expense
- Capture amount, date, account, category, and optional description.
- Validate amount, date, account, and category locally.
- Save to the current local web state until backend persistence is connected.

### Transactions
- Show month spend, transaction count, and average ticket.
- Provide local search by description, account, or category.
- Provide category and account filters.
- Provide the only account-management entry point from the Transactions screen.
- Keep row details scannable on desktop and card-like on mobile.

### Categories
- Show category totals and transaction counts.
- Rank categories by spend.
- Use progress bars for share of tracked spend.

### Profile
- Summarize current workspace state.
- Show FIRE target assumptions from the reference profile.
- Keep product-direction notes visible for the current alpha.

### Analytics
- Show the statistics layout from `docs/Figmamake`.
- Include range tabs, expense chart, FIRE projection, top spending, and category share.

### Accounts
- Account management is not a primary tab or sidebar item.
- Show account list management only when launched from Transactions.
- Support add, edit, and delete flows for local demo accounts.

## 6. Visual Requirements
- Use the green-led palette from the Figma Make color update:
  - App background `#F5F8F4`
  - Primary green `#3C8A61`
  - Deep green `#25543D`
  - Secondary green `#67B47C`
  - Soft mint `#DCEBDD`
  - White cards `#FFFFFF`
  - Muted surface `#EEF5EF`
  - Text primary `#1F3D2E`
  - Text secondary `#6B8577`
  - Border `#D7E3D8`
- Match the Figma Make layout closely, including:
  - Mobile-first 390px app column.
  - Fixed 200px desktop sidebar.
  - Green curved headers.
  - Overlapping dashboard balance card.
  - Mobile bottom navigation with centered protruding add button.
  - Figma-style cards, shadows, spacing, and screen hierarchy.
- Do not include sending, peer transfer, send-again, contact list, or payment-recipient UI.
- This layout requirement intentionally overrides the older flat/no-gradient visual constraint for the current web implementation.

## 7. Functional Requirements
- The user can add an expense and see all views update immediately.
- The user can review all saved local expenses.
- The user can filter transactions by search, category, and account.
- The user can manage local demo accounts from Transactions.
- The user can compare category totals.
- The user can inspect the current FIRE snapshot.

## 8. Data Requirements
Initial web data can remain local/demo data while the stack is wired. Shared contracts should continue to live in `packages/shared` when they are reusable across web and mobile.

Planned persisted tables remain:
- `profiles`
- `categories`
- `expenses`

Default categories remain:
- Food & Drink
- Transport
- Shopping
- Bills & Utilities
- Healthcare
- Entertainment
- Travel
- Others

## 9. Future Requirements
- Supabase-backed expense persistence.
- FastAPI routes for expenses, categories, and AI parsing.
- OpenAI-powered transaction auto-categorisation.
- CPF and financial-document RAG after the core flow is stable.
- Full FIRE analytics and projection charts after the MVP expense flow works end to end.

## 10. Out Of Scope For MVP
- Telegram bot integration.
- Mobile app polish beyond preserving shared logic.
- Full investment account syncing.
- Income tracking as a first-class workflow.
- Production-grade FIRE projection modelling.
