import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATION_PATH = REPO_ROOT / "supabase" / "migrations" / "20261003090000_profile_ai_preference.sql"


class ProfileAiPreferenceMigrationTests(unittest.TestCase):
    def test_migration_adds_consent_columns_with_a_closed_default(self):
        sql = MIGRATION_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("alter table public.profiles", sql)
        self.assertIn("ai_preference text not null default 'off'", sql)
        self.assertIn("check (ai_preference in ('off', 'guide', 'personalised'))", sql)
        self.assertIn("ai_consented_at timestamptz", sql)
        # The browser must keep no direct access; only the backend reads these columns.
        self.assertNotIn("grant", sql)
        self.assertNotIn("policy", sql)


if __name__ == "__main__":
    unittest.main()
