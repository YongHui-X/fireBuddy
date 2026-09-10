-- Add reusable user-owned tags and atomic transaction/tag persistence.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_trimmed_check check (name = btrim(name)),
  constraint tags_name_length_check check (length(name) between 1 and 40),
  constraint tags_name_separator_check check (position('|' in name) = 0),
  constraint tags_id_user_unique unique (id, user_id)
);

create unique index tags_user_name_unique_idx
  on public.tags (user_id, lower(name));

create index tags_user_created_at_idx
  on public.tags (user_id, created_at);

alter table public.expenses
  add constraint expenses_id_user_unique unique (id, user_id);

create table public.transaction_tags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id),
  constraint transaction_tags_transaction_owner_fkey
    foreign key (transaction_id, user_id)
    references public.expenses(id, user_id)
    on delete cascade,
  constraint transaction_tags_tag_owner_fkey
    foreign key (tag_id, user_id)
    references public.tags(id, user_id)
    on delete cascade
);

create index transaction_tags_user_tag_idx
  on public.transaction_tags (user_id, tag_id, transaction_id);

create index transaction_tags_user_transaction_idx
  on public.transaction_tags (user_id, transaction_id);

create or replace function public.enforce_transaction_tag_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.transaction_id::text, 0));
  if (
    select count(*)
    from public.transaction_tags existing_tag
    where existing_tag.transaction_id = new.transaction_id
  ) >= 10 then
    raise exception 'A transaction can have at most 10 tags';
  end if;
  return new;
end;
$$;

create trigger enforce_transaction_tag_limit_trigger
  before insert on public.transaction_tags
  for each row execute procedure public.enforce_transaction_tag_limit();

create trigger set_tags_updated_at
  before update on public.tags
  for each row execute procedure public.update_updated_at();

create or replace function public.create_transaction_with_tags(
  p_user_id uuid,
  p_category_id uuid,
  p_account_id uuid,
  p_description text,
  p_amount numeric,
  p_date date,
  p_transaction_type text,
  p_tag_ids uuid[] default '{}'::uuid[]
)
returns setof public.expenses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_transaction public.expenses;
begin
  if cardinality(p_tag_ids) > 10 or cardinality(p_tag_ids) <> cardinality(array(select distinct requested_tag_id from unnest(p_tag_ids) as requested_tag(requested_tag_id))) then
    raise exception 'tagIds must contain at most 10 unique tags';
  end if;
  if exists (
    select 1 from unnest(p_tag_ids) as requested_tag(requested_tag_id)
    where not exists (
      select 1 from public.tags owned_tag
      where owned_tag.id = requested_tag_id and owned_tag.user_id = p_user_id
    )
  ) then
    raise exception 'tagIds must reference tags owned by the same user';
  end if;

  insert into public.expenses (
    user_id, category_id, account_id, description, amount, date, transaction_type
  ) values (
    p_user_id, p_category_id, p_account_id, p_description, p_amount, p_date, p_transaction_type
  ) returning * into created_transaction;

  insert into public.transaction_tags (user_id, transaction_id, tag_id)
  select p_user_id, created_transaction.id, requested_tag_id
  from unnest(p_tag_ids) as requested_tag(requested_tag_id);

  return next created_transaction;
end;
$$;

create or replace function public.update_transaction_with_tags(
  p_user_id uuid,
  p_transaction_id uuid,
  p_category_id uuid,
  p_account_id uuid,
  p_description text,
  p_amount numeric,
  p_date date,
  p_transaction_type text,
  p_tag_ids uuid[] default '{}'::uuid[]
)
returns setof public.expenses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_transaction public.expenses;
begin
  if cardinality(p_tag_ids) > 10 or cardinality(p_tag_ids) <> cardinality(array(select distinct requested_tag_id from unnest(p_tag_ids) as requested_tag(requested_tag_id))) then
    raise exception 'tagIds must contain at most 10 unique tags';
  end if;
  if exists (
    select 1 from unnest(p_tag_ids) as requested_tag(requested_tag_id)
    where not exists (
      select 1 from public.tags owned_tag
      where owned_tag.id = requested_tag_id and owned_tag.user_id = p_user_id
    )
  ) then
    raise exception 'tagIds must reference tags owned by the same user';
  end if;

  update public.expenses
  set category_id = p_category_id,
      account_id = p_account_id,
      description = p_description,
      amount = p_amount,
      date = p_date,
      transaction_type = p_transaction_type
  where id = p_transaction_id and user_id = p_user_id
  returning * into updated_transaction;

  if not found then
    raise exception 'Transaction not found';
  end if;

  delete from public.transaction_tags
  where transaction_id = p_transaction_id and user_id = p_user_id;

  insert into public.transaction_tags (user_id, transaction_id, tag_id)
  select p_user_id, p_transaction_id, requested_tag_id
  from unnest(p_tag_ids) as requested_tag(requested_tag_id);

  return next updated_transaction;
end;
$$;

alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;

create policy tags_select_own on public.tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy tags_insert_own on public.tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy tags_update_own on public.tags for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy tags_delete_own on public.tags for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy transaction_tags_select_own on public.transaction_tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transaction_tags_insert_own on public.transaction_tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transaction_tags_delete_own on public.transaction_tags for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.tags, public.transaction_tags from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.tags, public.transaction_tags to service_role;

revoke execute on function public.enforce_transaction_tag_limit() from public, anon, authenticated, service_role;
revoke execute on function public.create_transaction_with_tags(uuid, uuid, uuid, text, numeric, date, text, uuid[])
  from public, anon, authenticated;
revoke execute on function public.update_transaction_with_tags(uuid, uuid, uuid, uuid, text, numeric, date, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.create_transaction_with_tags(uuid, uuid, uuid, text, numeric, date, text, uuid[])
  to service_role;
grant execute on function public.update_transaction_with_tags(uuid, uuid, uuid, uuid, text, numeric, date, text, uuid[])
  to service_role;

comment on table public.tags is 'Reusable transaction labels owned by one authenticated user.';
comment on table public.transaction_tags is 'Ownership-safe many-to-many assignments between transactions and tags.';
