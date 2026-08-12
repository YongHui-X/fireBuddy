import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260812042442_secure_rag_access.sql"
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
        self.assertIn("revoke execute on function public.match_rag_chunks", sql)


if __name__ == "__main__":
    unittest.main()
