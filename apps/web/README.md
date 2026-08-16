# FireBuddy Web App

This React and Vite app is FireBuddy's active public MVP. It is expense only: API and database amounts are positive while the existing presentation model renders them as spending.

## Delivered flows

- Supabase sign up, sign in, session restoration, and sign out
- Account synchronisation and protected account CRUD
- Expense CRUD with a required persisted account and optional category
- Read-only system categories plus editable custom categories
- Optional AI category suggestions that never save automatically and remain overridable
- Day, week, month, and year expense aggregates with filtered CSV export
- Illustrative FIRE snapshot and projection labels pending the later modelling phase
- Ember Singapore finance guide at `/ember`, with browser-local topic history and per-answer citations
- Explicit `VITE_SKIP_AUTH=true` demo mode with local account, category, and expense state

## Environment

Copy `.env.example` to `.env.local` and configure:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_API_BASE_URL=http://localhost:8000
VITE_SKIP_AUTH=false
VITE_DEMO_ACCOUNT_EMAIL=demo@example.com
```

The browser must only receive a Supabase publishable key. Never put a secret or service-role key in a `VITE_` variable.

`VITE_DEMO_ACCOUNT_EMAIL` is optional. When configured, FireBuddy blocks password recovery for that email in the web interface so shared demo credentials remain unchanged. This is a client-side safeguard, not a server-enforced security boundary.

Password recovery redirects to `/reset-password`. Add the local and deployed versions of that path to the Supabase Auth redirect URL allowlist before testing recovery emails.

## Commands

Run from the repository root:

```powershell
npm run dev:web
npm run lint:web
npm run test:web
npm run build:web
```

Vitest uses React Testing Library and jsdom. Current tests cover authenticated account synchronisation, expense account mapping, expense-only entry, AI suggestion override and errors, read-only default categories, range aggregation, filtered CSV output, and API errors.

## Vercel

`/vercel.json` builds from the monorepo root and serves `apps/web/dist`. It also rewrites application deep links to `index.html` for React Router.

Deploy the Railway backend first, set its public URL as `VITE_API_BASE_URL`, and configure the Supabase variables for Vercel production and preview environments. After the final Vercel domains are known, add only those required origins to the backend's `CORS_ALLOWED_ORIGINS`.
