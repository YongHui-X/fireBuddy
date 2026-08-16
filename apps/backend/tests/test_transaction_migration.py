import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = (
    REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260814130244_add_income_transactions.sql"
)


class TransactionMigrationTests(unittest.TestCase):
    def setUp(self):
        self.sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

    def test_backfills_types_and_seeds_income_categories(self):
        self.assertIn("category_type text not null default 'expense'", self.sql)
        self.assertIn("transaction_type text not null default 'expense'", self.sql)
        self.assertIn("categories_type_check", self.sql)
        self.assertIn("expenses_transaction_type_check", self.sql)
        self.assertIn("categories_income_budget_zero_check", self.sql)
        for name in ("salary", "bonus", "dividends", "interest", "other income"):
            self.assertIn(f"('{name}'", self.sql)

    def test_enforces_matching_types_indexes_rls_and_grants(self):
        self.assertIn("category.category_type = new.transaction_type", self.sql)
        self.assertIn("validate_category_type_change_trigger", self.sql)
        self.assertIn("stored_transaction.transaction_type <> new.category_type", self.sql)
        self.assertIn("expenses_user_type_date_idx", self.sql)
        self.assertIn("expenses_user_type_category_idx", self.sql)
        self.assertIn("alter table public.categories enable row level security", self.sql)
        self.assertIn("alter table public.expenses enable row level security", self.sql)
        self.assertIn("to service_role", self.sql)


if __name__ == "__main__":
    unittest.main()
