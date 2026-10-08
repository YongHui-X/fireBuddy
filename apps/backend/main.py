import logging
import os
import sys

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from lib.auth import require_registered_user
from routers.accounts import router as accounts_router
from routers.analytics import router as analytics_router
from routers.ai import router as ai_router
from routers.categories import router as categories_router
from routers.expenses import router as expenses_router
from routers.fire import router as fire_router
from routers.profile import router as profile_router
from routers.rag import router as rag_router
from routers.transactions import router as transactions_router
from routers.tags import router as tags_router
from routers.user_account import router as user_account_router
from routers.wealth import router as wealth_router


def configure_logging() -> None:
    """Send application logs to stdout at the configured level.

    Without this the root logger stays at WARNING, so the retrieval telemetry and
    Ember routing events emitted at INFO never reach Railway's log stream.
    """

    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root.addHandler(handler)
    root.setLevel(settings.log_level)
    # One line per outgoing Supabase or OpenAI request is noise; application events are enough.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


configure_logging()
logger = logging.getLogger(__name__)

# Railway sets RAILWAY_ENVIRONMENT, so the interactive API docs stay local-only.
_public_deploy = bool(os.getenv('RAILWAY_ENVIRONMENT'))
app = FastAPI(
    title='FireBuddy API',
    docs_url=None if _public_deploy else '/docs',
    redoc_url=None if _public_deploy else '/redoc',
    openapi_url=None if _public_deploy else '/openapi.json',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allowed_origins),
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add the OWASP baseline response headers for a JSON API.

    Answers carry personal finance context, so nothing may be cached or framed. The strict CSP
    is skipped on the local-only API docs, which load Swagger UI from a CDN.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        headers = response.headers
        headers.setdefault('X-Content-Type-Options', 'nosniff')
        headers.setdefault('X-Frame-Options', 'DENY')
        headers.setdefault('Referrer-Policy', 'no-referrer')
        headers.setdefault('Cache-Control', 'no-store')
        headers.setdefault('Cross-Origin-Resource-Policy', 'same-origin')
        if not request.url.path.startswith(('/docs', '/redoc')):
            headers.setdefault('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
        if _public_deploy:
            headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        return response


app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Log unexpected failures with the request path and return a fixed body.

    Database driver and provider errors can carry table names, constraint names or
    upstream messages. Those belong in the server log, not in the browser.
    """

    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


@app.get('/')
def root():
    return {'message': 'Welcome to the Homepage'}


@app.get('/health')
def health():
    """Return a minimal unauthenticated readiness response."""

    return {'status': 'ok'}


# Anonymous phone sessions may only reach DouDou chat (rag), the consent level
# (profile) and account deletion (user_account); every record route needs a real account.
registered_only = [Depends(require_registered_user)]
app.include_router(accounts_router, dependencies=registered_only)
app.include_router(analytics_router, dependencies=registered_only)
app.include_router(ai_router, dependencies=registered_only)
app.include_router(categories_router, dependencies=registered_only)
app.include_router(expenses_router, dependencies=registered_only)
app.include_router(fire_router, dependencies=registered_only)
app.include_router(profile_router)
app.include_router(rag_router)
app.include_router(transactions_router, dependencies=registered_only)
app.include_router(tags_router, dependencies=registered_only)
app.include_router(user_account_router)
app.include_router(wealth_router, dependencies=registered_only)
