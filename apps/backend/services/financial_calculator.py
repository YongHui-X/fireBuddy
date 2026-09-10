from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable


MONEY = Decimal("0.01")
RATE = Decimal("0.000001")


def money(value: Decimal) -> str:
    """Round monetary contract values consistently at the response boundary."""

    return str(value.quantize(MONEY, rounding=ROUND_HALF_UP))


def rate(value: Decimal) -> str:
    """Round ratios to six decimal places without losing stored precision."""

    return str(value.quantize(RATE, rounding=ROUND_HALF_UP))


def add_months(value: date, months: int) -> date:
    """Advance a calendar date while keeping it valid for the destination month."""

    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(value.day, monthrange(year, month)[1]))


def previous_month_end(value: date) -> date:
    """Return the last day before the current calendar month."""

    return value.replace(day=1).fromordinal(value.replace(day=1).toordinal() - 1)


def calculate_savings_rate(income: Decimal, spending: Decimal) -> Decimal | None:
    """Return no ratio when zero income makes a savings rate misleading."""

    return (income - spending) / income if income > 0 else None


def required_monthly_investment(
    current: Decimal,
    target: Decimal,
    monthly_rate: Decimal,
    months: int,
) -> Decimal:
    """Calculate end-of-month investment needed for a fixed target date."""

    if months <= 0 or current >= target:
        return Decimal("0")
    if abs(monthly_rate) < Decimal("0.000000000001"):
        return max(Decimal("0"), (target - current) / Decimal(months))
    growth = (Decimal("1") + monthly_rate) ** months
    return max(Decimal("0"), ((target - current * growth) * monthly_rate) / (growth - 1))


@dataclass(frozen=True)
class ProjectionInput:
    effective_date: date
    current_assets: Decimal | None
    annual_spending: Decimal | None
    monthly_contribution: Decimal
    nominal_return: Decimal
    inflation_rate: Decimal
    withdrawal_rate: Decimal
    target_date: date | None = None
    plan: dict | None = None


def project_fire(values: ProjectionInput) -> dict:
    """Legacy callers must supply a confirmed v2 plan; no legacy target is calculated."""
    from services.retirement_calculator import calculate_retirement
    return calculate_retirement(values.plan, values.current_assets, values.effective_date)


def latest_values(positions: Iterable[dict], snapshots: Iterable[dict], as_of: date) -> dict[str, dict]:
    """Select each position's latest snapshot on or before the effective date."""

    position_ids = {str(position["id"]) for position in positions}
    selected: dict[str, dict] = {}
    for snapshot in snapshots:
        position_id = str(snapshot["wealth_position_id"])
        value_date = date.fromisoformat(str(snapshot["value_date"])[:10])
        if position_id not in position_ids or value_date > as_of:
            continue
        current = selected.get(position_id)
        if current is None or str(current["value_date"])[:10] < value_date.isoformat():
            selected[position_id] = snapshot
    return selected
