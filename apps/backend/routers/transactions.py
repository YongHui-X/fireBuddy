from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.transaction import (
    CreateTransactionRequest,
    TransactionResponse,
    TransactionType,
    UpdateTransactionRequest,
    serialize_transaction,
)


router = APIRouter(prefix="/transactions", tags=["transactions"])
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
TRANSACTION_COLUMNS = (
    "id,user_id,category_id,account_id,description,amount,date,transaction_type,created_at,updated_at"
)


def ensure_category_matches_type(
    category_id: UUID | None,
    transaction_type: TransactionType,
    user_id: str,
) -> None:
    """Require an available category with the same explicit transaction type."""

    if category_id is None:
        return

    response = (
        supabase.table("categories")
        .select("id,user_id,is_default,category_type")
        .eq("id", str(category_id))
        .eq("category_type", transaction_type)
        .execute()
    )
    available = any(
        row.get("is_default") is True or row.get("user_id") == user_id
        for row in response.data or []
    )
    if not available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="categoryId must reference an available category with the same transaction type",
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


def get_owned_transaction_or_404(transaction_id: UUID, user_id: str) -> dict:
    """Fetch an owned transaction without disclosing another user's row."""

    response = (
        supabase.table("expenses")
        .select(TRANSACTION_COLUMNS)
        .eq("id", str(transaction_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return response.data[0]


@router.get("", response_model=list[TransactionResponse])
def get_transactions(
    current_user: CurrentUser,
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    category_id: UUID | None = Query(default=None, alias="categoryId"),
    transaction_type: Literal["expense", "income"] | None = Query(
        default=None,
        alias="transactionType",
    ),
):
    """List owned transactions with optional date, category, and type filters."""

    query = (
        supabase.table("expenses")
        .select(TRANSACTION_COLUMNS)
        .eq("user_id", current_user.id)
        .order("date", desc=True)
        .order("created_at", desc=True)
    )
    if start_date is not None:
        query = query.gte("date", start_date.isoformat())
    if end_date is not None:
        query = query.lte("date", end_date.isoformat())
    if category_id is not None:
        query = query.eq("category_id", str(category_id))
    if transaction_type is not None:
        query = query.eq("transaction_type", transaction_type)

    response = query.execute()
    return [serialize_transaction(row) for row in response.data or []]


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: CreateTransactionRequest, current_user: CurrentUser):
    """Create an income or expense with positive stored amount semantics."""

    ensure_category_matches_type(payload.category_id, payload.transaction_type, current_user.id)
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
                "transaction_type": payload.transaction_type,
            }
        )
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=500, detail="Transaction was not created")
    return serialize_transaction(response.data[0])


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: UUID,
    payload: UpdateTransactionRequest,
    current_user: CurrentUser,
):
    """Update a transaction while validating its resulting category and account."""

    current = get_owned_transaction_or_404(transaction_id, current_user.id)
    next_type = payload.transaction_type or current.get("transaction_type", "expense")
    next_category_id = (
        payload.category_id
        if "category_id" in payload.model_fields_set
        else current.get("category_id")
    )
    ensure_category_matches_type(next_category_id, next_type, current_user.id)
    if "account_id" in payload.model_fields_set and payload.account_id is not None:
        ensure_account_is_owned(payload.account_id, current_user.id)

    updates = payload.model_dump(mode="json", by_alias=False, exclude_unset=True)
    if "amount" in updates:
        updates["amount"] = str(updates["amount"])
    if "date" in updates:
        updates["date"] = str(updates["date"])

    response = (
        supabase.table("expenses")
        .update(updates)
        .eq("id", str(transaction_id))
        .eq("user_id", current_user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=500, detail="Transaction was not updated")
    return serialize_transaction(response.data[0])


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: UUID, current_user: CurrentUser):
    """Delete an owned income or expense transaction."""

    get_owned_transaction_or_404(transaction_id, current_user.id)
    (
        supabase.table("expenses")
        .delete()
        .eq("id", str(transaction_id))
        .eq("user_id", current_user.id)
        .execute()
    )
    return None
