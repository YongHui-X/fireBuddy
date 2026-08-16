from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


AccountType = Literal["bank", "credit_card", "debit_card", "cash", "ewallet"]
AccountName = Annotated[str, Field(min_length=1, max_length=80)]
AccountColor = Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
LastFour = Annotated[str | None, Field(pattern=r"^[0-9]{4}$")]


class AccountModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateAccountRequest(AccountModel):
    name: AccountName
    type: AccountType
    color: AccountColor
    last_four: LastFour = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        """Collapse account name whitespace before persistence."""

        return " ".join(value.strip().split())


class UpdateAccountRequest(AccountModel):
    name: AccountName | None = None
    type: AccountType | None = None
    color: AccountColor | None = None
    last_four: LastFour = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        """Collapse account name whitespace when it is updated."""

        return " ".join(value.strip().split()) if value is not None else None

    @model_validator(mode="after")
    def require_one_field(self):
        """Reject empty updates while allowing lastFour to be cleared."""

        if not self.model_fields_set:
            raise ValueError("At least one account field must be provided")
        return self


class AccountResponse(AccountModel):
    id: UUID
    user_id: UUID
    name: str
    type: AccountType
    color: str
    last_four: str | None
    is_default: bool
    created_at: str
    updated_at: str


def serialize_account(row: dict[str, Any]) -> AccountResponse:
    """Map a database account row to the public camel-case API contract."""

    return AccountResponse(
        id=str(row["id"]),
        userId=str(row["user_id"]),
        name=str(row["name"]),
        type=str(row["type"]),
        color=str(row["color"]),
        lastFour=str(row["last_four"]) if row.get("last_four") is not None else None,
        isDefault=bool(row["is_default"]),
        createdAt=_serialize_datetime(row.get("created_at")),
        updatedAt=_serialize_datetime(row.get("updated_at")),
    )


def _serialize_datetime(value: Any) -> str:
    """Return database timestamps as stable ISO compatible strings."""

    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
