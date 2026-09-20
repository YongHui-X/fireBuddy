begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(19);

select has_function('public', 'replace_essential_categories', array['uuid', 'uuid[]'], 'atomic category replacement exists');
select has_function('public', 'get_latest_wealth_snapshots', array['uuid', 'uuid[]'], 'latest snapshot function exists');
select ok(not has_function_privilege('anon', 'public.replace_essential_categories(uuid,uuid[])', 'execute'), 'anonymous callers cannot replace selections');
select ok(not has_function_privilege('authenticated', 'public.replace_essential_categories(uuid,uuid[])', 'execute'), 'browser callers cannot supply another owner');
select ok(not has_function_privilege('anon', 'public.get_latest_wealth_snapshots(uuid,uuid[])', 'execute'), 'anonymous callers cannot read snapshots');
select ok(not has_function_privilege('authenticated', 'public.get_latest_wealth_snapshots(uuid,uuid[])', 'execute'), 'browser callers cannot read snapshots directly');

insert into auth.users (id, email) values
  ('94000000-0000-4000-8000-000000000001', 'financial-one@example.test'),
  ('94000000-0000-4000-8000-000000000002', 'financial-two@example.test');
insert into public.categories (id, user_id, name, is_default, category_type) values
  ('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'Essential test', false, 'expense'),
  ('95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000002', 'Private test', false, 'expense'),
  ('95000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000001', 'Income test', false, 'income');
insert into public.essential_expense_categories (user_id, category_id) values
  ('94000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002');

set local role service_role;
select lives_ok($$select public.replace_essential_categories('94000000-0000-4000-8000-000000000001', array['95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001']::uuid[])$$, 'backend role can save and deduplicate selections');
reset role;
select is((select count(*)::integer from public.essential_expense_categories where user_id = '94000000-0000-4000-8000-000000000001'), 1, 'duplicates produce one selection');
select throws_ok($$select public.replace_essential_categories('94000000-0000-4000-8000-000000000001', array['95000000-0000-4000-8000-000000000002']::uuid[])$$, '22023', 'Essential categories must be visible expense categories', 'foreign selections are rejected');
select throws_ok($$select public.replace_essential_categories('94000000-0000-4000-8000-000000000001', array['95000000-0000-4000-8000-000000000003']::uuid[])$$, '22023', 'Essential categories must be visible expense categories', 'income selections are rejected');

-- Force failure after the DELETE to verify real transaction rollback, not a mock.
create function pg_temp.reject_essential_insert() returns trigger language plpgsql as $$
begin
  raise exception 'Simulated insert failure';
end;
$$;
create trigger test_reject_essential_insert before insert on public.essential_expense_categories
  for each row execute function pg_temp.reject_essential_insert();
select throws_ok($$select public.replace_essential_categories('94000000-0000-4000-8000-000000000001', array['95000000-0000-4000-8000-000000000001']::uuid[])$$, 'P0001', 'Simulated insert failure', 'insert failures propagate after deletion');
select is((select category_id::text from public.essential_expense_categories where user_id = '94000000-0000-4000-8000-000000000001'), '95000000-0000-4000-8000-000000000001', 'failed replacement restores the original selection');
drop trigger test_reject_essential_insert on public.essential_expense_categories;
select lives_ok($$select public.replace_essential_categories('94000000-0000-4000-8000-000000000001', '{}'::uuid[])$$, 'empty selections clear successfully');
select is((select count(*)::integer from public.essential_expense_categories where user_id = '94000000-0000-4000-8000-000000000001'), 0, 'cleared owner has no selections');
select is((select count(*)::integer from public.essential_expense_categories where user_id = '94000000-0000-4000-8000-000000000002'), 1, 'other owner selections are unchanged');

insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class) values
  ('96000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'Owned test', 'asset', 'cash', 'liquid'),
  ('96000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000002', 'Foreign test', 'asset', 'cash', 'liquid');
insert into public.wealth_position_snapshots (user_id, wealth_position_id, value_date, amount) values
  ('94000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', '2026-01-01', 100),
  ('94000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', '2026-02-01', 200),
  ('94000000-0000-4000-8000-000000000002', '96000000-0000-4000-8000-000000000002', '2026-02-01', 999);
set local role service_role;
select results_eq(
  $$select amount from public.get_latest_wealth_snapshots('94000000-0000-4000-8000-000000000001', array['96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000002']::uuid[])$$,
  $$values (200::numeric)$$, 'backend sees only the latest owned value');
select is((select count(*)::integer from public.get_latest_wealth_snapshots('94000000-0000-4000-8000-000000000002', array['96000000-0000-4000-8000-000000000001']::uuid[])), 0, 'foreign requested position returns no rows');
select is((select count(*)::integer from public.get_latest_wealth_snapshots('94000000-0000-4000-8000-000000000001', '{}'::uuid[])), 0, 'empty request returns no history');
reset role;
select ok(not (select prosecdef from pg_proc where oid = 'public.get_latest_wealth_snapshots(uuid,uuid[])'::regprocedure), 'snapshot function does not elevate privileges');
select * from finish();
rollback;
