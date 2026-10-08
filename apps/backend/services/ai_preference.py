"""
Per-user AI consent, read before any OpenAI call is made on the user's behalf.

The default is `off`, and every failure to read the profile is treated as `off`
too: a lookup error must never turn into a request that sends the user's data
to a third party they did not consent to.
"""

import logging
from datetime import datetime, timezone

from lib.supabase import supabase
from schemas.profile import AiPreference


logger = logging.getLogger(__name__)

AI_PREFERENCES: tuple[AiPreference, ...] = ("off", "guide", "personalised")

AI_DISABLED_ANSWER = (
    "DouDou is switched off for your account. Choose Guide or Personalised under "
    "Profile, DouDou and AI, to turn it on."
)
GUIDE_ONLY_DATA_ANSWER = (
    "Your DouDou setting is Guide, so I can explain Singapore finance topics but cannot "
    "read your FireBuddy records. Switch to Personalised under Profile, DouDou and AI, "
    "if you want answers about your own figures."
)


def load_profile(user_id: str) -> dict | None:
    """Return the caller's profile row, or None when it does not exist."""

    if not user_id:
        return None
    response = (
        supabase.table("profiles")
        .select("id,email,ai_preference,ai_consented_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def load_ai_preference(user_id: str) -> AiPreference:
    """Resolve the user's AI level, failing closed to `off` on a missing row or any error."""

    try:
        row = load_profile(user_id)
    except Exception:
        logger.exception("ai_preference_lookup_failed")
        return "off"
    value = (row or {}).get("ai_preference")
    return value if value in AI_PREFERENCES else "off"


def save_ai_preference(user_id: str, preference: AiPreference) -> dict | None:
    """Persist the level. Leaving `off` records consent; returning to `off` withdraws it."""

    if preference not in AI_PREFERENCES:
        raise ValueError("Unknown AI preference")
    values = {
        "ai_preference": preference,
        "ai_consented_at": None if preference == "off" else datetime.now(timezone.utc).isoformat(),
    }
    response = supabase.table("profiles").update(values).eq("id", user_id).execute()
    return response.data[0] if response.data else None
