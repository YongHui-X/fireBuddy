from datetime import date, datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from lib.auth import AuthenticatedUser, get_current_user
from lib.repository import fetch_all
from lib.supabase import supabase
from schemas.financial import (
    CreateWealthContributionRequest,
    CreateWealthPositionRequest,
    CreateWealthSnapshotRequest,
    UpdateWealthContributionRequest,
    UpdateWealthPositionRequest,
    UpdateWealthSnapshotRequest,
    WealthContributionResponse,
    WealthPositionResponse,
    WealthSnapshotResponse,
    serialize_row,
)


router = APIRouter(prefix="/wealth", tags=["wealth"])
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
POSITION_COLUMNS = "id,user_id,name,position_kind,position_type,liquidity_class,include_in_fi,is_emergency_fund,restriction_type,currency,is_archived,archived_at,created_at,updated_at"
SNAPSHOT_COLUMNS = "id,user_id,wealth_position_id,value_date,amount,created_at,updated_at"
CONTRIBUTION_COLUMNS = "id,user_id,wealth_position_id,contribution_date,amount,note,created_at,updated_at"


def owned_position(position_id: UUID, user_id: str, include_archived: bool = True) -> dict:
    """Fetch an owned wealth position without exposing another user's identifier."""

    query = supabase.table("wealth_positions").select(POSITION_COLUMNS).eq("id", str(position_id)).eq("user_id", user_id)
    if not include_archived:
        query = query.eq("is_archived", False)
    response = query.limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Wealth position not found")
    return response.data[0]


def owned_snapshot(position_id: UUID, snapshot_id: UUID, user_id: str) -> dict:
    """Fetch one snapshot scoped to both owner and parent position."""

    response = (supabase.table("wealth_position_snapshots").select(SNAPSHOT_COLUMNS)
                .eq("id", str(snapshot_id)).eq("wealth_position_id", str(position_id))
                .eq("user_id", user_id).limit(1).execute())
    if not response.data:
        raise HTTPException(status_code=404, detail="Wealth snapshot not found")
    return response.data[0]


def owned_contribution(contribution_id: UUID, user_id: str) -> dict:
    """Fetch one contribution without disclosing cross-user rows."""

    response = (supabase.table("wealth_contributions").select(CONTRIBUTION_COLUMNS)
                .eq("id", str(contribution_id)).eq("user_id", user_id).limit(1).execute())
    if not response.data:
        raise HTTPException(status_code=404, detail="Wealth contribution not found")
    return response.data[0]


def raise_financial_conflict(error: APIError) -> None:
    """Map database classification and uniqueness errors to an actionable response."""

    if error.code in {"23505", "23514", "P0001"}:
        raise HTTPException(status_code=409, detail=str(error.message)) from error
    raise error


def attach_latest_snapshot(rows: list[dict], user_id: str) -> list[WealthPositionResponse]:
    """Attach the newest snapshot to each position without changing history."""

    snapshots = fetch_all(lambda: supabase.table("wealth_position_snapshots").select(SNAPSHOT_COLUMNS)
                          .eq("user_id", user_id).order("value_date", desc=True))
    latest: dict[str, dict] = {}
    for snapshot in snapshots:
        latest.setdefault(str(snapshot["wealth_position_id"]), snapshot)
    return [serialize_row(WealthPositionResponse, row, latest_snapshot=latest.get(str(row["id"]))) for row in rows]


@router.get("/positions", response_model=list[WealthPositionResponse])
def get_positions(current_user: CurrentUser, include_archived: bool = Query(False, alias="includeArchived")):
    """List active owned positions with their latest value snapshot."""

    def query():
        value = supabase.table("wealth_positions").select(POSITION_COLUMNS).eq("user_id", current_user.id)
        return value if include_archived else value.eq("is_archived", False)
    return attach_latest_snapshot(fetch_all(query), current_user.id)


@router.post("/positions", response_model=WealthPositionResponse, status_code=201)
def create_position(payload: CreateWealthPositionRequest, current_user: CurrentUser):
    """Create a classified wealth position without changing payment accounts."""

    try:
        response = supabase.table("wealth_positions").insert({"user_id": current_user.id, **payload.model_dump(mode="json")}).execute()
    except APIError as error:
        raise_financial_conflict(error)
    return serialize_row(WealthPositionResponse, response.data[0], latest_snapshot=None)


@router.get("/positions/{position_id}", response_model=WealthPositionResponse)
def get_position(position_id: UUID, current_user: CurrentUser):
    """Return one owned position and its latest snapshot."""

    return attach_latest_snapshot([owned_position(position_id, current_user.id)], current_user.id)[0]


@router.put("/positions/{position_id}", response_model=WealthPositionResponse)
def update_position(position_id: UUID, payload: UpdateWealthPositionRequest, current_user: CurrentUser):
    """Replace the editable classification fields for an active owned position."""

    existing = owned_position(position_id, current_user.id, include_archived=False)
    editable_fields = {
        "name", "position_kind", "position_type", "liquidity_class", "include_in_fi",
        "is_emergency_fund", "restriction_type", "currency",
    }
    merged = {field: existing[field] for field in editable_fields}
    merged.update(payload.model_dump(exclude_unset=True))
    validated = CreateWealthPositionRequest.model_validate(merged)
    try:
        response = (supabase.table("wealth_positions").update(validated.model_dump(mode="json"))
                    .eq("id", str(position_id)).eq("user_id", current_user.id).execute())
    except APIError as error:
        raise_financial_conflict(error)
    return attach_latest_snapshot(response.data, current_user.id)[0]


@router.delete("/positions/{position_id}", status_code=204)
def delete_position(position_id: UUID, current_user: CurrentUser):
    """Hard delete unused positions or archive positions that own financial history."""

    owned_position(position_id, current_user.id)
    snapshots = (supabase.table("wealth_position_snapshots").select("id").eq("wealth_position_id", str(position_id))
                 .eq("user_id", current_user.id).limit(1).execute()).data
    contributions = (supabase.table("wealth_contributions").select("id").eq("wealth_position_id", str(position_id))
                     .eq("user_id", current_user.id).limit(1).execute()).data
    query = supabase.table("wealth_positions")
    if snapshots or contributions:
        query.update({"is_archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(position_id)).eq("user_id", current_user.id).execute()
    else:
        query.delete().eq("id", str(position_id)).eq("user_id", current_user.id).execute()
    return None


@router.get("/positions/{position_id}/snapshots", response_model=list[WealthSnapshotResponse])
def get_snapshots(position_id: UUID, current_user: CurrentUser):
    """List all dated snapshots for an owned position, newest first."""

    owned_position(position_id, current_user.id)
    rows = fetch_all(lambda: supabase.table("wealth_position_snapshots").select(SNAPSHOT_COLUMNS)
                     .eq("wealth_position_id", str(position_id)).eq("user_id", current_user.id).order("value_date", desc=True))
    return [serialize_row(WealthSnapshotResponse, row) for row in rows]


@router.post("/positions/{position_id}/snapshots", response_model=WealthSnapshotResponse, status_code=201)
def create_snapshot(position_id: UUID, payload: CreateWealthSnapshotRequest, current_user: CurrentUser):
    """Record one nonfuture value for an active owned position."""

    owned_position(position_id, current_user.id, include_archived=False)
    try:
        response = supabase.table("wealth_position_snapshots").insert({
            "user_id": current_user.id, "wealth_position_id": str(position_id), **payload.model_dump(mode="json")
        }).execute()
    except APIError as error:
        raise_financial_conflict(error)
    return serialize_row(WealthSnapshotResponse, response.data[0])


@router.put("/positions/{position_id}/snapshots/{snapshot_id}", response_model=WealthSnapshotResponse)
def update_snapshot(position_id: UUID, snapshot_id: UUID, payload: UpdateWealthSnapshotRequest, current_user: CurrentUser):
    """Correct an owned snapshot while retaining its stable identity."""

    owned_snapshot(position_id, snapshot_id, current_user.id)
    try:
        response = (supabase.table("wealth_position_snapshots").update(payload.model_dump(mode="json"))
                    .eq("id", str(snapshot_id)).eq("wealth_position_id", str(position_id)).eq("user_id", current_user.id).execute())
    except APIError as error:
        raise_financial_conflict(error)
    return serialize_row(WealthSnapshotResponse, response.data[0])


@router.delete("/positions/{position_id}/snapshots/{snapshot_id}", status_code=204)
def delete_snapshot(position_id: UUID, snapshot_id: UUID, current_user: CurrentUser):
    """Delete one explicitly selected snapshot without affecting its position."""

    owned_snapshot(position_id, snapshot_id, current_user.id)
    (supabase.table("wealth_position_snapshots").delete().eq("id", str(snapshot_id))
     .eq("wealth_position_id", str(position_id)).eq("user_id", current_user.id).execute())
    return None


@router.get("/contributions", response_model=list[WealthContributionResponse])
def get_contributions(current_user: CurrentUser, start: date | None = None, end: date | None = None, position_id: UUID | None = Query(None, alias="positionId")):
    """List owned investment contributions with optional period and position filters."""

    def query():
        value = supabase.table("wealth_contributions").select(CONTRIBUTION_COLUMNS).eq("user_id", current_user.id)
        if start: value = value.gte("contribution_date", start.isoformat())
        if end: value = value.lte("contribution_date", end.isoformat())
        if position_id: value = value.eq("wealth_position_id", str(position_id))
        return value.order("contribution_date", desc=True)
    return [serialize_row(WealthContributionResponse, row) for row in fetch_all(query)]


@router.post("/contributions", response_model=WealthContributionResponse, status_code=201)
def create_contribution(payload: CreateWealthContributionRequest, current_user: CurrentUser):
    """Record an investment contribution against an eligible owned asset."""

    position = owned_position(payload.wealth_position_id, current_user.id, include_archived=False)
    if position["position_kind"] != "asset" or not position["include_in_fi"]:
        raise HTTPException(status_code=409, detail="Contributions require an active FI-included asset")
    response = supabase.table("wealth_contributions").insert({"user_id": current_user.id, **payload.model_dump(mode="json")}).execute()
    return serialize_row(WealthContributionResponse, response.data[0])


@router.put("/contributions/{contribution_id}", response_model=WealthContributionResponse)
def update_contribution(contribution_id: UUID, payload: UpdateWealthContributionRequest, current_user: CurrentUser):
    """Correct an owned contribution without converting it into a transaction."""

    owned_contribution(contribution_id, current_user.id)
    response = (supabase.table("wealth_contributions").update(payload.model_dump(mode="json"))
                .eq("id", str(contribution_id)).eq("user_id", current_user.id).execute())
    return serialize_row(WealthContributionResponse, response.data[0])


@router.delete("/contributions/{contribution_id}", status_code=204)
def delete_contribution(contribution_id: UUID, current_user: CurrentUser):
    """Delete one explicitly selected owned contribution."""

    owned_contribution(contribution_id, current_user.id)
    supabase.table("wealth_contributions").delete().eq("id", str(contribution_id)).eq("user_id", current_user.id).execute()
    return None
