-- Persist user-owned payment accounts and require every expense to reference one.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null,
  color text not null default '#E5B24A',
  last_four text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_not_blank check (length(btrim(name)) between 1 and 80),
  constraint accounts_type_check check (
    type in ('bank', 'credit_card', 'debit_card', 'cash', 'ewallet')
  ),
  constraint accounts_color_format_check check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint accounts_last_four_format_check check (
    last_four is null or last_four ~ '^[0-9]{4}$'
  )
);

create unique index accounts_user_name_unique_idx
  on public.accounts (user_id, lower(name));

create unique index accounts_one_default_per_user_idx
  on public.accounts (user_id)
  where is_default = true;

create index accounts_user_created_at_idx
  on public.accounts (user_id, created_at);

insert into public.accounts (user_id, name, type, color, is_default)
select profiles.id, 'Cash', 'cash', '#E5B24A', true
from public.profiles
on conflict (user_id) where is_default = true do nothing;

alter table public.expenses add column account_id uuid;

update public.expenses expenses
set account_id = accounts.id
from public.accounts accounts
where accounts.user_id = expenses.user_id
  and accounts.is_default = true
  and expenses.account_id is null;

do $$
begin
  if exists (select 1 from public.expenses where account_id is null) then
    raise exception 'Cannot require expense accounts while unbackfilled expenses exist';
  end if;
end $$;

alter table public.expenses
  alter column account_id set not null,
  add constraint expenses_account_id_fkey
    foreign key (account_id) references public.accounts(id) on delete restrict;

create index expenses_user_account_idx
  on public.expenses (user_id, account_id);

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

  insert into public.accounts (user_id, name, type, color, is_default)
  values (new.id, 'Cash', 'cash', '#E5B24A', true)
  on conflict (user_id) where is_default = true do nothing;

  return new;
end;
$$;

create or replace function public.validate_expense_account_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.accounts account
    where account.id = new.account_id
      and account.user_id = new.user_id
  ) then
    return new;
  end if;

  raise exception 'account_id must reference an account owned by the same user';
end;
$$;

create trigger set_accounts_updated_at
  before update on public.accounts
  for each row execute procedure public.update_updated_at();

create trigger validate_expense_account_ownership_trigger
  before insert or update on public.expenses
  for each row execute procedure public.validate_expense_account_ownership();

alter table public.accounts enable row level security;

create policy accounts_select_own
  on public.accounts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy accounts_insert_own
  on public.accounts for insert
  to authenticated
  with check ((select auth.uid()) = user_id and is_default = false);

create policy accounts_update_own
  on public.accounts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy accounts_delete_own
  on public.accounts for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_default = false);

revoke all on table public.accounts from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.accounts to service_role;

revoke execute on function public.validate_expense_account_ownership()
  from public, anon, authenticated, service_role;

comment on table public.accounts is
  'User-owned payment sources without balance tracking for the expense-only MVP.';
comment on column public.expenses.account_id is
  'Required owning account. Deletion is restricted while referenced by expenses.';
