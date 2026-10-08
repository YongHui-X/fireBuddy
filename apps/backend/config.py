import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def read_positive_int(name: str, default: int) -> int:
    """Read a positive integer setting and reject unsafe configuration."""

    raw_value = os.getenv(name, str(default)).strip()
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a positive integer") from exc
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


def read_positive_float(name: str, default: float) -> float:
    """Read a positive decimal setting such as a timeout in seconds."""

    raw_value = os.getenv(name, str(default)).strip()
    try:
        value = float(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a positive number") from exc
    if value <= 0:
        raise ValueError(f"{name} must be a positive number")
    return value


def read_non_negative_int(name: str, default: int) -> int:
    """Read a zero-or-more integer setting such as a retry count."""

    raw_value = os.getenv(name, str(default)).strip()
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a non-negative integer") from exc
    if value < 0:
        raise ValueError(f"{name} must be a non-negative integer")
    return value


def read_cors_origins() -> tuple[str, ...]:
    """Read the explicit browser-origin allowlist used by FastAPI CORS."""

    raw_value = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    origins = tuple(
        origin.strip().rstrip("/")
        for origin in raw_value.split(",")
        if origin.strip()
    ) or DEFAULT_CORS_ORIGINS
    if "*" in origins:
        raise ValueError(
            "CORS_ALLOWED_ORIGINS cannot contain '*' when credentials are enabled"
        )
    return origins


class Settings:
    """Load backend settings once for API, auth, and advisor controls."""

    def __init__(self) -> None:
        # A trailing slash would change the token issuer and reject every login.
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        self.supabase_key = (
            os.getenv("SUPABASE_SECRET_KEY", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()

        if not self.supabase_url:
            raise ValueError("Missing SUPABASE_URL in apps/backend/.env")
        if not self.supabase_key:
            raise ValueError(
                "Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in "
                "apps/backend/.env"
            )

        self.supabase_auth_issuer = f"{self.supabase_url}/auth/v1"
        self.supabase_jwks_url = f"{self.supabase_auth_issuer}/.well-known/jwks.json"
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = (
            os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
        )
        # Every OpenAI call runs inside a threadpool worker, so an unbounded wait during
        # an outage would pin the pool. The SDK retries transient errors itself.
        self.openai_timeout_seconds = read_positive_float("OPENAI_TIMEOUT_SECONDS", 30.0)
        self.openai_max_retries = read_non_negative_int("OPENAI_MAX_RETRIES", 2)
        self.log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper() or "INFO"
        self.cors_allowed_origins = read_cors_origins()
        self.advisor_rate_limit_requests = read_positive_int(
            "ADVISOR_RATE_LIMIT_REQUESTS",
            10,
        )
        self.advisor_rate_limit_window_seconds = read_positive_int(
            "ADVISOR_RATE_LIMIT_WINDOW_SECONDS",
            60,
        )
        self.ai_suggestion_rate_limit_requests = read_positive_int(
            "AI_SUGGESTION_RATE_LIMIT_REQUESTS",
            10,
        )
        self.ai_suggestion_rate_limit_window_seconds = read_positive_int(
            "AI_SUGGESTION_RATE_LIMIT_WINDOW_SECONDS",
            60,
        )

    @property
    def openai_client_options(self) -> dict:
        """Keyword arguments every OpenAI client in the request path must use."""

        return {
            "timeout": self.openai_timeout_seconds,
            "max_retries": self.openai_max_retries,
        }


settings = Settings()
