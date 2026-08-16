import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260812042442_secure_rag_access.sql"
)
HNSW_MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260814051717_replace_rag_ivfflat_with_hnsw.sql"
)
HYBRID_MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260814052904_add_private_hybrid_rag_retrieval.sql"
)


class RagSecurityMigrationTests(unittest.TestCase):
    def test_migration_enables_rls_and_restricts_public_roles(self):
        sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("alter table public.rag_chunks enable row level security", sql)
        self.assertIn(
            "revoke all on table public.rag_chunks from public, anon, authenticated",
            sql,
        )
        self.assertIn("grant select, insert, update, delete", sql)
        self.assertIn("to service_role", sql)
        self.assertIn("rag_chunks_service_role_backend_only", sql)
        self.assertIn(
            "revoke execute on function public.match_rag_chunks(extensions.vector, integer)\n  from public, anon, authenticated",
            sql,
        )
        self.assertIn(
            "grant execute on function public.match_rag_chunks(extensions.vector, integer)\n  to service_role",
            sql,
        )

    def test_hnsw_migration_replaces_the_cosine_ivfflat_index(self):
        sql = HNSW_MIGRATION_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("drop index if exists public.rag_chunks_embedding_idx", sql)
        self.assertIn("using hnsw (embedding extensions.vector_cosine_ops)", sql)
        self.assertNotIn("using ivfflat", sql)

    def test_hybrid_migration_adds_simple_full_text_rrf_for_service_role(self):
        sql = HYBRID_MIGRATION_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("search_vector tsvector", sql)
        self.assertIn("'pg_catalog.simple'::pg_catalog.regconfig", sql)
        self.assertIn("regexp_split_to_table", sql)
        self.assertIn("term || ':*'", sql)
        self.assertIn("using gin (search_vector)", sql)
        self.assertIn("full outer join semantic", sql)
        self.assertIn("candidate_count integer default 10", sql)
        self.assertIn("full_text_weight double precision default 0.6", sql)
        self.assertIn("semantic_weight double precision default 1.0", sql)
        self.assertIn("partition by scored.source_path", sql)
        self.assertIn("related chunk", sql)
        self.assertIn("deduplicated.source_rank <= 2", sql)
        self.assertIn("set search_path = ''", sql)
        self.assertIn(
            ") from public, anon, authenticated, service_role",
            sql,
        )
        self.assertIn(
            ") to service_role",
            sql,
        )
        self.assertNotIn("security definer", sql)


if __name__ == "__main__":
    unittest.main()
