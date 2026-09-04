begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(15);

select has_table('public', 'wealth_positions', 'wealth positions table exists');
select has_table('public', 'wealth_position_snapshots', 'dated snapshots table exists');
select has_table('public', 'wealth_contributions', 'dedicated contributions table exists');
select has_table('public', 'fire_profiles', 'FIRE profiles table exists');
select has_table('public', 'essential_expense_categories', 'essential category selections exist');

select ok((select relrowsecurity from pg_class where oid = 'public.wealth_positions'::regclass), 'wealth positions use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.wealth_position_snapshots'::regclass), 'snapshots use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.wealth_contributions'::regclass), 'contributions use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.fire_profiles'::regclass), 'profiles use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.essential_expense_categories'::regclass), 'essential selections use RLS');

select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'wealth_positions'), 4, 'wealth positions have separate CRUD policies');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'wealth_position_snapshots'), 4, 'snapshots have separate CRUD policies');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'wealth_contributions'), 4, 'contributions have separate CRUD policies');
select ok(not has_table_privilege('authenticated', 'public.wealth_positions', 'select'), 'browser role cannot query financial tables directly');
select ok(has_table_privilege('service_role', 'public.wealth_positions', 'select'), 'backend service role can query financial tables');

select * from finish();
rollback;
