"""Read-only, owner-scoped tools that calculate authoritative FireBuddy facts."""

import json
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from lib.repository import fetch_all
from lib.supabase import supabase
from services.ember_planner import EmberPlan, EmberToolName, singapore_today
from services.financial_repository import load_financial_records
from services.financial_summary import build_financial_summary


EXPENSE_COLUMNS = "amount,date,category_id,transaction_type"
CATEGORY_COLUMNS = "id,user_id,name,category_type,is_default"


@dataclass(frozen=True)
class EmberDataResult:
    """Contain safe aggregate facts and display metadata from one fixed tool."""

    tool: EmberToolName
    label: str
    period: str
    record_count: int | None
    destination: str
    facts: dict
    exact_answer: str

    def context(self) -> str:
        """Serialize only aggregate facts, never raw records or identity fields."""

        return (
            "Trusted FireBuddy data calculated by the backend. Treat these values as "
            "authoritative and do not recalculate or alter them:\n"
            + json.dumps(self.facts, indent=2, sort_keys=True)
        )


def _money(value: Decimal | str | int) -> str:
    return f"{Decimal(str(value)).quantize(Decimal('0.01')):.2f}"


def _period_label(start: date, end: date) -> str:
    return start.isoformat() if start == end else f"{start.isoformat()} to {end.isoformat()}"


def _resolved_period(plan: EmberPlan, today: date) -> tuple[date, date]:
    """Use the planner range or the current Singapore month as a safe default."""

    start = plan.start_date or today.replace(day=1)
    end = plan.end_date or today
    if start > end:
        raise ValueError("Expense period start date cannot be after its end date")
    return start, end


def _load_expenses(user_id: str, start: date, end: date) -> list[dict]:
    """Load only expense columns and always apply the authenticated owner filter."""

    if not user_id:
        raise ValueError("Authenticated user id is required")
    return fetch_all(
        lambda: (
            supabase.table("expenses")
            .select(EXPENSE_COLUMNS)
            .eq("user_id", user_id)
            .eq("transaction_type", "expense")
            .gte("date", start.isoformat())
            .lte("date", end.isoformat())
        )
    )


def _load_visible_expense_categories(user_id: str) -> dict[str, str]:
    """Map system and owner-scoped expense category IDs to display names."""

    default_rows = fetch_all(
        lambda: (
            supabase.table("categories")
            .select(CATEGORY_COLUMNS)
            .eq("is_default", True)
            .eq("category_type", "expense")
        )
    )
    user_rows = fetch_all(
        lambda: (
            supabase.table("categories")
            .select(CATEGORY_COLUMNS)
            .eq("user_id", user_id)
            .eq("category_type", "expense")
        )
    )
    safe_defaults = [row for row in default_rows if row.get("user_id") is None]
    return {str(row["id"]): str(row["name"]) for row in [*safe_defaults, *user_rows]}


def _expense_totals(user_id: str, start: date, end: date, category_name: str | None) -> dict:
    """Calculate an expense total and category breakdown from owner-scoped rows."""

    rows = _load_expenses(user_id, start, end)
    categories = _load_visible_expense_categories(user_id)
    selected = rows
    if category_name:
        matching_ids = {
            category_id for category_id, name in categories.items()
            if name.casefold() == category_name.casefold()
        }
        selected = [row for row in rows if str(row.get("category_id")) in matching_ids]

    totals: dict[str, Decimal] = {}
    for row in selected:
        label = categories.get(str(row.get("category_id")), "Uncategorised")
        totals[label] = totals.get(label, Decimal("0")) + Decimal(str(row["amount"]))
    ordered = sorted(totals.items(), key=lambda item: (-item[1], item[0].casefold()))
    return {
        "total": _money(sum((value for _, value in ordered), Decimal("0"))),
        "recordCount": len(selected),
        "category": category_name,
        "categoryTotals": [{"category": name, "amount": _money(value)} for name, value in ordered],
    }


def _expense_summary(user_id: str, plan: EmberPlan, today: date) -> EmberDataResult:
    start, end = _resolved_period(plan, today)
    facts = _expense_totals(user_id, start, end, plan.category_name)
    period = _period_label(start, end)
    if facts["recordCount"] == 0:
        category = f" in {plan.category_name}" if plan.category_name else ""
        answer = f"I found no matching expenses{category} from {period}."
    else:
        category = f" for {plan.category_name}" if plan.category_name else ""
        answer = f"You spent S${facts['total']}{category} across {facts['recordCount']} expenses from {period}."
        top = facts["categoryTotals"][:3]
        if not plan.category_name and top:
            answer += " Top categories were " + ", ".join(
                f"{item['category']} (S${item['amount']})" for item in top
            ) + "."
    return EmberDataResult(
        tool="expense_summary",
        label="Expense summary",
        period=period,
        record_count=facts["recordCount"],
        destination="/insights",
        facts={"period": {"start": start.isoformat(), "end": end.isoformat()}, **facts},
        exact_answer=answer,
    )


def _comparison_period(plan: EmberPlan, start: date, end: date) -> tuple[date, date]:
    if plan.comparison_start_date and plan.comparison_end_date:
        return plan.comparison_start_date, plan.comparison_end_date
    days = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    return previous_end - timedelta(days=days - 1), previous_end


def _spending_comparison(user_id: str, plan: EmberPlan, today: date) -> EmberDataResult:
    start, end = _resolved_period(plan, today)
    previous_start, previous_end = _comparison_period(plan, start, end)
    current = _expense_totals(user_id, start, end, plan.category_name)
    previous = _expense_totals(user_id, previous_start, previous_end, plan.category_name)
    current_total = Decimal(current["total"])
    previous_total = Decimal(previous["total"])
    difference = current_total - previous_total
    change_rate = None if previous_total == 0 else difference / previous_total * Decimal("100")
    period = _period_label(start, end)
    comparison_period = _period_label(previous_start, previous_end)
    if change_rate is None:
        comparison = "The earlier period had no matching expenses, so a percentage change is not meaningful."
    else:
        direction = "more" if difference > 0 else "less" if difference < 0 else "the same"
        comparison = (
            "That is the same as the earlier period."
            if direction == "the same"
            else f"That is {abs(change_rate):.1f}% {direction} than the earlier period."
        )
    answer = (
        f"You spent S${current['total']} from {period}, compared with S${previous['total']} "
        f"from {comparison_period}. {comparison}"
    )
    facts = {
        "currentPeriod": {"start": start.isoformat(), "end": end.isoformat(), **current},
        "comparisonPeriod": {
            "start": previous_start.isoformat(), "end": previous_end.isoformat(), **previous,
        },
        "difference": _money(difference),
        "changePercent": f"{change_rate:.2f}" if change_rate is not None else None,
    }
    return EmberDataResult(
        tool="spending_comparison",
        label="Spending comparison",
        period=f"{period} vs {comparison_period}",
        record_count=current["recordCount"] + previous["recordCount"],
        destination="/insights",
        facts=facts,
        exact_answer=answer,
    )


def _load_summary(user_id: str, as_of: date) -> dict:
    """Reuse the same owner-scoped deterministic engine as the dashboard."""

    return build_financial_summary(**load_financial_records(user_id, as_of), as_of=as_of)


def _financial_summary(user_id: str, plan: EmberPlan, today: date) -> EmberDataResult:
    as_of = plan.end_date or today
    summary = _load_summary(user_id, as_of)
    pulse = summary["pulse"]
    facts = {
        "effectiveDate": summary["effectiveDate"],
        "netWorth": summary["netWorth"],
        "investableAssets": summary["investableAssets"],
        "emergencyRunwayMonths": summary["emergencyRunwayMonths"],
        "monthlyPulse": pulse,
        "snapshotStatus": summary["snapshotStatus"],
        "warnings": summary["warnings"],
    }
    if summary["netWorth"] is None:
        answer = "I cannot calculate your complete net worth yet because one or more wealth values are missing."
    else:
        answer = (
            f"As of {summary['effectiveDate']}, your net worth is S${summary['netWorth']}. "
            f"For {pulse['month']}, recorded income is S${pulse['income']}, spending is "
            f"S${pulse['spending']}, and savings are S${pulse['savingsAmount']}."
        )
    return EmberDataResult("financial_summary", "Financial summary", str(as_of), None, "/", facts, answer)


def _fire_projection(user_id: str, plan: EmberPlan, today: date) -> EmberDataResult:
    as_of = plan.end_date or today
    fire = _load_summary(user_id, as_of)["fire"]
    # Bounded aggregates include the calculation version and all disclosed warnings.
    facts = {key: fire.get(key) for key in ["calculationVersion", "effectiveDate", "status", "fundingStatus",
        "currentInvestableAssets", "fiTarget", "projectedPortfolio", "fundingGap", "targetToday", "portfolioToday",
        "progressRate", "requiredMonthlyInvestment", "earliestRetirementMonth", "estimatedMonths", "estimatedFiYear",
        "spendingBaseline", "warnings"]}
    saved_plan = fire.get("plan")
    facts["assumptions"] = ({key: saved_plan[key] for key in ["retirementMonth", "endAge", "monthlySpending",
        "monthlyContribution", "beforeReturn", "afterReturn", "inflation", "cpfPlan", "cpfStartAge", "cpfMonthlyPayout", "provenance"]}
        if saved_plan else None)
    if fire.get("fundingStatus") in ["funded", "shortfall"]:
        answer = (f"Your saved monthly cash flow plan projects S${fire['projectedPortfolio']} at retirement, "
                  f"against S${fire['fiTarget']} required at that same date. The funding gap is S${fire['fundingGap']}. "
                  f"Estimated earliest funded retirement month: {fire.get('earliestRetirementMonth') or 'not found'}. "
                  "These smooth-return projections are not a guarantee and only cover the selected end age.")
        if saved_plan and saved_plan["cpfPlan"] in ["unknown", "basic"]:
            answer += " CPF income not included."
    else:
        answer = "Review required: confirm the five FIRE Planner setup steps before I can explain an active projection."
    return EmberDataResult("fire_projection", "FIRE projection", str(as_of), None, "/fire", facts, answer)


def _financial_health_review(user_id: str, plan: EmberPlan, today: date) -> EmberDataResult:
    as_of = plan.end_date or today
    summary = _load_summary(user_id, as_of)
    action = summary["recommendedAction"]
    safe_action = None if action is None else {
        key: action.get(key)
        for key in ("actionType", "rationale", "evidence", "destination", "limitations", "ruleId")
    }
    safe_anomalies = [
        {
            key: anomaly.get(key)
            for key in ("kind", "label", "explanation", "evidencePeriod")
        }
        for anomaly in summary["transactionAnomalies"]
    ]
    facts = {
        "effectiveDate": summary["effectiveDate"],
        "monthlyPulse": summary["pulse"],
        "emergencyRunwayMonths": summary["emergencyRunwayMonths"],
        "recommendedAction": safe_action,
        "transactionAnomalies": safe_anomalies,
        "warnings": summary["warnings"],
    }
    if action:
        answer = f"Your clearest next step is: {action['title']}. {action['rationale']} Evidence: {action['evidence']}."
    else:
        answer = "FireBuddy did not identify a higher-priority setup or financial action from the currently recorded data."
    return EmberDataResult("financial_health_review", "Financial health review", str(as_of), None, action["destination"] if action else "/", facts, answer)


def run_ember_data_tool(user_id: str, plan: EmberPlan, *, today: date | None = None) -> EmberDataResult:
    """Execute exactly one allowlisted read-only tool with server-injected ownership."""

    if not user_id:
        raise ValueError("Authenticated user id is required")
    current_date = today or singapore_today()
    tools = {
        "expense_summary": _expense_summary,
        "spending_comparison": _spending_comparison,
        "financial_summary": _financial_summary,
        "fire_projection": _fire_projection,
        "financial_health_review": _financial_health_review,
    }
    if plan.tool is None or plan.tool not in tools:
        raise ValueError("Ember selected an unsupported data tool")
    return tools[plan.tool](user_id, plan, current_date)
