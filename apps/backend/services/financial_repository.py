from datetime import date

from lib.repository import fetch_all
from lib.supabase import supabase


def load_financial_records(user_id: str, as_of: date) -> dict:
    """Load all owner-scoped source records used by one deterministic calculation."""

    positions = fetch_all(lambda: supabase.table("wealth_positions").select("*").eq("user_id", user_id))
    snapshots = fetch_all(lambda: supabase.table("wealth_position_snapshots").select("*").eq("user_id", user_id).lte("value_date", as_of.isoformat()))
    contributions = fetch_all(lambda: supabase.table("wealth_contributions").select("*").eq("user_id", user_id).lte("contribution_date", as_of.isoformat()))
    transactions = fetch_all(lambda: supabase.table("expenses").select("*").eq("user_id", user_id).lte("date", as_of.isoformat()))
    essential_rows = fetch_all(lambda: supabase.table("essential_expense_categories").select("category_id").eq("user_id", user_id))
    profile_response = supabase.table("fire_profiles").select("*").eq("user_id", user_id).limit(1).execute()
    return {
        "positions": positions,
        "snapshots": snapshots,
        "contributions": contributions,
        "transactions": transactions,
        "selected_essentials": [str(row["category_id"]) for row in essential_rows],
        "profile": profile_response.data[0] if profile_response.data else None,
    }
