# Frontend Web Scaffold Plan

## Purpose
This document defines the first implementation pass for the web app in `apps/web`.

The goal is to replace the current placeholder scaffold with a real `Add Expense` screen that works with local dummy data only.

## Scope For This Pass
- Build the first meaningful web UI in `apps/web`
- Focus on the `Add Expense` flow only
- Use dummy data and local state
- Keep the UI structured so logic can move into shared packages later

## Explicit Non-Goals
- Do not implement AI features yet
- Do not call `POST /ai/parse-input`
- Do not add OpenAI wiring
- Do not add auth in this pass
- Do not wire FastAPI in this pass
- Do not migrate or port the Expo app into the web app
- Do not copy Figma Make code directly into production code

## Why This Is The Next Step
The current repo state shows:
- `apps/web` is still a transition scaffold
- `packages/shared` already contains the basic categories and expense input types
- Supabase schema is ahead of the frontend
- Backend routes exist but are still scaffold-level

That means the next useful development step is product-shaping on the web frontend, not more infra work.

## Screen To Build
Create a single-screen `Add Expense` web page with:
- Header area with title and helper copy
- Main form card
- Recent expenses list below or beside the form depending on screen width

The form should include:
- Description
- Amount
- Date
- Category
- Save button

There may be a placeholder area for future categorisation guidance, but it must stay static and must not behave like an AI feature.

## Recommended File Scaffold
Under `apps/web/src`, use this structure:

```text
App.tsx
styles.css
components/
  AddExpensePage.tsx
  AddExpenseForm.tsx
  CategorySelect.tsx
  RecentExpensesList.tsx
data/
  mockExpenses.ts
lib/
  format.ts
types/
  ui.ts
```

## File Ownership
### `App.tsx`
- App entry only
- Renders the page component

### `components/AddExpensePage.tsx`
- Screen-level container
- Owns local state
- Owns submit behavior
- Owns local validation handling
- Owns the recent expenses state

### `components/AddExpenseForm.tsx`
- Presentational form only
- Receives values, errors, and callbacks via props

### `components/CategorySelect.tsx`
- Category picker UI only
- Uses shared categories from `@firebuddy/shared`

### `components/RecentExpensesList.tsx`
- Renders recent local entries
- No business logic

### `data/mockExpenses.ts`
- Seed dummy expenses for first render

### `lib/format.ts`
- Formatting helpers only
- Currency formatting
- Date formatting

### `types/ui.ts`
- Local UI-only types
- Domain types should continue to come from `@firebuddy/shared`

## State Model
Keep the state in `AddExpensePage` simple and future-proof.

### Form state
- `description`
- `amount`
- `date`
- `categoryId` or `categoryName`

### Supporting state
- `recentExpenses`
- `errors`
- `isSubmitting`

Do not add AI suggestion state in this pass.

## Shared Contracts To Reuse
Use the existing shared package as the source of truth where possible:
- Category names from `packages/shared/src/categories.ts`
- Expense input shape from `packages/shared/src/types.ts`

Do not solve backend field-name translation yet.

Known mismatch to leave alone for now:
- Shared frontend shape uses camelCase like `categoryId`
- Backend currently expects snake_case like `category_id`

That mapping belongs to the API integration pass, not this scaffold pass.

## Validation For This Pass
Keep validation lightweight:
- Description must not be empty
- Amount must be a valid positive number
- Date must be present
- Category should be selected if the UI requires it

Validation should happen locally in the page container before adding a new local entry.

## Styling Direction
Follow the updated green-led product palette:
- Background: `#F5F8F4`
- Surface: `#FFFFFF`
- Muted surface: `#EEF5EF`
- Accent: `#3C8A61`
- Deep green: `#25543D`
- Secondary green: `#67B47C`
- Text primary: `#1F3D2E`
- Text secondary: `#6B8577`
- Border: `#D7E3D8`
- Radius: `12px`

Visual rules:
- Flat surfaces
- Thin borders
- No gradients
- No drop shadows
- Generous whitespace
- Calm, finance-oriented feel

## Acceptance Criteria
This pass is complete when:
- `apps/web` shows a real `Add Expense` screen instead of the current placeholder scaffold
- The form can be filled locally
- Clicking save adds an item to a recent expenses list in local state
- The screen looks intentional and aligned with the brief
- No AI, auth, backend, or Supabase integration is added yet

## Recommended Build Order
1. Replace the placeholder content in `App.tsx`
2. Add global tokens and layout styles in `styles.css`
3. Build the page container and form UI
4. Add mock categories and mock recent expenses
5. Add local save behavior
6. Add lightweight validation
7. Refine spacing and mobile responsiveness

## Next Steps After This Pass
After the local scaffold is stable:
1. Wire categories from `GET /categories`
2. Wire authenticated `POST /expenses`
3. Add backend-safe field mapping between frontend and API shapes
4. Add AI categorisation only after the save flow works end to end
