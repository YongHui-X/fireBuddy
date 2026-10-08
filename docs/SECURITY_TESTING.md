# Security testing

`.github/workflows/security.yml` runs on every pull request, on pushes to `main`
and `dev`, every Monday, and on demand. Each job maps to an OWASP Top 10 (2021)
risk. All tool versions and GitHub actions are pinned.

| Job | Tool | Catches | Fails the build on |
|---|---|---|---|
| Secret scan | Gitleaks 8.28 | Keys and tokens anywhere in git history (A02, A07) | Any finding not listed in `.gitleaksignore` |
| Static analysis | Semgrep 1.140 (`p/owasp-top-ten`, `python`, `typescript`, `react`, `secrets`, `github-actions`) | Injection, unsafe crypto, SSRF, XSS, mutable action tags (A01, A03, A08, A10) | ERROR or WARNING findings |
| Static analysis | Bandit 1.9 | Python security anti-patterns | Medium severity and up |
| Dependency CVEs | pip-audit 2.10 | Known vulnerabilities in `apps/backend/requirements.txt` (A06) | Any known vulnerability |
| Dependency CVEs | npm audit | Known vulnerabilities in production npm packages (A06) | Critical |
| Live API scan | OWASP ZAP 2.17 API scan | Runs the backend and actively attacks every route in its OpenAPI spec: injection, path traversal, error disclosure, missing headers (A03, A05) | Any FAIL alert, or any 5xx in the server log |

The ZAP report (HTML and JSON) is uploaded as the `zap-report` artifact on every run.

## Baseline (8 Oct 2026)

- Gitleaks: clean after review. The old `apps/web/.env.local` in early commits held only the
  Supabase publishable key, which ships in the web bundle by design.
- Semgrep, Bandit: no application findings. GitHub actions are now pinned to commit SHAs.
- pip-audit: PyJWT 2.12.1 and Starlette 0.47.3 had published advisories (JWT verification
  edge cases, Host-header URL reconstruction, form-parsing DoS). Upgraded to PyJWT 2.15.1
  and FastAPI 0.142.4 (Starlette 1.7.0); now clean.
- npm audit: the critical `shell-quote` advisory is fixed. About 20 high advisories remain in
  Expo build tooling (`braces` via Metro, `node-forge` via expo-cli). They run on the build
  machine, not in the app, and clear with the next Expo SDK upgrade. Raise the npm gate to
  `high` after that upgrade.
- ZAP: 15,851 requests across every route, 118 rules passed, no alerts, no 5xx. Protected
  routes answered 401 throughout.

## Controls already in the backend

- Supabase JWTs verified on every protected route (ES256/RS256 via JWKS, `aud=authenticated`).
  Anonymous phone sessions reach only DouDou, the consent level and account deletion.
- Per-user sliding-window rate limits: DouDou 10 requests a minute
  (`ADVISOR_RATE_LIMIT_*`), AI category suggestions 10 a minute, account export and deletion
  share the advisor limit. Counts are kept in memory, so they are per server.
- Request bodies are bounded by Pydantic (question 2,000 characters, 20 history turns).
- CORS is an explicit allowlist, and `*` is rejected.
- Unexpected errors return a fixed message, with no stack traces or database text.
- API docs and the OpenAPI spec are off when `RAILWAY_ENVIRONMENT` is set.
- Response headers: `nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`, a strict
  CSP, `Referrer-Policy: no-referrer`, and HSTS when deployed.

## Gaps not covered by CI

- ZAP scans without a login. An authenticated scan needs a test Supabase project and a
  test-user token stored as a repository secret.
- There is no daily cap per user on DouDou, and no limit per IP address. Supabase limits
  anonymous sign-ins per IP, but a determined caller can still mint fresh sessions. Set
  OpenAI usage limits on the project dashboard as a cost backstop.
- The mobile app has no automated security scan beyond Semgrep and npm audit. Records stay
  on the device, so the main risks are the backup encryption (covered by unit tests) and the
  HTTPS API URL in release builds.

## Running locally

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.28.0 git /repo --redact
docker run --rm -v "$PWD:/src" -w /src semgrep/semgrep:1.140.0 semgrep scan --config p/owasp-top-ten
pip install bandit pip-audit && bandit -r apps/backend -x apps/backend/tests -ll && pip-audit -r apps/backend/requirements.txt
npm audit --omit=dev
# ZAP: start the backend on :8000, then
docker run --rm -v "$PWD/zap:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:2.17.0 zap-api-scan.py -t http://host.docker.internal:8000/openapi.json -f openapi -r report.html
```
