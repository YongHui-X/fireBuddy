import json
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, ConfigDict, Field

from config import settings
from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase

router = APIRouter(prefix="/ai", tags=["ai"])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Confidence = Literal["low", "medium", "high"]


class ParseInputRequest(BaseModel):
    description: str = Field(min_length=1, max_length=200)


class ParseInputResponse(BaseModel):
    category_id: str | None = Field(alias="categoryId")
    category_name: str | None = Field(alias="categoryName")
    confidence: Confidence
    reason: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class CategoryOption(BaseModel):
    id: str
    name: str


def fetch_available_categories(user_id: str) -> list[CategoryOption]:
    default_response = (
        supabase.table("categories")
        .select("id,name")
        .eq("is_default", True)
        .order("name")
        .execute()
    )
    user_response = (
        supabase.table("categories")
        .select("id,name")
        .eq("user_id", user_id)
        .order("name")
        .execute()
    )

    rows = [*(default_response.data or []), *(user_response.data or [])]
    return [
        CategoryOption(id=str(row["id"]), name=str(row["name"]))
        for row in sorted(rows, key=lambda row: str(row["name"]).lower())
    ]


def parse_openai_json(content: str) -> dict:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI category suggestion was not valid JSON",
        ) from exc

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI category suggestion had an invalid shape",
        )

    return parsed


@router.post("/parse-input", response_model=ParseInputResponse)
def parse_input(payload: ParseInputRequest, current_user: CurrentUser):
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )

    categories = fetch_available_categories(current_user.id)
    if not categories:
        return ParseInputResponse(
            categoryId=None,
            categoryName=None,
            confidence="low",
            reason="No categories are available.",
        )

    category_lookup = {category.id: category for category in categories}
    category_list = "\n".join(f"- {category.id}: {category.name}" for category in categories)
    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You categorize Singapore personal finance transaction descriptions. "
                        "Choose one categoryId only from the provided category list. "
                        "Return null when there is no reasonable match."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Description: {payload.description.strip()}\n\n"
                        f"Available categories:\n{category_list}"
                    ),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "category_suggestion",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "categoryId": {
                                "type": ["string", "null"],
                                "description": "An id from the available categories, or null.",
                            },
                            "confidence": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                            },
                            "reason": {
                                "type": "string",
                                "maxLength": 160,
                            },
                        },
                        "required": ["categoryId", "confidence", "reason"],
                    },
                },
            },
        )
    except OpenAIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to get an AI category suggestion",
        ) from exc

    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI category suggestion was empty",
        )

    parsed = parse_openai_json(content)
    raw_category_id = parsed.get("categoryId")
    confidence = parsed.get("confidence")
    reason = parsed.get("reason")

    if confidence not in {"low", "medium", "high"}:
        confidence = "low"

    if raw_category_id is None:
        return ParseInputResponse(
            categoryId=None,
            categoryName=None,
            confidence=confidence,
            reason=str(reason) if reason else None,
        )

    category_id = str(raw_category_id)
    category = category_lookup.get(category_id)
    if category is None:
        return ParseInputResponse(
            categoryId=None,
            categoryName=None,
            confidence="low",
            reason="AI suggested a category outside the available list.",
        )

    return ParseInputResponse(
        categoryId=category.id,
        categoryName=category.name,
        confidence=confidence,
        reason=str(reason) if reason else None,
    )
