from datetime import date
from typing import Annotated
from uuid import UUID

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
EXPENSE_COLUMNS = (
    "id,user_id,category_id,account_id,description,amount,date,created_at,updated_at"
)


def ensure_category_is_available(category_id: UUID | None, user_id: str) -> None:
    if category_id is None:
        return

    category_id_value = str(category_id)

    try:
        default_response = (
            supabase.table("categories")
            .select("id,category_type")
            .eq("id", category_id_value)
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

    if default_response.data and default_response.data[0].get("category_type", "expense") == "expense":
        return

    try:
        user_response = (
            supabase.table("categories")
            .select("id,category_type")
            .eq("id", category_id_value)
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

    if user_response.data and user_response.data[0].get("category_type", "expense") == "expense":
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="categoryId must reference a default category or your own category",
    )


def ensure_account_is_owned(account_id: UUID, user_id: str) -> None:
    """Reject account references that are missing or belong to another user."""

    response = (
        supabase.table("accounts")
        .select("id")
        .eq("id", str(account_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="accountId must reference one of your accounts",
        )


def get_owned_expense_or_404(expense_id: UUID, user_id: str) -> dict:
    response = (
        supabase.table("expenses")
        .select(EXPENSE_COLUMNS)
        .eq("id", str(expense_id))
        .eq("user_id", user_id)
        .eq("transaction_type", "expense")
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
    category_id: UUID | None = Query(default=None, alias="categoryId"),
):
    query = (
        supabase.table("expenses")
        .select(EXPENSE_COLUMNS)
        .eq("user_id", current_user.id)
        .eq("transaction_type", "expense")
        .order("date", desc=True)
        .order("created_at", desc=True)
    )

    if start_date is not None:
        query = query.gte("date", start_date.isoformat())

    if end_date is not None:
        query = query.lte("date", end_date.isoformat())

    if category_id is not None:
        query = query.eq("category_id", str(category_id))

    response = query.execute()
    return [serialize_expense(row) for row in response.data or []]


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(payload: CreateExpenseRequest, current_user: CurrentUser):
    ensure_category_is_available(payload.category_id, current_user.id)
    ensure_account_is_owned(payload.account_id, current_user.id)

    response = (
        supabase.table("expenses")
        .insert(
            {
                "user_id": current_user.id,
                "category_id": str(payload.category_id) if payload.category_id else None,
                "account_id": str(payload.account_id),
                "description": payload.description,
                "amount": str(payload.amount),
                "date": payload.date.isoformat(),
                "transaction_type": "expense",
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
    expense_id: UUID,
    payload: UpdateExpenseRequest,
    current_user: CurrentUser,
):
    get_owned_expense_or_404(expense_id, current_user.id)

    if "category_id" in payload.model_fields_set:
        ensure_category_is_available(payload.category_id, current_user.id)
    if "account_id" in payload.model_fields_set and payload.account_id is not None:
        ensure_account_is_owned(payload.account_id, current_user.id)

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
        .eq("id", str(expense_id))
        .eq("user_id", current_user.id)
        .eq("transaction_type", "expense")
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Expense was not updated",
        )

    return serialize_expense(response.data[0])


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: UUID, current_user: CurrentUser):
    get_owned_expense_or_404(expense_id, current_user.id)

    (
        supabase.table("expenses")
        .delete()
        .eq("id", str(expense_id))
        .eq("user_id", current_user.id)
        .eq("transaction_type", "expense")
        .execute()
    )
    return None
