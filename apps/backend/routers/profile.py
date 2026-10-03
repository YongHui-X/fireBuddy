from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from lib.auth import AuthenticatedUser, get_current_user
from schemas.profile import AiPreferenceUpdate, ProfileResponse
from services.ai_preference import load_profile, save_ai_preference

router = APIRouter(prefix="/profile", tags=["profile"])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


def _serialise(row: dict) -> ProfileResponse:
    return ProfileResponse(
        id=str(row["id"]),
        email=str(row.get("email") or ""),
        aiPreference=row.get("ai_preference") or "off",
        aiConsentedAt=row.get("ai_consented_at"),
    )


@router.get("", response_model=ProfileResponse)
def get_profile(current_user: CurrentUser):
    """Return the caller's profile and AI consent level. The browser has no direct table access."""

    row = load_profile(current_user.id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _serialise(row)


@router.put("/ai-preference", response_model=ProfileResponse)
def update_ai_preference(payload: AiPreferenceUpdate, current_user: CurrentUser):
    """Record the user's AI level. Consent is timestamped; switching off withdraws it."""

    row = save_ai_preference(current_user.id, payload.ai_preference)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _serialise(row)
