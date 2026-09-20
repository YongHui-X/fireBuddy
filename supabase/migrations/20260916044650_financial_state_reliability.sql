-- Keep essential selection replacements atomic and serialize concurrent saves per owner.
create or replace function public.replace_essential_categories(
  p_user_id uuid,
  p_category_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- The profile exists even when the current selection is empty, so it is a stable lock.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Unknown essential category owner' using errcode = '22023';
  end if;
  if p_category_ids is null or exists (
    select 1 from unnest(p_category_ids) as requested(category_id)
    where not exists (
      select 1 from public.categories category
      where category.id = requested.category_id
        and category.category_type = 'expense'
        and (category.is_default or category.user_id = p_user_id)
    )
  ) then
    raise exception 'Essential categories must be visible expense categories' using errcode = '22023';
  end if;

  delete from public.essential_expense_categories where user_id = p_user_id;
  insert into public.essential_expense_categories (user_id, category_id)
    select p_user_id, requested.category_id
    from (select distinct unnest(p_category_ids) as category_id) requested;
end;
$$;

-- One indexed lookup per requested owned position, returning only its newest value.
create or replace function public.get_latest_wealth_snapshots(
  p_user_id uuid,
  p_position_ids uuid[]
)
returns setof public.wealth_position_snapshots
language sql
stable
security invoker
set search_path = ''
as $$
  select snapshot.*
  from public.wealth_positions position
  cross join lateral (
    select value.* from public.wealth_position_snapshots value
    where value.wealth_position_id = position.id and value.user_id = p_user_id
    order by value.value_date desc
    limit 1
  ) snapshot
  where position.user_id = p_user_id and position.id = any(p_position_ids);
$$;

revoke execute on function public.replace_essential_categories(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.get_latest_wealth_snapshots(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.replace_essential_categories(uuid, uuid[]) to service_role;
grant execute on function public.get_latest_wealth_snapshots(uuid, uuid[]) to service_role;

notify pgrst, 'reload schema';
