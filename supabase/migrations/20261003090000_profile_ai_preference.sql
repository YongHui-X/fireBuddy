-- Per-user AI consent. The backend enforces it before any OpenAI call; the browser
-- never reads profiles directly (service-role access only, see 20260813150220).
alter table public.profiles
  add column if not exists ai_preference text not null default 'off'
    constraint profiles_ai_preference_check check (ai_preference in ('off', 'guide', 'personalised')),
  add column if not exists ai_consented_at timestamptz;

comment on column public.profiles.ai_preference is
  'off: no AI calls. guide: curated guidance only, question scrubbed. personalised: masked aggregates added.';
comment on column public.profiles.ai_consented_at is
  'When the user last chose guide or personalised. Null while off (consent withdrawn).';
