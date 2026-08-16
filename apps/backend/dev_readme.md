# FireBuddy Backend

FastAPI owns protected application data APIs, optional AI category suggestions, and Ember's Singapore finance RAG service. Supabase remains the only authentication provider and the backend verifies its bearer tokens before using the service role client.

## Mounted routes

- `GET /health`, public Railway readiness check
- `GET|POST /accounts`
- `PUT|DELETE /accounts/{account_id}`
- `GET|POST /categories`
- `PUT|DELETE /categories/{category_id}`
- `GET|POST /expenses`
- `PUT|DELETE /expenses/{expense_id}`
- `POST /ai/parse-input`
- `POST /api/chat/financial-advisor`

Account, category, expense, AI, and advisor routes require a Supabase bearer token. Account and expense lookups include the authenticated user ID so another user's objects are returned as not found where required.

## Local setup

Use Python 3.11 and copy `.env.example` to `.env`.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r apps\backend\requirements-dev.txt
npm run dev:backend
```

The backend needs `SUPABASE_URL`, a backend-only Supabase secret or service-role key, and OpenAI configuration for AI features. Never expose the service-role key to either frontend.

Rate limits are process-local for this MVP:

- `ADVISOR_RATE_LIMIT_REQUESTS` and `ADVISOR_RATE_LIMIT_WINDOW_SECONDS`
- `AI_SUGGESTION_RATE_LIMIT_REQUESTS` and `AI_SUGGESTION_RATE_LIMIT_WINDOW_SECONDS`

Both default to 10 requests per authenticated user per 60 seconds.

## Verification

```powershell
python -m unittest discover apps\backend\tests -v
python -m py_compile apps\backend\main.py apps\backend\routers\accounts.py apps\backend\routers\ai.py apps\backend\routers\categories.py apps\backend\routers\expenses.py
```

Tests use an in-memory Supabase double and do not require production credentials. Live RAG evaluation and ingestion still require configured Supabase and OpenAI services.

## Railway

Set the Railway service root directory to `/apps/backend` and the config path to `/apps/backend/railway.toml` if it is not discovered automatically. Railpack reads `.python-version`, installs `requirements.txt`, and runs Uvicorn on Railway's `PORT`. The configuration uses the Singapore region and `/health` readiness check.

Configure:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` only when legacy HS256 verification is required
- `OPENAI_API_KEY`, `OPENAI_MODEL`, and RAG model settings
- `CORS_ALLOWED_ORIGINS`
- Both advisor and AI suggestion rate limit pairs

## RAG chunk overlap

The ingestion script at `rag/Implementation/ingest.py` splits Markdown by headings and then paragraph groups. It carries one trailing paragraph, up to 600 characters, into the next oversized section chunk. This keeps facts near boundaries with their context without changing the live advisor contract.
