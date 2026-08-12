# Supabase SQL Setup

Use these files when setting up FireBuddy in Supabase.

## Files

- `migrations/001_init.sql`
  Creates the tables, constraints, indexes, functions, triggers, and RLS policies.
- `migrations/002_cleanup_live_state.sql`
  Removes older overlapping triggers and legacy RLS policies if they already exist in a live database.
- `migrations/20260719044512_add_category_visuals.sql`
  Adds persisted category icons, colors, and monthly budgets, then backfills known categories.
- `migrations/003_rag_pgvector.sql`
  Creates the shared `rag_chunks` vector store and retrieval RPC.
- `migrations/20260812042442_secure_rag_access.sql`
  Enables RLS and restricts the RAG table and RPC to backend service-role clients.
- `seed.sql`
  Inserts the default system categories.

## Recommended Order In Supabase SQL Editor

1. Run `migrations/001_init.sql`
2. If this project already had earlier manual policies or triggers, run `migrations/002_cleanup_live_state.sql`
3. Run `migrations/20260719044512_add_category_visuals.sql`
4. Run `migrations/003_rag_pgvector.sql`
5. Run `migrations/20260812042442_secure_rag_access.sql`
6. Confirm the tables exist:
   - `profiles`
   - `categories`
   - `expenses`
7. Confirm RLS is enabled on those tables, including `rag_chunks`
8. Confirm only `service_role` can access `rag_chunks` and execute `match_rag_chunks`
9. Run `seed.sql`
10. Check that the default category rows were inserted with:
   - `is_default = true`
   - `user_id = NULL`

## Important Notes

- `profiles` depends on `auth.users`, so it is tied to Supabase Auth.
- `handle_new_user()` creates a profile automatically after signup.
- `validate_expense_category_ownership()` protects against linking an expense to another user's category.
- `seed.sql` is safe to re-run because it uses `on conflict do nothing`.
- The backend must use `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for RAG ingestion and retrieval. Never expose that key to either frontend.
