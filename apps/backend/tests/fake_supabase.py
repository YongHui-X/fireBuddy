from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime, timezone
from uuid import UUID, uuid5


@dataclass
class FakeResponse:
    data: list[dict]


class FakeQuery:
    """Provide the small fluent query surface used by the CRUD route tests."""

    def __init__(self, client: "FakeSupabase", table_name: str):
        self.client = client
        self.table_name = table_name
        self.operation = "select"
        self.values: dict | None = None
        self.filters: list[tuple[str, object]] = []
        self.limit_count: int | None = None

    def select(self, _columns: str):
        return self

    def insert(self, values: dict):
        self.operation = "insert"
        self.values = deepcopy(values)
        return self

    def update(self, values: dict):
        self.operation = "update"
        self.values = deepcopy(values)
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, column: str, value: object):
        self.filters.append((column, value))
        return self

    def gte(self, column: str, value: object):
        self.filters.append((column, ("gte", value)))
        return self

    def lte(self, column: str, value: object):
        self.filters.append((column, ("lte", value)))
        return self

    def order(self, _column: str, desc: bool = False):
        return self

    def limit(self, count: int):
        self.limit_count = count
        return self

    def execute(self) -> FakeResponse:
        rows = self.client.rows.setdefault(self.table_name, [])

        if self.operation == "insert":
            row = self.client.complete_row(self.table_name, self.values or {})
            rows.append(row)
            return FakeResponse([deepcopy(row)])

        matches = [row for row in rows if self._matches(row)]
        if self.limit_count is not None:
            matches = matches[: self.limit_count]

        if self.operation == "update":
            for row in matches:
                row.update(self.values or {})
                if self.table_name == "expenses":
                    row["updated_at"] = datetime.now(timezone.utc).isoformat()
            return FakeResponse(deepcopy(matches))

        if self.operation == "delete":
            matched_ids = {id(row) for row in matches}
            self.client.rows[self.table_name] = [row for row in rows if id(row) not in matched_ids]
            return FakeResponse(deepcopy(matches))

        return FakeResponse(deepcopy(matches))

    def _matches(self, row: dict) -> bool:
        for column, expected in self.filters:
            actual = row.get(column)
            if isinstance(expected, tuple):
                operation, boundary = expected
                if operation == "gte" and actual < boundary:
                    return False
                if operation == "lte" and actual > boundary:
                    return False
            elif str(actual).lower() != str(expected).lower():
                return False
        return True


class FakeSupabase:
    """Keep deterministic in-memory rows while matching Supabase's route API."""

    def __init__(self, rows: dict[str, list[dict]] | None = None):
        self.rows = deepcopy(rows or {})
        self.next_id = 1

    def table(self, table_name: str) -> FakeQuery:
        return FakeQuery(self, table_name)

    def complete_row(self, table_name: str, values: dict) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        generated_id = str(uuid5(UUID("00000000-0000-4000-8000-000000000000"), str(self.next_id)))
        self.next_id += 1

        if table_name == "categories":
            return {
                "id": generated_id,
                "created_at": now,
                "category_type": "expense",
                **values,
            }

        if table_name == "expenses":
            return {
                "id": generated_id,
                "created_at": now,
                "updated_at": now,
                "transaction_type": "expense",
                **values,
            }

        if table_name == "accounts":
            return {
                "id": generated_id,
                "created_at": now,
                "updated_at": now,
                **values,
            }

        return {"id": generated_id, **values}
