-- Keep shared RAG content private to trusted backend service-role clients.
-- The table remains in public for PostgREST-backed Python clients, but browser
-- roles receive neither table privileges nor RPC execution rights.

alter table public.rag_chunks enable row level security;

revoke all on table public.rag_chunks from public, anon, authenticated;
grant select, insert, update, delete on table public.rag_chunks to service_role;

revoke execute on function public.match_rag_chunks(extensions.vector, integer)
  from public, anon, authenticated;
grant execute on function public.match_rag_chunks(extensions.vector, integer)
  to service_role;

comment on table public.rag_chunks is
  'Shared FireBuddy RAG chunks accessible only through trusted backend service-role clients.';
