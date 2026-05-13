from fastapi import FastAPI

from routers.categories import router as categories_router
from routers.expenses import router as expenses_router

app = FastAPI(title='FireBuddy API')


@app.get('/')
def root():
    return {'message': 'Welcome to the Homepage'}


app.include_router(categories_router)
app.include_router(expenses_router)
