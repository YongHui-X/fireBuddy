from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class TagModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TagNameRequest(TagModel):
    name: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        """Normalize whitespace and reject the CSV tag separator."""

        cleaned = " ".join(value.strip().split())
        if not 1 <= len(cleaned) <= 40:
            raise ValueError("Tag names must contain 1 to 40 characters")
        if "|" in cleaned:
            raise ValueError("Tag names cannot contain the | separator")
        return cleaned


class TagResponse(TagModel):
    id: UUID
    user_id: UUID
    name: str
    usage_count: int
    created_at: str
    updated_at: str


def serialize_tag(row: dict[str, Any], usage_count: int = 0) -> TagResponse:
    """Map a stored tag and its derived usage count to the API contract."""

    return TagResponse(
        id=str(row["id"]),
        userId=str(row["user_id"]),
        name=str(row["name"]),
        usageCount=usage_count,
        createdAt=_serialize_datetime(row.get("created_at")),
        updatedAt=_serialize_datetime(row.get("updated_at")),
    )


def _serialize_datetime(value: Any) -> str:
    return value.isoformat() if isinstance(value, datetime) else str(value)
