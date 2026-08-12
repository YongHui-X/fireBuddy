from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.categories import router as categories_router
from routers.expenses import router as expenses_router
from routers.rag import router as rag_router

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


app.include_router(categories_router)
app.include_router(expenses_router)
app.include_router(rag_router)
