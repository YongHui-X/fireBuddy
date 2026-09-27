# FireBuddy Mobile App

The Expo (SDK 54, expo-router 6) native app for FireBuddy on Android and iOS. It follows the same
forest-and-lime design system as the web app: `constants/tokens.ts` mirrors
`apps/web/src/styles/tokens.css`, and the phone rules in `DESIGN.md` ("Mobile and Touch") apply.

## What is here

- **Shell**: forest topbar (`components/navigation/AppTopbar.tsx`) with theme toggle and a More
  sheet; a custom four-tab bar (`components/navigation/TabBar.tsx`) with the centred lime Add tile.
  Both read safe-area insets, so nothing sits under the status bar, the Android navigation bar or
  the iOS home indicator.
- **Screens**: Home (net worth hero, Money Pulse, category budgets, spending donut, recent
  transactions, FI progress), Transactions (period stepper, search, Filters sheet, day-grouped
  ledger with details, edit, duplicate and delete), Categories (cards, breakdown, add/edit sheet),
  Profile (appearance, clear demo data). `app/add-transaction.tsx` is the Add/Edit sheet.
  Secondary web routes (Ember, Insights, Wealth, FIRE Planner, Accounts, Plan, Goals) open
  `app/coming-soon.tsx` from the More sheet.
- **Data**: local demo data only. `lib/fire-buddy-store.tsx` seeds from
  `@firebuddy/shared` (`demo-data.ts`) and persists to AsyncStorage. Ledger maths, formatters and
  the transaction draft live in `packages/shared` so web and mobile agree. Supabase and the
  FastAPI backend are not wired yet.
- **Primitives**: `components/ui/*` (Text, Card, Button, BottomSheet, ActionSheet, ConfirmDialog,
  SegmentedControl, ProgressTrack, CategoryAvatar, TextField/SelectField/DateField, Toast, …).
  Every modal surface is a `BottomSheet` built on the native Modal, which gives Android back-button
  dismissal and keyboard avoidance without extra dependencies.

## Commands (from this folder)

```bash
npm run dev          # expo start
npm run android      # expo start --android (installs Expo Go on the emulator when missing)
npm run ios
npm run lint         # expo lint
npm run typecheck    # tsc --noEmit
```

From the repo root: `npm run dev:mobile`, `npm run lint:mobile`, `npm run typecheck:mobile`.

Typed routes are generated into `.expo/types/router.d.ts` when Metro starts, so run `npm run dev`
once after adding a route before `npm run typecheck`.

## Expo Go vs dev build

Everything runs in Expo Go. The `app.json` settings (app icon, splash colour, adaptive icon,
`softwareKeyboardLayoutMode`, the iOS status-bar plist key) only apply in a development build:
`npx expo run:android` or `npx expo run:ios`.

## Brand assets

`scripts/render-brand-assets.mjs` rasterises the sun-on-horizon mark into `assets/images/*.png`
(icon, adaptive icon foreground and monochrome layers, splash, favicon). Re-run it when the mark
changes:

```bash
npx --yes --package sharp node scripts/render-brand-assets.mjs
```

## Next steps

- Wire Supabase auth and the `/transactions`, `/categories`, `/accounts` APIs behind the same
  store interface.
- Port Insights, Wealth, FIRE Planner and Ember from the web app.

Project references: [`../../PROJECT_BRIEF.md`](../../PROJECT_BRIEF.md), [`../../AGENTS.md`](../../AGENTS.md), [`../../DESIGN.md`](../../DESIGN.md).
