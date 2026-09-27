-- Let liabilities carry the terms needed to project a payoff: annual interest rate,
-- monthly payment, next payment date and the original principal. Balances stay as
-- dated snapshots; contributions remain FI-asset only, so nothing here changes how
-- repayments are recorded.

alter table public.wealth_positions
  add column interest_rate numeric(6,4)
    check (interest_rate is null or (interest_rate >= 0 and interest_rate <= 1)),
  add column monthly_payment numeric(10,2)
    check (monthly_payment is null or monthly_payment >= 0),
  add column next_payment_date date,
  add column original_principal numeric(10,2)
    check (original_principal is null or original_principal >= 0),
  add constraint wealth_positions_debt_terms_liability_only_check check (
    position_kind = 'liability' or (
      interest_rate is null
      and monthly_payment is null
      and next_payment_date is null
      and original_principal is null
    )
  );

comment on column public.wealth_positions.interest_rate is
  'Annual interest rate as a fraction (0.0650 = 6.5%). Liabilities only.';
comment on column public.wealth_positions.monthly_payment is
  'Regular monthly repayment in SGD used to project the payoff month. Liabilities only.';
comment on column public.wealth_positions.next_payment_date is
  'Next scheduled repayment date. Liabilities only.';
comment on column public.wealth_positions.original_principal is
  'Amount originally borrowed, for progress display. Liabilities only.';

-- Credit cards are the canonical high-interest liability the recommended action targets.
alter table public.wealth_positions drop constraint wealth_positions_position_type_check;
alter table public.wealth_positions add constraint wealth_positions_position_type_check
  check (position_type in ('cash', 'investment', 'property', 'mortgage', 'loan', 'credit_card', 'cpf', 'other'));

notify pgrst, 'reload schema';
