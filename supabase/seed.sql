-- FireBuddy default categories seed
-- Run this after the initial schema migration.

insert into public.categories (name, is_default, user_id, icon, color, monthly_budget, category_type)
values
  ('Food & Drink', true, null, 'food', '#3C8A61', 600, 'expense'),
  ('Transport', true, null, 'transport', '#67B47C', 250, 'expense'),
  ('Shopping', true, null, 'shopping', '#E5B24A', 300, 'expense'),
  ('Bills & Utilities', true, null, 'utilities', '#7BAA90', 150, 'expense'),
  ('Healthcare', true, null, 'health', '#2E9B57', 150, 'expense'),
  ('Entertainment', true, null, 'entertainment', '#8BB89D', 200, 'expense'),
  ('Travel', true, null, 'travel', '#25543D', 400, 'expense'),
  ('Others', true, null, 'shapes', '#A8D3B7', 200, 'expense'),
  ('Salary', true, null, 'salary', '#3C8A61', 0, 'income'),
  ('Bonus', true, null, 'bonus', '#E5B24A', 0, 'income'),
  ('Dividends', true, null, 'dividends', '#67B47C', 0, 'income'),
  ('Interest', true, null, 'interest', '#7BAA90', 0, 'income'),
  ('Other income', true, null, 'income', '#A8D3B7', 0, 'income')
on conflict do nothing;
