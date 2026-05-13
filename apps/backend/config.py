from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Settings:
  def __init__(self) -> None:
    self.supabase_url = os.getenv("SUPABASE_URL", "").strip()
    self.supabase_key = (
      os.getenv("SUPABASE_SECRET_KEY", "").strip()
      or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    )

    if not self.supabase_url:
      raise ValueError("Missing SUPABASE_URL in apps/backend/.env")

    if not self.supabase_key:
      raise ValueError(
        "Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env"
      )


settings = Settings()
