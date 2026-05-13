from fastapi import APIRouter

from lib.supabase import supabase
from schemas.expense import CreateExpenseRequest

router = APIRouter(prefix='/expenses', tags=['expenses'])

@router.get('')
def get_expenses():
    response = supabase.table('expenses').select('*').order('date', desc=True).execute()
    return response.data

#receives expense data from a request, validates it, inserts it into the expenses table in Supabase, and returns the inserted record
#payload: CreateExpenseRequest means FastAPI takes the incoming JSON request, validates it using your defined Pydantic model, and automatically converts it into a structured Python object called payload.
@router.post('')
def create_expense(payload: CreateExpenseRequest):
    response = supabase.table('expenses').insert(payload.model_dump()).execute()
    return response.data

