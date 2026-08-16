from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

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
    "others": "others",
    "salary": "salary",
    "bonus": "bonus",
    "dividends": "dividends",
    "interest": "interest",
    "other income": "income",
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


class CategoryModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateCategoryRequest(CategoryModel):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    icon: Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")]
    color: Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
    monthly_budget: Annotated[
        Decimal,
        Field(ge=0, max_digits=10, decimal_places=2),
    ]
    category_type: Literal["expense", "income"] = "expense"

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        return cleaned

    @model_validator(mode="after")
    def require_zero_income_budget(self):
        """Keep income categories free of expense budget semantics."""

        if self.category_type == "income" and self.monthly_budget != 0:
            raise ValueError("Income categories must have a zero monthly budget")
        return self


class UpdateCategoryRequest(CategoryModel):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    icon: Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{0,31}$")]
    color: Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
    monthly_budget: Annotated[
        Decimal,
        Field(ge=0, max_digits=10, decimal_places=2),
    ]
    category_type: Literal["expense", "income"] = "expense"

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        return cleaned

    @model_validator(mode="after")
    def require_zero_income_budget(self):
        """Keep income categories free of expense budget semantics."""

        if self.category_type == "income" and self.monthly_budget != 0:
            raise ValueError("Income categories must have a zero monthly budget")
        return self


class CategoryResponse(CategoryModel):
    id: UUID
    user_id: UUID | None
    name: str
    icon: str
    color: str
    monthly_budget: Decimal
    category_type: Literal["expense", "income"]
    is_default: bool
    created_at: str


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
        categoryType=str(row.get("category_type") or "expense"),
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
