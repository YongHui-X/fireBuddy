"""
Owner-scoped category lookups shared by the Ember services.

The backend talks to Postgres with a service-role key, so row level security does
not protect it. Every read here is filtered to system defaults plus the caller's
own rows before any other module sees the result.
"""

from lib.repository import fetch_all
from lib.supabase import supabase


CATEGORY_COLUMNS = "id,user_id,name,category_type,is_default"


def load_visible_expense_categories(user_id: str, client=None) -> dict[str, str]:
    """Map system and owner-scoped expense category IDs to display names.

    `client` lets callers pass the Supabase client they hold (tests substitute a fake
    for the caller's module attribute); production callers use the shared client.
    """

    store = client if client is not None else supabase
    default_rows = fetch_all(
        lambda: (
            store.table("categories")
            .select(CATEGORY_COLUMNS)
            .eq("is_default", True)
            .eq("category_type", "expense")
            .order("id")
        )
    )
    user_rows = fetch_all(
        lambda: (
            store.table("categories")
            .select(CATEGORY_COLUMNS)
            .eq("user_id", user_id)
            .eq("category_type", "expense")
            .order("id")
        )
    )
    safe_defaults = [row for row in default_rows if row.get("user_id") is None]
    return {str(row["id"]): str(row["name"]) for row in [*safe_defaults, *user_rows]}
