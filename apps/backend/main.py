from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.accounts import router as accounts_router
from routers.analytics import router as analytics_router
from routers.ai import router as ai_router
from routers.categories import router as categories_router
from routers.expenses import router as expenses_router
from routers.fire import router as fire_router
from routers.rag import router as rag_router
from routers.transactions import router as transactions_router
from routers.wealth import router as wealth_router

app = FastAPI(title='FireBuddy API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allowed_origins),
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)


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
app.include_router(wealth_router)
