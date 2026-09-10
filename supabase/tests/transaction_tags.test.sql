begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(22);

select has_table('public', 'tags', 'tags table exists');
select has_table('public', 'transaction_tags', 'transaction tag join table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.tags'::regclass), 'tags use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.transaction_tags'::regclass), 'transaction tags use RLS');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tags'), 4, 'tags have CRUD ownership policies');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'transaction_tags'), 3, 'transaction tags have scoped assignment policies');
select ok(not has_table_privilege('authenticated', 'public.tags', 'select'), 'browser role cannot query tags directly');
select ok(not has_table_privilege('authenticated', 'public.transaction_tags', 'select'), 'browser role cannot query tag assignments directly');
select ok(has_table_privilege('service_role', 'public.tags', 'select'), 'backend role can list tags');
select ok(has_table_privilege('service_role', 'public.transaction_tags', 'insert'), 'backend role can attach tags');
select has_index('public', 'tags', 'tags_user_name_unique_idx', 'case-insensitive user tag index exists');
select has_trigger('public', 'transaction_tags', 'enforce_transaction_tag_limit_trigger', 'ten-tag limit trigger exists');
select has_function('public', 'create_transaction_with_tags', array['uuid', 'uuid', 'uuid', 'text', 'numeric', 'date', 'text', 'uuid[]'], 'atomic create function exists');
select has_function('public', 'update_transaction_with_tags', array['uuid', 'uuid', 'uuid', 'uuid', 'text', 'numeric', 'date', 'text', 'uuid[]'], 'atomic update function exists');
select ok(not has_function_privilege('authenticated', 'public.create_transaction_with_tags(uuid,uuid,uuid,text,numeric,date,text,uuid[])', 'execute'), 'authenticated role cannot call atomic create directly');
select ok(has_function_privilege('service_role', 'public.create_transaction_with_tags(uuid,uuid,uuid,text,numeric,date,text,uuid[])', 'execute'), 'backend role can call atomic create');

insert into auth.users (id, email)
values
  ('91000000-0000-4000-8000-000000000001', 'tags-one@example.test'),
  ('91000000-0000-4000-8000-000000000002', 'tags-two@example.test');

insert into public.tags (id, user_id, name)
values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Tax'),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'Private');

select throws_ok(
  $$insert into public.tags (user_id, name) values ('91000000-0000-4000-8000-000000000001', 'tax')$$,
  '23505',
  'duplicate key value violates unique constraint "tags_user_name_unique_idx"',
  'case-insensitive tag names are unique per user'
);
select throws_ok(
  $$insert into public.tags (user_id, name) values ('91000000-0000-4000-8000-000000000001', ' not-trimmed ')$$,
  '23514',
  'new row for relation "tags" violates check constraint "tags_name_trimmed_check"',
  'tag names must already be trimmed'
);

insert into public.expenses (id, user_id, category_id, account_id, description, amount, date, transaction_type)
select
  '93000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  (select id from public.categories where is_default and category_type = 'expense' order by name limit 1),
  (select id from public.accounts where user_id = '91000000-0000-4000-8000-000000000001' limit 1),
  'Tax record', 10, current_date, 'expense';

select throws_ok(
  $$insert into public.transaction_tags (user_id, transaction_id, tag_id) values ('91000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002')$$,
  '23503',
  'insert or update on table "transaction_tags" violates foreign key constraint "transaction_tags_tag_owner_fkey"',
  'cross-user tag assignment is rejected by ownership constraints'
);

insert into public.transaction_tags (user_id, transaction_id, tag_id)
values ('91000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001');
delete from public.tags where id = '92000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.expenses where id = '93000000-0000-4000-8000-000000000001'), 1, 'deleting a tag keeps its transaction');
select is((select count(*)::integer from public.transaction_tags where transaction_id = '93000000-0000-4000-8000-000000000001'), 0, 'deleting a tag detaches its assignment');

insert into public.tags (user_id, name)
select '91000000-0000-4000-8000-000000000001', 'Limit ' || sequence
from generate_series(1, 11) sequence;
insert into public.transaction_tags (user_id, transaction_id, tag_id)
select '91000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', id
from public.tags
where user_id = '91000000-0000-4000-8000-000000000001'
order by id
limit 10;
select throws_ok(
  $$insert into public.transaction_tags (user_id, transaction_id, tag_id)
    select '91000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', id
    from public.tags
    where user_id = '91000000-0000-4000-8000-000000000001'
      and id not in (select tag_id from public.transaction_tags where transaction_id = '93000000-0000-4000-8000-000000000001')
    limit 1$$,
  'P0001',
  'A transaction can have at most 10 tags',
  'database rejects an eleventh transaction tag'
);

select * from finish();
rollback;
