begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(11);

select has_column('public', 'wealth_positions', 'interest_rate', 'liabilities can store an annual interest rate');
select has_column('public', 'wealth_positions', 'monthly_payment', 'liabilities can store a monthly payment');
select has_column('public', 'wealth_positions', 'next_payment_date', 'liabilities can store the next payment date');
select has_column('public', 'wealth_positions', 'original_principal', 'liabilities can store the original principal');

insert into auth.users (id, email) values
  ('96000000-0000-4000-8000-000000000001', 'debt-terms@example.test');

select lives_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class, interest_rate, monthly_payment, next_payment_date, original_principal)
  values ('97000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', 'Car loan', 'liability', 'loan', 'less_liquid', 0.0350, 546.50, '2026-10-01', 30000)
$$, 'a liability accepts full debt terms');

select lives_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class, interest_rate, monthly_payment)
  values ('97000000-0000-4000-8000-000000000002', '96000000-0000-4000-8000-000000000001', 'Visa', 'liability', 'credit_card', 'liquid', 0.2600, 250)
$$, 'credit_card is an accepted liability type');

select lives_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class)
  values ('97000000-0000-4000-8000-000000000003', '96000000-0000-4000-8000-000000000001', 'Old loan', 'liability', 'loan', 'less_liquid')
$$, 'debt terms remain optional for a liability');

select throws_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class, interest_rate)
  values ('97000000-0000-4000-8000-000000000004', '96000000-0000-4000-8000-000000000001', 'Brokerage', 'asset', 'investment', 'less_liquid', 0.05)
$$, '23514', null, 'an asset cannot carry debt terms');

select throws_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class, monthly_payment)
  values ('97000000-0000-4000-8000-000000000005', '96000000-0000-4000-8000-000000000001', 'Negative', 'liability', 'loan', 'less_liquid', -1)
$$, '23514', null, 'a negative monthly payment is rejected');

select throws_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class, interest_rate)
  values ('97000000-0000-4000-8000-000000000006', '96000000-0000-4000-8000-000000000001', 'Loan shark', 'liability', 'loan', 'less_liquid', 1.5)
$$, '23514', null, 'an interest rate above 100 percent is rejected');

select throws_ok($$
  insert into public.wealth_positions (id, user_id, name, position_kind, position_type, liquidity_class, include_in_fi, interest_rate)
  values ('97000000-0000-4000-8000-000000000007', '96000000-0000-4000-8000-000000000001', 'Card', 'liability', 'credit_card', 'liquid', true, 0.26)
$$, '23514', null, 'a credit card still cannot be included in FI assets');

select * from finish();
rollback;
