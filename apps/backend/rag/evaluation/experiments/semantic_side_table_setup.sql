drop table if exists public.rag_chunks_semantic cascade;
create table public.rag_chunks_semantic (like public.rag_chunks including all);
create or replace function public.hybrid_match_rag_chunks_semantic(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count integer default 5,
  candidate_count integer default 20,
  full_text_weight double precision default 0.6,
  semantic_weight double precision default 1.0,
  rrf_k integer default 50
)
returns table (
  id uuid,
  source_path text,
  source_type text,
  source_title text,
  source_url text,
  agency text,
  topic text,
  chunk_index integer,
  headline text,
  content text,
  similarity double precision,
  fused_score double precision,
  signal_count integer
)
language sql
stable
set search_path = ''
as $$
  with query_terms as (
    select distinct term
    from pg_catalog.regexp_split_to_table(
      pg_catalog.lower(query_text),
      '[^[:alnum:]]+'
    ) as term
    where pg_catalog.length(term) > 1
      and term <> all (array[
        'about', 'and', 'are', 'can', 'could', 'does', 'explain', 'for',
        'from', 'give', 'how', 'into', 'its', 'that', 'the', 'their',
        'these', 'this', 'those', 'under', 'what', 'when', 'where',
        'which', 'who', 'why', 'with', 'would', 'you', 'your'
      ])
  ),
  query_config as (
    select case
      when pg_catalog.count(*) = 0 then pg_catalog.plainto_tsquery(
        'pg_catalog.english'::pg_catalog.regconfig,
        query_text
      )
      else pg_catalog.to_tsquery(
        'pg_catalog.english'::pg_catalog.regconfig,
        pg_catalog.string_agg(term || ':*', ' | ' order by term)
      )
    end as full_text_query
    from query_terms
  ),
  full_text as (
    select
      rag_chunks.id,
      row_number() over (
        order by pg_catalog.ts_rank_cd(
          rag_chunks.search_vector,
          query_config.full_text_query
        ) desc,
        rag_chunks.id
      ) as rank_index
    from public.rag_chunks_semantic as rag_chunks
    cross join query_config
    where rag_chunks.search_vector operator(pg_catalog.@@) query_config.full_text_query
    order by rank_index
    limit least(
      greatest(coalesce(candidate_count, 20), coalesce(match_count, 5), 1),
      50
    )
  ),
  semantic as (
    select
      rag_chunks.id,
      row_number() over (
        order by rag_chunks.embedding operator(extensions.<=>) query_embedding,
        rag_chunks.id
      ) as rank_index
    from public.rag_chunks_semantic as rag_chunks
    order by rank_index
    limit least(
      greatest(coalesce(candidate_count, 20), coalesce(match_count, 5), 1),
      50
    )
  ),
  fused as (
    select
      coalesce(full_text.id, semantic.id) as id,
      coalesce(1.0 / (greatest(coalesce(rrf_k, 50), 1) + full_text.rank_index), 0.0)
        * greatest(coalesce(full_text_weight, 0.6), 0.0)
        + coalesce(1.0 / (greatest(coalesce(rrf_k, 50), 1) + semantic.rank_index), 0.0)
        * greatest(coalesce(semantic_weight, 1.0), 0.0) as fused_score,
      (case when full_text.id is null then 0 else 1 end)
        + (case when semantic.id is null then 0 else 1 end) as signal_count
    from full_text
    full outer join semantic on full_text.id = semantic.id
  ),
  scored as (
    select
      rag_chunks.*,
      fused.fused_score,
      fused.signal_count,
      rag_chunks.embedding operator(extensions.<=>) query_embedding as vector_distance
    from fused
    join public.rag_chunks_semantic as rag_chunks on rag_chunks.id = fused.id
  ),
  deduplicated as (
    select
      scored.*,
      row_number() over (
        partition by scored.source_path
        order by scored.fused_score desc, scored.vector_distance, scored.id
      ) as source_rank
    from scored
  ),
  source_context as (
    select
      deduplicated.source_path,
      pg_catalog.count(*) as candidate_count,
      pg_catalog.max(deduplicated.content)
        filter (where deduplicated.source_rank = 1) as primary_content,
      pg_catalog.string_agg(
        pg_catalog.left(deduplicated.content, 2200),
        E'\n\n--- Related chunk ---\n\n'
        order by deduplicated.chunk_index
      ) filter (where deduplicated.source_rank <= 2) as combined_content
    from deduplicated
    group by deduplicated.source_path
  )
  select
    deduplicated.id,
    deduplicated.source_path,
    deduplicated.source_type,
    deduplicated.source_title,
    deduplicated.source_url,
    deduplicated.agency,
    deduplicated.topic,
    deduplicated.chunk_index,
    deduplicated.headline,
    case
      when source_context.candidate_count > 1 then source_context.combined_content
      else source_context.primary_content
    end as content,
    1 - deduplicated.vector_distance as similarity,
    deduplicated.fused_score,
    deduplicated.signal_count
  from deduplicated
  join source_context on source_context.source_path = deduplicated.source_path
  where deduplicated.source_rank = 1
  order by deduplicated.fused_score desc, deduplicated.vector_distance, deduplicated.id
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;

notify pgrst, 'reload schema';
grant select, insert, update, delete on public.rag_chunks_semantic to service_role;
grant execute on function public.hybrid_match_rag_chunks_semantic(text, extensions.vector, integer, integer, double precision, double precision, integer) to service_role;
notify pgrst, 'reload schema';
