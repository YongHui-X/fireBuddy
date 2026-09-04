from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP, localcontext
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


def project_fire(values: ProjectionInput) -> dict:
    """Project FI deterministically using real returns and month-end contributions."""

    empty_baseline = {
        "status": "insufficient_data", "source": "none", "startDate": None,
        "endDate": None, "completedMonths": 0, "expenseTotal": None,
        "annualisedSpending": None,
    }
    if values.current_assets is None or values.annual_spending is None or values.withdrawal_rate <= 0:
        return {
            "status": "insufficient_data", "effectiveDate": values.effective_date.isoformat(),
            "currentInvestableAssets": money(values.current_assets) if values.current_assets is not None else None,
            "fiTarget": None, "progressRate": None, "progressRateCapped": None,
            "estimatedMonths": None, "estimatedFiYear": None, "requiredMonthlyInvestment": None,
            "assumptions": None, "spendingBaseline": empty_baseline,
            "actualPath": [], "projectedPath": [],
            "warnings": [{"code": "missing_fire_inputs", "message": "Add wealth values and FIRE spending assumptions to calculate a projection."}],
        }

    with localcontext() as context:
        context.prec = 34
        target = values.annual_spending / values.withdrawal_rate
        progress = values.current_assets / target if target else Decimal("1")
        real_return = (Decimal("1") + values.nominal_return) / (Decimal("1") + values.inflation_rate) - Decimal("1")
        monthly_rate = (Decimal("1") + real_return) ** (Decimal("1") / Decimal("12")) - Decimal("1")
        target_date = values.target_date or add_months(values.effective_date, 16 * 12)
        target_months = max(1, (target_date.year - values.effective_date.year) * 12 + target_date.month - values.effective_date.month)
        required = required_monthly_investment(values.current_assets, target, monthly_rate, target_months)
        assumptions = {
            "monthlyContribution": money(values.monthly_contribution),
            "nominalAnnualReturn": rate(values.nominal_return),
            "inflationRate": rate(values.inflation_rate),
            "realAnnualReturn": rate(real_return),
            "withdrawalRate": rate(values.withdrawal_rate),
            "contributionTiming": "month_end", "horizonMonths": 1200,
        }

        if values.current_assets >= target:
            return {
                "status": "already_reached", "effectiveDate": values.effective_date.isoformat(),
                "currentInvestableAssets": money(values.current_assets), "fiTarget": money(target),
                "progressRate": rate(progress), "progressRateCapped": "1.000000",
                "estimatedMonths": 0, "estimatedFiYear": values.effective_date.year,
                "requiredMonthlyInvestment": "0.00", "assumptions": assumptions,
                "spendingBaseline": empty_baseline, "actualPath": [], "projectedPath": [], "warnings": [],
            }

        balance = values.current_assets
        estimated_months = None
        path = []
        for month in range(1, 1201):
            balance = balance * (Decimal("1") + monthly_rate) + values.monthly_contribution
            if month == 1 or month % 12 == 0 or balance >= target:
                path.append({"date": add_months(values.effective_date, month).isoformat(), "amount": money(balance), "kind": "projected"})
            if balance >= target:
                estimated_months = month
                break
            if balance <= 0 and monthly_rate <= 0 and values.monthly_contribution <= 0:
                break

        warnings = [] if estimated_months is not None else [{
            "code": "unreachable_horizon",
            "message": "The FI target is not reached within the 100 year projection horizon.",
        }]
        return {
            "status": "projected" if estimated_months is not None else "unreachable",
            "effectiveDate": values.effective_date.isoformat(), "currentInvestableAssets": money(values.current_assets),
            "fiTarget": money(target), "progressRate": rate(progress),
            "progressRateCapped": rate(min(progress, Decimal("1"))), "estimatedMonths": estimated_months,
            "estimatedFiYear": add_months(values.effective_date, estimated_months).year if estimated_months is not None else None,
            "requiredMonthlyInvestment": money(required), "assumptions": assumptions,
            "spendingBaseline": empty_baseline, "actualPath": [], "projectedPath": path, "warnings": warnings,
        }


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
