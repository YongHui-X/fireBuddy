# Privacy and data handling

How FireBuddy handles personal data, what the code enforces, and the operational
steps the code cannot enforce. Written against Singapore's Personal Data
Protection Act (PDPA). The user-facing version is `/privacy` in the web app
(`apps/web/src/routes/LegalPage.tsx`).

## Data inventory

| Data | Where it lives | Who can read it |
|---|---|---|
| Sign-in identity (email; name and email with Google sign-in) | Supabase Auth, `profiles` | Backend service role only |
| Records the user enters: accounts, categories, transactions, tags, wealth positions, snapshots, contributions, essential categories, FIRE plan | Supabase tables, all keyed by `user_id` with RLS | Backend service role only; the browser never queries tables directly |
| AI consent level and timestamp | `profiles.ai_preference`, `profiles.ai_consented_at` | Backend only, via `GET /profile` |
| Ember conversation history | The user's browser (localStorage) or phone (AsyncStorage) | The user |
| Server logs | Railway | Request path, user id and a hash of the question. Never the question text or figures |

No analytics, no crash reporting, no trackers, no cookies beyond Supabase auth.

## AI data flow

Every call to OpenAI sets `store=False` and receives only scrubbed or masked
text. The rule is enforced in code and in `AGENTS.md`.

1. `services/ai_preference.py` reads the user's level. `off` is the default and
   the fail-closed value: a lookup error means no AI call.
2. `services/ember_masking.py` builds one `MaskingSession` per request from the
   user's own account, position and custom category names.
3. The question and the recent history (both roles) are scrubbed: currency
   amounts become `{{Q1}}`, the user's names become `{{P1}}` or `{{C1}}`. Years,
   dates, percentages and default category names stay, because the planner
   needs them for routing.
4. At `personalised`, the aggregate snapshot (`ember_personal_context.py`) and
   data-tool results (`ember_data_tools.py`) are masked: every money, rate and
   month figure becomes a token plus a coarse band, e.g. `{{M1}} (range: 25k-50k)`.
   Free-text fields are masked for amounts, percentages and names. The
   recommended action `title` is excluded because two rules embed a position
   name in it.
5. The model is instructed to copy tokens verbatim and never compute with them.
   Pre-computed targets (3x and 6x essential spending) are supplied so it does
   not need to.
6. The backend restores the real values in the answer, including across
   streamed deltas (`StreamingUnmasker`), before anything reaches the client.

What still reaches the provider, and is disclosed in the notice: the question
with amounts and names removed, coarse bands, years and month keys, record
counts, status codes, default category names (Food & Drink, Transport, ...),
and at `personalised` the custom category names the user created (needed for
the autodetect feature and for the planner to route category questions).

Known scrubber limits: spelled-out amounts ("four thousand"), amounts without a
currency sign under 1,000, account or position names shorter than four
characters or on the stoplist (Cash, Savings, CPF, ...), and names that are
ordinary English words. These are residual risks, not guarantees.

## Phone: records stay on the device

The mobile app keeps every record in on-device storage and never writes it to
Supabase. Two consequences the code handles:

- **Ember** computes the aggregate snapshot on the phone with the shared
  `buildPersonalSnapshot`, masks it with the shared `MaskingSession` (the
  TypeScript twin of the backend module), and sends the request with
  `clientMasked: true` and `clientSnapshot`. The backend forwards the tokens
  to the model as they are, skips its own scrubbing and restoring, converts any
  data-tool plan into a knowledge answer over the snapshot, and the phone puts
  the real figures back. The backend never holds the phone's figures, masked or
  otherwise, beyond the request.
- **Backup** is a passphrase-encrypted file (`packages/shared/src/backup.ts`:
  scrypt N=2^14, XChaCha20-Poly1305) handed to the share sheet. FireBuddy does
  not upload it. There is no passphrase recovery by design.

## Consent

- Default `off` for every new account (migration `20261003090000`).
- First use of Ember shows the consent panel with the three levels and what
  each sends. Nothing is sent until a level is chosen.
- `ai_consented_at` records the choice. Returning to `off` clears it, which is
  the PDPA withdrawal of consent.
- Category autodetect requires `personalised` because it sends the typed
  description.

## User rights

- Access: `GET /account/export` returns every row the user owns as JSON
  (`Download my data` on Profile).
- Correction: in-app editing.
- Withdrawal: switch the AI level to Off on Profile.
- Deletion: `DELETE /account` removes rows in dependency order, the profile,
  then the Supabase auth user (`Delete account` on Profile, type-to-confirm).
- Phone: "Reset data" on Profile wipes the device store; uninstalling the app
  removes everything, since nothing is held on a server.
- Complaints: the notice names the Personal Data Protection Commission.

## Operational checklist (not enforced by code)

- [ ] Create the `firebuddyapp@gmail.com` inbox and forward it; it is the
      published support and data protection contact.
- [ ] Request zero data retention on the OpenAI API organisation, or move the
      client to Azure OpenAI in the Southeast Asia region. Until one is in
      place, the notice says "under terms that prohibit training", not "not
      retained".
- [ ] Confirm the Supabase project region is Singapore (PRD 11.1).
- [ ] Keep `EMBER_MASKING_MODE` unset in production. `off` exists only for
      evaluation runs and logs a warning at startup.
- [ ] Breach process: contain, assess within 30 days, notify the PDPC within 3
      calendar days of assessing that the breach is notifiable, and notify
      affected users where there is significant harm.
- [ ] Review the notice with counsel and remove the "Draft for review" label.
- [ ] Access request runbook: the user uses Download my data; if they cannot
      sign in, verify identity by email and run the export with the service
      role against their user id.
- [ ] Deletion runbook: the user uses Delete account; if the auth deletion
      step fails (503), retry, then check Supabase Auth for a leftover user.

## Sub-processors

Supabase (database and auth), Railway (backend), Vercel (web hosting), OpenAI
(AI answers over masked text). All may process data outside Singapore.
