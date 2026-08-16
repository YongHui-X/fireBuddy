-- FireBuddy initial schema for Supabase/Postgres
-- Apply this in Supabase SQL Editor or through Supabase migrations.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint categories_valid_ownership_state check (
    (is_default = true and user_id is null)
    or
    (is_default = false and user_id is not null)
  )
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  amount numeric(10,2) not null,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount > 0)
);

create unique index if not exists categories_default_name_unique_idx
  on public.categories (lower(name))
  where is_default = true;

create unique index if not exists categories_user_name_unique_idx
  on public.categories (user_id, lower(name))
  where user_id is not null;

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc);

create index if not exists expenses_user_category_idx
  on public.expenses (user_id, category_id);

create index if not exists categories_user_name_lookup_idx
  on public.categories (user_id, name);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_expense_category_ownership()
returns trigger
language plpgsql
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists expenses_updated_at on public.expenses;
drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.update_updated_at();

drop trigger if exists validate_expense_category_ownership_trigger on public.expenses;
create trigger validate_expense_category_ownership_trigger
  before insert or update on public.expenses
  for each row execute procedure public.validate_expense_category_ownership();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "Users see own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users see default and own categories" on public.categories;
drop policy if exists "categories_select_defaults_or_own" on public.categories;
create policy "categories_select_defaults_or_own"
  on public.categories
  for select
  using (is_default = true or auth.uid() = user_id);

drop policy if exists "Users manage own categories" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
  on public.categories
  for insert
  with check (auth.uid() = user_id and is_default = false);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
  on public.categories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_default = false);

drop policy if exists "Users delete own categories" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
  on public.categories
  for delete
  using (auth.uid() = user_id and is_default = false);

drop policy if exists "Users manage own expenses" on public.expenses;
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
  on public.expenses
  for select
  using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
  on public.expenses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
  on public.expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
  on public.expenses
  for delete
  using (auth.uid() = user_id);
