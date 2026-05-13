# Repository Guidelines

## Source Of Truth
- Read [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) before making product, architecture, data model, or roadmap decisions.
- Treat `AGENTS.md` as the operating guide for how to work in this repo.
- If `PROJECT_BRIEF.md` and the current file tree differ, assume the repo is in transition. Call out the gap clearly and work within the user's requested scope instead of pretending the migration is already complete.

## Project Direction
FireBuddy is a Singapore-focused personal finance and FIRE tracker. The target architecture is a Turborepo monorepo with a web-first build for early public deployment and job applications, while mobile is deferred until later.

Current repo state:
- The repo now uses the root monorepo shape with `apps/`, `packages/`, and `docs/`.
- `apps/mobile/` contains the current Expo implementation.
- `apps/web/` and `apps/backend/` are the target web-first surfaces and are still early scaffolds.

Target repo state:
- `apps/web` for the active React + Vite web app
- `apps/mobile` for the Expo + React Native mobile app
- `apps/backend` for FastAPI
- `packages/shared` for shared types, hooks, API calls, and Supabase client utilities

## Project Structure And Module Organization
Work from the actual repo layout that exists today unless the user explicitly asks you to restructure it further.

Current structure:
- `apps/mobile/` contains the current Expo app
- `apps/mobile/app/` contains Expo Router routes
- `apps/mobile/components/` contains shared UI
- `apps/mobile/hooks/`, `apps/mobile/constants/`, and `apps/mobile/lib/` contain shared app logic and utilities
- `apps/backend/` contains the FastAPI scaffold
- `apps/web/` contains the Vite web scaffold
- `packages/shared/` contains shared TypeScript contracts
- `docs/Figmamake/` contains Figma Make reference material

Target structure after migration:
- `apps/web/` should become the main frontend surface
- `apps/mobile/` should hold the Expo mobile app once shared logic is extracted and the web contracts are stable
- `apps/backend/` should hold FastAPI
- `packages/shared/` should hold shared TypeScript types, hooks, Supabase client helpers, and API-call wrappers imported by both frontends

Migration-aware rule:
- Agents may propose folder moves, shared-package extraction, and scaffold plans.
- Agents must not assume `apps/web`, `apps/mobile`, `apps/backend`, or `packages/shared` already exist unless they are present in the repo.

## Build, Test, And Development Commands
Use commands that match the repo's current state.

Current commands that exist today:
- Run install commands from the repo root for workspaces, or from `apps/mobile/` for the Expo app directly
- `npm run dev:web`
- `npm run dev:mobile`
- `npm run dev:backend`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint:mobile`

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

## Coding Style And Naming Conventions
Follow the existing TypeScript, React Native, Expo Router, and Python patterns already present in the repo, while steering new architecture work toward the target web-first monorepo.

- Use 2-space indentation and match the surrounding quote style
- Use PascalCase for components and camelCase for functions and variables
- Keep route filenames aligned with the framework in use
- Keep shared UI reusable and keep feature-specific logic close to the consuming route or hook
- When introducing target-state structure, prefer names that will map cleanly to `apps/*` and `packages/shared`

## Testing Guidelines
There is no automated test suite configured yet.

- If you add tests, keep them near the feature and document the command in the relevant `package.json`
- For current Expo work, verify with `npm run lint:mobile` plus manual checks in the relevant screen
- For future monorepo work, document which app or package owns each test command

## Commit And Pull Request Guidelines
Commit history is short and plain, so keep messages concise and imperative, for example `scaffold shared types`.

- Mention the affected app, package, screen, component, or backend area in the PR description
- Include screenshots or screen recordings for UI work
- Call out new environment variables, Supabase changes, route additions, and migration-related folder moves

## Agent-Specific Instructions
- Default to mentoring mode. Provide guidance, planning, architecture review, scaffolding advice, and adaptation steps first.
- Do not implement code, edit files, or make repo changes unless the user explicitly asks for code or implementation work.
- Do not show code, write code, or edit files unless the user explicitly asks for implementation.
- If the user asks for scaffolding guidance, you may describe the folder structure and migration plan without creating the full codebase unless they ask you to do so.
- If the user asks for code changes in one area, do not silently perform broad repo migration work around it.
- When current code and target architecture differ, explain the tradeoff and recommend an incremental path instead of forcing a full rewrite.
