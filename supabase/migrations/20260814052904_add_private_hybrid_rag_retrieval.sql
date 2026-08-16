-- Add keyword ranking and fuse it with cosine similarity for backend RAG retrieval.
alter table public.rag_chunks
  add column if not exists search_vector tsvector
  generated always as (
    pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.simple'::pg_catalog.regconfig,
        coalesce(source_title, '')
      ),
      'A'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.simple'::pg_catalog.regconfig,
        coalesce(headline, '')
      ),
      'A'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.simple'::pg_catalog.regconfig,
        coalesce(topic, '')
      ),
      'B'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.simple'::pg_catalog.regconfig,
        content
      ),
      'C'
    )
  ) stored;

create index if not exists rag_chunks_search_vector_idx
  on public.rag_chunks
  using gin (search_vector);

drop function if exists public.hybrid_match_rag_chunks(
  text,
  extensions.vector,
  integer,
  integer
);

create or replace function public.hybrid_match_rag_chunks(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count integer default 5,
  candidate_count integer default 10,
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
  similarity double precision
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
        'pg_catalog.simple'::pg_catalog.regconfig,
        query_text
      )
      else pg_catalog.to_tsquery(
        'pg_catalog.simple'::pg_catalog.regconfig,
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
    from public.rag_chunks
    cross join query_config
    where rag_chunks.search_vector operator(pg_catalog.@@) query_config.full_text_query
    order by rank_index
    limit least(
      greatest(coalesce(candidate_count, 10), coalesce(match_count, 5), 1),
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
    from public.rag_chunks
    order by rank_index
    limit least(
      greatest(coalesce(candidate_count, 10), coalesce(match_count, 5), 1),
      50
    )
  ),
  fused as (
    select
      coalesce(full_text.id, semantic.id) as id,
      coalesce(1.0 / (greatest(coalesce(rrf_k, 50), 1) + full_text.rank_index), 0.0)
        * greatest(coalesce(full_text_weight, 0.6), 0.0)
        + coalesce(1.0 / (greatest(coalesce(rrf_k, 50), 1) + semantic.rank_index), 0.0)
        * greatest(coalesce(semantic_weight, 1.0), 0.0) as fused_score
    from full_text
    full outer join semantic on full_text.id = semantic.id
  ),
  scored as (
    select
      rag_chunks.*,
      fused.fused_score,
      rag_chunks.embedding operator(extensions.<=>) query_embedding as vector_distance
    from fused
    join public.rag_chunks on rag_chunks.id = fused.id
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
        pg_catalog.left(
          deduplicated.content,
          case when deduplicated.source_rank = 1 then 1150 else 550 end
        ),
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
    1 - deduplicated.vector_distance as similarity
  from deduplicated
  join source_context on source_context.source_path = deduplicated.source_path
  where deduplicated.source_rank = 1
  order by deduplicated.fused_score desc, deduplicated.vector_distance, deduplicated.id
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;

revoke execute on function public.hybrid_match_rag_chunks(
  text,
  extensions.vector,
  integer,
  integer,
  double precision,
  double precision,
  integer
) from public, anon, authenticated, service_role;
grant execute on function public.hybrid_match_rag_chunks(
  text,
  extensions.vector,
  integer,
  integer,
  double precision,
  double precision,
  integer
) to service_role;

comment on function public.hybrid_match_rag_chunks(
  text,
  extensions.vector,
  integer,
  integer,
  double precision,
  double precision,
  integer
) is 'Private service-role RAG retrieval using simple full text search and reciprocal rank fusion.';
