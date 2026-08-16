from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


class ExpenseModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateExpenseRequest(ExpenseModel):
    category_id: UUID | None = None
    account_id: UUID
    description: Annotated[str, Field(min_length=1, max_length=200)]
    amount: Annotated[Decimal, Field(gt=0, decimal_places=2)]
    date: Date

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return value.strip()


class UpdateExpenseRequest(ExpenseModel):
    category_id: UUID | None = None
    account_id: UUID | None = None
    description: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    amount: Annotated[Decimal | None, Field(gt=0, decimal_places=2)] = None
    date: Date | None = None

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value

    @model_validator(mode="after")
    def require_one_field(self):
        if not self.model_fields_set:
            raise ValueError("At least one expense field must be provided")
        if "account_id" in self.model_fields_set and self.account_id is None:
            raise ValueError("accountId cannot be null")
        return self


class ExpenseResponse(ExpenseModel):
    id: UUID
    user_id: UUID
    category_id: UUID | None
    account_id: UUID
    description: str | None
    amount: str
    date: str
    created_at: str
    updated_at: str


def serialize_expense(row: dict[str, Any]) -> ExpenseResponse:
    return ExpenseResponse(
        id=str(row["id"]),
        userId=str(row["user_id"]),
        categoryId=str(row["category_id"]) if row.get("category_id") is not None else None,
        accountId=str(row["account_id"]),
        description=row.get("description"),
        amount=str(row["amount"]),
        date=str(row["date"]),
        createdAt=_serialize_datetime(row.get("created_at")),
        updatedAt=_serialize_datetime(row.get("updated_at")),
    )


def _serialize_datetime(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
