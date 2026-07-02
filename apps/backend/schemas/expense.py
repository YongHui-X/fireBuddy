from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CreateExpenseRequest(BaseModel):
    category_id: str | None = Field(default=None, alias="categoryId")
    description: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=0, decimal_places=2)
    date: Date

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return value.strip()


class UpdateExpenseRequest(BaseModel):
    category_id: str | None = Field(default=None, alias="categoryId")
    description: str | None = Field(default=None, min_length=1, max_length=200)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    date: Date | None = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value

    @model_validator(mode="after")
    def require_one_field(self):
        if not self.model_fields_set:
            raise ValueError("At least one expense field must be provided")
        return self


class ExpenseResponse(BaseModel):
    id: str
    user_id: str = Field(alias="userId")
    category_id: str | None = Field(alias="categoryId")
    description: str | None
    amount: str
    date: str
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


def serialize_expense(row: dict[str, Any]) -> ExpenseResponse:
    return ExpenseResponse(
        id=row["id"],
        userId=row["user_id"],
        categoryId=row.get("category_id"),
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
