\set ON_ERROR_STOP on

begin;

set local timezone = 'Asia/Singapore';
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table seed_context (
  user_id uuid primary key,
  as_of date not null
) on commit drop;

insert into seed_context (user_id, as_of)
select id, current_date
from auth.users
where lower(email) = lower(:'target_email');

do $$
begin
  if (select count(*) from seed_context) <> 1 then
    raise exception 'Expected exactly one auth user for the supplied email';
  end if;

  perform 1
  from auth.users
  where id = (select user_id from seed_context)
  for update;
end;
$$;

insert into public.profiles (id, email)
select user_id, :'target_email'
from seed_context
on conflict (id) do update set email = excluded.email;

delete from public.essential_expense_categories
where user_id = (select user_id from seed_context);

delete from public.wealth_contributions
where user_id = (select user_id from seed_context);

delete from public.wealth_position_snapshots
where user_id = (select user_id from seed_context);

delete from public.wealth_positions
where user_id = (select user_id from seed_context);

delete from public.fire_profiles
where user_id = (select user_id from seed_context);

delete from public.expenses
where user_id = (select user_id from seed_context);

delete from public.categories
where user_id = (select user_id from seed_context)
  and is_default = false;

delete from public.accounts
where user_id = (select user_id from seed_context);

insert into public.accounts (user_id, name, type, color, last_four, is_default)
select user_id, account.name, account.type, account.color, account.last_four, account.is_default
from seed_context
cross join (
  values
    ('DBS Multiplier', 'bank', '#2F6F3E', '4521', true),
    ('DBS Altitude', 'credit_card', '#386D82', '1234', false),
    ('GrabPay', 'ewallet', '#247F63', null, false),
    ('Cash', 'cash', '#B77A16', null, false)
) as account(name, type, color, last_four, is_default);

insert into public.categories (
  user_id,
  name,
  is_default,
  icon,
  color,
  monthly_budget,
  category_type
)
select user_id, category.name, false, category.icon, category.color, category.monthly_budget, 'expense'
from seed_context
cross join (
  values
    ('Housing', 'utilities', '#557A46', 1800.00::numeric),
    ('Insurance', 'health', '#66758A', 180.00::numeric)
) as category(name, icon, color, monthly_budget);

create temporary table seed_transaction_templates (
  month_offset integer not null check (month_offset between 0 and 6),
  category_name text not null,
  account_name text not null,
  day_of_month integer not null,
  description text not null,
  amount numeric(10,2) not null
) on commit drop;

insert into seed_transaction_templates (
  month_offset,
  category_name,
  account_name,
  day_of_month,
  description,
  amount
)
values
  -- Current month: balanced spending with every category represented.
  (0, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (0, 'Food & Drink', 'DBS Altitude', 3, 'FairPrice groceries', 420.35),
  (0, 'Transport', 'GrabPay', 5, 'SimplyGo and Grab rides', 132.80),
  (0, 'Bills & Utilities', 'DBS Multiplier', 7, 'SP Services and mobile bill', 178.60),
  (0, 'Entertainment', 'DBS Altitude', 10, 'Streaming subscriptions', 48.90),
  (0, 'Food & Drink', 'GrabPay', 13, 'Dining and coffee', 185.40),
  (0, 'Healthcare', 'DBS Altitude', 17, 'Pharmacy purchase', 42.50),
  (0, 'Shopping', 'DBS Altitude', 21, 'Household purchases', 96.40),
  (0, 'Insurance', 'DBS Multiplier', 25, 'Insurance premium', 145.00),
  (0, 'Travel', 'DBS Altitude', 27, 'Weekend travel fund', 75.00),
  (0, 'Others', 'Cash', 28, 'Miscellaneous household expense', 36.20),

  -- Previous month: a travel-heavy month with flights and accommodation.
  (1, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (1, 'Food & Drink', 'DBS Altitude', 3, 'Groceries and meal prep', 510.00),
  (1, 'Transport', 'GrabPay', 5, 'Airport rides and SimplyGo', 240.00),
  (1, 'Bills & Utilities', 'DBS Multiplier', 7, 'SP Services and mobile bill', 215.00),
  (1, 'Entertainment', 'DBS Altitude', 10, 'Concert tickets', 120.00),
  (1, 'Food & Drink', 'GrabPay', 13, 'Holiday dining', 295.00),
  (1, 'Shopping', 'DBS Altitude', 18, 'Travel essentials', 210.00),
  (1, 'Insurance', 'DBS Multiplier', 20, 'Insurance premium', 145.00),
  (1, 'Travel', 'DBS Altitude', 22, 'Return flights', 1250.00),
  (1, 'Travel', 'DBS Altitude', 24, 'Hotel deposit', 280.00),
  (1, 'Others', 'Cash', 27, 'Foreign currency fees', 85.00),

  -- Two months ago: home setup and shopping were the main discretionary costs.
  (2, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (2, 'Food & Drink', 'DBS Altitude', 4, 'Groceries and dining', 560.00),
  (2, 'Transport', 'GrabPay', 6, 'SimplyGo top ups', 145.00),
  (2, 'Bills & Utilities', 'DBS Multiplier', 8, 'SP Services and broadband', 190.00),
  (2, 'Shopping', 'DBS Altitude', 11, 'Home office chair', 860.00),
  (2, 'Shopping', 'DBS Altitude', 15, 'Storage and household items', 230.00),
  (2, 'Healthcare', 'DBS Altitude', 18, 'Dental check-up', 60.00),
  (2, 'Entertainment', 'DBS Altitude', 21, 'Streaming and cinema', 55.00),
  (2, 'Insurance', 'DBS Multiplier', 25, 'Insurance premium', 145.00),
  (2, 'Others', 'Cash', 27, 'Home repair service', 240.00),

  -- Three months ago: healthcare was unusually high.
  (3, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (3, 'Food & Drink', 'DBS Altitude', 4, 'Groceries and dining', 530.00),
  (3, 'Transport', 'GrabPay', 6, 'SimplyGo and clinic rides', 160.00),
  (3, 'Bills & Utilities', 'DBS Multiplier', 8, 'SP Services and mobile bill', 185.00),
  (3, 'Healthcare', 'DBS Altitude', 12, 'Specialist consultation', 680.00),
  (3, 'Healthcare', 'DBS Altitude', 18, 'Medication and follow-up', 125.00),
  (3, 'Insurance', 'DBS Multiplier', 20, 'Insurance premium', 145.00),
  (3, 'Entertainment', 'DBS Altitude', 23, 'Streaming subscriptions', 35.00),
  (3, 'Others', 'Cash', 27, 'Family support', 70.00),

  -- Four months ago: a deliberately quiet, low-spend month.
  (4, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (4, 'Food & Drink', 'DBS Altitude', 4, 'Groceries and meal prep', 430.00),
  (4, 'Transport', 'GrabPay', 7, 'SimplyGo top ups', 105.00),
  (4, 'Bills & Utilities', 'DBS Multiplier', 9, 'SP Services and mobile bill', 168.00),
  (4, 'Insurance', 'DBS Multiplier', 16, 'Insurance premium', 145.00),
  (4, 'Healthcare', 'DBS Altitude', 19, 'Pharmacy purchase', 30.00),
  (4, 'Others', 'Cash', 27, 'Small cash purchases', 25.00),

  -- Five months ago: dining, social events, and entertainment were elevated.
  (5, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (5, 'Food & Drink', 'DBS Altitude', 3, 'Groceries', 680.00),
  (5, 'Transport', 'GrabPay', 6, 'SimplyGo and late-night rides', 210.00),
  (5, 'Bills & Utilities', 'DBS Multiplier', 8, 'SP Services and mobile bill', 175.00),
  (5, 'Food & Drink', 'DBS Altitude', 11, 'Birthday dinners', 390.00),
  (5, 'Entertainment', 'DBS Altitude', 14, 'Festival passes', 320.00),
  (5, 'Entertainment', 'DBS Altitude', 18, 'Cinema and games', 110.00),
  (5, 'Shopping', 'DBS Altitude', 21, 'Gifts and clothing', 180.00),
  (5, 'Insurance', 'DBS Multiplier', 24, 'Insurance premium', 145.00),
  (5, 'Travel', 'DBS Altitude', 26, 'Weekend staycation', 190.00),

  -- Six months ago: transport and a regional trip drove the total.
  (6, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (6, 'Food & Drink', 'DBS Altitude', 4, 'Groceries and dining', 480.00),
  (6, 'Transport', 'GrabPay', 6, 'Monthly transport pass', 310.00),
  (6, 'Transport', 'GrabPay', 9, 'Ride-hailing trips', 95.00),
  (6, 'Bills & Utilities', 'DBS Multiplier', 11, 'SP Services and mobile bill', 205.00),
  (6, 'Travel', 'DBS Altitude', 15, 'Regional getaway', 780.00),
  (6, 'Shopping', 'DBS Altitude', 19, 'Trip essentials', 120.00),
  (6, 'Insurance', 'DBS Multiplier', 22, 'Insurance premium', 145.00),
  (6, 'Healthcare', 'DBS Altitude', 25, 'Clinic visit', 55.00),
  (6, 'Others', 'Cash', 27, 'Travel incidentals', 60.00);

do $$
begin
  if exists (
    select 1
    from seed_transaction_templates template
    where not exists (
      select 1
      from public.categories category
      cross join seed_context context
      where category.name = template.category_name
        and category.category_type = 'expense'
        and (
          (category.is_default = true and category.user_id is null)
          or (category.is_default = false and category.user_id = context.user_id)
        )
    )
  ) then
    raise exception 'A required expense category is missing';
  end if;

  if exists (
    select 1
    from seed_transaction_templates template
    where not exists (
      select 1
      from public.accounts account
      cross join seed_context context
      where account.user_id = context.user_id
        and account.name = template.account_name
    )
  ) then
    raise exception 'A required payment account is missing';
  end if;
end;
$$;

with seed_months as (
  select
    month_offset,
    (date_trunc('month', context.as_of)::date - make_interval(months => month_offset))::date as month_start,
    context.as_of
  from seed_context context
  cross join generate_series(0, 6) as month_offset
)
insert into public.expenses (
  user_id,
  category_id,
  account_id,
  description,
  amount,
  date,
  transaction_type
)
select
  context.user_id,
  category.id,
  account.id,
  template.description,
  template.amount,
  least((months.month_start + (template.day_of_month - 1))::date, months.as_of),
  'expense'
from seed_context context
cross join seed_transaction_templates template
join seed_months months on months.month_offset = template.month_offset
join public.categories category
  on category.name = template.category_name
  and category.category_type = 'expense'
  and (
    (category.is_default = true and category.user_id is null)
    or (category.is_default = false and category.user_id = context.user_id)
  )
join public.accounts account
  on account.user_id = context.user_id
  and account.name = template.account_name;

with seed_months as (
  select
    month_offset,
    (date_trunc('month', context.as_of)::date - make_interval(months => month_offset))::date as month_start,
    context.as_of
  from seed_context context
  cross join generate_series(0, 6) as month_offset
)
insert into public.expenses (
  user_id,
  category_id,
  account_id,
  description,
  amount,
  date,
  transaction_type
)
select
  context.user_id,
  category.id,
  account.id,
  'Salary - ' || to_char(months.month_start, 'Mon YYYY'),
  6200.00,
  least(months.month_start + 19, months.as_of),
  'income'
from seed_context context
cross join seed_months months
join public.categories category
  on category.name = 'Salary'
  and category.category_type = 'income'
  and category.is_default = true
join public.accounts account
  on account.user_id = context.user_id
  and account.name = 'DBS Multiplier';

insert into public.expenses (
  user_id,
  category_id,
  account_id,
  description,
  amount,
  date,
  transaction_type
)
select
  context.user_id,
  category.id,
  account.id,
  occasional.description,
  occasional.amount,
  ((date_trunc('month', context.as_of)::date - make_interval(months => occasional.month_offset))::date + occasional.day_offset)::date,
  'income'
from seed_context context
cross join (
  values
    ('Bonus', 'Performance bonus', 1850.00::numeric, 3, 14),
    ('Dividends', 'Quarterly ETF distribution', 286.40::numeric, 1, 24)
) as occasional(category_name, description, amount, month_offset, day_offset)
join public.categories category
  on category.name = occasional.category_name
  and category.category_type = 'income'
  and category.is_default = true
join public.accounts account
  on account.user_id = context.user_id
  and account.name = 'DBS Multiplier';

insert into public.wealth_positions (
  user_id,
  name,
  position_kind,
  position_type,
  liquidity_class,
  include_in_fi,
  is_emergency_fund,
  restriction_type
)
select
  context.user_id,
  position.name,
  position.position_kind,
  position.position_type,
  position.liquidity_class,
  position.include_in_fi,
  position.is_emergency_fund,
  position.restriction_type
from seed_context context
cross join (
  values
    ('Cash reserve', 'asset', 'cash', 'liquid', true, true, 'none'),
    ('Brokerage', 'asset', 'investment', 'less_liquid', true, false, 'none'),
    ('CPF OA', 'asset', 'cpf', 'restricted', false, false, 'cpf'),
    ('Home', 'asset', 'property', 'less_liquid', false, false, 'none'),
    ('Mortgage', 'liability', 'mortgage', 'less_liquid', false, false, 'none')
) as position(name, position_kind, position_type, liquidity_class, include_in_fi, is_emergency_fund, restriction_type);

insert into public.wealth_position_snapshots (
  user_id,
  wealth_position_id,
  value_date,
  amount
)
select
  context.user_id,
  position.id,
  snapshot.value_date,
  case snapshot.period
    when 'previous' then amount.previous_amount
    else amount.current_amount
  end
from seed_context context
join public.wealth_positions position on position.user_id = context.user_id
join (
  values
    ('Cash reserve', 28750.00::numeric, 31240.00::numeric),
    ('Brokerage', 188400.00::numeric, 192850.00::numeric),
    ('CPF OA', 74500.00::numeric, 76050.00::numeric),
    ('Home', 610000.00::numeric, 610000.00::numeric),
    ('Mortgage', 418000.00::numeric, 416500.00::numeric)
) as amount(position_name, previous_amount, current_amount) on amount.position_name = position.name
cross join lateral (
  values
    ('previous', date_trunc('month', context.as_of)::date - 1),
    ('current', context.as_of)
) as snapshot(period, value_date);

insert into public.wealth_contributions (
  user_id,
  wealth_position_id,
  contribution_date,
  amount,
  note
)
select
  context.user_id,
  position.id,
  least(
    ((date_trunc('month', context.as_of)::date - make_interval(months => month_offset))::date + 14)::date,
    context.as_of
  ),
  2500.00,
  'Monthly brokerage contribution'
from seed_context context
join public.wealth_positions position
  on position.user_id = context.user_id
  and position.name = 'Brokerage'
cross join generate_series(0, 5) as month_offset;

insert into public.fire_profiles (
  user_id,
  monthly_contribution,
  expected_return_rate,
  inflation_rate,
  withdrawal_rate,
  retirement_spending_override,
  target_fi_date,
  birth_year
)
select
  user_id,
  2500.00,
  0.070000,
  0.025000,
  0.040000,
  4000.00,
  (as_of + interval '16 years')::date,
  1994
from seed_context;

insert into public.essential_expense_categories (user_id, category_id)
select context.user_id, category.id
from seed_context context
join public.categories category
  on category.category_type = 'expense'
  and category.name in ('Housing', 'Insurance', 'Food & Drink', 'Transport', 'Bills & Utilities', 'Healthcare')
  and (
    (category.is_default = true and category.user_id is null)
    or (category.is_default = false and category.user_id = context.user_id)
  );

do $$
declare
  target_user_id uuid := (select user_id from seed_context);
  seed_date date := (select as_of from seed_context);
  transaction_count integer;
begin
  select count(*) into transaction_count
  from public.expenses
  where user_id = target_user_id;

  if (select count(*) from public.accounts where user_id = target_user_id) <> 4 then
    raise exception 'Jen seed must create four accounts';
  end if;
  if (select count(*) from public.categories where user_id = target_user_id and is_default = false) <> 2 then
    raise exception 'Jen seed must create two custom categories';
  end if;
  if transaction_count <> 77 then
    raise exception 'Jen seed transaction count % does not match the expected rolling dataset', transaction_count;
  end if;
  if (select count(*) from public.wealth_positions where user_id = target_user_id) <> 5 then
    raise exception 'Jen seed must create five wealth positions';
  end if;
  if (select count(*) from public.wealth_position_snapshots where user_id = target_user_id) <> 10 then
    raise exception 'Jen seed must create ten wealth snapshots';
  end if;
  if (select count(*) from public.wealth_contributions where user_id = target_user_id) <> 6 then
    raise exception 'Jen seed must create six wealth contributions';
  end if;
  if (select count(*) from public.fire_profiles where user_id = target_user_id) <> 1 then
    raise exception 'Jen seed must create one FIRE profile';
  end if;
  if (select count(*) from public.essential_expense_categories where user_id = target_user_id) <> 6 then
    raise exception 'Jen seed must create six essential category selections';
  end if;
  if exists (select 1 from public.expenses where user_id = target_user_id and amount <= 0) then
    raise exception 'Jen seed contains a non-positive stored transaction amount';
  end if;
  if exists (
    select 1
    from public.expenses stored_transaction
    left join public.accounts account on account.id = stored_transaction.account_id
    left join public.categories category on category.id = stored_transaction.category_id
    where stored_transaction.user_id = target_user_id
      and (
        account.id is null
        or account.user_id <> stored_transaction.user_id
        or category.id is null
        or category.category_type <> stored_transaction.transaction_type
        or not (category.is_default or category.user_id = stored_transaction.user_id)
      )
  ) then
    raise exception 'Jen seed contains an invalid account or category relationship';
  end if;
  if exists (select 1 from public.expenses where user_id = target_user_id and date > seed_date) then
    raise exception 'Jen seed contains a future transaction';
  end if;
  if not exists (
    select 1 from public.expenses
    where user_id = target_user_id
      and transaction_type = 'income'
      and date_trunc('month', date) = date_trunc('month', seed_date)
  ) then
    raise exception 'Jen seed needs current-month income';
  end if;
  if not exists (
    select 1 from public.expenses
    where user_id = target_user_id
      and transaction_type = 'expense'
      and date_trunc('month', date) = date_trunc('month', seed_date)
  ) then
    raise exception 'Jen seed needs current-month expenses';
  end if;
  if (
    select count(distinct monthly_total)
    from (
      select date_trunc('month', date) as spending_month, sum(amount) as monthly_total
      from public.expenses
      where user_id = target_user_id
        and transaction_type = 'expense'
      group by date_trunc('month', date)
    ) monthly_totals
  ) <> 7 then
    raise exception 'Jen seed needs a distinct expense total in every seeded month';
  end if;
  if (
    select count(distinct category_signature)
    from (
      select
        date_trunc('month', stored_expense.date) as spending_month,
        string_agg(distinct category.name, ', ' order by category.name) as category_signature
      from public.expenses stored_expense
      join public.categories category on category.id = stored_expense.category_id
      where stored_expense.user_id = target_user_id
        and stored_expense.transaction_type = 'expense'
      group by date_trunc('month', stored_expense.date)
    ) monthly_categories
  ) <> 7 then
    raise exception 'Jen seed needs a distinct category mix in every seeded month';
  end if;
  if exists (
    select 1
    from public.categories category
    where category.category_type = 'expense'
      and (category.is_default = true or category.user_id = target_user_id)
      and not exists (
        select 1
        from public.expenses stored_expense
        where stored_expense.user_id = target_user_id
          and stored_expense.category_id = category.id
          and stored_expense.transaction_type = 'expense'
          and date_trunc('month', stored_expense.date) = date_trunc('month', seed_date)
      )
  ) then
    raise exception 'Jen seed needs a current-month expense in every available expense category';
  end if;
end;
$$;

select
  profile.email,
  context.as_of,
  (select count(*) from public.accounts where user_id = context.user_id) as accounts,
  (select count(*) from public.categories where user_id = context.user_id and is_default = false) as custom_categories,
  (select count(*) from public.expenses where user_id = context.user_id) as transactions,
  (select min(date) from public.expenses where user_id = context.user_id) as earliest_transaction,
  (select max(date) from public.expenses where user_id = context.user_id) as latest_transaction,
  (select count(*) from public.wealth_positions where user_id = context.user_id) as wealth_positions,
  (select count(*) from public.wealth_position_snapshots where user_id = context.user_id) as wealth_snapshots,
  (select count(*) from public.wealth_contributions where user_id = context.user_id) as contributions
from seed_context context
join public.profiles profile on profile.id = context.user_id;

select
  to_char(date_trunc('month', stored_transaction.date), 'YYYY-MM') as month,
  sum(stored_transaction.amount) filter (where stored_transaction.transaction_type = 'expense') as spending,
  count(distinct stored_transaction.category_id) filter (where stored_transaction.transaction_type = 'expense') as expense_categories,
  string_agg(distinct category.name, ', ' order by category.name)
    filter (where stored_transaction.transaction_type = 'expense') as category_mix
from seed_context context
join public.expenses stored_transaction on stored_transaction.user_id = context.user_id
join public.categories category on category.id = stored_transaction.category_id
group by date_trunc('month', stored_transaction.date)
order by date_trunc('month', stored_transaction.date) desc;

commit;
