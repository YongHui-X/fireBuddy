from typing import Annotated
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials

from config import settings
from lib.auth import AuthenticatedUser, bearer_scheme, get_current_user
from services.ember_service import answer_ember_question, stream_ember_question
from services.rate_limiter import SlidingWindowRateLimiter
from schemas.rag import AdvisorRequest, AdvisorResponse

router = APIRouter()
logger = logging.getLogger(__name__)
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
advisor_rate_limiter = SlidingWindowRateLimiter(
    settings.advisor_rate_limit_requests,
    settings.advisor_rate_limit_window_seconds,
)


def get_stream_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> AuthenticatedUser | HTTPException:
    """Return auth failures as values so the stream can encode an SSE error."""

    try:
        return get_current_user(credentials)
    except HTTPException as exc:
        return exc


StreamUser = Annotated[
    AuthenticatedUser | HTTPException,
    Depends(get_stream_current_user),
]


def encode_sse(event: str, data: dict) -> str:
    """Encode one typed event using the browser-compatible SSE wire format."""

    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def error_stream(
    *,
    code: str,
    message: str,
    status_code: int,
    retryable: bool,
    headers: dict[str, str] | None = None,
) -> StreamingResponse:
    """Return one structured SSE error while retaining the matching HTTP status."""

    event = encode_sse(
        "error",
        {
            "code": code,
            "message": message,
            "retryable": retryable,
            "status": status_code,
        },
    )
    return StreamingResponse(
        iter([event]),
        status_code=status_code,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", **(headers or {})},
    )


@router.post("/api/chat/financial-advisor", response_model=AdvisorResponse)
def financial_advisor(body: AdvisorRequest, current_user: CurrentUser):
    decision = advisor_rate_limiter.check(current_user.id)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Ember request limit reached. Try again shortly.",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    try:
        return answer_ember_question(
            current_user.id,
            body.question,
            body.history,
            body.app_context,
        )
    except Exception as exc:
        # Keep raw finance questions out of logs; the user id is enough to trace failures.
        logger.exception("rag_advisor_failed", extra={"user_id": current_user.id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ember is temporarily unavailable.",
        ) from exc


@router.post("/api/chat/financial-advisor/stream")
def financial_advisor_stream(body: AdvisorRequest, current_user: StreamUser):
    """Stream authenticated Ember search status, answer deltas, and citations."""

    if isinstance(current_user, HTTPException):
        return error_stream(
            code="authentication",
            message=str(current_user.detail),
            status_code=current_user.status_code,
            retryable=True,
        )

    decision = advisor_rate_limiter.check(current_user.id)
    if not decision.allowed:
        return error_stream(
            code="rate_limit",
            message="Ember request limit reached. Try again shortly.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            retryable=True,
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    def generate_events():
        try:
            for event in stream_ember_question(
                current_user.id,
                body.question,
                body.history,
                body.app_context,
            ):
                yield encode_sse(event["event"], event["data"])
        except Exception:
            logger.exception(
                "rag_advisor_stream_failed",
                extra={"user_id": current_user.id},
            )
            yield encode_sse(
                "error",
                {
                    "code": "unavailable",
                    "message": "Ember is temporarily unavailable.",
                    "retryable": True,
                    "status": status.HTTP_503_SERVICE_UNAVAILABLE,
                },
            )

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
