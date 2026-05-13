# Supabase SQL Setup

Use these files when setting up FireBuddy in Supabase.

## Files

- `migrations/001_init.sql`
  Creates the tables, constraints, indexes, functions, triggers, and RLS policies.
- `migrations/002_cleanup_live_state.sql`
  Removes older overlapping triggers and legacy RLS policies if they already exist in a live database.
- `seed.sql`
  Inserts the default system categories.

## Recommended Order In Supabase SQL Editor

1. Run `migrations/001_init.sql`
2. If this project already had earlier manual policies or triggers, run `migrations/002_cleanup_live_state.sql`
3. Confirm the tables exist:
   - `profiles`
   - `categories`
   - `expenses`
4. Confirm RLS is enabled on those tables
5. Run `seed.sql`
6. Check that the default category rows were inserted with:
   - `is_default = true`
   - `user_id = NULL`

## Important Notes

- `profiles` depends on `auth.users`, so it is tied to Supabase Auth.
- `handle_new_user()` creates a profile automatically after signup.
- `validate_expense_category_ownership()` protects against linking an expense to another user's category.
- `seed.sql` is safe to re-run because it uses `on conflict do nothing`.
