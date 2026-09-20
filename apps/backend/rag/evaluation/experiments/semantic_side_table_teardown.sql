drop function if exists public.hybrid_match_rag_chunks_semantic(text, extensions.vector, integer, integer, double precision, double precision, integer);
drop table if exists public.rag_chunks_semantic cascade;
notify pgrst, 'reload schema';
