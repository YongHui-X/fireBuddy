import csv
from datetime import date, datetime
from io import StringIO
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from postgrest.exceptions import APIError

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
EXPORT_PAGE_SIZE = 500
EXPORT_COLUMNS = [
    "Transaction ID", "Date", "Type", "Description", "Amount (SGD)",
    "Category", "Category ID", "Account", "Account ID", "Tags", "Tag IDs",
    "Created At", "Updated At",
]


def _execute_transaction_rpc(function_name: str, params: dict):
    """Run one atomic transaction write and return a safe client error on constraint failure."""

    try:
        return supabase.rpc(function_name, params).execute()
    except APIError as error:
        raise HTTPException(status_code=400, detail="Transaction and tags could not be saved") from error


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


def ensure_tags_are_owned(tag_ids: list[UUID], user_id: str) -> list[str]:
    """Validate the tag limit, uniqueness, and ownership before an atomic write."""

    normalized = [str(tag_id) for tag_id in tag_ids]
    if len(normalized) != len(set(normalized)):
        raise HTTPException(status_code=400, detail="tagIds must contain unique tags")
    if not normalized:
        return normalized
    response = (
        supabase.table("tags").select("id").eq("user_id", user_id)
        .in_("id", normalized).execute()
    )
    owned = {str(row["id"]) for row in response.data or []}
    if any(tag_id not in owned for tag_id in normalized):
        raise HTTPException(status_code=400, detail="tagIds must reference your tags")
    return normalized


def get_transaction_tag_ids(user_id: str) -> dict[str, list[str]]:
    """Group owned tag assignments by transaction for response serialization."""

    grouped: dict[str, list[str]] = {}
    offset = 0
    while True:
        page = (
            supabase.table("transaction_tags").select("transaction_id,tag_id")
            .eq("user_id", user_id).order("transaction_id").order("tag_id")
            .range(offset, offset + EXPORT_PAGE_SIZE - 1).execute().data or []
        )
        for row in page:
            grouped.setdefault(str(row["transaction_id"]), []).append(str(row["tag_id"]))
        if len(page) < EXPORT_PAGE_SIZE:
            break
        offset += EXPORT_PAGE_SIZE
    return grouped


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
    tag_ids = get_transaction_tag_ids(current_user.id)
    return [serialize_transaction(row, tag_ids.get(str(row["id"]), [])) for row in response.data or []]


def _fetch_export_transactions(
    user_id: str,
    start_date: date | None,
    end_date: date | None,
    transaction_type: str | None,
    category_id: UUID | None,
    account_id: UUID | None,
) -> list[dict]:
    """Read every matching transaction page so API row limits cannot truncate exports."""

    rows: list[dict] = []
    offset = 0
    while True:
        query = supabase.table("expenses").select(TRANSACTION_COLUMNS).eq("user_id", user_id)
        if start_date is not None:
            query = query.gte("date", start_date.isoformat())
        if end_date is not None:
            query = query.lte("date", end_date.isoformat())
        if transaction_type is not None:
            query = query.eq("transaction_type", transaction_type)
        if category_id is not None:
            query = query.eq("category_id", str(category_id))
        if account_id is not None:
            query = query.eq("account_id", str(account_id))
        page = query.order("date").order("created_at").order("id").range(offset, offset + EXPORT_PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < EXPORT_PAGE_SIZE:
            break
        offset += EXPORT_PAGE_SIZE
    return rows


def _fetch_owned_rows(
    table: str,
    columns: str,
    user_id: str,
    order_columns: tuple[str, ...] = ("id",),
) -> list[dict]:
    """Read every page of one user-owned lookup table for a complete export."""

    rows: list[dict] = []
    offset = 0
    while True:
        query = supabase.table(table).select(columns).eq("user_id", user_id)
        for column in order_columns:
            query = query.order(column)
        page = query.range(offset, offset + EXPORT_PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < EXPORT_PAGE_SIZE:
            return rows
        offset += EXPORT_PAGE_SIZE


def _protect_spreadsheet_text(value: object) -> str:
    """Prevent imported text cells from being interpreted as spreadsheet formulas."""

    text = "" if value is None else str(value)
    return f"'{text}" if text.startswith(("=", "+", "-", "@", "\t", "\r")) else text


def build_transaction_csv(
    rows: list[dict],
    categories: dict[str, str],
    accounts: dict[str, str],
    tags: dict[str, str],
    assignments: dict[str, list[str]],
    tag_id: UUID | None = None,
    search: str | None = None,
) -> bytes:
    """Build a portable, injection-safe UTF-8 CSV in stable chronological order."""

    requested_tag_id = str(tag_id) if tag_id else None
    normalized_search = search.strip().casefold() if search else ""
    export_rows: list[list[str]] = []
    ordered_rows = sorted(rows, key=lambda row: (str(row["date"]), str(row.get("created_at") or ""), str(row["id"])))
    for row in ordered_rows:
        row_tag_ids = assignments.get(str(row["id"]), [])
        if requested_tag_id and requested_tag_id not in row_tag_ids:
            continue
        ordered_tags = sorted(
            ((tags[tag], tag) for tag in row_tag_ids if tag in tags),
            key=lambda item: (item[0].casefold(), item[1]),
        )
        category_id = str(row["category_id"]) if row.get("category_id") else ""
        account_id = str(row["account_id"])
        description = str(row.get("description") or "")
        category_name = categories.get(category_id, "Uncategorised")
        account_name = accounts.get(account_id, "Unknown account")
        tag_names = " | ".join(item[0] for item in ordered_tags)
        ordered_tag_ids = " | ".join(item[1] for item in ordered_tags)
        if normalized_search and not any(
            normalized_search in candidate.casefold()
            for candidate in (description, category_name, account_name)
        ):
            continue
        amount = abs(Decimal(str(row["amount"])))
        signed_amount = amount if row.get("transaction_type") == "income" else -amount
        export_rows.append([
            str(row["id"]), str(row["date"]), str(row.get("transaction_type") or "expense"),
            description, f"{signed_amount:.2f}", category_name, category_id,
            account_name, account_id, tag_names, ordered_tag_ids,
            str(row.get("created_at") or ""), str(row.get("updated_at") or ""),
        ])

    output = StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(EXPORT_COLUMNS)
    for row in export_rows:
        writer.writerow([value if index == 4 else _protect_spreadsheet_text(value) for index, value in enumerate(row)])
    return b"\xef\xbb\xbf" + output.getvalue().encode("utf-8")


@router.get("/export")
def export_transactions(
    current_user: CurrentUser,
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    transaction_type: Literal["expense", "income"] | None = Query(default=None, alias="transactionType"),
    category_id: UUID | None = Query(default=None, alias="categoryId"),
    account_id: UUID | None = Query(default=None, alias="accountId"),
    tag_id: UUID | None = Query(default=None, alias="tagId"),
    search: str | None = Query(default=None, max_length=200),
):
    """Download all matching owned transactions in the stable portable CSV contract."""

    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="startDate cannot be after endDate")
    rows = _fetch_export_transactions(
        current_user.id, start_date, end_date, transaction_type, category_id, account_id,
    )
    default_categories = supabase.table("categories").select("id,name").eq("is_default", True).execute().data or []
    owned_categories = _fetch_owned_rows("categories", "id,name", current_user.id)
    accounts = _fetch_owned_rows("accounts", "id,name", current_user.id)
    tags = _fetch_owned_rows("tags", "id,name", current_user.id)
    links = _fetch_owned_rows(
        "transaction_tags", "transaction_id,tag_id", current_user.id, ("transaction_id", "tag_id"),
    )
    assignments: dict[str, list[str]] = {}
    for link in links:
        assignments.setdefault(str(link["transaction_id"]), []).append(str(link["tag_id"]))
    content = build_transaction_csv(
        rows,
        {str(row["id"]): str(row["name"]) for row in [*default_categories, *owned_categories]},
        {str(row["id"]): str(row["name"]) for row in accounts},
        {str(row["id"]): str(row["name"]) for row in tags},
        assignments,
        tag_id,
        search,
    )
    range_suffix = ""
    if start_date or end_date:
        range_suffix = f"-{start_date.isoformat() if start_date else 'start'}-to-{end_date.isoformat() if end_date else 'present'}"
    exported_date = datetime.now(ZoneInfo("Asia/Singapore")).date().isoformat()
    filename = f"firebuddy-transactions{range_suffix}-{exported_date}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: CreateTransactionRequest, current_user: CurrentUser):
    """Create an income or expense with positive stored amount semantics."""

    ensure_category_matches_type(payload.category_id, payload.transaction_type, current_user.id)
    ensure_account_is_owned(payload.account_id, current_user.id)
    tag_ids = ensure_tags_are_owned(payload.tag_ids, current_user.id)
    response = _execute_transaction_rpc("create_transaction_with_tags", {
        "p_user_id": current_user.id,
        "p_category_id": str(payload.category_id) if payload.category_id else None,
        "p_account_id": str(payload.account_id),
        "p_description": payload.description,
        "p_amount": str(payload.amount),
        "p_date": payload.date.isoformat(),
        "p_transaction_type": payload.transaction_type,
        "p_tag_ids": tag_ids,
    })
    if not response.data:
        raise HTTPException(status_code=500, detail="Transaction was not created")
    return serialize_transaction(response.data[0], tag_ids)


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
    existing_tag_ids = get_transaction_tag_ids(current_user.id).get(str(transaction_id), [])
    requested_tag_ids = payload.tag_ids if "tag_ids" in payload.model_fields_set else [UUID(value) for value in existing_tag_ids]
    tag_ids = ensure_tags_are_owned(requested_tag_ids or [], current_user.id)
    response = _execute_transaction_rpc("update_transaction_with_tags", {
        "p_user_id": current_user.id,
        "p_transaction_id": str(transaction_id),
        "p_category_id": str(next_category_id) if next_category_id else None,
        "p_account_id": str(payload.account_id or current["account_id"]),
        "p_description": payload.description if payload.description is not None else current.get("description"),
        "p_amount": str(payload.amount if payload.amount is not None else current["amount"]),
        "p_date": str(payload.date if payload.date is not None else current["date"]),
        "p_transaction_type": next_type,
        "p_tag_ids": tag_ids,
    })
    if not response.data:
        raise HTTPException(status_code=500, detail="Transaction was not updated")
    return serialize_transaction(response.data[0], tag_ids)


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
