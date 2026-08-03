-- FireBuddy default categories seed
-- Run this after the initial schema migration.

insert into public.categories (name, is_default, user_id, icon, color, monthly_budget)
values
  ('Food & Drink', true, null, 'food', '#3C8A61', 600),
  ('Transport', true, null, 'transport', '#67B47C', 250),
  ('Shopping', true, null, 'shopping', '#E5B24A', 300),
  ('Bills & Utilities', true, null, 'utilities', '#7BAA90', 150),
  ('Healthcare', true, null, 'health', '#2E9B57', 150),
  ('Entertainment', true, null, 'entertainment', '#8BB89D', 200),
  ('Travel', true, null, 'travel', '#25543D', 400),
  ('Others', true, null, 'others', '#A8D3B7', 200)
on conflict do nothing;
