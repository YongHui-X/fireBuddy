from fastapi import APIRouter

from lib.supabase import supabase

router = APIRouter(prefix='/categories', tags=['categories'])


@router.get('')
def get_categories():
    response = supabase.table('categories').select('*').order('name').execute()
    return response.data
