-- FireBuddy cleanup migration for older overlapping policies and triggers
-- Apply this after 001_init.sql if the database already contains legacy objects.

drop trigger if exists expenses_updated_at on public.expenses;

drop policy if exists "Users see own profile" on public.profiles;
drop policy if exists "Users see default and own categories" on public.categories;
drop policy if exists "Users manage own categories" on public.categories;
drop policy if exists "Users delete own categories" on public.categories;
drop policy if exists "Users manage own expenses" on public.expenses;
