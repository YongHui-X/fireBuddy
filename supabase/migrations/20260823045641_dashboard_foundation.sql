-- Add the balance sheet and FIRE inputs required by the real-data dashboard.

create table public.wealth_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  position_kind text not null check (position_kind in ('asset', 'liability')),
  position_type text not null check (position_type in ('cash', 'investment', 'property', 'mortgage', 'loan', 'cpf', 'other')),
  liquidity_class text not null check (liquidity_class in ('liquid', 'less_liquid', 'restricted')),
  include_in_fi boolean not null default false,
  is_emergency_fund boolean not null default false,
  restriction_type text not null default 'none' check (restriction_type in ('none', 'cpf', 'other_restricted')),
  currency text not null default 'SGD' check (currency = 'SGD'),
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wealth_positions_owner_identity_unique unique (id, user_id),
  constraint wealth_positions_archive_state_check check (is_archived = (archived_at is not null)),
  constraint wealth_positions_liability_classification_check check (
    position_kind = 'asset' or (include_in_fi = false and is_emergency_fund = false)
  ),
  constraint wealth_positions_emergency_eligibility_check check (
    is_emergency_fund = false or (
      position_kind = 'asset' and liquidity_class = 'liquid' and restriction_type = 'none'
    )
  ),
  constraint wealth_positions_restriction_consistency_check check (
    (restriction_type = 'none' and liquidity_class <> 'restricted' and position_type <> 'cpf')
    or (restriction_type = 'cpf' and liquidity_class = 'restricted' and position_type = 'cpf')
    or (restriction_type = 'other_restricted' and liquidity_class = 'restricted' and position_type <> 'cpf')
  )
);

create table public.wealth_position_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wealth_position_id uuid not null,
  value_date date not null,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wealth_position_snapshots_position_owner_fk
    foreign key (wealth_position_id, user_id)
    references public.wealth_positions(id, user_id) on delete cascade,
  constraint wealth_position_snapshots_position_date_unique
    unique (wealth_position_id, value_date)
);

create table public.wealth_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wealth_position_id uuid not null,
  contribution_date date not null,
  amount numeric(10,2) not null check (amount > 0),
  note text check (note is null or char_length(note) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wealth_contributions_position_owner_fk
    foreign key (wealth_position_id, user_id)
    references public.wealth_positions(id, user_id) on delete cascade
);

create table public.fire_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  monthly_contribution numeric(10,2) not null default 0 check (monthly_contribution >= 0),
  expected_return_rate numeric(8,6) not null check (expected_return_rate between -0.20 and 0.30),
  inflation_rate numeric(8,6) not null check (inflation_rate between 0 and 0.20),
  withdrawal_rate numeric(8,6) not null check (withdrawal_rate between 0.01 and 0.10),
  retirement_spending_override numeric(10,2) check (retirement_spending_override > 0),
  target_fi_date date,
  birth_year integer check (birth_year between 1900 and 2200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.essential_expense_categories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

create unique index wealth_positions_active_user_name_unique_idx
  on public.wealth_positions (user_id, lower(name)) where is_archived = false;
create index wealth_positions_user_active_idx
  on public.wealth_positions (user_id, is_archived, name);
create index wealth_position_snapshots_user_date_idx
  on public.wealth_position_snapshots (user_id, value_date desc);
create index wealth_position_snapshots_position_date_idx
  on public.wealth_position_snapshots (wealth_position_id, value_date desc);
create index wealth_contributions_user_date_idx
  on public.wealth_contributions (user_id, contribution_date desc);
create index wealth_contributions_position_date_idx
  on public.wealth_contributions (wealth_position_id, contribution_date desc);
create index essential_expense_categories_category_idx
  on public.essential_expense_categories (category_id);

create or replace function public.validate_wealth_contribution_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.wealth_positions position
    where position.id = new.wealth_position_id
      and position.user_id = new.user_id
      and position.position_kind = 'asset'
      and position.include_in_fi = true
      and position.is_archived = false
  ) then
    raise exception 'wealth contributions require an active FI-included asset';
  end if;
  return new;
end;
$$;

create or replace function public.validate_essential_expense_category()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories category
    where category.id = new.category_id
      and category.category_type = 'expense'
      and (
        (category.is_default = true and category.user_id is null)
        or (category.is_default = false and category.user_id = new.user_id)
      )
  ) then
    raise exception 'essential category must be a visible expense category';
  end if;
  return new;
end;
$$;

create trigger validate_wealth_contribution_position_trigger
  before insert or update on public.wealth_contributions
  for each row execute procedure public.validate_wealth_contribution_position();
create trigger validate_essential_expense_category_trigger
  before insert or update on public.essential_expense_categories
  for each row execute procedure public.validate_essential_expense_category();

create trigger set_wealth_positions_updated_at before update on public.wealth_positions
  for each row execute procedure public.update_updated_at();
create trigger set_wealth_position_snapshots_updated_at before update on public.wealth_position_snapshots
  for each row execute procedure public.update_updated_at();
create trigger set_wealth_contributions_updated_at before update on public.wealth_contributions
  for each row execute procedure public.update_updated_at();
create trigger set_fire_profiles_updated_at before update on public.fire_profiles
  for each row execute procedure public.update_updated_at();

alter table public.wealth_positions enable row level security;
alter table public.wealth_position_snapshots enable row level security;
alter table public.wealth_contributions enable row level security;
alter table public.fire_profiles enable row level security;
alter table public.essential_expense_categories enable row level security;

create policy wealth_positions_select_own on public.wealth_positions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy wealth_positions_insert_own on public.wealth_positions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy wealth_positions_update_own on public.wealth_positions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wealth_positions_delete_own on public.wealth_positions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy wealth_position_snapshots_select_own on public.wealth_position_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
create policy wealth_position_snapshots_insert_own on public.wealth_position_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy wealth_position_snapshots_update_own on public.wealth_position_snapshots for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wealth_position_snapshots_delete_own on public.wealth_position_snapshots for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy wealth_contributions_select_own on public.wealth_contributions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy wealth_contributions_insert_own on public.wealth_contributions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy wealth_contributions_update_own on public.wealth_contributions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wealth_contributions_delete_own on public.wealth_contributions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy fire_profiles_select_own on public.fire_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy fire_profiles_insert_own on public.fire_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy fire_profiles_update_own on public.fire_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy fire_profiles_delete_own on public.fire_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy essential_expense_categories_select_own on public.essential_expense_categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy essential_expense_categories_insert_own on public.essential_expense_categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy essential_expense_categories_update_own on public.essential_expense_categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy essential_expense_categories_delete_own on public.essential_expense_categories for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.wealth_positions, public.wealth_position_snapshots,
  public.wealth_contributions, public.fire_profiles, public.essential_expense_categories
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.wealth_positions,
  public.wealth_position_snapshots, public.wealth_contributions,
  public.fire_profiles, public.essential_expense_categories to service_role;

revoke execute on function public.validate_wealth_contribution_position()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_essential_expense_category()
  from public, anon, authenticated, service_role;

comment on table public.wealth_positions is
  'Assets and liabilities for balance sheet and FIRE calculations, separate from payment accounts.';
comment on table public.wealth_contributions is
  'Dated invested contributions that never count as expense transactions.';
