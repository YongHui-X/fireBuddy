from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_CATEGORY_COLOR = "#3C8A61"
DEFAULT_CATEGORY_ICONS = {
    "food & drink": "food",
    "coffee": "coffee",
    "transport": "transport",
    "bus": "bus",
    "car": "car",
    "fuel": "fuel",
    "shopping": "shopping",
    "clothing": "clothing",
    "bills & utilities": "utilities",
    "housing": "housing",
    "phone & internet": "phone",
    "healthcare": "health",
    "fitness": "fitness",
    "entertainment": "entertainment",
    "gaming": "gaming",
    "camera": "camera",
    "travel": "travel",
    "places": "places",
    "education": "education",
    "gifts": "gifts",
    "tech": "tech",
    "banking": "banking",
    "income": "income",
    "others": "others",
}
DEFAULT_CATEGORY_STYLES = {
    "food & drink": ("#3C8A61", Decimal("600")),
    "transport": ("#67B47C", Decimal("250")),
    "shopping": ("#E5B24A", Decimal("300")),
    "bills & utilities": ("#7BAA90", Decimal("150")),
    "healthcare": ("#2E9B57", Decimal("150")),
    "entertainment": ("#8BB89D", Decimal("200")),
    "travel": ("#25543D", Decimal("400")),
    "others": ("#A8D3B7", Decimal("200")),
}


class CreateCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    monthly_budget: Decimal = Field(alias="monthlyBudget", ge=0, max_digits=10, decimal_places=2)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class UpdateCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    monthly_budget: Decimal = Field(alias="monthlyBudget", ge=0, max_digits=10, decimal_places=2)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class CategoryResponse(BaseModel):
    id: str
    user_id: str | None = Field(alias="userId")
    name: str
    icon: str
    color: str
    monthly_budget: Decimal = Field(alias="monthlyBudget")
    is_default: bool = Field(alias="isDefault")
    created_at: str = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


def serialize_category(row: dict[str, Any]) -> CategoryResponse:
    name = str(row["name"])
    normalized_name = name.lower()
    fallback_color, fallback_budget = DEFAULT_CATEGORY_STYLES.get(
        normalized_name,
        (DEFAULT_CATEGORY_COLOR, Decimal("0")),
    )
    persisted_budget = row.get("monthly_budget")

    return CategoryResponse(
        icon=str(row.get("icon") or DEFAULT_CATEGORY_ICONS.get(normalized_name, "others")),
        color=str(row.get("color") or fallback_color),
        monthlyBudget=Decimal(str(fallback_budget if persisted_budget is None else persisted_budget)),
        id=str(row["id"]),
        userId=str(row["user_id"]) if row.get("user_id") is not None else None,
        name=name,
        isDefault=bool(row["is_default"]),
        createdAt=_serialize_datetime(row.get("created_at")),
    )


def _serialize_datetime(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
