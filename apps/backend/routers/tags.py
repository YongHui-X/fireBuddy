from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError

from lib.auth import AuthenticatedUser, get_current_user
from lib.supabase import supabase
from schemas.tag import TagNameRequest, TagResponse, serialize_tag


router = APIRouter(prefix="/tags", tags=["tags"])
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
TAG_COLUMNS = "id,user_id,name,created_at,updated_at"
PAGE_SIZE = 500


def _raise_tag_write_error(error: APIError) -> None:
    """Translate the database uniqueness guarantee into a stable API conflict."""

    if error.json().get("code") == "23505":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A tag with this name already exists") from error
    raise error


def _get_owned_tag_or_404(tag_id: UUID, user_id: str) -> dict:
    """Fetch an owned tag without exposing whether another user owns the ID."""

    response = (
        supabase.table("tags").select(TAG_COLUMNS)
        .eq("id", str(tag_id)).eq("user_id", user_id).limit(1).execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return response.data[0]


def _ensure_unique_name(name: str, user_id: str, excluded_id: str | None = None) -> None:
    """Return a friendly conflict before the database unique index is reached."""

    response = supabase.table("tags").select("id,name").eq("user_id", user_id).execute()
    duplicate = next(
        (row for row in response.data or [] if row["name"].casefold() == name.casefold() and row["id"] != excluded_id),
        None,
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A tag with this name already exists")


def _count_tag_usage(tag_id: str, user_id: str) -> int:
    """Count every owned assignment page without relying on the Data API row cap."""

    total = 0
    offset = 0
    while True:
        page = (
            supabase.table("transaction_tags").select("tag_id")
            .eq("user_id", user_id).eq("tag_id", tag_id)
            .range(offset, offset + PAGE_SIZE - 1).execute().data or []
        )
        total += len(page)
        if len(page) < PAGE_SIZE:
            return total
        offset += PAGE_SIZE


@router.get("", response_model=list[TagResponse])
def get_tags(current_user: CurrentUser):
    """List the user's reusable tags with transaction usage counts."""

    tag_rows: list[dict] = []
    link_rows: list[dict] = []
    offset = 0
    while True:
        page = supabase.table("tags").select(TAG_COLUMNS).eq("user_id", current_user.id).order("name").order("id").range(offset, offset + PAGE_SIZE - 1).execute().data or []
        tag_rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    offset = 0
    while True:
        page = supabase.table("transaction_tags").select("tag_id").eq("user_id", current_user.id).order("tag_id").range(offset, offset + PAGE_SIZE - 1).execute().data or []
        link_rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    counts: dict[str, int] = {}
    for link in link_rows:
        tag_id = str(link["tag_id"])
        counts[tag_id] = counts.get(tag_id, 0) + 1
    rows = sorted(tag_rows, key=lambda row: str(row["name"]).casefold())
    return [serialize_tag(row, counts.get(str(row["id"]), 0)) for row in rows]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(payload: TagNameRequest, current_user: CurrentUser):
    """Create one normalized, user-owned reusable tag."""

    _ensure_unique_name(payload.name, current_user.id)
    try:
        response = supabase.table("tags").insert({"user_id": current_user.id, "name": payload.name}).execute()
    except APIError as error:
        _raise_tag_write_error(error)
    if not response.data:
        raise HTTPException(status_code=500, detail="Tag was not created")
    return serialize_tag(response.data[0])


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: UUID, payload: TagNameRequest, current_user: CurrentUser):
    """Rename one owned tag without changing its assignments."""

    current = _get_owned_tag_or_404(tag_id, current_user.id)
    _ensure_unique_name(payload.name, current_user.id, str(tag_id))
    try:
        response = (
            supabase.table("tags").update({"name": payload.name})
            .eq("id", str(tag_id)).eq("user_id", current_user.id).execute()
        )
    except APIError as error:
        _raise_tag_write_error(error)
    if not response.data:
        raise HTTPException(status_code=500, detail="Tag was not updated")
    return serialize_tag(response.data[0], _count_tag_usage(str(tag_id), current_user.id))


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: UUID,
    current_user: CurrentUser,
    confirm: bool = Query(default=False),
):
    """Delete a confirmed owned tag while database cascades detach assignments."""

    if not confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag deletion must be confirmed")
    _get_owned_tag_or_404(tag_id, current_user.id)
    supabase.table("tags").delete().eq("id", str(tag_id)).eq("user_id", current_user.id).execute()
    return None
