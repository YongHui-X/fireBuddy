from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


TransactionType = Literal["expense", "income"]


class TransactionModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateTransactionRequest(TransactionModel):
    category_id: UUID | None = None
    account_id: UUID
    description: Annotated[str, Field(min_length=1, max_length=200)]
    amount: Annotated[Decimal, Field(gt=0, decimal_places=2)]
    date: Date
    transaction_type: TransactionType
    tag_ids: Annotated[list[UUID], Field(max_length=10)] = Field(default_factory=list)

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        """Trim transaction descriptions before persistence."""

        return value.strip()


class UpdateTransactionRequest(TransactionModel):
    category_id: UUID | None = None
    account_id: UUID | None = None
    description: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    amount: Annotated[Decimal | None, Field(gt=0, decimal_places=2)] = None
    date: Date | None = None
    transaction_type: TransactionType | None = None
    tag_ids: Annotated[list[UUID] | None, Field(max_length=10)] = None

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str | None) -> str | None:
        """Trim an updated description without changing omitted fields."""

        return value.strip() if value is not None else value

    @model_validator(mode="after")
    def require_one_field(self):
        """Reject empty updates and nullable required relationships."""

        if not self.model_fields_set:
            raise ValueError("At least one transaction field must be provided")
        if "account_id" in self.model_fields_set and self.account_id is None:
            raise ValueError("accountId cannot be null")
        if "transaction_type" in self.model_fields_set and self.transaction_type is None:
            raise ValueError("transactionType cannot be null")
        if "tag_ids" in self.model_fields_set and self.tag_ids is None:
            raise ValueError("tagIds cannot be null")
        return self


class TransactionResponse(TransactionModel):
    id: UUID
    user_id: UUID
    category_id: UUID | None
    account_id: UUID
    description: str | None
    amount: str
    date: str
    transaction_type: TransactionType
    created_at: str
    updated_at: str
    tag_ids: list[UUID]


def serialize_transaction(row: dict[str, Any], tag_ids: list[str] | None = None) -> TransactionResponse:
    """Map a stored row to the typed public transaction contract."""

    return TransactionResponse(
        id=str(row["id"]),
        userId=str(row["user_id"]),
        categoryId=str(row["category_id"]) if row.get("category_id") is not None else None,
        accountId=str(row["account_id"]),
        description=row.get("description"),
        amount=str(row["amount"]),
        date=str(row["date"]),
        transactionType=str(row.get("transaction_type") or "expense"),
        createdAt=_serialize_datetime(row.get("created_at")),
        updatedAt=_serialize_datetime(row.get("updated_at")),
        tagIds=tag_ids or [],
    )


def _serialize_datetime(value: Any) -> str:
    """Return database timestamps as stable ISO compatible strings."""

    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
