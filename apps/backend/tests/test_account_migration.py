import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260814032352_persist_accounts_and_expense_accounts.sql"
)


class AccountMigrationTests(unittest.TestCase):
    def setUp(self):
        self.sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

    def test_defines_account_contract_and_expense_backfill(self):
        self.assertIn("create table public.accounts", self.sql)
        self.assertIn("accounts_type_check", self.sql)
        self.assertIn("accounts_color_format_check", self.sql)
        self.assertIn("accounts_last_four_format_check", self.sql)
        self.assertIn("accounts_user_name_unique_idx", self.sql)
        self.assertIn("set account_id = accounts.id", self.sql)
        self.assertIn("alter column account_id set not null", self.sql)
        self.assertIn("on delete restrict", self.sql)

    def test_defines_rls_grants_ownership_and_new_user_provisioning(self):
        self.assertIn("alter table public.accounts enable row level security", self.sql)
        self.assertIn("accounts_select_own", self.sql)
        self.assertIn("(select auth.uid()) = user_id", self.sql)
        self.assertIn("grant select, insert, update, delete on table public.accounts to service_role", self.sql)
        self.assertIn("validate_expense_account_ownership", self.sql)
        self.assertIn("values (new.id, 'cash', 'cash'", self.sql)


if __name__ == "__main__":
    unittest.main()
