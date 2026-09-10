from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.financial import (
    EssentialCategoriesRequest,
    EssentialCategoriesResponse,
    FireCalculationRequest,
    FireCalculationResponse,
    FireProfileEnvelope,
    FireProfileInput,
    FireProfileResponse,
    FireScenarioRequest,
    serialize_row,
)
from services.financial_repository import load_financial_records
from services.financial_summary import build_financial_summary
from services.retirement_calculator import validate_timeline


router = APIRouter(prefix="/fire", tags=["fire"])
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


def singapore_today() -> date:
    """Use the product's Singapore calendar boundary for dashboard periods."""

    return datetime.now(ZoneInfo("Asia/Singapore")).date()


def validated_as_of(value: date | None) -> date:
    """Prevent future dates from turning projections into historical facts."""

    result = value or singapore_today()
    if result > singapore_today():
        raise HTTPException(status_code=422, detail="asOf cannot be in the future")
    return result


@router.get("/essential-categories", response_model=EssentialCategoriesResponse)
def get_essential_categories(current_user: CurrentUser):
    """Return the user's confirmed essential expense category identifiers."""

    response = supabase.table("essential_expense_categories").select("category_id").eq("user_id", current_user.id).execute()
    return {"categoryIds": [row["category_id"] for row in response.data or []]}


@router.put("/essential-categories", response_model=EssentialCategoriesResponse)
def replace_essential_categories(payload: EssentialCategoriesRequest, current_user: CurrentUser):
    """Replace the small per-user essential-category selection atomically at API level."""

    category_ids = [str(value) for value in payload.category_ids]
    if category_ids:
        visible = (supabase.table("categories").select("id,user_id,is_default,category_type")
                   .eq("category_type", "expense").execute()).data or []
        visible_ids = {str(row["id"]) for row in visible if row.get("is_default") or str(row.get("user_id")) == current_user.id}
        if not set(category_ids).issubset(visible_ids):
            raise HTTPException(status_code=422, detail="Essential categories must be visible expense categories")
    supabase.table("essential_expense_categories").delete().eq("user_id", current_user.id).execute()
    for category_id in category_ids:
        supabase.table("essential_expense_categories").insert({"user_id": current_user.id, "category_id": category_id}).execute()
    return {"categoryIds": category_ids}


@router.get("/profile", response_model=FireProfileEnvelope)
def get_fire_profile(current_user: CurrentUser):
    """Return an explicit unconfigured state instead of fabricated FIRE assumptions."""

    response = supabase.table("fire_profiles").select("*").eq("user_id", current_user.id).limit(1).execute()
    if not response.data:
        return {"configured": False, "profile": None}
    return {"configured": True, "profile": serialize_row(FireProfileResponse, response.data[0])}


@router.put("/profile", response_model=FireProfileResponse)
def replace_fire_profile(payload: FireProfileInput, current_user: CurrentUser):
    """Save an isolated draft or a confirmed active plan while preserving legacy fields."""

    existing = supabase.table("fire_profiles").select("id").eq("user_id", current_user.id).limit(1).execute()
    if payload.active_plan:
        try:
            validate_timeline(payload.active_plan.model_dump(mode="json"), singapore_today())
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        if payload.active_plan.portfolioOverride is None:
            records = load_financial_records(current_user.id, singapore_today())
            candidate = {**(records['profile'] or {}), 'active_plan': payload.active_plan.model_dump(mode='json')}
            checked = build_financial_summary(**{**records, 'profile': candidate}, as_of=singapore_today())['fire']
            if checked['fundingStatus'] == 'review_required':
                raise HTTPException(status_code=422, detail='Selected retirement assets must be owned, eligible and have dated snapshots')
    values = {"user_id": current_user.id, **payload.model_dump(mode="json", exclude_unset=True)}
    if existing.data:
        response = supabase.table("fire_profiles").update(values).eq("user_id", current_user.id).execute()
    else:
        response = supabase.table("fire_profiles").insert(values).execute()
    return serialize_row(FireProfileResponse, response.data[0])


def calculate_for_user(user_id: str, as_of: date, contribution: Decimal | None = None, spending: Decimal | None = None, overrides: dict | None = None) -> dict:
    """Run the shared financial summary and return its FIRE calculation portion."""

    records = load_financial_records(user_id, as_of)
    return build_financial_summary(**records, as_of=as_of, scenario_contribution=contribution, scenario_spending=spending, scenario_overrides=overrides)["fire"]


@router.post("/calculate", response_model=FireCalculationResponse)
def calculate_fire(payload: FireCalculationRequest, current_user: CurrentUser):
    """Calculate the saved baseline from current owner-scoped financial records."""

    return calculate_for_user(current_user.id, validated_as_of(payload.as_of))


@router.post("/scenario", response_model=FireCalculationResponse)
def calculate_fire_scenario(payload: FireScenarioRequest, current_user: CurrentUser):
    """Calculate permitted temporary overrides without persisting any profile changes."""

    return calculate_for_user(current_user.id, validated_as_of(payload.as_of), payload.monthly_contribution, payload.retirement_spending, payload.plan_overrides.model_dump(exclude_none=True) if payload.plan_overrides else None)
