-- Align the legacy live schema with the UUID-first repository contract.
-- The conversion retains integer identifiers in nullable legacy_id columns for
-- one stable release so rollback tooling can map records if needed.

lock table public.categories, public.expenses in access exclusive mode;

alter table public.categories add column if not exists legacy_id integer;
alter table public.expenses add column if not exists legacy_id integer;

drop trigger if exists validate_expense_category_ownership_trigger on public.expenses;

do $$
declare
  categories_id_type text;
  expenses_id_type text;
  expenses_category_id_type text;
begin
  select a.atttypid::regtype::text
  into categories_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.categories'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  select a.atttypid::regtype::text
  into expenses_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.expenses'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  select a.atttypid::regtype::text
  into expenses_category_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.expenses'::regclass
    and a.attname = 'category_id'
    and not a.attisdropped;

  if categories_id_type = 'integer'
    and expenses_id_type = 'integer'
    and expenses_category_id_type = 'integer' then
    if exists (
      select 1
      from public.expenses e
      left join public.categories c on c.id = e.category_id
      where e.category_id is not null and c.id is null
    ) then
      raise exception 'Cannot convert category IDs while orphaned expenses exist';
    end if;

    update public.categories set legacy_id = id where legacy_id is null;
    update public.expenses set legacy_id = id where legacy_id is null;

    alter table public.categories add column _uuid_id uuid;
    alter table public.expenses
      add column _uuid_id uuid,
      add column _uuid_category_id uuid;

    update public.categories set _uuid_id = gen_random_uuid();
    update public.expenses set _uuid_id = gen_random_uuid();
    update public.expenses e
    set _uuid_category_id = c._uuid_id
    from public.categories c
    where e.category_id = c.legacy_id;

    alter table public.expenses drop constraint if exists expenses_category_id_fkey;
    alter table public.expenses drop constraint if exists expenses_pkey;
    alter table public.categories drop constraint if exists categories_pkey;

    alter table public.expenses
      drop column id,
      drop column category_id;
    alter table public.categories drop column id;

    alter table public.categories rename column _uuid_id to id;
    alter table public.expenses rename column _uuid_id to id;
    alter table public.expenses rename column _uuid_category_id to category_id;

    alter table public.categories
      alter column id set not null,
      alter column id set default gen_random_uuid(),
      add constraint categories_pkey primary key (id);

    alter table public.expenses
      alter column id set not null,
      alter column id set default gen_random_uuid(),
      add constraint expenses_pkey primary key (id),
      add constraint expenses_category_id_fkey
        foreign key (category_id) references public.categories(id) on delete set null;

    drop sequence if exists public.categories_id_seq;
    drop sequence if exists public.expenses_id_seq;
  elsif categories_id_type = 'uuid'
    and expenses_id_type = 'uuid'
    and expenses_category_id_type = 'uuid' then
    alter table public.categories alter column id set default gen_random_uuid();
    alter table public.expenses alter column id set default gen_random_uuid();
  else
    raise exception 'Unsupported mixed identifier state: categories.id=%, expenses.id=%, expenses.category_id=%',
      categories_id_type, expenses_id_type, expenses_category_id_type;
  end if;
end $$;

create unique index if not exists categories_legacy_id_unique_idx
  on public.categories (legacy_id)
  where legacy_id is not null;

create unique index if not exists expenses_legacy_id_unique_idx
  on public.expenses (legacy_id)
  where legacy_id is not null;

alter table public.expenses
  alter column amount type numeric(10,2) using amount::numeric(10,2);

alter table public.categories drop constraint if exists categories_valid_ownership_state;
alter table public.categories
  add constraint categories_valid_ownership_state check (
    (is_default = true and user_id is null)
    or
    (is_default = false and user_id is not null)
  );

alter table public.expenses drop constraint if exists expenses_amount_positive;
alter table public.expenses
  add constraint expenses_amount_positive check (amount > 0);

create index if not exists expenses_category_id_idx
  on public.expenses (category_id);

create index if not exists expenses_user_category_idx
  on public.expenses (user_id, category_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create or replace function public.validate_expense_category_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.categories c
    where c.id = new.category_id
      and (
        (c.is_default = true and c.user_id is null)
        or
        (c.user_id = new.user_id and c.is_default = false)
      )
  ) then
    return new;
  end if;

  raise exception 'category_id must reference a default category or a category owned by the same user';
end;
$$;

create or replace function public.match_rag_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 5
)
returns table (
  id uuid,
  source_path text,
  source_type text,
  source_title text,
  source_url text,
  agency text,
  topic text,
  chunk_index integer,
  headline text,
  content text,
  similarity double precision
)
language sql
stable
set search_path = ''
as $$
  select
    rag_chunks.id,
    rag_chunks.source_path,
    rag_chunks.source_type,
    rag_chunks.source_title,
    rag_chunks.source_url,
    rag_chunks.agency,
    rag_chunks.topic,
    rag_chunks.chunk_index,
    rag_chunks.headline,
    rag_chunks.content,
    1 - (rag_chunks.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.rag_chunks
  order by rag_chunks.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

create trigger validate_expense_category_ownership_trigger
  before insert or update on public.expenses
  for each row execute procedure public.validate_expense_category_ownership();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.rag_chunks enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists categories_select_defaults_or_own on public.categories;
create policy categories_select_defaults_or_own
  on public.categories for select
  to authenticated
  using (is_default = true or (select auth.uid()) = user_id);

drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id and is_default = false);

drop policy if exists categories_update_own on public.categories;
create policy categories_update_own
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id and is_default = false)
  with check ((select auth.uid()) = user_id and is_default = false);

drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_default = false);

drop policy if exists expenses_select_own on public.expenses;
create policy expenses_select_own
  on public.expenses for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists expenses_insert_own on public.expenses;
create policy expenses_insert_own
  on public.expenses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists expenses_update_own on public.expenses;
create policy expenses_update_own
  on public.expenses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists expenses_delete_own on public.expenses;
create policy expenses_delete_own
  on public.expenses for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists rag_chunks_service_role_backend_only on public.rag_chunks;
create policy rag_chunks_service_role_backend_only
  on public.rag_chunks for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.profiles, public.categories, public.expenses, public.rag_chunks
  from public, anon, authenticated, service_role;
grant select, insert, update, delete
  on table public.profiles, public.categories, public.expenses, public.rag_chunks
  to service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke execute on function public.update_updated_at() from public, anon, authenticated, service_role;
revoke execute on function public.validate_expense_category_ownership() from public, anon, authenticated, service_role;
revoke execute on function public.match_rag_chunks(extensions.vector, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.match_rag_chunks(extensions.vector, integer) to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

comment on column public.categories.legacy_id is
  'Temporary pre-UUID identifier retained for one stable release; new rows leave it null.';
comment on column public.expenses.legacy_id is
  'Temporary pre-UUID identifier retained for one stable release; new rows leave it null.';
