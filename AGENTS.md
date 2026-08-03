# Repository Guidelines

## Source Of Truth
- Read [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) before making product, architecture, data model, or roadmap decisions.
- Treat `AGENTS.md` as the operating guide for how to work in this repo.
- If `PROJECT_BRIEF.md` and the current file tree differ, assume the repo is in transition. Call out the gap clearly and work within the user's requested scope instead of pretending the migration is already complete.

## Project Direction
FireBuddy is a Singapore-focused personal finance and FIRE tracker. The target architecture is a Turborepo monorepo with a web-first build for early public deployment and job applications, while mobile is deferred until later.

Current repo state:
- The repo now uses the root monorepo shape with `apps/`, `packages/`, and `docs/`.
- `apps/web/` is the active React and Vite frontend.
- `apps/web/` includes Supabase auth, dashboard, transactions, categories, profile, insights, accounts, add-expense modal, local fallback state, and backend sync for categories and expenses.
- `apps/backend/` is the FastAPI backend with mounted categories, expenses, and financial advisor RAG routes.
- `apps/mobile/` contains the earlier Expo implementation and is currently deferred.
- `packages/shared/` contains shared TypeScript contracts, category data, add-expense helpers, and API route constants.
- `supabase/` contains SQL migrations for profiles, categories, expenses, category visuals, and RAG pgvector storage.

Target repo state:
- `apps/web` for the active React + Vite web app
- `apps/mobile` for the Expo + React Native mobile app
- `apps/backend` for FastAPI
- `packages/shared` for shared types, hooks, API calls, and Supabase client utilities

## Project Structure And Module Organization
Work from the actual repo layout that exists today unless the user explicitly asks you to restructure it further.

Current structure:
- `apps/web/` contains the current active web app
- `apps/web/src/routes/` contains the main web screens and modal routes
- `apps/web/src/app/` contains web app state, constants, and shared view helpers
- `apps/backend/` contains the FastAPI app
- `apps/backend/routers/` contains categories, expenses, RAG, and draft AI parse route modules
- `apps/backend/rag/` contains the knowledge base, ingestion, retrieval, and advisor service support code
- `apps/mobile/` contains the earlier Expo app
- `apps/mobile/app/` contains Expo Router routes
- `apps/mobile/components/` contains shared UI
- `apps/mobile/hooks/`, `apps/mobile/constants/`, and `apps/mobile/lib/` contain shared app logic and utilities
- `packages/shared/` contains shared TypeScript contracts
- `supabase/` contains migrations and seed data
- `docs/Figmamake/` contains Figma Make reference material

Target structure after migration:
- `apps/web/` should remain the main frontend surface
- `apps/mobile/` should hold the Expo mobile app once shared logic and web contracts are stable
- `apps/backend/` should hold FastAPI business logic, protected data APIs, AI features, and RAG endpoints
- `packages/shared/` should hold shared TypeScript types, helpers, Supabase client utilities, hooks, and API-call wrappers imported by both frontends

Migration-aware rule:
- Agents may propose folder moves, shared-package extraction, and scaffold plans.
- Agents must not assume `apps/web`, `apps/mobile`, `apps/backend`, or `packages/shared` already exist unless they are present in the repo.
- Agents must distinguish mounted backend routes from draft route modules. `routers/ai.py` exists, but only routes included by `apps/backend/main.py` are live.

## Build, Test, And Development Commands
Use commands that match the repo's current state.

Current commands that exist today:
- Run install commands from the repo root for workspaces, or from `apps/mobile/` for the Expo app directly
- `npm run dev:web`
- `npm run dev:mobile`
- `npm run dev:backend`
- `npm run build:web`
- `npm run lint:web`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint:mobile`
- `npm run typecheck:shared`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

Target commands after monorepo migration:
- Run install commands from the monorepo root
- Expect root scripts to remain the main entrypoint for `web`, `mobile`, and `backend`
- Confirm the exact workspace and Turbo commands from `package.json` and `turbo.json` before instructing the user to run them

## Architecture Guidance
- Prioritise the web app first. Mobile is a later phase unless the user explicitly asks to work on it.
- Preserve a shared-logic-first architecture. Business logic should live in hooks, lib modules, backend services, or the future `packages/shared` package, not inside UI components.
- Keep components presentation-only whenever practical. They should render UI and call hooks instead of owning business logic.
- Treat Figma Make output as a visual reference only. Do not copy-paste generated Vite, Tailwind, or shadcn code into the project unless the user explicitly asks for a careful adaptation.
- When adapting the current Expo code in `apps/mobile` toward the target architecture, optimise for later reuse in `packages/shared`.
- For backend changes, keep JWT verification in FastAPI for protected app data routes and keep Supabase Auth as the only auth system.
- For RAG changes, keep ingestion, retrieval, advisor response generation, and knowledge-base refresh concerns separated unless a small integration change requires touching multiple layers.

## Frontend Workflow
For new screens or flows, prefer this sequence unless the user asks otherwise:
1. Review the Figma reference and project brief.
2. Break the UI into reusable components.
3. Build the UI shape with dummy data first.
4. Validate the interaction and screen structure.
5. Shape backend endpoints and shared types around the validated frontend data flow.
6. Replace dummy data with real API calls.

Navigation direction:
- Bottom tabs should remain `Home`, `Transactions`, `Categories`, and `Profile`.
- `Add Expense` should be treated as a modal, sheet, or floating-action-button flow rather than a fifth main tab unless the user explicitly changes the design.
- The current web UI includes an `Insights` route and an `Accounts` management view. Accounts should remain secondary to Transactions unless the user changes the product direction.

## Coding Style And Naming Conventions
Follow the existing TypeScript, React Native, Expo Router, and Python patterns already present in the repo, while steering new architecture work toward the target web-first monorepo.

- Use 2-space indentation and match the surrounding quote style
- Use PascalCase for components and camelCase for functions and variables
- Keep route filenames aligned with the framework in use
- Keep shared UI reusable and keep feature-specific logic close to the consuming route or hook
- When introducing target-state structure, prefer names that will map cleanly to `apps/*` and `packages/shared`

## Testing Guidelines
There is no broad automated test suite configured yet.

- If you add tests, keep them near the feature and document the command in the relevant `package.json`
- For web work, run the most relevant of `npm run lint:web`, `npm run build:web`, and `npm run typecheck:shared`
- For current Expo work, verify with `npm run lint:mobile` plus manual checks in the relevant screen
- For backend work, run targeted Python import or route checks where practical, and document any checks that need Supabase or OpenAI credentials
- For monorepo work, document which app or package owns each test command

## Commit And Pull Request Guidelines
Commit history is short and plain, so keep messages concise and imperative, for example `scaffold shared types`.

- Mention the affected app, package, screen, component, or backend area in the PR description
- Include screenshots or screen recordings for UI work
- Call out new environment variables, Supabase changes, backend route additions, RAG ingestion changes, and migration-related folder moves

## Agent-Specific Instructions
- Default to mentoring mode. Provide guidance, planning, architecture review, scaffolding advice, and adaptation steps first.
- Do not implement code, edit files, or make repo changes unless the user explicitly asks for code or implementation work.
- Do not show code, write code, or edit files unless the user explicitly asks for implementation.
- If the user asks for scaffolding guidance, you may describe the folder structure and migration plan without creating the full codebase unless they ask you to do so.
- If the user asks for code changes in one area, do not silently perform broad repo migration work around it.
- When current code and target architecture differ, explain the tradeoff and recommend an incremental path instead of forcing a full rewrite.
- If updating docs, align them with the actual file tree, root scripts, mounted backend routes, and Supabase migrations before describing future plans.
