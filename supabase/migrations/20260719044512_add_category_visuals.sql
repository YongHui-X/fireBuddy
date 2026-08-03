alter table if exists public.categories
  add column if not exists icon text not null default 'others',
  add column if not exists color text not null default '#3C8A61',
  add column if not exists monthly_budget numeric(10,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_icon_format_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_icon_format_check
      check (icon ~ '^[a-z][a-z0-9_]{0,31}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_color_format_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_color_format_check
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_monthly_budget_nonnegative_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_monthly_budget_nonnegative_check
      check (monthly_budget >= 0);
  end if;
end $$;

update public.categories
set icon = case lower(name)
    when 'food & drink' then 'food'
    when 'coffee' then 'coffee'
    when 'transport' then 'transport'
    when 'bus' then 'bus'
    when 'car' then 'car'
    when 'fuel' then 'fuel'
    when 'shopping' then 'shopping'
    when 'clothing' then 'clothing'
    when 'bills & utilities' then 'utilities'
    when 'housing' then 'housing'
    when 'phone & internet' then 'phone'
    when 'healthcare' then 'health'
    when 'fitness' then 'fitness'
    when 'entertainment' then 'entertainment'
    when 'gaming' then 'gaming'
    when 'camera' then 'camera'
    when 'travel' then 'travel'
    when 'places' then 'places'
    when 'education' then 'education'
    when 'gifts' then 'gifts'
    when 'tech' then 'tech'
    when 'banking' then 'banking'
    when 'income' then 'income'
    else icon
  end
where icon = 'others';

update public.categories
set color = case lower(name)
    when 'food & drink' then '#3C8A61'
    when 'transport' then '#67B47C'
    when 'shopping' then '#E5B24A'
    when 'bills & utilities' then '#7BAA90'
    when 'healthcare' then '#2E9B57'
    when 'entertainment' then '#8BB89D'
    when 'travel' then '#25543D'
    when 'others' then '#A8D3B7'
    else color
  end,
  monthly_budget = case lower(name)
    when 'food & drink' then 600
    when 'transport' then 250
    when 'shopping' then 300
    when 'bills & utilities' then 150
    when 'healthcare' then 150
    when 'entertainment' then 200
    when 'travel' then 400
    when 'others' then 200
    else monthly_budget
  end
where is_default = true;
