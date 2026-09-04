from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from lib.auth import AuthenticatedUser, get_current_user
from routers.fire import validated_as_of
from schemas.financial import FinancialSummaryResponse
from services.financial_repository import load_financial_records
from services.financial_summary import build_financial_summary


router = APIRouter(prefix="/analytics", tags=["analytics"])
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


@router.get("/financial-summary", response_model=FinancialSummaryResponse)
def get_financial_summary(current_user: CurrentUser, as_of: date | None = Query(None, alias="asOf")):
    """Return fact, freshness, projection, pulse, anomaly, and next-action dashboard data."""

    effective_date = validated_as_of(as_of)
    records = load_financial_records(current_user.id, effective_date)
    return build_financial_summary(**records, as_of=effective_date)
