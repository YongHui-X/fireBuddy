import sys
import unittest
from decimal import Decimal
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError


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

    def test_foreign_wealth_children_and_mutations_are_rejected(self):
        """Foreign positions, snapshots and contributions stay unreadable and unchanged."""
        snapshot = self.supabase.complete_row("wealth_position_snapshots", {
            "user_id": OTHER_USER_ID, "wealth_position_id": OTHER_POSITION_ID,
            "value_date": "2026-08-20", "amount": "999999",
        })
        contribution = self.supabase.complete_row("wealth_contributions", {
            "user_id": OTHER_USER_ID, "wealth_position_id": OTHER_POSITION_ID,
            "contribution_date": "2026-08-20", "amount": "999999", "note": "Private",
        })
        self.supabase.rows["wealth_position_snapshots"].append(snapshot)
        self.supabase.rows["wealth_contributions"].append(contribution)
        before = deepcopy(self.supabase.rows)
        self.assertEqual(self.client.get("/wealth/contributions").json(), [])
        requests = [
            ("PUT", f"/wealth/positions/{OTHER_POSITION_ID}", {"name": "Changed"}),
            ("DELETE", f"/wealth/positions/{OTHER_POSITION_ID}", None),
            ("GET", f"/wealth/positions/{OTHER_POSITION_ID}/snapshots", None),
            ("POST", f"/wealth/positions/{OTHER_POSITION_ID}/snapshots", {"amount": "1", "valueDate": "2026-08-20"}),
            ("POST", "/wealth/contributions", {"wealthPositionId": OTHER_POSITION_ID, "amount": "1", "contributionDate": "2026-08-20"}),
            ("PUT", f"/wealth/contributions/{contribution['id']}", {"amount": "1", "contributionDate": "2026-08-20"}),
            ("DELETE", f"/wealth/contributions/{contribution['id']}", None),
        ]
        for position_id in (POSITION_ID, OTHER_POSITION_ID):
            path = f"/wealth/positions/{position_id}/snapshots/{snapshot['id']}"
            requests.extend([("PUT", path, {"amount": "1", "valueDate": "2026-08-20"}), ("DELETE", path, None)])
        for method, path, payload in requests:
            with self.subTest(method=method, path=path):
                response = self.client.request(method, path, **({"json": payload} if payload is not None else {}))
                self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(self.supabase.rows, before)

    def test_analytics_excludes_another_users_financial_rows(self):
        """Foreign balances and spending must not change the caller's aggregate response."""
        path = "/analytics/financial-summary?asOf=2026-08-23"
        baseline = self.client.get(path)
        self.assertEqual(baseline.status_code, 200, baseline.text)
        self.supabase.rows["wealth_position_snapshots"].append(self.supabase.complete_row("wealth_position_snapshots", {
            "user_id": OTHER_USER_ID, "wealth_position_id": OTHER_POSITION_ID,
            "amount": "999999", "value_date": "2026-08-20",
        }))
        self.supabase.rows["expenses"].append(self.supabase.complete_row("expenses", {
            "user_id": OTHER_USER_ID, "amount": "999999", "date": "2026-08-20",
            "transaction_type": "expense", "category_id": "20000000-0000-4000-8000-000000000099",
        }))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), baseline.json())

    def test_fire_profile_update_and_scenario_preserve_another_users_plan(self):
        """Creating the caller's profile cannot overwrite or use a foreign saved plan."""
        payload = {"monthlyContribution": "2500", "expectedReturnRate": "0.07",
                   "inflationRate": "0.02", "withdrawalRate": "0.04"}
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=OTHER_USER_ID)
        saved = self.client.put("/fire/profile", json=payload)
        self.assertEqual(saved.status_code, 200, saved.text)
        foreign = deepcopy(self.supabase.rows["fire_profiles"])
        app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=USER_ID)
        self.assertIsNone(self.client.get("/fire/profile").json()["profile"])
        scenario = self.client.post("/fire/scenario", json={"asOf": "2026-08-23", "monthlyContribution": "100"})
        self.assertEqual(scenario.status_code, 200, scenario.text)
        self.assertEqual(self.supabase.rows["fire_profiles"], foreign)
        updated = self.client.put("/fire/profile", json={**payload, "monthlyContribution": "100"})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual([row for row in self.supabase.rows["fire_profiles"] if row["user_id"] == OTHER_USER_ID], foreign)

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

    def test_debt_terms_persist_on_liabilities_and_are_rejected_on_assets(self):
        created = self.client.post("/wealth/positions", json={
            "name": "Visa", "positionKind": "liability", "positionType": "credit_card", "liquidityClass": "liquid",
            "interestRate": "0.26", "monthlyPayment": "400", "nextPaymentDate": "2026-10-01",
        })
        self.assertEqual(created.status_code, 201, created.text)
        body = created.json()
        # The fake store echoes values as sent; Postgres would return "400.00", so compare numerically.
        self.assertEqual(Decimal(body["interestRate"]), Decimal("0.26"))
        self.assertEqual(Decimal(body["monthlyPayment"]), Decimal("400"))
        self.assertEqual(body["nextPaymentDate"], "2026-10-01")
        self.assertIsNone(body["originalPrincipal"])

        edited = self.client.put(f"/wealth/positions/{body['id']}", json={"monthlyPayment": "450"})
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual(Decimal(edited.json()["monthlyPayment"]), Decimal("450"))
        self.assertEqual(Decimal(edited.json()["interestRate"]), Decimal("0.26"))

        listed = self.client.get("/wealth/positions").json()
        self.assertEqual(Decimal(next(item for item in listed if item["id"] == body["id"])["monthlyPayment"]), Decimal("450"))

        asset = self.client.post("/wealth/positions", json={
            "name": "Brokerage 2", "positionKind": "asset", "positionType": "investment", "liquidityClass": "less_liquid", "interestRate": "0.05",
        })
        self.assertEqual(asset.status_code, 422)
        self.assertEqual(self.client.put(f"/wealth/positions/{POSITION_ID}", json={"monthlyPayment": "10"}).status_code, 422)
        self.assertEqual(self.client.post("/wealth/positions", json={
            "name": "Loan shark", "positionKind": "liability", "positionType": "loan", "liquidityClass": "liquid", "interestRate": "1.5",
        }).status_code, 422)

    def test_rejects_future_actual_records(self):
        response = self.client.post(f"/wealth/positions/{POSITION_ID}/snapshots", json={"valueDate": "2200-01-01", "amount": "1"})
        self.assertEqual(response.status_code, 422)

    def test_invalid_partial_position_edits_return_validation_errors_without_writing(self):
        before = deepcopy(self.supabase.rows)
        for payload in ({"isEmergencyFund": True}, {"liquidityClass": "restricted"}, {"name": None}):
            with self.subTest(payload=payload):
                response = self.client.put(f"/wealth/positions/{POSITION_ID}", json=payload)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertIsInstance(response.json()["detail"], str)
                self.assertEqual(self.supabase.rows, before)
        response = self.client.put(f"/wealth/positions/{POSITION_ID}", json={"name": "Renamed"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["name"], "Renamed")

    def test_essential_categories_replace_clear_and_reject_foreign_or_income_selections(self):
        category_id = "20000000-0000-4000-8000-000000000001"
        foreign_id = "20000000-0000-4000-8000-000000000002"
        income_id = "20000000-0000-4000-8000-000000000003"
        self.supabase.rows["categories"] = [
            {"id": category_id, "user_id": None, "is_default": True, "category_type": "expense"},
            {"id": foreign_id, "user_id": OTHER_USER_ID, "is_default": False, "category_type": "expense"},
            {"id": income_id, "user_id": USER_ID, "is_default": False, "category_type": "income"},
        ]
        other_selection = {"user_id": OTHER_USER_ID, "category_id": foreign_id}
        self.supabase.rows["essential_expense_categories"] = [other_selection]
        response = self.client.put("/fire/essential-categories", json={"categoryIds": [category_id, category_id]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["categoryIds"], [category_id])
        before = deepcopy(self.supabase.rows)
        for invalid_id in (foreign_id, income_id):
            response = self.client.put("/fire/essential-categories", json={"categoryIds": [invalid_id]})
            self.assertEqual(response.status_code, 422)
            self.assertEqual(self.supabase.rows, before)
        with patch.object(self.supabase, "rpc", side_effect=APIError({"code": "08006", "message": "Internal database detail"})):
            response = self.client.put("/fire/essential-categories", json={"categoryIds": []})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("Internal database detail", response.text)
        self.assertEqual(self.supabase.rows, before)
        self.assertEqual(self.client.put("/fire/essential-categories", json={"categoryIds": []}).status_code, 200)
        self.assertEqual(self.supabase.rows["essential_expense_categories"], [other_selection])

    def test_latest_values_and_bulk_history_are_owned_and_not_truncated(self):
        def snapshot(index, position_id=POSITION_ID, user_id=USER_ID):
            return self.supabase.complete_row("wealth_position_snapshots", {
                "wealth_position_id": position_id, "user_id": user_id,
                "value_date": "2026-08-20" if index == 500 else "2026-08-01", "amount": str(index),
            })
        self.supabase.rows["wealth_position_snapshots"] = [snapshot(i) for i in range(501)] + [snapshot(999, OTHER_POSITION_ID, OTHER_USER_ID)]
        self.supabase.max_rows = 500
        positions = self.client.get("/wealth/positions").json()
        self.assertEqual(len(positions), 1)
        self.assertEqual(positions[0]["latestSnapshot"]["amount"], "500")
        response = self.client.get("/wealth/snapshots")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()), 501)
        self.assertTrue(all(row["userId"] == USER_ID for row in response.json()))

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

    def test_retirement_activation_rejects_foreign_assets_but_allows_any_owned_asset(self):
        from test_retirement_calculator import FIXTURES
        plan = {**FIXTURES['base'], 'birthMonth': '1990-01', 'retirementMonth': '2040-01', 'assetIds': [OTHER_POSITION_ID]}
        legacy = {'monthlyContribution': '0', 'expectedReturnRate': '0.05', 'inflationRate': '0.025', 'withdrawalRate': '0.04'}
        response = self.client.put('/fire/profile', json={**legacy, 'activePlan': plan})
        self.assertEqual(response.status_code, 422)
        self.client.post(f'/wealth/positions/{POSITION_ID}/snapshots', json={'amount': '50000', 'valueDate': '2026-01-01'})
        owned = next(p for p in self.supabase.rows['wealth_positions'] if p['id'] == POSITION_ID)
        owned['position_type'] = 'property'
        response = self.client.put('/fire/profile', json={**legacy, 'activePlan': {**plan, 'assetIds': [POSITION_ID]}})
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
