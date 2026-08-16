import json
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from config import settings
from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from services.rate_limiter import SlidingWindowRateLimiter

router = APIRouter(prefix="/ai", tags=["ai"])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Confidence = Literal["low", "medium", "high"]
ai_suggestion_rate_limiter = SlidingWindowRateLimiter(
    settings.ai_suggestion_rate_limit_requests,
    settings.ai_suggestion_rate_limit_window_seconds,
)


class AiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ParseInputRequest(AiModel):
    description: Annotated[str, Field(min_length=1, max_length=200)]

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        """Trim descriptions and reject whitespace-only suggestion requests."""

        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Description cannot be blank")
        return cleaned


class ParseInputResponse(AiModel):
    category_id: UUID | None
    category_name: str | None
    confidence: Confidence
    reason: str | None = None


class CategoryOption(AiModel):
    id: UUID
    name: str


def fetch_available_categories(user_id: str) -> list[CategoryOption]:
    """Return system and user-owned categories allowed for a suggestion."""

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

    rows = [
        row
        for row in [*(default_response.data or []), *(user_response.data or [])]
        if str(row["name"]).strip().lower() != "income"
    ]
    return [
        CategoryOption(id=str(row["id"]), name=str(row["name"]))
        for row in sorted(rows, key=lambda row: str(row["name"]).lower())
    ]


def parse_openai_json(content: str) -> dict:
    """Decode structured model output without exposing raw upstream content."""

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
    """Suggest one available category while leaving saving to the user."""

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )

    rate_limit = ai_suggestion_rate_limiter.check(current_user.id)
    if not rate_limit.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many category suggestion requests. Please try again shortly.",
            headers={"Retry-After": str(rate_limit.retry_after_seconds)},
        )

    categories = fetch_available_categories(current_user.id)
    if not categories:
        return ParseInputResponse(
            categoryId=None,
            categoryName=None,
            confidence="low",
            reason="No categories are available.",
        )

    category_lookup = {str(category.id): category for category in categories}
    category_list = "\n".join(f"- {category.id}: {category.name}" for category in categories)
    try:
        client = OpenAI(api_key=settings.openai_api_key)
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
                        f"Description: {payload.description}\n\n"
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
    except (OpenAIError, RuntimeError, ValueError, TypeError) as exc:
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
