from typing import Annotated
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from config import settings
from lib.auth import AuthenticatedUser, get_current_user
from services.rag_service import answer_financial_advisor_question
from services.rate_limiter import SlidingWindowRateLimiter
from schemas.rag import AdvisorRequest, AdvisorResponse

router = APIRouter()
logger = logging.getLogger(__name__)
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
advisor_rate_limiter = SlidingWindowRateLimiter(
    settings.advisor_rate_limit_requests,
    settings.advisor_rate_limit_window_seconds,
)


@router.post("/api/chat/financial-advisor", response_model=AdvisorResponse)
def financial_advisor(body: AdvisorRequest, current_user: CurrentUser):
    decision = advisor_rate_limiter.check(current_user.id)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Financial advisor request limit reached. Try again shortly.",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    try:
        return answer_financial_advisor_question(body.question, body.history)
    except Exception as exc:
        # Keep raw finance questions out of logs; the user id is enough to trace failures.
        logger.exception("rag_advisor_failed", extra={"user_id": current_user.id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Financial advisor is temporarily unavailable.",
        ) from exc
