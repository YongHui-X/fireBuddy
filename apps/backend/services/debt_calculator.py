"""
Deterministic debt payoff maths, mirrored from `packages/shared/src/debt.ts`.

The web demo mode runs the TypeScript version and the API runs this one, so the
two must agree to the cent. `packages/shared/fixtures/debt.json` holds the shared
cases and `tests/test_debt_calculator.py --fixtures` prints this module's output
for the web parity test to compare against.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from services.financial_calculator import add_months, money, rate


MAX_PAYOFF_MONTHS = 600
HIGH_INTEREST_THRESHOLD = Decimal("0.06")
CENT = Decimal("0.01")
RATE_PLACES = Decimal("0.0001")


def _decimal(value: object) -> Decimal:
    return Decimal(str(value))


def round_cents(value: Decimal) -> Decimal:
    """Round half away from zero to cents, the counterpart of `roundCents` in TypeScript."""

    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def calculate_debt_payoff(balance: Decimal, annual_rate: Decimal, monthly_payment: Decimal, as_of: date) -> dict:
    """Project when a balance reaches zero under monthly compounding and a fixed payment."""

    if balance <= 0:
        return {"payoffMonth": None, "monthsRemaining": 0, "totalInterest": "0.00", "status": "paid_off"}
    if monthly_payment <= 0 or annual_rate < 0:
        return {"payoffMonth": None, "monthsRemaining": None, "totalInterest": None, "status": "missing_terms"}
    monthly_rate = annual_rate / Decimal(12)
    if round_cents(balance * monthly_rate) >= monthly_payment:
        return {"payoffMonth": None, "monthsRemaining": None, "totalInterest": None, "status": "payment_below_interest"}
    remaining = round_cents(balance)
    interest_total = Decimal("0")
    months = 0
    cursor = as_of.replace(day=1)
    while remaining > 0 and months < MAX_PAYOFF_MONTHS:
        interest = round_cents(remaining * monthly_rate)
        interest_total = round_cents(interest_total + interest)
        remaining = round_cents(remaining + interest - monthly_payment)
        months += 1
        cursor = add_months(cursor, 1)
    if remaining > 0:
        return {"payoffMonth": None, "monthsRemaining": None, "totalInterest": None, "status": "payment_below_interest"}
    return {"payoffMonth": cursor.strftime("%Y-%m"), "monthsRemaining": months, "totalInterest": money(interest_total), "status": "projected"}


def build_debt_summary(positions: list[dict], latest: dict[str, dict], monthly_income: Decimal | None, as_of: date) -> dict:
    """Summarise every active liability and the household's monthly debt service."""

    liabilities = []
    for row in positions:
        if row.get("position_kind") != "liability" or row.get("is_archived", False):
            continue
        snapshot = latest.get(str(row["id"]))
        balance = _decimal(snapshot["amount"]) if snapshot else None
        interest_rate = _decimal(row["interest_rate"]) if row.get("interest_rate") is not None else None
        payment = _decimal(row["monthly_payment"]) if row.get("monthly_payment") is not None else None
        if balance is None or interest_rate is None or payment is None:
            payoff = {"payoffMonth": None, "monthsRemaining": None, "totalInterest": None, "status": "missing_terms"}
        else:
            payoff = calculate_debt_payoff(balance, interest_rate, payment, as_of)
        liabilities.append({
            "positionId": str(row["id"]), "name": row["name"],
            "balance": money(balance) if balance is not None else None,
            "interestRate": str(interest_rate.quantize(RATE_PLACES, rounding=ROUND_HALF_UP)) if interest_rate is not None else None,
            "monthlyPayment": money(payment) if payment is not None else None,
            **payoff,
        })
    service = round_cents(sum((_decimal(item["monthlyPayment"]) for item in liabilities if item["monthlyPayment"] is not None), Decimal("0")))
    rates = [_decimal(item["interestRate"]) for item in liabilities if item["interestRate"] is not None]
    highest = max(rates) if rates else None
    return {
        "totalMonthlyDebtService": money(service),
        "highestInterestRate": str(highest.quantize(RATE_PLACES, rounding=ROUND_HALF_UP)) if highest is not None else None,
        "debtToIncome": rate(service / monthly_income) if monthly_income and monthly_income > 0 else None,
        "liabilities": liabilities,
    }


def highest_interest_liability(summary: dict) -> dict | None:
    """The liability to pay down first, or None when none charges more than the threshold."""

    candidates = [
        item for item in summary["liabilities"]
        if item["interestRate"] is not None and _decimal(item["interestRate"]) > HIGH_INTEREST_THRESHOLD
        and item["balance"] is not None and _decimal(item["balance"]) > 0
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda item: _decimal(item["interestRate"]))
