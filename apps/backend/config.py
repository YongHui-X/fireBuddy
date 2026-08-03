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
    self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()

    if not self.supabase_url:
      raise ValueError("Missing SUPABASE_URL in apps/backend/.env")

    if not self.supabase_key:
      raise ValueError(
        "Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env"
      )

    self.supabase_auth_issuer = f"{self.supabase_url}/auth/v1"
    self.supabase_jwks_url = f"{self.supabase_auth_issuer}/.well-known/jwks.json"
    self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"


settings = Settings()
