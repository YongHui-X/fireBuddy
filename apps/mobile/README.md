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
  Accounts, plus a Recurring view for repeating transactions), Categories (cards, breakdown,
  add/edit sheet), Profile (money tools, country and currency, appearance, daily reminder, Replay
  Tutorial, and "Delete all my data"; "Start fresh" and "Load demo data" show only in development
  builds). `app/add-transaction.tsx` is the Add/Edit sheet; its account list ends with "Add account"
  and it can make the transaction repeat.
- **Secondary screens** (pushed over the tabs, each with a back chevron): `wealth` (positions,
  dated values, contributions), `fire-planner` and `fire-plan-edit` (projection, scenario sheet,
  plan editor), `insights` (Day / Week / Month / Year or one chosen month, breakdown donut, trend
  bars in `components/charts/TrendChart.tsx`, top spending, CSV export), `accounts` (payment
  account labels, add/edit/make default, and delete with a "move transactions to" step), `plan` (essential spending categories and their monthly
  average), and `ember` (chat transcript and composer). Life Goals has no mobile screen yet.
- **Data**: records live only on the phone. `lib/fire-buddy-store.tsx` persists to AsyncStorage.
  A new install starts empty in production; development builds seed the shared demo dataset
  (`demo-data.ts`). Recurring rules are stored beside the records and due copies are added on app
  open. Singapore users get the full app; other countries get the general mode described in
  `PROJECT_BRIEF.md` (chosen currency, no CPF/SRS/HDB). Ledger maths, Insights
  ranges and series, the CSV builder, essential-spending maths, formatters and the transaction
  draft live in `packages/shared` so web and mobile agree. Records never go to Supabase or the
  backend, and there is no sign-in screen.
- **Ember**: `hooks/use-ember.ts` keeps the transcript on the device and `lib/ember-api.ts` calls
  `POST /api/chat/financial-advisor`. That route needs a Supabase JWT, which comes from an
  invisible anonymous session created only when the user turns Ember on (`lib/ember-session.ts`,
  stored with `expo-secure-store`). Without the env values below, the screen explains that and
  keeps the composer disabled.
- **CSV export**: `lib/export-csv.ts` writes the file with `expo-file-system` and opens the system
  share sheet with `expo-sharing`, the phone equivalent of the web download.
- **AI consent**: one Off/On choice, off by default (`lib/ai-preference.tsx`). Off means no account
  and no network calls. "Turn on DouDou" shows the plain-language consent text, creates the
  anonymous session and saves `personalised` to the profile row, which the backend enforces.
  Turning it off deletes the anonymous user through `DELETE /account`. Profile carries an On/Off
  switch, and Reset data also turns Ember off. The web's Guide level is not offered on the phone.
- **Ember masks on the device and sends only what is needed**: `hooks/use-ember.ts` scrubs the
  question and history with the shared `MaskingSession`, picks the snapshot sections the question
  needs (`selectSnapshotSections` in `packages/shared`), and builds and masks only those. A general
  question sends no figures. The answer notes what was used. The request carries
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

`scripts/render-brand-assets.mjs` rasterises DouDou, the FireBuddy mark, into `assets/images/*.png`
(icon, adaptive icon foreground and monochrome layers, splash, favicon). Re-run it when the mark
changes:

```bash
npx --yes --package sharp node scripts/render-brand-assets.mjs
```

## Environment

Copy `.env.example` to `.env.local` when you want Ember to reach a running backend. Every other
screen works without them.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | FastAPI origin. Use HTTPS for any build that leaves development |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL, for the anonymous session |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key, for the anonymous session |

Enable Anonymous sign-ins in the Supabase dashboard under Auth providers. For local Supabase this is
`enable_anonymous_sign_ins = true` in `supabase/config.toml`, already set; restart with
`npx supabase stop` and `npx supabase start` after changing it.

A phone cannot reach `localhost`. In development builds the app swaps `localhost` and `127.0.0.1`
in both URLs for the computer's Wi-Fi address that Metro reports (`lib/dev-url.ts`), so either form
works in `.env.local`. Release builds use the URLs exactly as written. The backend must listen on
the network, not just on the computer itself, so start it from the repo root with:

```powershell
npm run dev:backend:phone
```

If DouDou still says it cannot connect, allow Python and port 8000 (and 54321 for local Supabase)
through Windows Firewall on private networks. Metro's log shows a `[DouDou]` warning naming the step
that failed.

If the phone cannot reach the computer over Wi-Fi at all (a Wi-Fi network marked Public in Windows,
or a router that keeps devices apart), use a USB cable instead. Forward the three ports and open
Expo Go on the forwarded address:

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
adb reverse tcp:54321 tcp:54321
```

Keep `127.0.0.1` in both `.env.local` URLs. Metro then reports `127.0.0.1` too, so the app leaves the
URLs unchanged and every request goes through the cable. Restart Metro with `npx expo start -c`
after changing `.env.local`.

Expo Go already includes `expo-secure-store`, so scanning the QR code from `npm run dev:mobile` is
enough to test DouDou. Restart Metro after changing `.env.local`. The old
`EXPO_PUBLIC_DEV_ACCESS_TOKEN` is retired.

## Next steps

- Records stay on the device, so the backend data routes are not wired on mobile.
- Stream Ember answers over the SSE route.
- Category autodetect on the Add transaction sheet, available only while Ember is on.
- Life Goals and period-based Spending Plan limits follow the web roadmap.

Project references: [`../../PROJECT_BRIEF.md`](../../PROJECT_BRIEF.md), [`../../AGENTS.md`](../../AGENTS.md), [`../../DESIGN.md`](../../DESIGN.md).
