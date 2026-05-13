from supabase import Client, create_client

from config import settings

#create the Supabase client once
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
