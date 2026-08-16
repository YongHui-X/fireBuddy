import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260813150220_align_uuid_security_and_grants.sql"
)


class SchemaAlignmentMigrationTests(unittest.TestCase):
    def test_migration_preserves_legacy_ids_and_enforces_uuid_contract(self):
        sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("add column if not exists legacy_id integer", sql)
        self.assertIn("alter column id set default gen_random_uuid()", sql)
        self.assertIn("categories_legacy_id_unique_idx", sql)
        self.assertIn("expenses_legacy_id_unique_idx", sql)
        self.assertIn("alter column amount type numeric(10,2)", sql)
        self.assertIn("expenses_amount_positive", sql)
        self.assertIn("categories_valid_ownership_state", sql)
        self.assertIn("expenses_category_id_idx", sql)

    def test_migration_hardens_policies_functions_and_grants(self):
        sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("to authenticated", sql)
        self.assertIn("(select auth.uid())", sql)
        self.assertIn("set search_path = ''", sql)
        self.assertIn("rag_chunks_service_role_backend_only", sql)
        self.assertIn("revoke all on table public.profiles", sql)
        self.assertIn("alter default privileges for role postgres", sql)
        self.assertNotIn("alter default privileges for role supabase_admin", sql)


if __name__ == "__main__":
    unittest.main()
