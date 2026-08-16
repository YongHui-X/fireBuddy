# Supabase SQL Setup

Use these files when setting up FireBuddy in Supabase.

## Files

- `migrations/20260424074203_001_init.sql`
  Creates the tables, constraints, indexes, functions, triggers, and RLS policies.
- `migrations/20260424080806_002_cleanup_live_state.sql`
  Removes older overlapping triggers and legacy RLS policies if they already exist in a live database.
- `migrations/20260719044512_add_category_visuals.sql`
  Adds persisted category icons, colors, and monthly budgets, then backfills known categories.
- `migrations/20260702161557_rag_pgvector.sql`
  Creates the shared `rag_chunks` vector store and retrieval RPC.
- `migrations/20260812042442_secure_rag_access.sql`
  Enables RLS and restricts the RAG table and RPC to backend service-role clients.
- `migrations/20260813150220_align_uuid_security_and_grants.sql`
  Converts legacy integer identifiers to UUIDs, retains temporary legacy mappings,
  restores constraints, hardens functions and RLS, and makes Data API access explicit.
- `migrations/20260814032352_persist_accounts_and_expense_accounts.sql`
  Creates persisted accounts, provisions one default Cash account per profile,
  backfills expense account ownership, and requires account IDs on expenses.
- `seed.sql`
  Inserts the default system categories.

## Recommended Order In Supabase SQL Editor

1. Run `migrations/20260424074203_001_init.sql`
2. If this project already had earlier manual policies or triggers, run `migrations/20260424080806_002_cleanup_live_state.sql`
3. Run `migrations/20260719044512_add_category_visuals.sql`
4. Run `migrations/20260702161557_rag_pgvector.sql`
5. Run `migrations/20260812042442_secure_rag_access.sql`
6. Run `migrations/20260813150220_align_uuid_security_and_grants.sql`
7. Run `migrations/20260814032352_persist_accounts_and_expense_accounts.sql`
8. Confirm the tables exist:
   - `profiles`
   - `categories`
   - `accounts`
   - `expenses`
9. Confirm RLS is enabled on those tables, including `rag_chunks`
10. Confirm only `service_role` can access application tables and execute `match_rag_chunks`
11. Run `seed.sql`
12. Check that the default category rows were inserted with:
   - `is_default = true`
   - `user_id = NULL`

## Important Notes

- `profiles` depends on `auth.users`, so it is tied to Supabase Auth.
- `handle_new_user()` creates a profile automatically after signup.
- `handle_new_user()` also creates one default Cash account for every new profile.
- `validate_expense_category_ownership()` protects against linking an expense to another user's category.
- `validate_expense_account_ownership()` protects against linking an expense to another user's account.
- `expenses.account_id` is nonnull after existing expenses are backfilled to their owner's default Cash account. Referenced accounts use restricted deletion.
- `seed.sql` is safe to re-run because it uses `on conflict do nothing`.
- `categories.legacy_id` and `expenses.legacy_id` are rollback mappings for one
  stable release. New rows leave them null. Remove them in a later verified migration.
- The backend must use `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for RAG ingestion and retrieval. Never expose that key to either frontend.

## Local CLI verification

The migration was created with the pinned repository CLI. Discover flags from the installed version before using them:

```powershell
npx supabase --version
npx supabase db reset --help
npx supabase migration list --help
```

With Docker running, rebuild the local database from the complete history:

```powershell
npx supabase db reset
npx supabase migration list --local
```

Then verify that existing and newly created local users have exactly one default Cash account, expenses have nonnull owned `account_id` values, cross-user reads are rejected, and default or referenced accounts cannot be deleted. Do not run `db reset --linked` against the production project because it is destructive.
