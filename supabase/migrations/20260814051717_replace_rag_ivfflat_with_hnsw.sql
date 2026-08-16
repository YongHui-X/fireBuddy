-- Use the robust cosine HNSW index for the small, changing RAG corpus.
drop index if exists public.rag_chunks_embedding_idx;

create index rag_chunks_embedding_idx
  on public.rag_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
