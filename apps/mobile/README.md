# FireBuddy Mobile App

The Expo (SDK 54, expo-router 6) native app for FireBuddy on Android and iOS. It follows the same
forest-and-lime design system as the web app: `constants/tokens.ts` mirrors
`apps/web/src/styles/tokens.css`, and the phone rules in `DESIGN.md` ("Mobile and Touch") apply.

## What is here

- **Look**: one flat canvas colour per theme (white, or deep forest in dark mode), hairline flat cards
  with no shadows, and a single forest accent card per screen; the Home headline sits straight on
  the canvas above a row of round shortcuts (`components/home/QuickActions.tsx`), in the manner of
  wallet apps.
- **Shell**: no topbar. Home carries the theme toggle, notifications and Ask Ember beside the
  greeting (`components/home/HomeActions.tsx`), and an eye on the net-worth hero hides every
  amount app-wide (`lib/privacy.tsx`). A custom four-tab bar (`components/navigation/TabBar.tsx`)
  has the centred lime Add tile. Screens and the tab bar read safe-area insets, so nothing sits
  under the status bar, the Android navigation bar or the iOS home indicator.
- **Tab screens**: Home (net worth hero, Money Pulse, category budgets, spending donut, recent
  transactions), Transactions (period stepper, search, Filters sheet, day-grouped ledger with
  details, edit, duplicate and delete; the overflow menu holds Manage tags, Export CSV and
  Accounts), Categories (cards, breakdown, add/edit sheet), Profile (money tools, appearance,
  reset data). `app/add-transaction.tsx` is the Add/Edit sheet.
- **Secondary screens** (pushed over the tabs, each with a back chevron): `wealth` (positions,
  dated values, contributions), `fire-planner` and `fire-plan-edit` (projection, scenario sheet,
  plan editor), `insights` (Day / Week / Month / Year or one chosen month, breakdown donut, trend
  bars in `components/charts/TrendChart.tsx`, top spending, CSV export), `accounts` (payment
  account labels, add/edit/delete), `plan` (essential spending categories and their monthly
  average), `ember` (chat transcript and composer), and `goals` (roadmap placeholder, as on web).
- **Data**: records live only on the phone. `lib/fire-buddy-store.tsx` seeds from
  `@firebuddy/shared` (`demo-data.ts`) and persists to AsyncStorage. Ledger maths, Insights
  ranges and series, the CSV builder, essential-spending maths, formatters and the transaction
  draft live in `packages/shared` so web and mobile agree. Supabase auth and the FastAPI data
  routes are not wired yet.
- **Ember**: `hooks/use-ember.ts` keeps the transcript on the device and `lib/ember-api.ts` calls
  `POST /api/chat/financial-advisor`. That route needs a Supabase JWT, so Ember only answers when
  `EXPO_PUBLIC_API_BASE_URL` and, until sign-in exists, `EXPO_PUBLIC_DEV_ACCESS_TOKEN` are set
  (see `.env.example`); otherwise the screen explains that and keeps the composer disabled.
- **CSV export**: `lib/export-csv.ts` writes the file with `expo-file-system` and opens the system
  share sheet with `expo-sharing`, the phone equivalent of the web download.
- **AI consent**: `lib/ai-preference.tsx` stores the Off / Guide / Personalised level on the device
  (off by default). The Ember screen shows a consent card until a level is chosen, and Profile
  carries the control. Once the phone sends a JWT the backend enforces the same level from the
  profile row; until then the device setting is the only gate.
- **Ember masks on the device**: `hooks/use-ember.ts` scrubs the question and history with the
  shared `MaskingSession`, and at Personalised builds the snapshot from the records on the phone
  (`buildPersonalSnapshot` in `packages/shared`) and masks it before sending. The request carries
  `clientMasked: true`, the backend forwards tokens untouched, and the phone restores the real
  figures from its own map. Exact figures never leave the device.
- **Encrypted backup**: `hooks/use-backup.ts` and `components/profile/BackupSheet.tsx`. Profile has
  "Back up to a file" (scrypt-derived key, XChaCha20-Poly1305 via `@noble`, saved through the
  share sheet to iCloud Drive, Google Drive or Files) and "Restore from a file" (document picker,
  then passphrase). The passphrase is never stored; a lost passphrase means a lost backup.
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

## Troubleshooting Metro on Windows

If Metro reports `EINVAL: invalid argument, readlink` for a file under
`node_modules/eslint-config-expo`, the dependency tree contains a OneDrive reparse point. Stop any
running Expo process, then reinstall from the repository root:

```powershell
# Close the Expo terminal first. If it remains running, stop only its process:
Get-Process node | Select-Object Id,Path
Stop-Process -Id <expo-process-id> -Force
npm ci --legacy-peer-deps --install-strategy=hoisted
npm run dev:mobile -- --clear
```

If Windows still reports `EPERM` while npm removes a native `.node` file, keep the repository in a
non-synced path such as `C:\dev\fireBuddy`. OneDrive can hold or recreate reparse points inside
`node_modules`, which Metro cannot read as ordinary files.

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

## Environment

Copy `.env.example` to `.env.local` when you want Ember to reach a running backend. Both values
are optional; every other screen runs on local demo data.

## Next steps

- Wire Supabase auth, then the `/transactions`, `/categories`, `/accounts`, `/wealth` and `/fire`
  APIs behind the same store interface, replacing the development token for Ember.
- Stream Ember answers over the SSE route once auth is in place.
- Life Goals and period-based Spending Plan limits follow the web roadmap.

Project references: [`../../PROJECT_BRIEF.md`](../../PROJECT_BRIEF.md), [`../../AGENTS.md`](../../AGENTS.md), [`../../DESIGN.md`](../../DESIGN.md).
