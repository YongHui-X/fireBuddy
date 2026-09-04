from typing import Callable


def fetch_all(query_factory: Callable[[], object], page_size: int = 1000) -> list[dict]:
    """Read every PostgREST page so financial totals never stop at the API row limit."""

    rows: list[dict] = []
    offset = 0
    while True:
        response = query_factory().range(offset, offset + page_size - 1).execute()
        page = response.data or []
        rows.extend(page)
        if len(page) < page_size:
            return rows
        offset += page_size
