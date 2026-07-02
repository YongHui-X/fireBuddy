from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.categories import router as categories_router
from routers.expenses import router as expenses_router
from routers.rag import router as rag_router

app = FastAPI(title='FireBuddy API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/')
def root():
    return {'message': 'Welcome to the Homepage'}


app.include_router(categories_router)
app.include_router(expenses_router)
app.include_router(rag_router)
