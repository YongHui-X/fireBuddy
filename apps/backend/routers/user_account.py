"""
Account-level data rights: a full export of everything FireBuddy holds for the
caller, and deletion of the account and all of its rows.

Both run with the service-role client, so every query is owner-scoped here.
Deletion removes rows in an explicit dependency order rather than relying on
cascades: `expenses.account_id` references `accounts(id)` with ON DELETE
RESTRICT, and a cascade fanning out from `profiles` could reach `accounts`
before `expenses`.
"""

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from config import settings
from lib.auth import AuthenticatedUser, get_current_user
from lib.repository import fetch_all
from lib.supabase import supabase
from services.ai_preference import load_profile
from services.rate_limiter import SlidingWindowRateLimiter

router = APIRouter(prefix="/account", tags=["account"])
logger = logging.getLogger(__name__)

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
account_rate_limiter = SlidingWindowRateLimiter(
    settings.advisor_rate_limit_requests,
    settings.advisor_rate_limit_window_seconds,
)

EXPORT_FORMAT = "firebuddy-export/1"

# (table, owner column, order column). Deletion walks this list top to bottom.
USER_TABLES: tuple[tuple[str, str, str], ...] = (
    ("transaction_tags", "user_id", "transaction_id"),
    ("expenses", "user_id", "id"),
    ("tags", "user_id", "id"),
    ("essential_expense_categories", "user_id", "category_id"),
    ("fire_profiles", "user_id", "id"),
    ("wealth_contributions", "user_id", "id"),
    ("wealth_position_snapshots", "user_id", "id"),
    ("wealth_positions", "user_id", "id"),
    ("accounts", "user_id", "id"),
    ("categories", "user_id", "id"),
)


def _profile_payload(user_id: str, fallback_email: str | None) -> dict:
    row = load_profile(user_id) or {}
    return {
        "id": user_id,
        "email": str(row.get("email") or fallback_email or ""),
        "aiPreference": row.get("ai_preference") or "off",
        "aiConsentedAt": row.get("ai_consented_at"),
    }


@router.get("/export")
def export_account(current_user: CurrentUser, response: Response):
    """Return every row the caller owns as one JSON document (PDPA access right)."""

    decision = account_rate_limiter.check(current_user.id)
    if not decision.allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Try again shortly.",
                            headers={"Retry-After": str(decision.retry_after_seconds)})

    tables: dict[str, list[dict]] = {}
    for table, owner_column, order_column in USER_TABLES:
        tables[table] = fetch_all(
            lambda table=table, owner_column=owner_column, order_column=order_column: (
                supabase.table(table).select("*").eq(owner_column, current_user.id).order(order_column)
            )
        )

    exported_at = datetime.now(timezone.utc)
    response.headers["Content-Disposition"] = (
        f'attachment; filename="firebuddy-export-{exported_at.date().isoformat()}.json"'
    )
    return {
        "format": EXPORT_FORMAT,
        "exportedAt": exported_at.isoformat(),
        "profile": _profile_payload(current_user.id, current_user.email),
        "tables": tables,
    }


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(current_user: CurrentUser):
    """Delete the caller's rows, profile and sign-in (PDPA deletion right). Idempotent."""

    decision = account_rate_limiter.check(current_user.id)
    if not decision.allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Try again shortly.",
                            headers={"Retry-After": str(decision.retry_after_seconds)})

    for table, owner_column, _order_column in USER_TABLES:
        supabase.table(table).delete().eq(owner_column, current_user.id).execute()
    supabase.table("profiles").delete().eq("id", current_user.id).execute()

    try:
        supabase.auth.admin.delete_user(current_user.id)
    except Exception as exc:
        # Data is gone; the sign-in is not. The client retries, and the second
        # pass finds nothing to delete before reaching this call again.
        logger.exception("account_auth_deletion_failed", extra={"user_id": current_user.id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Your data was removed but the sign-in could not be deleted yet. Please retry.",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
