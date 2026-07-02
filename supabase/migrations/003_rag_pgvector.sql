-- FireBuddy RAG document store.
-- Stores embedded knowledge-base chunks for semantic retrieval.

create extension if not exists vector with schema extensions;

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  source_type text not null,
  source_title text not null,
  source_url text,
  agency text,
  topic text,
  chunk_index integer not null,
  headline text not null,
  content text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),

  constraint rag_chunks_source_chunk_unique
    unique (source_path, chunk_index)
);

create index if not exists rag_chunks_embedding_idx
  on public.rag_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

create index if not exists rag_chunks_source_path_idx
  on public.rag_chunks (source_path);

create index if not exists rag_chunks_topic_idx
  on public.rag_chunks (topic);

create or replace function public.match_rag_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 5
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
as $$
  select
    rag_chunks.id,
    rag_chunks.source_path,
    rag_chunks.source_type,
    rag_chunks.source_title,
    rag_chunks.source_url,
    rag_chunks.agency,
    rag_chunks.topic,
    rag_chunks.chunk_index,
    rag_chunks.headline,
    rag_chunks.content,
    1 - (rag_chunks.embedding <=> query_embedding) as similarity
  from public.rag_chunks
  order by rag_chunks.embedding <=> query_embedding
  limit match_count;
$$;
