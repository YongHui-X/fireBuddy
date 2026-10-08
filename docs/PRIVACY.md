# Privacy and data handling

How FireBuddy handles personal data, what the code enforces, and the operational
steps the code cannot enforce. Written against Singapore's Personal Data
Protection Act (PDPA). The user-facing versions are `/privacy` in the web app
(`apps/web/src/routes/LegalPage.tsx`) and, for the phone, the Privacy policy and
Terms of use in `packages/shared/src/legal.ts`, shown by `apps/mobile/app/legal.tsx`.

Phone legal flow (8 Oct 2026): the welcome's first step has two stacked tick
boxes, "I agree to the Terms of use" and "I've read the Privacy policy", each
linking to its document (which ends with a Back button). Continue and Skip stay
off until both are ticked; finishing the
welcome stores `legalAcceptedVersion` and `legalAcceptedAt` on the device. A
phone that accepted an older `LEGAL_VERSION`, or none, sees a one-time
"We've updated our terms" sheet with Continue. Bump `LEGAL_VERSION` and
`LEGAL_LAST_UPDATED` on every material change. Both documents are linked from
Profile → About. The tester email template is `docs/TESTER_INVITE.md`.

## Data inventory

| Data | Where it lives | Who can read it |
|---|---|---|
| Sign-in identity (email; name and email with Google sign-in) | Supabase Auth, `profiles` | Backend service role only |
| Phone with Ember on: anonymous identity (random id, no email or name) | Supabase Auth, `profiles` | Backend service role only; deleted when the user turns Ember off |
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
Supabase. There is no sign-in screen and no mobile data route.

### Ember is Off or On

| | Off (default) | On |
|---|---|---|
| Account | None | Invisible anonymous Supabase session, created when the user taps "Turn on DouDou" |
| Network | None. The app makes no calls | Ember requests only |
| Leaves the phone | Nothing | The scrubbed question and recent history, plus masked figures only for the parts of the summary the question needs |
| Server keeps | Nothing | A random id, the level `personalised`, and the consent time |

A user who never turns Ember on never gets an anonymous session, so there is nothing to delete. The phone never offers the web's Guide level. A stored `guide` value from an
earlier build is read as `off`, so the user consents again with the current
text. If a user who turned Ember on later turns it off, the phone stops AI
at once, then deletes the anonymous user through `DELETE /account` and clears the session from the
device. If the deletion fails, the phone retries on the next launch.

The signup trigger also gives the anonymous user the generic default "Cash"
payment account row that every new profile gets. It holds no user data and is
deleted with the anonymous user.

The anonymous session exists only so the backend can rate-limit each phone and
check consent. Without it the AI endpoint would be open to anyone. It is a
Supabase-signed JWT verified by FastAPI, stored in the iOS Keychain or Android
Keystore (`expo-secure-store`), refreshed hourly, and sent over HTTPS in
production. A stolen token allows questions on that phone's quota until it
expires; there are no records or chats on the server to read. Anyone can mint
anonymous sessions, so Supabase's per-IP anonymous sign-in limit applies, and a
CAPTCHA on "Turn on DouDou" is the fallback if abuse appears.

### Relevant data only when needed

The phone reads the scrubbed question and picks which snapshot sections it
needs (`packages/shared/src/snapshot-scope.ts`):

| Section | Facts sent, masked |
|---|---|
| Spending | Current month top categories, previous month top categories |
| Cash flow | Monthly income, spending, savings amount and rate |
| Net worth | Net worth, liabilities, investable assets, monthly debt service |
| Emergency fund | Runway in months, essential spending, 3x and 6x targets |
| FIRE | Funding status, FI target, progress, required monthly investment, estimated FI year |

A general question ("How does CPF LIFE work?") sends no snapshot. A personal
question sends only the matching sections, plus the effective date and whether
the snapshot is current. If the phone cannot tell, it sends no figures and
Ember answers generally. The answer shows a short note of what was used, for
example "Used: spending totals".
A personal question about records the phone does not have (for example
spending on an empty ledger) sends nothing: DouDou replies on the phone that
there are no recorded transactions yet.

DouDou never gives personal financial advice (8 Oct 2026). A clear request
for an investment, product, provider, allocation or retire-now decision ("Should
I buy DBS?", "Which robo-advisor should I use?", "Am I better off paying down my
mortgage or investing?") gets a fixed reply from `services/advice_boundary.py`
before any planner, retrieval or OpenAI call, pointing to a licensed financial
adviser and suggesting an educational rephrase. Phrasings the screen misses are
held by `ADVICE_BOUNDARY_GUIDANCE` in the answer prompt. Regression set:
`apps/backend/rag/evaluation/mobile/doudou_cases_advice.json`.

### How the request is built

- **Ember** computes the aggregate snapshot on the phone with the shared
  `buildPersonalSnapshot`, keeps only the selected sections, masks it with the
  shared `MaskingSession` (the TypeScript twin of the backend module), and
  sends the request with `clientMasked: true` and `clientSnapshot`. The backend
  forwards the tokens to the model as they are, skips its own scrubbing and
  restoring, converts any data-tool plan into a knowledge answer over the
  snapshot, and the phone puts the real figures back. The backend never holds
  the phone's figures, masked or otherwise, beyond the request.
- **Backup** is a passphrase-encrypted file (`packages/shared/src/backup.ts`:
  scrypt N=2^14, XChaCha20-Poly1305) handed to the share sheet. FireBuddy does
  not upload it. There is no passphrase recovery by design.

### Consent text shown on the phone

A popup of five pages, read with Next (Back and Skip also available). Skip
jumps to the last page, so the decision is always made there.

> 1. **Hi, I'm DouDou!** Ask DouDou questions about personal finance in Singapore and get tips that fit your situation.
> 2. **Your privacy, in plain words · Your money stays with you.** Your transactions and balances stay on your phone. We never keep a copy.
> 3. **Only rough ranges.** For personalised tips, DouDou only uses rough ranges, like "$25k–$50k", never your exact figures. (Shows an example: S$38,240 crossed out, becoming $25k–$50k.)
> 4. **How answers are made.** Your questions are sent to an AI service to give you an answer, and are never used to train AI.
> 5. **You're in control · Ready to turn on DouDou?** You can turn DouDou off anytime.
>
> Last page buttons, side by side at equal width: "Decline" and "Agree".
> Small text underneath: "You can always come back later."

The source of truth is `DOUDOU_CONSENT` in `apps/mobile/lib/ai-preference.tsx`;
keep this copy in step with it. The popup is shown the first time the user
opens DouDou, and from Profile. The Android back button and a tap outside the
popup count as Decline.

Why each claim holds:

- **Transactions and balances stay on the phone.** The phone never uploads
  records. The highlighted line names what is protected rather than listing
  what is not collected, which made readers wonder what else was. It avoids
  "your data", because with DouDou on the question, rough ranges and a random
  anonymous id do leave the phone. "We never keep a copy" refers to FireBuddy's
  servers: the backend keeps only the anonymous id, the consent time and a hash
  of each question, never figures.
- **Rough ranges, never exact figures.** The phone sends tokens and coarse
  bands for only the snapshot sections a question needs, and puts the exact
  figures back into the answer itself. General questions send no figures.
- **Sent to an AI service, never used to train AI.** Questions go to OpenAI,
  scrubbed or masked, with `store=False`; API traffic is not used for training.
  The text does not claim the provider never stores requests. That claim waits
  for zero data retention (see the checklist below).
- **Turn DouDou off anytime.** Turning it off stops AI at once and deletes the
  anonymous id, as described above.
- **Display name.** The name a user picks for the greeting stays on the phone
  and is never part of DouDou's snapshot. Keep it out of
  `packages/shared/src/personal-snapshot.ts`.

## Consent

- Default `off` for every new account (migration `20261003090000`).
- Web: first use of Ember shows the consent panel with the three levels and
  what each sends. Nothing is sent until a level is chosen.
- Phone: first use of Ember shows the Off/On consent text above. Nothing is
  sent, and no account exists, until the user taps "Turn on DouDou".
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
- Phone: turning Ember off on Profile withdraws consent and deletes the
  anonymous user. "Reset data" wipes the device store and also turns Ember
  off. Uninstalling removes the records; any leftover anonymous id holds no
  records and is inert.
- Complaints: the notice names the Personal Data Protection Commission.

## Operational checklist (not enforced by code)

- [x] Data Protection Officer: the owner (8 Oct 2026), reached at `firebuddyapp@gmail.com` and named by role in the phone privacy policy.
- [ ] Create the `firebuddyapp@gmail.com` inbox and forward it; it is the
      published support and data protection contact.
- [ ] Request zero data retention on the OpenAI API organisation, or move the
      client to Azure OpenAI in the Southeast Asia region. Until one is in
      place, the notice says "under terms that prohibit training", not "not
      retained".
- [ ] Confirm the Supabase project region is Singapore (PRD 11.1).
- [ ] Enable Anonymous sign-ins in Supabase Auth for the phone, keep the
      per-IP anonymous sign-in rate limit on, and add a CAPTCHA if abuse
      appears.
- [ ] Use an HTTPS API base URL in every phone build that leaves development.
- [ ] Periodically remove anonymous users with no Ember activity for a long
      period, for phones uninstalled while Ember was on.
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
