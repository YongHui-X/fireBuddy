import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = REPO_ROOT / "supabase" / "migrations" / "20260823045641_dashboard_foundation.sql"


class DashboardFoundationMigrationTests(unittest.TestCase):
    def setUp(self):
        self.sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

    def test_defines_separate_wealth_history_contribution_and_profile_tables(self):
        for table in ("wealth_positions", "wealth_position_snapshots", "wealth_contributions", "fire_profiles", "essential_expense_categories"):
            self.assertIn(f"create table public.{table}", self.sql)
        self.assertIn("wealth_positions_emergency_eligibility_check", self.sql)
        self.assertIn("wealth_position_snapshots_position_date_unique", self.sql)
        self.assertIn("wealth contributions require an active fi-included asset", self.sql)

    def test_protects_every_new_table_with_rls_and_backend_only_grants(self):
        for table in ("wealth_positions", "wealth_position_snapshots", "wealth_contributions", "fire_profiles", "essential_expense_categories"):
            self.assertIn(f"alter table public.{table} enable row level security", self.sql)
        self.assertGreaterEqual(self.sql.count("(select auth.uid()) = user_id"), 20)
        self.assertIn("from public, anon, authenticated, service_role", self.sql)
        self.assertIn("to service_role", self.sql)


if __name__ == "__main__":
    unittest.main()
