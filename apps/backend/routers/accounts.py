from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.account import (
    AccountResponse,
    CreateAccountRequest,
    UpdateAccountRequest,
    serialize_account,
)


router = APIRouter(prefix="/accounts", tags=["accounts"])
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
ACCOUNT_COLUMNS = (
    "id,user_id,name,type,color,last_four,is_default,created_at,updated_at"
)


def get_owned_account_or_404(account_id: UUID, user_id: str) -> dict:
    """Fetch an owned account without disclosing another user's rows."""

    response = (
        supabase.table("accounts")
        .select(ACCOUNT_COLUMNS)
        .eq("id", str(account_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return response.data[0]


def raise_account_conflict(error: APIError) -> None:
    """Translate duplicate account names into a stable API conflict."""

    if error.code == "23505":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that name already exists",
        ) from error
    raise error


@router.get("", response_model=list[AccountResponse])
def get_accounts(current_user: CurrentUser):
    """List the authenticated user's persisted accounts."""

    response = (
        supabase.table("accounts")
        .select(ACCOUNT_COLUMNS)
        .eq("user_id", current_user.id)
        .order("is_default", desc=True)
        .order("name")
        .execute()
    )
    return [serialize_account(row) for row in response.data or []]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(payload: CreateAccountRequest, current_user: CurrentUser):
    """Create a nondefault account owned by the authenticated user."""

    try:
        response = (
            supabase.table("accounts")
            .insert(
                {
                    "user_id": current_user.id,
                    "name": payload.name,
                    "type": payload.type,
                    "color": payload.color,
                    "last_four": payload.last_four,
                    "is_default": False,
                }
            )
            .execute()
        )
    except APIError as error:
        raise_account_conflict(error)

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account was not created",
        )
    return serialize_account(response.data[0])


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: UUID,
    payload: UpdateAccountRequest,
    current_user: CurrentUser,
):
    """Update an owned account while preserving its default status."""

    get_owned_account_or_404(account_id, current_user.id)
    updates = payload.model_dump(by_alias=False, exclude_unset=True)

    try:
        response = (
            supabase.table("accounts")
            .update(updates)
            .eq("id", str(account_id))
            .eq("user_id", current_user.id)
            .execute()
        )
    except APIError as error:
        raise_account_conflict(error)

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account was not updated",
        )
    return serialize_account(response.data[0])


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: UUID, current_user: CurrentUser):
    """Delete an unused nondefault account owned by the current user."""

    account = get_owned_account_or_404(account_id, current_user.id)
    if account["is_default"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The default account cannot be deleted",
        )

    expense_response = (
        supabase.table("expenses")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("account_id", str(account_id))
        .limit(1)
        .execute()
    )
    if expense_response.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Move or delete transactions linked to this account first",
        )

    (
        supabase.table("accounts")
        .delete()
        .eq("id", str(account_id))
        .eq("user_id", current_user.id)
        .execute()
    )
    return None
