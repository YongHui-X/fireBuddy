from typing import Any, Callable


DEFAULT_PAGE_SIZE = 500


def fetch_all(
    query_factory: Callable[[], Any],
    page_size: int = DEFAULT_PAGE_SIZE,
) -> list[dict]:
    """Read every PostgREST page so API results never stop at the row limit."""

    if page_size <= 0:
        raise ValueError("page_size must be a positive integer")

    rows: list[dict] = []
    offset = 0
    while True:
        response = query_factory().range(offset, offset + page_size - 1).execute()
        page = response.data or []
        rows.extend(page)
        if len(page) < page_size:
            return rows
        offset += page_size
