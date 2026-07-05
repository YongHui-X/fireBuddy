from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CreateCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class CategoryResponse(BaseModel):
    id: str
    user_id: str | None = Field(alias="userId")
    name: str
    is_default: bool = Field(alias="isDefault")
    created_at: str = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


def serialize_category(row: dict[str, Any]) -> CategoryResponse:
    return CategoryResponse(
        id=str(row["id"]),
        userId=str(row["user_id"]) if row.get("user_id") is not None else None,
        name=row["name"],
        isDefault=bool(row["is_default"]),
        createdAt=_serialize_datetime(row.get("created_at")),
    )


def _serialize_datetime(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
