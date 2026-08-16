from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.category import (
    CategoryResponse,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    serialize_category,
)

router = APIRouter(prefix="/categories", tags=["categories"])


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
CATEGORY_VISUALS_MIGRATION_ERROR = (
    "Category visuals are not available yet. Apply the add_category_visuals Supabase migration."
)
CATEGORY_COLUMNS = "id,user_id,name,icon,color,monthly_budget,category_type,is_default,created_at"


def _is_missing_category_visual_column(error: APIError) -> bool:
    details = error.json()
    message = " ".join(str(value) for value in details.values()).lower()
    return details.get("code") == "PGRST204" and any(
        column in message for column in ("icon", "color", "monthly_budget")
    )


@router.get("", response_model=list[CategoryResponse])
def get_categories(
    current_user: CurrentUser,
    category_type: str | None = Query(default=None, alias="categoryType", pattern="^(expense|income)$"),
):
    default_response = (
        supabase.table("categories")
        .select(CATEGORY_COLUMNS)
        .eq("is_default", True)
        .order("name")
        .execute()
    )
    user_response = (
        supabase.table("categories")
        .select(CATEGORY_COLUMNS)
        .eq("user_id", current_user.id)
        .order("name")
        .execute()
    )

    rows = [*(default_response.data or []), *(user_response.data or [])]
    if category_type is not None:
        rows = [row for row in rows if row.get("category_type", "expense") == category_type]
    return [serialize_category(row) for row in sorted(rows, key=lambda row: row["name"].lower())]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: CreateCategoryRequest, current_user: CurrentUser):
    try:
        response = (
            supabase.table("categories")
            .insert(
                {
                    "name": payload.name,
                    "icon": payload.icon,
                    "color": payload.color,
                    "monthly_budget": str(payload.monthly_budget),
                    "category_type": payload.category_type,
                    "user_id": current_user.id,
                    "is_default": False,
                }
            )
            .execute()
        )
    except APIError as error:
        if _is_missing_category_visual_column(error):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=CATEGORY_VISUALS_MIGRATION_ERROR,
            ) from error
        raise

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Category was not created",
        )

    return serialize_category(response.data[0])


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: UUID, payload: UpdateCategoryRequest, current_user: CurrentUser):
    category_id_value = str(category_id)
    response = (
        supabase.table("categories")
        .select(CATEGORY_COLUMNS)
        .eq("id", category_id_value)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    category = response.data[0]
    if category["is_default"] or category.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only user-owned categories can be edited",
        )

    try:
        update_response = (
            supabase.table("categories")
            .update(
                {
                    "name": payload.name,
                    "icon": payload.icon,
                    "color": payload.color,
                    "monthly_budget": str(payload.monthly_budget),
                    "category_type": payload.category_type,
                }
            )
            .eq("id", category_id_value)
            .eq("user_id", current_user.id)
            .execute()
        )
    except APIError as error:
        if _is_missing_category_visual_column(error):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=CATEGORY_VISUALS_MIGRATION_ERROR,
            ) from error
        raise

    if not update_response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Category was not updated",
        )

    return serialize_category(update_response.data[0])


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: UUID, current_user: CurrentUser):
    category_id_value = str(category_id)
    response = (
        supabase.table("categories")
        .select(CATEGORY_COLUMNS)
        .eq("id", category_id_value)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    category = response.data[0]
    if category["is_default"] or category.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only user-owned categories can be deleted",
        )

    (
        supabase.table("categories")
        .delete()
        .eq("id", category_id_value)
        .eq("user_id", current_user.id)
        .execute()
    )
    return None
