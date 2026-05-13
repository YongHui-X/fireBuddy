# FireBuddy Seed CSVs

These CSVs are meant to help with manual Supabase imports.

## Files

### `categories_defaults.csv`
Use this to seed the system default categories into the `categories` table.

Expected import behavior:
- `name` maps to the category name
- `is_default` is `true`
- `user_id` is blank, which should import as `NULL`
- `id` is omitted so the table can generate it automatically
- `created_at` is omitted so the table default can populate it

### `categories_user_template.csv`
This is a header-only template for future user-owned categories.

Important:
- Do not import this as-is
- `user_id` must be a real UUID from `profiles.id`
- `is_default` should stay `false` for user-created categories

### `expenses_template.csv`
This is a header-only template for future expense imports.

Important:
- Do not import this as-is
- `user_id` must be a real UUID from `profiles.id`
- `category_id` must be either:
  - a valid default category UUID, or
  - a valid user-owned category UUID for the same user
- `amount` should be positive only
- `date` should use `YYYY-MM-DD`

## What You Still Need To Do In Supabase

CSV import only handles row data. You still need to create:
- the tables
- UUID defaults
- foreign keys
- check constraints
- unique constraints
- triggers
- RLS policies

## Recommended Order
1. Create the schema first
2. Enable constraints and RLS
3. Import `categories_defaults.csv`
4. Verify the imported rows have:
   - `is_default = true`
   - `user_id = NULL`
5. Only then start creating users and expenses through the app
