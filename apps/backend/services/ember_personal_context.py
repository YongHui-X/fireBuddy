"""
Bounded snapshot of the signed-in user's aggregates for personalised answers.

Knowledge answers can be tailored to the user's own numbers (savings rate,
emergency runway, net worth, FIRE progress, the deterministic recommended
action) without giving the model any raw records. Everything here comes from
one `build_financial_summary` call, the same engine as the dashboard, and only
aggregate fields are copied. Transactions, descriptions, anomaly labels,
position names and identifiers are excluded by construction.
"""

import json
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from lib.clock import singapore_today
from lib.repository import fetch_all
from lib.supabase import supabase
from schemas.rag import AdvisorDataEvidence
from services.financial_repository import load_financial_records
from services.financial_summary import build_financial_summary


PERSONAL_CONTEXT_TOOL = "personal_context"
PERSONAL_CONTEXT_LABEL = (
    "Trusted FireBuddy data calculated by the backend (this user's current "
    "recorded aggregates, supplied to tailor the answer)"
)
MAX_PERSONAL_CONTEXT_CHARS = 2600
TOP_CATEGORY_COUNT = 5
MAX_WARNING_CODES = 6
ANOMALY_KINDS = ("possible_duplicate", "high_category_amount")
PULSE_KEYS = ("month", "income", "spending", "savingsAmount", "savingsRate", "completeness")
FIRE_KEYS = (
    "fundingStatus",
    "fiTarget",
    "progressRate",
    "requiredMonthlyInvestment",
    "estimatedFiYear",
    "earliestRetirementMonth",
)
ACTION_KEYS = ("title", "rationale", "destination")


def trusted_data_block(facts: dict, *, label: str) -> str:
    """Render aggregate facts as the labelled block the answer prompt trusts."""

    return (
        f"{label}. Treat these values as authoritative and do not recalculate "
        "or alter them:\n" + json.dumps(facts, indent=2, sort_keys=True)
    )


@dataclass(frozen=True)
class EmberPersonalContext:
    """Aggregate facts plus the evidence entry shown next to a tailored answer."""

    facts: dict
    effective_date: str

    def context(self) -> str:
        return trusted_data_block(self.facts, label=PERSONAL_CONTEXT_LABEL)

    def evidence(self) -> AdvisorDataEvidence:
        return AdvisorDataEvidence(
            tool=PERSONAL_CONTEXT_TOOL,
            label="Your FireBuddy snapshot",
            period=self.effective_date,
            record_count=None,
            destination="/",
        )


def _pick(source: dict | None, keys: tuple[str, ...]) -> dict | None:
    if not isinstance(source, dict):
        return None
    return {key: source.get(key) for key in keys}


def _money(value: Decimal) -> str:
    return f"{value.quantize(Decimal('0.01')):.2f}"


def _month_bounds(as_of: date) -> tuple[date, date, date, date]:
    """Return (current start, current end, previous start, previous end)."""

    current_start = as_of.replace(day=1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end.replace(day=1)
    return current_start, as_of, previous_start, previous_end


def _category_names(user_id: str) -> dict[str, str]:
    """Map system-default and owner-scoped expense category ids to names."""

    rows = fetch_all(
        lambda: (
            supabase.table("categories")
            .select("id,user_id,name,category_type,is_default")
            .eq("category_type", "expense")
            .order("id")
        )
    )
    return {
        str(row["id"]): str(row["name"])
        for row in rows
        if (row.get("is_default") and row.get("user_id") is None) or row.get("user_id") == user_id
    }


def spending_block(transactions: list[dict], categories: dict[str, str], as_of: date) -> dict:
    """
    Summarise expense records for the current month to date and the previous
    calendar month: totals plus the top categories by amount. Only category
    labels and sums leave this function; descriptions and rows never do.
    """

    current_start, current_end, previous_start, previous_end = _month_bounds(as_of)

    def totals(start: date, end: date) -> tuple[Decimal, list[dict]]:
        by_category: dict[str, Decimal] = {}
        for row in transactions:
            if row.get("transaction_type") != "expense":
                continue
            try:
                row_date = date.fromisoformat(str(row.get("date"))[:10])
            except ValueError:
                continue
            if not (start <= row_date <= end):
                continue
            label = categories.get(str(row.get("category_id")), "Uncategorised")
            by_category[label] = by_category.get(label, Decimal("0")) + Decimal(str(row.get("amount") or "0"))
        ordered = sorted(by_category.items(), key=lambda item: (-item[1], item[0].casefold()))
        return sum(by_category.values(), Decimal("0")), [
            {"category": name, "amount": _money(amount)} for name, amount in ordered[:TOP_CATEGORY_COUNT]
        ]

    current_total, current_top = totals(current_start, current_end)
    previous_total, previous_top = totals(previous_start, previous_end)
    return {
        "currentMonth": {
            "period": f"{current_start.isoformat()} to {current_end.isoformat()}",
            "total": _money(current_total),
            "topCategories": current_top,
        },
        "previousMonth": {
            "period": f"{previous_start.isoformat()} to {previous_end.isoformat()}",
            "total": _money(previous_total),
            "topCategories": previous_top[:3],
        },
    }


def personal_context_from_summary(summary: dict, *, spending: dict | None = None) -> EmberPersonalContext:
    """
    Copy only aggregate fields out of a financial summary.

    Raises if the serialised block would exceed the size bound, which guards
    against a future summary field silently inflating the prompt.
    """

    fire = summary.get("fire") or {}
    warning_codes: list[str] = []
    for item in [*(summary.get("warnings") or []), *(fire.get("warnings") or [])]:
        code = item.get("code") if isinstance(item, dict) else None
        if code and code not in warning_codes:
            warning_codes.append(code)

    anomalies = summary.get("transactionAnomalies") or []
    anomaly_counts = {
        kind: sum(1 for item in anomalies if isinstance(item, dict) and item.get("kind") == kind)
        for kind in ANOMALY_KINDS
    }

    facts = {
        "effectiveDate": summary.get("effectiveDate"),
        "snapshotStatus": summary.get("snapshotStatus"),
        "netWorth": summary.get("netWorth"),
        "investableAssets": summary.get("investableAssets"),
        "emergencyRunwayMonths": summary.get("emergencyRunwayMonths"),
        "averageMonthlyEssentialSpending": summary.get("averageMonthlyEssentialSpending"),
        "monthlyPulse": _pick(summary.get("pulse"), PULSE_KEYS),
        "fire": _pick(fire, FIRE_KEYS),
        "recommendedAction": _pick(summary.get("recommendedAction"), ACTION_KEYS),
        "anomalyCounts": anomaly_counts,
        "warningCodes": warning_codes[:MAX_WARNING_CODES],
        "spending": spending,
    }

    serialised = json.dumps(facts)
    if len(serialised) > MAX_PERSONAL_CONTEXT_CHARS:
        raise ValueError(
            f"Personal context is {len(serialised)} characters; the bound is "
            f"{MAX_PERSONAL_CONTEXT_CHARS}"
        )
    return EmberPersonalContext(facts=facts, effective_date=str(summary.get("effectiveDate") or ""))


def build_personal_context(user_id: str, *, today: date | None = None) -> EmberPersonalContext:
    """Build the snapshot for one authenticated user from owner-scoped records."""

    if not user_id:
        raise ValueError("Authenticated user id is required")
    as_of = today or singapore_today()
    records = load_financial_records(user_id, as_of)
    summary = build_financial_summary(**records, as_of=as_of)
    spending = spending_block(records.get("transactions") or [], _category_names(user_id), as_of)
    return personal_context_from_summary(summary, spending=spending)
