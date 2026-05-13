-- FireBuddy default categories seed
-- Run this after the initial schema migration.

insert into public.categories (name, is_default, user_id)
values
  ('Food & Drink', true, null),
  ('Transport', true, null),
  ('Shopping', true, null),
  ('Bills & Utilities', true, null),
  ('Healthcare', true, null),
  ('Entertainment', true, null),
  ('Travel', true, null),
  ('Others', true, null)
on conflict do nothing;
