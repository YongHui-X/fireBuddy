import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
TESTS_DIR = Path(__file__).resolve().parent
for path in (BACKEND_DIR, TESTS_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from fake_supabase import FakeSupabase
from lib.auth import AuthenticatedUser, get_current_user
from main import app
from routers import analytics as analytics_router
from routers import fire as fire_router
from routers import wealth as wealth_router
from services import financial_repository


USER_ID = "10000000-0000-4000-8000-000000000001"
OTHER_USER_ID = "10000000-0000-4000-8000-000000000002"
POSITION_ID = "50000000-0000-4000-8000-000000000001"
OTHER_POSITION_ID = "50000000-0000-4000-8000-000000000002"


def position_row(position_id: str, user_id: str, name: str) -> dict:
    return {
        "id": position_id, "user_id": user_id, "name": name, "position_kind": "asset",
        "position_type": "investment", "liquidity_class": "less_liquid", "include_in_fi": True,
        "is_emergency_fund": False, "restriction_type": "none", "currency": "SGD", "is_archived": False,
        "archived_at": None, "created_at": "2026-08-01T00:00:00+00:00", "updated_at": "2026-08-01T00:00:00+00:00",
    }


class FinancialRouteTests(unittest.TestCase):
    def setUp(self):
        self.supabase = FakeSupabase({
            "wealth_positions": [position_row(POSITION_ID, USER_ID, "Brokerage"), position_row(OTHER_POSITION_ID, OTHER_USER_ID, "Hidden")],
            "wealth_position_snapshots": [], "wealth_contributions": [], "fire_profiles": [],
            "essential_expense_categories": [], "expenses": [], "categories": [],
        })
        self.patchers = [
            patch.object(wealth_router, "supabase", self.supabase),
            patch.object(fire_router, "supabase", self.supabase),
            patch.object(financial_repository, "supabase", self.supabase),
        ]
        for patcher in self.patchers:
            patcher.start()
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        for patcher in reversed(self.patchers):
            patcher.stop()

    def test_position_snapshot_contribution_crud_and_owner_isolation(self):
        listing = self.client.get("/wealth/positions")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([row["id"] for row in listing.json()], [POSITION_ID])
        self.assertEqual(self.client.get(f"/wealth/positions/{OTHER_POSITION_ID}").status_code, 404)

        snapshot = self.client.post(f"/wealth/positions/{POSITION_ID}/snapshots", json={"valueDate": "2026-08-20", "amount": "192000"})
        self.assertEqual(snapshot.status_code, 201)
        self.assertEqual(snapshot.json()["amount"], "192000")
        contribution = self.client.post("/wealth/contributions", json={
            "wealthPositionId": POSITION_ID, "contributionDate": "2026-08-20", "amount": "2500", "note": "Monthly",
        })
        self.assertEqual(contribution.status_code, 201)
        self.assertEqual(self.client.get("/wealth/contributions").status_code, 200)

        self.assertEqual(self.client.delete(f"/wealth/positions/{POSITION_ID}").status_code, 204)
        archived = next(row for row in self.supabase.rows["wealth_positions"] if row["id"] == POSITION_ID)
        self.assertTrue(archived["is_archived"])

    def test_profile_validation_scenario_and_summary_states(self):
        invalid = self.client.put("/fire/profile", json={
            "monthlyContribution": "1000", "expectedReturnRate": "0.31", "inflationRate": "0.02",
            "withdrawalRate": "0.04", "retirementSpendingOverride": "4000", "targetFiDate": "2042-08-23", "birthYear": 1994,
        })
        self.assertEqual(invalid.status_code, 422)
        saved = self.client.put("/fire/profile", json={
            "monthlyContribution": "2500", "expectedReturnRate": "0.07", "inflationRate": "0.02",
            "withdrawalRate": "0.04", "retirementSpendingOverride": "4000", "targetFiDate": "2042-08-23", "birthYear": 1994,
        })
        self.assertEqual(saved.status_code, 200)
        self.assertTrue(self.client.get("/fire/profile").json()["configured"])

        summary = self.client.get("/analytics/financial-summary?asOf=2026-08-23")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.json()["snapshotStatus"], "missing")
        scenario = self.client.post("/fire/scenario", json={"asOf": "2026-08-23", "monthlyContribution": "3000"})
        self.assertEqual(scenario.status_code, 200)
        self.assertEqual(scenario.json()["status"], "insufficient_data")

    def test_rejects_future_actual_records(self):
        response = self.client.post(f"/wealth/positions/{POSITION_ID}/snapshots", json={"valueDate": "2200-01-01", "amount": "1"})
        self.assertEqual(response.status_code, 422)

    def test_retirement_draft_active_scenario_and_owner_isolation(self):
        from test_retirement_calculator import FIXTURES
        from copy import deepcopy
        plan = {**FIXTURES['base'], 'birthMonth': '1990-01', 'retirementMonth': '2040-01',
                'portfolioOverride': {'amount': 100000, 'date': '2026-01-01'}}
        legacy = {'monthlyContribution': '0', 'expectedReturnRate': '0.05', 'inflationRate': '0.025', 'withdrawalRate': '0.04'}
        activated = self.client.put('/fire/profile', json={**legacy, 'activePlan': plan})
        self.assertEqual(activated.status_code, 200, activated.text)
        before = self.client.post('/fire/calculate', json={}).json()
        self.assertEqual(before['calculationVersion'], 'sg-monthly.v2')
        saved = self.client.put('/fire/profile', json={**legacy, 'draftPlan': {'step': 2, 'inputs': {**plan, 'monthlySpending': 9999}}})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()['activePlan'], activated.json()['activePlan'])
        self.assertEqual(self.client.get('/fire/profile').json()['profile']['draftPlan']['step'], 2)
        bad = self.client.put('/fire/profile', json={**legacy, 'activePlan': {**plan, 'retirementMonth': '2200-01'}})
        self.assertEqual(bad.status_code, 422)
        records = deepcopy(self.supabase.rows)
        scenario = self.client.post('/fire/scenario', json={'planOverrides': {'monthlySpending': 2000, 'beforeReturn': -0.02}})
        self.assertEqual(scenario.status_code, 200, scenario.text)
        self.assertNotEqual(scenario.json()['fiTarget'], before['fiTarget'])
        self.assertEqual(self.supabase.rows, records)
        self.assertEqual(self.client.post('/fire/calculate', json={}).json(), before)
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=OTHER_USER_ID)
        self.assertIsNone(self.client.get('/fire/profile').json()['profile'])
        self.assertEqual(self.client.post('/fire/calculate', json={}).json()['fundingStatus'], 'review_required')

    def test_retirement_activation_rejects_foreign_and_restricted_assets(self):
        from test_retirement_calculator import FIXTURES
        plan = {**FIXTURES['base'], 'birthMonth': '1990-01', 'retirementMonth': '2040-01', 'assetIds': [OTHER_POSITION_ID]}
        legacy = {'monthlyContribution': '0', 'expectedReturnRate': '0.05', 'inflationRate': '0.025', 'withdrawalRate': '0.04'}
        response = self.client.put('/fire/profile', json={**legacy, 'activePlan': plan})
        self.assertEqual(response.status_code, 422)
        self.client.post(f'/wealth/positions/{POSITION_ID}/snapshots', json={'amount': '50000', 'valueDate': '2026-01-01'})
        owned = next(p for p in self.supabase.rows['wealth_positions'] if p['id'] == POSITION_ID)
        owned['position_type'] = 'property'
        response = self.client.put('/fire/profile', json={**legacy, 'activePlan': {**plan, 'assetIds': [POSITION_ID]}})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
