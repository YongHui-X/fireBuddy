-- Draft edits never replace the active plan. Legacy columns remain for review.
alter table public.fire_profiles
  add column draft_plan jsonb,
  add column active_plan jsonb,
  add constraint fire_draft_shape check (draft_plan is null or
    (jsonb_typeof(draft_plan) = 'object' and draft_plan ? 'inputs' and draft_plan ? 'step')),
  add constraint fire_active_version check (active_plan is null or
    (jsonb_typeof(active_plan) = 'object' and active_plan @> '{"version":2}'::jsonb));

alter table public.fire_profiles enable row level security;
-- Preserve the existing owner policies and backend-only application data boundary.
revoke all on table public.fire_profiles from anon, authenticated;
grant select, insert, update, delete on table public.fire_profiles to service_role;
comment on column public.fire_profiles.active_plan is 'Confirmed individual SGD monthly cash flow plan v2. Null means review required.';
