from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.expense import (
    CreateExpenseRequest,
    ExpenseResponse,
    UpdateExpenseRequest,
    serialize_expense,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


def ensure_category_is_available(category_id: str | None, user_id: str) -> None:
    if category_id is None:
        return

    try:
        default_response = (
            supabase.table("categories")
            .select("id")
            .eq("id", category_id)
            .eq("is_default", True)
            .limit(1)
            .execute()
        )
    except APIError as exc:
        if exc.code == "22P02":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="categoryId must reference a backend category",
            ) from exc
        raise

    if default_response.data:
        return

    try:
        user_response = (
            supabase.table("categories")
            .select("id")
            .eq("id", category_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except APIError as exc:
        if exc.code == "22P02":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="categoryId must reference a backend category",
            ) from exc
        raise

    if user_response.data:
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="categoryId must reference a default category or your own category",
    )


def get_owned_expense_or_404(expense_id: str, user_id: str) -> dict:
    response = (
        supabase.table("expenses")
        .select("*")
        .eq("id", expense_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )

    return response.data[0]


@router.get("", response_model=list[ExpenseResponse])
def get_expenses(
    current_user: CurrentUser,
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    category_id: str | None = Query(default=None, alias="categoryId"),
):
    query = (
        supabase.table("expenses")
        .select("*")
        .eq("user_id", current_user.id)
        .order("date", desc=True)
        .order("created_at", desc=True)
    )

    if start_date is not None:
        query = query.gte("date", start_date.isoformat())

    if end_date is not None:
        query = query.lte("date", end_date.isoformat())

    if category_id is not None:
        query = query.eq("category_id", category_id)

    response = query.execute()
    return [serialize_expense(row) for row in response.data or []]


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(payload: CreateExpenseRequest, current_user: CurrentUser):
    ensure_category_is_available(payload.category_id, current_user.id)

    response = (
        supabase.table("expenses")
        .insert(
            {
                "user_id": current_user.id,
                "category_id": payload.category_id,
                "description": payload.description,
                "amount": str(payload.amount),
                "date": payload.date.isoformat(),
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Expense was not created",
        )

    return serialize_expense(response.data[0])


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    payload: UpdateExpenseRequest,
    current_user: CurrentUser,
):
    get_owned_expense_or_404(expense_id, current_user.id)

    if "category_id" in payload.model_fields_set:
        ensure_category_is_available(payload.category_id, current_user.id)

    updates = payload.model_dump(
        mode="json",
        by_alias=False,
        exclude_unset=True,
    )
    if "amount" in updates:
        updates["amount"] = str(updates["amount"])
    if "date" in updates:
        updates["date"] = str(updates["date"])

    response = (
        supabase.table("expenses")
        .update(updates)
        .eq("id", expense_id)
        .eq("user_id", current_user.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Expense was not updated",
        )

    return serialize_expense(response.data[0])


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, current_user: CurrentUser):
    get_owned_expense_or_404(expense_id, current_user.id)

    (
        supabase.table("expenses")
        .delete()
        .eq("id", expense_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    return None
