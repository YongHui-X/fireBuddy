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
        self.range_start: int | None = None
        self.range_end: int | None = None

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

    def in_(self, column: str, values: list[object]):
        self.filters.append((column, ("in", values)))
        return self

    def order(self, _column: str, desc: bool = False):
        return self

    def limit(self, count: int):
        self.limit_count = count
        return self

    def range(self, start: int, end: int):
        self.range_start = start
        self.range_end = end
        return self

    def execute(self) -> FakeResponse:
        rows = self.client.rows.setdefault(self.table_name, [])

        if self.operation == "insert":
            row = self.client.complete_row(self.table_name, self.values or {})
            rows.append(row)
            return FakeResponse([deepcopy(row)])

        matches = [row for row in rows if self._matches(row)]
        if self.range_start is not None and self.range_end is not None:
            matches = matches[self.range_start:self.range_end + 1]
        if self.limit_count is not None:
            matches = matches[: self.limit_count]

        if self.operation == "update":
            for row in matches:
                row.update(self.values or {})
                if self.table_name in {"expenses", "accounts", "wealth_positions", "wealth_position_snapshots", "wealth_contributions", "fire_profiles"}:
                    row["updated_at"] = datetime.now(timezone.utc).isoformat()
            return FakeResponse(deepcopy(matches))

        if self.operation == "delete":
            if self.table_name == "tags":
                deleted_tag_ids = {str(row["id"]) for row in matches}
                self.client.rows["transaction_tags"] = [
                    row for row in self.client.rows.get("transaction_tags", [])
                    if str(row.get("tag_id")) not in deleted_tag_ids
                ]
            if self.table_name == "expenses":
                deleted_transaction_ids = {str(row["id"]) for row in matches}
                self.client.rows["transaction_tags"] = [
                    row for row in self.client.rows.get("transaction_tags", [])
                    if str(row.get("transaction_id")) not in deleted_transaction_ids
                ]
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
                if operation == "in" and str(actual).lower() not in {str(value).lower() for value in boundary}:
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

    def rpc(self, function_name: str, params: dict):
        return FakeRpcQuery(self, function_name, params)

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

        if table_name == "tags":
            return {
                "id": generated_id,
                "created_at": now,
                "updated_at": now,
                **values,
            }

        if table_name == "accounts":
            return {
                "id": generated_id,
                "created_at": now,
                "updated_at": now,
                **values,
            }

        if table_name == "wealth_positions":
            return {
                "id": generated_id,
                "is_archived": False,
                "archived_at": None,
                "created_at": now,
                "updated_at": now,
                **values,
            }

        if table_name in {"wealth_position_snapshots", "wealth_contributions", "fire_profiles"}:
            return {
                "id": generated_id,
                "created_at": now,
                "updated_at": now,
                **values,
            }

        if table_name == "essential_expense_categories":
            return {"created_at": now, **values}

        return {"id": generated_id, **values}


class FakeRpcQuery:
    """Emulate the two atomic transaction functions used by route tests."""

    def __init__(self, client: FakeSupabase, function_name: str, params: dict):
        self.client = client
        self.function_name = function_name
        self.params = deepcopy(params)

    def execute(self) -> FakeResponse:
        tag_ids = [str(value) for value in self.params.get("p_tag_ids", [])]
        user_id = str(self.params["p_user_id"])
        owned_tag_ids = {
            str(row["id"]) for row in self.client.rows.get("tags", [])
            if str(row.get("user_id")) == user_id
        }
        if len(tag_ids) > 10 or len(tag_ids) != len(set(tag_ids)) or any(tag not in owned_tag_ids for tag in tag_ids):
            raise ValueError("Invalid tag assignment")

        values = {
            "user_id": user_id,
            "category_id": self.params.get("p_category_id"),
            "account_id": self.params["p_account_id"],
            "description": self.params["p_description"],
            "amount": self.params["p_amount"],
            "date": self.params["p_date"],
            "transaction_type": self.params["p_transaction_type"],
        }
        if self.function_name == "create_transaction_with_tags":
            transaction = self.client.complete_row("expenses", values)
            self.client.rows.setdefault("expenses", []).append(transaction)
        elif self.function_name == "update_transaction_with_tags":
            transaction_id = str(self.params["p_transaction_id"])
            transaction = next(
                (row for row in self.client.rows.get("expenses", []) if str(row["id"]) == transaction_id and str(row["user_id"]) == user_id),
                None,
            )
            if transaction is None:
                return FakeResponse([])
            transaction.update(values)
            transaction["updated_at"] = datetime.now(timezone.utc).isoformat()
            self.client.rows["transaction_tags"] = [
                row for row in self.client.rows.get("transaction_tags", [])
                if not (str(row.get("transaction_id")) == transaction_id and str(row.get("user_id")) == user_id)
            ]
        else:
            raise ValueError(f"Unsupported fake RPC: {self.function_name}")

        for tag_id in tag_ids:
            self.client.rows.setdefault("transaction_tags", []).append({
                "user_id": user_id,
                "transaction_id": str(transaction["id"]),
                "tag_id": tag_id,
            })
        return FakeResponse([deepcopy(transaction)])
