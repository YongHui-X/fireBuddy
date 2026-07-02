from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.category import (
    CategoryResponse,
    CreateCategoryRequest,
    serialize_category,
)

router = APIRouter(prefix="/categories", tags=["categories"])


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


@router.get("", response_model=list[CategoryResponse])
def get_categories(current_user: CurrentUser):
    default_response = (
        supabase.table("categories")
        .select("*")
        .eq("is_default", True)
        .order("name")
        .execute()
    )
    user_response = (
        supabase.table("categories")
        .select("*")
        .eq("user_id", current_user.id)
        .order("name")
        .execute()
    )

    rows = [*(default_response.data or []), *(user_response.data or [])]
    return [serialize_category(row) for row in sorted(rows, key=lambda row: row["name"].lower())]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: CreateCategoryRequest, current_user: CurrentUser):
    response = (
        supabase.table("categories")
        .insert(
            {
                "name": payload.name,
                "user_id": current_user.id,
                "is_default": False,
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Category was not created",
        )

    return serialize_category(response.data[0])


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, current_user: CurrentUser):
    response = (
        supabase.table("categories")
        .select("*")
        .eq("id", category_id)
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
        .eq("id", category_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    return None
