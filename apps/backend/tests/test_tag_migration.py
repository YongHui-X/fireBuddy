import unittest
from pathlib import Path


MIGRATION = Path(__file__).resolve().parents[3] / "supabase" / "migrations" / "20260909163854_transaction_tags_and_export.sql"


class TagMigrationTests(unittest.TestCase):
    def setUp(self):
        self.sql = MIGRATION.read_text(encoding="utf-8").lower()

    def test_enforces_names_ownership_limit_and_safe_detachment(self):
        self.assertIn("tags_user_name_unique_idx", self.sql)
        self.assertIn("lower(name)", self.sql)
        self.assertIn("tags_name_length_check", self.sql)
        self.assertIn("tags_name_separator_check", self.sql)
        self.assertIn("transaction_tags_transaction_owner_fkey", self.sql)
        self.assertIn("transaction_tags_tag_owner_fkey", self.sql)
        self.assertIn("on delete cascade", self.sql)
        self.assertIn("enforce_transaction_tag_limit_trigger", self.sql)

    def test_applies_rls_and_restricts_atomic_functions_to_service_role(self):
        self.assertIn("alter table public.tags enable row level security", self.sql)
        self.assertIn("alter table public.transaction_tags enable row level security", self.sql)
        self.assertIn("(select auth.uid()) = user_id", self.sql)
        self.assertIn("security invoker", self.sql)
        self.assertIn("create_transaction_with_tags", self.sql)
        self.assertIn("update_transaction_with_tags", self.sql)
        self.assertIn("to service_role", self.sql)


if __name__ == "__main__":
    unittest.main()
