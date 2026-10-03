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
  month_offset integer not null check (month_offset between 0 and 11),
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
  -- Current month: a typical month with every expense category represented.
  (0, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (0, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 138.65),
  (0, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 112.40),
  (0, 'Food & Drink', 'Cash', 4, 'Hawker lunches', 46.80),
  (0, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (0, 'Transport', 'DBS Multiplier', 6, 'SimplyGo MRT and bus', 58.20),
  (0, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (0, 'Food & Drink', 'GrabPay', 9, 'GrabFood dinners', 62.30),
  (0, 'Shopping', 'DBS Altitude', 11, 'Shopee household order', 57.80),
  (0, 'Transport', 'GrabPay', 12, 'Grab rides', 41.60),
  (0, 'Healthcare', 'DBS Altitude', 14, 'Polyclinic visit', 24.30),
  (0, 'Food & Drink', 'DBS Altitude', 16, 'Sheng Siong groceries', 121.10),
  (0, 'Entertainment', 'DBS Altitude', 19, 'Golden Village movie night', 32.00),
  (0, 'Food & Drink', 'DBS Altitude', 22, 'Seafood dinner with family', 148.00),
  (0, 'Shopping', 'DBS Altitude', 24, 'Uniqlo work shirts', 89.70),
  (0, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),
  (0, 'Travel', 'DBS Altitude', 26, 'Holiday flight deposit', 120.00),
  (0, 'Others', 'Cash', 27, 'Haircut', 18.00),

  -- 1 month ago: a Japan trip made travel the biggest cost after housing.
  (1, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (1, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 102.30),
  (1, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 128.70),
  (1, 'Transport', 'DBS Multiplier', 4, 'SimplyGo MRT and bus', 44.10),
  (1, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (1, 'Food & Drink', 'Cash', 6, 'Hawker lunches', 38.50),
  (1, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (1, 'Travel', 'DBS Altitude', 8, 'Return flights to Tokyo', 1180.00),
  (1, 'Insurance', 'DBS Altitude', 9, 'Travel insurance', 48.00),
  (1, 'Others', 'Cash', 10, 'Currency exchange fees', 32.40),
  (1, 'Transport', 'GrabPay', 12, 'Grab to Changi Airport', 31.50),
  (1, 'Travel', 'DBS Altitude', 13, 'Tokyo hotel', 520.00),
  (1, 'Transport', 'DBS Altitude', 13, 'JR Pass and Suica top up', 342.00),
  (1, 'Food & Drink', 'DBS Altitude', 14, 'Tokyo ramen and izakaya', 215.40),
  (1, 'Travel', 'DBS Altitude', 15, 'Kyoto ryokan', 640.00),
  (1, 'Entertainment', 'DBS Altitude', 16, 'teamLab tickets', 68.00),
  (1, 'Food & Drink', 'DBS Altitude', 17, 'Osaka street food', 96.20),
  (1, 'Shopping', 'DBS Altitude', 18, 'Don Quijote souvenirs', 184.50),
  (1, 'Food & Drink', 'DBS Altitude', 24, 'Sheng Siong groceries', 88.90),
  (1, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 2 months ago: a home refresh pushed shopping well over budget.
  (2, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (2, 'Food & Drink', 'DBS Altitude', 3, 'FairPrice groceries', 152.40),
  (2, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 141.20),
  (2, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (2, 'Transport', 'DBS Multiplier', 5, 'SimplyGo MRT and bus', 61.40),
  (2, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (2, 'Food & Drink', 'Cash', 8, 'Hawker lunches', 52.60),
  (2, 'Shopping', 'DBS Altitude', 9, 'IKEA sofa', 899.00),
  (2, 'Bills & Utilities', 'DBS Multiplier', 10, 'Town council conservancy charges', 82.00),
  (2, 'Others', 'Cash', 10, 'Movers and handyman', 180.00),
  (2, 'Shopping', 'DBS Altitude', 12, 'Courts air purifier', 329.00),
  (2, 'Transport', 'GrabPay', 15, 'Grab rides', 28.90),
  (2, 'Food & Drink', 'DBS Altitude', 17, 'Sheng Siong groceries', 134.80),
  (2, 'Healthcare', 'DBS Altitude', 18, 'Dental scaling and polish', 85.00),
  (2, 'Food & Drink', 'DBS Altitude', 20, 'Brunch with friends', 76.50),
  (2, 'Shopping', 'DBS Altitude', 21, 'Taobao home decor', 146.30),
  (2, 'Entertainment', 'DBS Altitude', 23, 'Board game cafe', 36.00),
  (2, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 3 months ago: a knee injury made healthcare the standout category.
  (3, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (3, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 118.20),
  (3, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 156.80),
  (3, 'Transport', 'DBS Multiplier', 4, 'SimplyGo MRT and bus', 39.80),
  (3, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (3, 'Food & Drink', 'Cash', 6, 'Hawker lunches', 44.70),
  (3, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (3, 'Healthcare', 'DBS Altitude', 10, 'Orthopaedic specialist consultation', 280.00),
  (3, 'Transport', 'GrabPay', 11, 'Grab rides to hospital', 64.20),
  (3, 'Healthcare', 'DBS Altitude', 12, 'MRI scan co-payment', 460.00),
  (3, 'Healthcare', 'DBS Altitude', 14, 'Guardian pharmacy', 38.60),
  (3, 'Food & Drink', 'DBS Altitude', 16, 'Sheng Siong groceries', 96.40),
  (3, 'Food & Drink', 'GrabPay', 19, 'GrabFood while recovering', 112.60),
  (3, 'Healthcare', 'DBS Altitude', 22, 'Physiotherapy sessions', 240.00),
  (3, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),
  (3, 'Others', 'Cash', 26, 'Gift for mum', 45.00),

  -- 4 months ago: a no-spend challenge kept discretionary costs near zero.
  (4, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (4, 'Food & Drink', 'DBS Altitude', 3, 'FairPrice groceries', 96.50),
  (4, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 118.90),
  (4, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (4, 'Transport', 'DBS Multiplier', 5, 'SimplyGo MRT and bus', 46.30),
  (4, 'Food & Drink', 'Cash', 7, 'Hawker lunches', 38.40),
  (4, 'Healthcare', 'DBS Altitude', 13, 'Follow-up physiotherapy', 60.00),
  (4, 'Food & Drink', 'DBS Altitude', 15, 'Sheng Siong groceries', 88.70),
  (4, 'Others', 'Cash', 20, 'Printing and stationery', 6.50),
  (4, 'Food & Drink', 'DBS Altitude', 23, 'Meal prep supplies', 54.20),
  (4, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 5 months ago: birthdays, a concert and nights out lifted food and entertainment.
  (5, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (5, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 124.30),
  (5, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 132.40),
  (5, 'Transport', 'DBS Multiplier', 4, 'SimplyGo MRT and bus', 52.80),
  (5, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (5, 'Entertainment', 'DBS Altitude', 6, 'Concert ticket', 248.00),
  (5, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (5, 'Shopping', 'DBS Altitude', 8, 'Birthday gifts', 168.00),
  (5, 'Food & Drink', 'DBS Altitude', 9, 'Birthday dinner', 286.00),
  (5, 'Food & Drink', 'GrabPay', 13, 'Hotpot with colleagues', 92.40),
  (5, 'Shopping', 'DBS Altitude', 14, 'Zara outfit', 119.90),
  (5, 'Food & Drink', 'DBS Altitude', 16, 'Drinks at Clarke Quay', 118.00),
  (5, 'Transport', 'GrabPay', 16, 'Late-night Grab rides', 87.30),
  (5, 'Entertainment', 'DBS Altitude', 20, 'Karaoke night', 54.00),
  (5, 'Food & Drink', 'DBS Altitude', 21, 'Sheng Siong groceries', 109.60),
  (5, 'Travel', 'DBS Altitude', 23, 'Sentosa staycation', 320.00),
  (5, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 6 months ago: a Bali getaway, with no entertainment spending at home.
  (6, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (6, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 112.40),
  (6, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 124.60),
  (6, 'Transport', 'DBS Multiplier', 4, 'SimplyGo MRT and bus', 48.60),
  (6, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (6, 'Food & Drink', 'Cash', 6, 'Hawker lunches', 41.20),
  (6, 'Travel', 'DBS Altitude', 10, 'Return flights to Bali', 410.00),
  (6, 'Healthcare', 'DBS Altitude', 12, 'Travel vaccinations', 95.00),
  (6, 'Shopping', 'DBS Altitude', 14, 'Swimwear and sunscreen', 74.50),
  (6, 'Insurance', 'DBS Altitude', 15, 'Travel insurance', 36.00),
  (6, 'Transport', 'GrabPay', 17, 'Grab to Changi Airport', 29.80),
  (6, 'Travel', 'DBS Altitude', 18, 'Ubud villa', 560.00),
  (6, 'Others', 'Cash', 18, 'Visa on arrival fee', 49.00),
  (6, 'Food & Drink', 'DBS Altitude', 19, 'Bali beach club dining', 138.70),
  (6, 'Transport', 'Cash', 20, 'Bali driver hire', 85.00),
  (6, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),
  (6, 'Food & Drink', 'DBS Altitude', 25, 'Sheng Siong groceries', 98.30),

  -- 7 months ago: a laptop upgrade made shopping the main discretionary cost.
  (7, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (7, 'Food & Drink', 'DBS Altitude', 3, 'FairPrice groceries', 131.70),
  (7, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 119.30),
  (7, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (7, 'Transport', 'DBS Multiplier', 5, 'SimplyGo MRT and bus', 55.10),
  (7, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (7, 'Food & Drink', 'Cash', 8, 'Hawker lunches', 48.90),
  (7, 'Shopping', 'DBS Altitude', 11, 'MacBook Air', 1599.00),
  (7, 'Shopping', 'DBS Altitude', 12, 'Laptop sleeve and adapter', 89.00),
  (7, 'Transport', 'GrabPay', 13, 'Grab rides', 36.40),
  (7, 'Food & Drink', 'DBS Altitude', 17, 'Sheng Siong groceries', 117.20),
  (7, 'Entertainment', 'DBS Altitude', 19, 'Nintendo Switch game', 69.90),
  (7, 'Food & Drink', 'DBS Altitude', 22, 'Omakase dinner', 168.00),
  (7, 'Others', 'Cash', 24, 'Phone screen repair', 129.00),
  (7, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 8 months ago: a family celebration drove food, gifts and red packets.
  (8, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (8, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 146.20),
  (8, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 127.80),
  (8, 'Transport', 'DBS Multiplier', 4, 'SimplyGo MRT and bus', 49.70),
  (8, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (8, 'Shopping', 'DBS Altitude', 8, 'New clothes for the celebration', 156.00),
  (8, 'Food & Drink', 'DBS Altitude', 10, 'Festive goodies', 96.50),
  (8, 'Others', 'Cash', 13, 'Red packets for family', 680.00),
  (8, 'Food & Drink', 'DBS Altitude', 14, 'Family reunion dinner', 388.00),
  (8, 'Transport', 'GrabPay', 15, 'Grab rides visiting relatives', 72.40),
  (8, 'Food & Drink', 'Cash', 20, 'Hawker lunches', 43.60),
  (8, 'Healthcare', 'DBS Altitude', 22, 'GP visit for flu', 42.00),
  (8, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 9 months ago: a Melaka weekend and an annual health screening.
  (9, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (9, 'Food & Drink', 'DBS Altitude', 3, 'FairPrice groceries', 119.80),
  (9, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 121.50),
  (9, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (9, 'Transport', 'DBS Multiplier', 5, 'SimplyGo MRT and bus', 47.20),
  (9, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (9, 'Food & Drink', 'Cash', 7, 'Hawker lunches', 39.90),
  (9, 'Entertainment', 'DBS Altitude', 12, 'Bouldering gym pass', 38.00),
  (9, 'Transport', 'DBS Altitude', 17, 'Coach to Melaka', 64.00),
  (9, 'Travel', 'DBS Altitude', 17, 'Melaka hotel', 186.00),
  (9, 'Food & Drink', 'DBS Altitude', 18, 'Melaka food trail', 84.60),
  (9, 'Healthcare', 'DBS Altitude', 21, 'Annual health screening', 158.00),
  (9, 'Food & Drink', 'DBS Altitude', 24, 'Sheng Siong groceries', 102.40),
  (9, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),

  -- 10 months ago: online sales and a Taipei trip.
  (10, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (10, 'Food & Drink', 'DBS Altitude', 2, 'FairPrice groceries', 128.90),
  (10, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 116.20),
  (10, 'Transport', 'DBS Multiplier', 4, 'SimplyGo MRT and bus', 51.30),
  (10, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (10, 'Food & Drink', 'Cash', 6, 'Hawker lunches', 46.10),
  (10, 'Travel', 'DBS Altitude', 9, 'Return flights to Taipei', 368.00),
  (10, 'Shopping', 'DBS Altitude', 11, 'Dyson cordless vacuum', 649.00),
  (10, 'Shopping', 'DBS Altitude', 12, 'Lazada sale haul', 213.40),
  (10, 'Others', 'DBS Multiplier', 15, 'Charity donation', 100.00),
  (10, 'Transport', 'GrabPay', 19, 'Grab rides', 33.70),
  (10, 'Travel', 'DBS Altitude', 20, 'Taipei hotel', 412.00),
  (10, 'Food & Drink', 'DBS Altitude', 21, 'Taipei night market', 72.80),
  (10, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00),
  (10, 'Food & Drink', 'DBS Altitude', 27, 'Sheng Siong groceries', 94.70),

  -- 11 months ago: a simple month with running gear and a comedy show.
  (11, 'Housing', 'DBS Multiplier', 1, 'HDB mortgage contribution', 1650.00),
  (11, 'Food & Drink', 'DBS Altitude', 3, 'FairPrice groceries', 117.40),
  (11, 'Bills & Utilities', 'DBS Multiplier', 3, 'SP Services electricity and water', 109.80),
  (11, 'Bills & Utilities', 'DBS Multiplier', 5, 'Singtel mobile and fibre', 74.90),
  (11, 'Transport', 'DBS Multiplier', 5, 'SimplyGo MRT and bus', 62.40),
  (11, 'Entertainment', 'DBS Altitude', 7, 'Netflix and Spotify', 29.96),
  (11, 'Food & Drink', 'Cash', 9, 'Hawker lunches', 51.30),
  (11, 'Transport', 'GrabPay', 14, 'Grab rides', 24.60),
  (11, 'Shopping', 'DBS Altitude', 16, 'Running shoes', 139.00),
  (11, 'Food & Drink', 'DBS Altitude', 18, 'Sheng Siong groceries', 106.80),
  (11, 'Entertainment', 'DBS Altitude', 21, 'Comedy show', 58.00),
  (11, 'Food & Drink', 'DBS Altitude', 24, 'Team lunch', 42.00),
  (11, 'Insurance', 'DBS Multiplier', 25, 'Integrated Shield premium', 145.00);

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
  cross join generate_series(0, 11) as month_offset
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
  -- Past months keep their day of month. Current-month rows are spread across the days
  -- elapsed so far, so the month is fully populated without any future-dated rows.
  case
    when template.month_offset = 0 then
      months.month_start + ((template.day_of_month - 1) * (extract(day from months.as_of)::integer - 1) / 30)
    else months.month_start + (template.day_of_month - 1)
  end,
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
  cross join generate_series(0, 11) as month_offset
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
    ('Bonus', 'Annual wage supplement', 6200.00::numeric, 8, 24),
    ('Dividends', 'Quarterly ETF distribution', 286.40::numeric, 1, 24),
    ('Dividends', 'Quarterly ETF distribution', 241.80::numeric, 4, 24),
    ('Dividends', 'Quarterly ETF distribution', 263.10::numeric, 7, 24),
    ('Dividends', 'Quarterly ETF distribution', 228.50::numeric, 10, 24),
    ('Interest', 'DBS Multiplier interest', 38.20::numeric, 2, 27),
    ('Interest', 'DBS Multiplier interest', 41.75::numeric, 5, 27),
    ('Other income', 'Carousell sale of old monitor', 120.00::numeric, 6, 12)
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
  0.030000,
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
  if transaction_count <> 208 then
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
  ) <> 12 then
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
  ) <> 12 then
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
