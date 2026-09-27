import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers.accounts import router as accounts_router
from routers.analytics import router as analytics_router
from routers.ai import router as ai_router
from routers.categories import router as categories_router
from routers.expenses import router as expenses_router
from routers.fire import router as fire_router
from routers.rag import router as rag_router
from routers.transactions import router as transactions_router
from routers.tags import router as tags_router
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

app = FastAPI(title='FireBuddy API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allowed_origins),
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)


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


app.include_router(accounts_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(categories_router)
app.include_router(expenses_router)
app.include_router(fire_router)
app.include_router(rag_router)
app.include_router(transactions_router)
app.include_router(tags_router)
app.include_router(wealth_router)
