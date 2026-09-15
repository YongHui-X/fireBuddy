from datetime import date, datetime, timedelta, timezone


SINGAPORE_TIMEZONE = timezone(timedelta(hours=8), name="Asia/Singapore")


def singapore_today() -> date:
    """Return today's date at FireBuddy's fixed Singapore calendar boundary."""

    return datetime.now(SINGAPORE_TIMEZONE).date()
