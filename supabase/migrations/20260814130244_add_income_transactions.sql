-- Add explicit income and expense classification without renaming legacy storage.

alter table public.categories
  add column category_type text not null default 'expense';

alter table public.expenses
  add column transaction_type text not null default 'expense';

alter table public.categories
  add constraint categories_type_check
    check (category_type in ('expense', 'income')),
  add constraint categories_income_budget_zero_check
    check (category_type = 'expense' or monthly_budget = 0);

alter table public.expenses
  add constraint expenses_transaction_type_check
    check (transaction_type in ('expense', 'income'));

drop index if exists public.categories_default_name_unique_idx;
drop index if exists public.categories_user_name_unique_idx;

create unique index categories_default_type_name_unique_idx
  on public.categories (category_type, lower(name))
  where is_default = true;

create unique index categories_user_type_name_unique_idx
  on public.categories (user_id, category_type, lower(name))
  where user_id is not null;

create index expenses_user_type_date_idx
  on public.expenses (user_id, transaction_type, date desc);

create index expenses_user_type_category_idx
  on public.expenses (user_id, transaction_type, category_id);

update public.categories
set icon = 'shapes'
where lower(name) = 'others'
  and category_type = 'expense';

insert into public.categories (
  name,
  is_default,
  user_id,
  icon,
  color,
  monthly_budget,
  category_type
)
values
  ('Salary', true, null, 'salary', '#3C8A61', 0, 'income'),
  ('Bonus', true, null, 'bonus', '#E5B24A', 0, 'income'),
  ('Dividends', true, null, 'dividends', '#67B47C', 0, 'income'),
  ('Interest', true, null, 'interest', '#7BAA90', 0, 'income'),
  ('Other income', true, null, 'income', '#A8D3B7', 0, 'income')
on conflict do nothing;

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
    from public.categories category
    where category.id = new.category_id
      and category.category_type = new.transaction_type
      and (
        (category.is_default = true and category.user_id is null)
        or
        (category.user_id = new.user_id and category.is_default = false)
      )
  ) then
    return new;
  end if;

  raise exception 'category_id must reference an available category with the same transaction type';
end;
$$;

create or replace function public.validate_category_type_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_type = old.category_type then
    return new;
  end if;

  if exists (
    select 1
    from public.expenses stored_transaction
    where stored_transaction.category_id = new.id
      and stored_transaction.transaction_type <> new.category_type
  ) then
    raise exception 'category_type cannot differ from linked transaction types';
  end if;

  return new;
end;
$$;

create trigger validate_category_type_change_trigger
  before update of category_type on public.categories
  for each row execute procedure public.validate_category_type_change();

alter table public.categories enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.categories, public.expenses
  from public, anon, authenticated, service_role;
grant select, insert, update, delete
  on table public.categories, public.expenses
  to service_role;

revoke execute on function public.validate_expense_category_ownership()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_category_type_change()
  from public, anon, authenticated, service_role;

comment on column public.categories.category_type is
  'Classifies categories as expense or income. Income categories always have a zero budget.';
comment on column public.expenses.transaction_type is
  'Classifies stored transactions while retaining the legacy expenses table name.';
