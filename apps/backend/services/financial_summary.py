from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from statistics import median

from services.financial_calculator import (
    ProjectionInput,
    add_months,
    calculate_savings_rate,
    latest_values,
    money,
    previous_month_end,
    project_fire,
    rate,
)


def _decimal(value: object) -> Decimal:
    return Decimal(str(value))


def _month_start(value: date) -> date:
    return value.replace(day=1)


def build_spending_baseline(transactions: list[dict], as_of: date) -> dict:
    """Annualise up to twelve completed months, including quiet months after tracking begins."""

    completed_end = previous_month_end(as_of)
    expense_rows = [row for row in transactions if row.get("transaction_type", "expense") == "expense" and date.fromisoformat(str(row["date"])[:10]) <= completed_end]
    if not expense_rows:
        return {"status": "insufficient_data", "source": "none", "startDate": None, "endDate": None,
                "completedMonths": 0, "expenseTotal": None, "annualisedSpending": None}
    first = _month_start(min(date.fromisoformat(str(row["date"])[:10]) for row in expense_rows))
    earliest = add_months(completed_end.replace(day=1), -11)
    start = max(first, earliest)
    months = (completed_end.year - start.year) * 12 + completed_end.month - start.month + 1
    total = sum((_decimal(row["amount"]) for row in expense_rows if date.fromisoformat(str(row["date"])[:10]) >= start), Decimal("0"))
    return {
        "status": "available" if months == 12 else "limited", "source": "transactions",
        "startDate": start.isoformat(), "endDate": completed_end.isoformat(), "completedMonths": months,
        "expenseTotal": money(total), "annualisedSpending": money(total / Decimal(months) * Decimal("12")),
    }


def build_actual_path(positions: list[dict], snapshots: list[dict], as_of: date) -> list[dict]:
    """Build monthly historical FI totals and leave gaps where a position lacks evidence."""

    included = [row for row in positions if row["position_kind"] == "asset" and row["include_in_fi"]]
    if not included or not snapshots:
        return []
    first_date = min(date.fromisoformat(str(row["value_date"])[:10]) for row in snapshots)
    cursor = _month_start(first_date)
    end = _month_start(as_of)
    points = []
    while cursor <= end:
        effective = previous_month_end(add_months(cursor, 1)) if cursor < end else as_of
        values = latest_values(included, snapshots, effective)
        if len(values) == len(included):
            total = sum((_decimal(row["amount"]) for row in values.values()), Decimal("0"))
            points.append({"date": effective.isoformat(), "amount": money(total), "kind": "actual"})
        cursor = add_months(cursor, 1)
    return points


def detect_transaction_anomalies(transactions: list[dict], as_of: date) -> list[dict]:
    """Flag explainable duplicate and high-category expense candidates without fraud claims."""

    expenses = [row for row in transactions if row.get("transaction_type", "expense") == "expense" and date.fromisoformat(str(row["date"])[:10]) <= as_of]
    anomalies = []
    normalized: dict[tuple, list[dict]] = defaultdict(list)
    for row in sorted(expenses, key=lambda item: str(item["date"])):
        key = (" ".join(str(row.get("description", "")).lower().split()), str(row.get("account_id")),
               str(row.get("category_id")), str(row.get("transaction_type", "expense")), money(_decimal(row["amount"])))
        previous = [item for item in normalized[key] if abs((date.fromisoformat(str(row["date"])[:10]) - date.fromisoformat(str(item["date"])[:10])).days) <= 3]
        if previous:
            anomalies.append({"transactionId": str(row["id"]), "kind": "possible_duplicate", "label": "Possible duplicate",
                              "explanation": "A matching expense was recorded within 3 days.", "evidencePeriod": "3 calendar days"})
        normalized[key].append(row)

    duplicate_ids = {item["transactionId"] for item in anomalies}
    for row in expenses:
        if str(row["id"]) in duplicate_ids or row.get("category_id") is None:
            continue
        row_date = date.fromisoformat(str(row["date"])[:10])
        history = [_decimal(item["amount"]) for item in expenses if item.get("category_id") == row.get("category_id")
                   and date.fromisoformat(str(item["date"])[:10]) < row_date
                   and date.fromisoformat(str(item["date"])[:10]) >= row_date - timedelta(days=90)]
        if len(history) >= 5:
            baseline = Decimal(str(median(history)))
            amount = _decimal(row["amount"])
            if amount >= baseline * 2 and amount >= baseline + Decimal("50"):
                anomalies.append({"transactionId": str(row["id"]), "kind": "high_category_amount", "label": "Above recent category pattern",
                                  "explanation": f"S${money(amount)} is at least twice the 90-day category median of S${money(baseline)}.",
                                  "evidencePeriod": "Previous 90 days"})
    return anomalies


def recommend_action(*, positions: list[dict], selected_essentials: list[str], profile: dict | None,
                     latest: dict[str, dict], runway: Decimal | None, pulse: dict, fire: dict, as_of: date) -> dict | None:
    """Choose at most one future-oriented action using versioned deterministic precedence."""

    if not positions:
        return _action("add_position", "Add your first wealth position", "Net worth and FIRE progress need a dated asset or liability value.", "No wealth positions", "/wealth", "foundation.v1.add_position")
    missing = [row for row in positions if str(row["id"]) not in latest]
    if missing:
        return _action("add_snapshot", f"Add a value for {missing[0]['name']}", "This position has no snapshot on or before the dashboard date.", as_of.isoformat(), "/wealth", "foundation.v1.missing_snapshot")
    stale = [row for row in latest.values() if (as_of - date.fromisoformat(str(row["value_date"])[:10])).days > 35]
    if stale:
        return _action("refresh_snapshot", "Refresh a stale wealth value", "At least one latest position value is older than 35 days.", str(stale[0]["value_date"])[:10], "/wealth", "foundation.v1.stale_snapshot")
    if not any(row["is_emergency_fund"] for row in positions):
        return _action("designate_emergency_fund", "Designate an emergency fund", "Runway needs one liquid, unrestricted asset marked for emergencies.", "Current wealth positions", "/wealth", "foundation.v1.emergency_fund")
    if not selected_essentials:
        return _action("select_essentials", "Choose essential spending categories", "Emergency runway needs your confirmed essential expense categories.", "Expense categories", "/fire", "foundation.v1.essential_categories")
    if profile is None:
        return _action("configure_fire", "Set your FIRE assumptions", "A projection needs contribution, return, inflation, and withdrawal assumptions.", "No FIRE profile", "/fire", "foundation.v1.fire_profile")
    if _decimal(pulse["savingsAmount"]) < 0:
        return _action("review_cashflow", "Review this month's negative cash flow", "Spending is currently higher than income.", pulse["month"], "/transactions", "foundation.v1.negative_cashflow")
    if runway is not None and runway < 3:
        return _action("build_runway", "Build emergency runway toward 3 months", "Your confirmed emergency fund covers fewer than 3 months of essential spending.", f"{rate(runway)} months", "/wealth", "foundation.v1.low_runway")
    required = fire.get("requiredMonthlyInvestment")
    if as_of.day >= 21 and required is not None and _decimal(pulse["investedAmount"]) < _decimal(required):
        return _action("review_contribution", "Review this month's investment contribution", "Recorded contributions are below the amount required for the target date.", pulse["month"], "/wealth", "foundation.v1.contribution_gap")
    return None


def _action(action_type: str, title: str, rationale: str, evidence: str, destination: str, rule_id: str) -> dict:
    return {"actionType": action_type, "title": title, "rationale": rationale, "evidence": evidence,
            "destination": destination, "limitations": None, "ruleId": rule_id}


def build_financial_summary(*, positions: list[dict], snapshots: list[dict], contributions: list[dict],
                            transactions: list[dict], selected_essentials: list[str], profile: dict | None,
                            as_of: date, scenario_contribution: Decimal | None = None,
                            scenario_spending: Decimal | None = None) -> dict:
    """Derive every dashboard fact from dated records and disclosed assumptions."""

    active = [row for row in positions if not row.get("is_archived", False)]
    latest = latest_values(active, snapshots, as_of)
    has_complete_wealth = bool(active) and len(latest) == len(active)
    assets = sum((_decimal(latest[str(row["id"])]["amount"]) for row in active if row["position_kind"] == "asset" and str(row["id"]) in latest), Decimal("0"))
    liabilities = sum((_decimal(latest[str(row["id"])]["amount"]) for row in active if row["position_kind"] == "liability" and str(row["id"]) in latest), Decimal("0"))
    net_worth = assets - liabilities if has_complete_wealth else None
    investable = sum((_decimal(latest[str(row["id"])]["amount"]) for row in active if row["position_kind"] == "asset" and row["include_in_fi"] and str(row["id"]) in latest), Decimal("0")) if has_complete_wealth else None
    emergency = sum((_decimal(latest[str(row["id"])]["amount"]) for row in active if row["position_kind"] == "asset" and row["is_emergency_fund"] and str(row["id"]) in latest), Decimal("0")) if has_complete_wealth else None

    prior_values = latest_values(active, snapshots, previous_month_end(as_of))
    prior_net = None
    if active and len(prior_values) == len(active):
        prior_assets = sum((_decimal(prior_values[str(row["id"])]["amount"]) for row in active if row["position_kind"] == "asset"), Decimal("0"))
        prior_liabilities = sum((_decimal(prior_values[str(row["id"])]["amount"]) for row in active if row["position_kind"] == "liability"), Decimal("0"))
        prior_net = prior_assets - prior_liabilities

    month_start = _month_start(as_of)
    current_rows = [row for row in transactions if month_start <= date.fromisoformat(str(row["date"])[:10]) <= as_of]
    income = sum((_decimal(row["amount"]) for row in current_rows if row.get("transaction_type", "expense") == "income"), Decimal("0"))
    spending = sum((_decimal(row["amount"]) for row in current_rows if row.get("transaction_type", "expense") == "expense"), Decimal("0"))
    savings = income - spending
    savings_rate = calculate_savings_rate(income, spending)
    invested = sum((_decimal(row["amount"]) for row in contributions if month_start <= date.fromisoformat(str(row["contribution_date"])[:10]) <= as_of), Decimal("0"))
    pulse = {"month": month_start.strftime("%Y-%m"), "income": money(income), "spending": money(spending),
             "savingsAmount": money(savings), "savingsRate": rate(savings_rate) if savings_rate is not None else None,
             "savingsRateStatus": "available" if savings_rate is not None else "unavailable",
             "investedAmount": money(invested), "completeness": "complete" if current_rows else "limited"}

    baseline = build_spending_baseline(transactions, as_of)
    essential_rows = [row for row in transactions if row.get("transaction_type", "expense") == "expense"
                      and str(row.get("category_id")) in selected_essentials
                      and baseline["startDate"] is not None
                      and date.fromisoformat(baseline["startDate"]) <= date.fromisoformat(str(row["date"])[:10]) <= date.fromisoformat(baseline["endDate"])]
    essential_average = None
    if selected_essentials and baseline["completedMonths"] > 0:
        essential_average = sum((_decimal(row["amount"]) for row in essential_rows), Decimal("0")) / Decimal(baseline["completedMonths"])
    runway = emergency / essential_average if emergency is not None and essential_average and essential_average > 0 else None

    annual_spending = scenario_spending * Decimal("12") if scenario_spending is not None else None
    if annual_spending is None and profile and profile.get("retirement_spending_override") is not None:
        annual_spending = _decimal(profile["retirement_spending_override"]) * Decimal("12")
        baseline = {**baseline, "status": "manual_override", "source": "manual_override", "annualisedSpending": money(annual_spending)}
    elif annual_spending is None and baseline["annualisedSpending"] is not None:
        annual_spending = _decimal(baseline["annualisedSpending"])

    contribution = scenario_contribution if scenario_contribution is not None else _decimal(profile["monthly_contribution"]) if profile else Decimal("0")
    fire = project_fire(ProjectionInput(
        effective_date=as_of, current_assets=investable, annual_spending=annual_spending,
        monthly_contribution=contribution,
        nominal_return=_decimal(profile["expected_return_rate"]) if profile else Decimal("0"),
        inflation_rate=_decimal(profile["inflation_rate"]) if profile else Decimal("0"),
        withdrawal_rate=_decimal(profile["withdrawal_rate"]) if profile else Decimal("0"),
        target_date=date.fromisoformat(str(profile["target_fi_date"])[:10]) if profile and profile.get("target_fi_date") else None,
    ))
    fire["spendingBaseline"] = baseline
    fire["actualPath"] = build_actual_path(active, snapshots, as_of)

    dates = [date.fromisoformat(str(row["value_date"])[:10]) for row in latest.values()]
    latest_date = max(dates) if dates else None
    stale = any((as_of - value).days > 35 for value in dates)
    snapshot_status = "missing" if not has_complete_wealth else "stale" if stale else "mixed" if len(set(dates)) > 1 else "current"
    warnings = list(fire["warnings"])
    if stale:
        warnings.append({"code": "stale_snapshot", "message": "At least one wealth value is older than 35 days."})
    action = recommend_action(positions=active, selected_essentials=selected_essentials, profile=profile,
                              latest=latest, runway=runway, pulse=pulse, fire=fire, as_of=as_of)
    return {
        "effectiveDate": as_of.isoformat(), "netWorth": money(net_worth) if net_worth is not None else None,
        "assetTotal": money(assets) if has_complete_wealth else None, "liabilityTotal": money(liabilities) if has_complete_wealth else None,
        "priorMonthNetWorth": money(prior_net) if prior_net is not None else None,
        "monthlyNetWorthChange": money(net_worth - prior_net) if net_worth is not None and prior_net is not None else None,
        "investableAssets": money(investable) if investable is not None else None,
        "emergencyEligibleAssets": money(emergency) if emergency is not None else None,
        "averageMonthlyEssentialSpending": money(essential_average) if essential_average is not None else None,
        "emergencyRunwayMonths": rate(runway) if runway is not None else None,
        "latestSnapshotDate": latest_date.isoformat() if latest_date else None, "snapshotStatus": snapshot_status,
        "pulse": pulse, "fire": fire, "recommendedAction": action,
        "transactionAnomalies": detect_transaction_anomalies(transactions, as_of), "warnings": warnings,
    }
