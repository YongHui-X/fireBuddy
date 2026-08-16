"""
Extract annual finance figures into annual-figures.json.

This is a pre-RAG utility. It updates the structured figures file only; it does
not chunk documents, create embeddings, or write to Supabase.

Run from the repo root:
    python apps/backend/rag/scripts/fetch_figures.py
"""

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ModuleNotFoundError:
    pdfplumber = None

try:
    import requests
except ModuleNotFoundError:
    requests = None

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*args, **kwargs):
        return False

try:
    from openai import OpenAI
except ModuleNotFoundError:
    OpenAI = None

try:
    from tenacity import retry, stop_after_attempt, wait_exponential
except ModuleNotFoundError:
    def retry(*args, **kwargs):
        def decorator(fn):
            return fn
        return decorator

    def stop_after_attempt(*args, **kwargs):
        return None

    def wait_exponential(*args, **kwargs):
        return None

load_dotenv(override=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
RAG_DIR = SCRIPT_DIR.parent
FIGURES_PATH = RAG_DIR / "annual-figures.json"
DEFAULT_KNOWLEDGE_BASE_DIR = RAG_DIR / "knowledge-base"
KNOWLEDGE_BASE_DIR = Path(
    os.getenv("RAG_KNOWLEDGE_BASE_DIR", DEFAULT_KNOWLEDGE_BASE_DIR)
)
MARKDOWN_CACHE_DIR = Path(
    os.getenv("RAG_MARKDOWN_CACHE_DIR", KNOWLEDGE_BASE_DIR / "markdown-cache")
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
    ),
}

_openai_client = None

SOURCES = [
    {
        "label": "CPF Contribution Rates 2026",
        "md_cache": "cpf/cpf-contribution-rates-2026.md",
        "url": "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf",
    },
    {
        "label": "CPF Allocation Rates 2026",
        "md_cache": "cpf/cpf-allocation-rates-2026.md",
        "url": "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf",
    },
    {
        "label": "CPF Retirement Sums",
        "md_cache": "cpf/cpf-retirement-sums.md",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/general-documents/Retirement%20Sums.pdf",
    },
    {
        "label": "CPF LIFE Payout Examples",
        "md_cache": "cpf/cpf-life-payout-examples.md",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/retirement-income/documents/CPF_LIFE_Payout_Examples.pdf",
    },
]

EXTRACTION_SYSTEM_PROMPT = """
You are a precise data extraction assistant. You read Singapore government
financial documents and extract key figures into a structured JSON object.

Extract only fields explicitly present in the document. Use null if not found.
Do not guess. Return only valid JSON, no markdown, no explanation.

Schema:
{
  "year": int or null,
  "cpf": {
    "ordinary_wage_ceiling_monthly": int or null,
    "annual_salary_ceiling": int or null,
    "contribution_rates": {
      "55_and_below": {"employer": float, "employee": float, "total": float} or null,
      "above_55_to_60": {"employer": float, "employee": float, "total": float} or null,
      "above_60_to_65": {"employer": float, "employee": float, "total": float} or null,
      "above_65_to_70": {"employer": float, "employee": float, "total": float} or null,
      "above_70": {"employer": float, "employee": float, "total": float} or null
    },
    "allocation_rates": {
      "35_and_below": {"OA": float, "SA": float, "MA": float} or null,
      "above_35_to_45": {"OA": float, "SA": float, "MA": float} or null,
      "above_45_to_50": {"OA": float, "SA": float, "MA": float} or null,
      "above_50_to_55": {"OA": float, "SA": float, "MA": float} or null,
      "above_55_to_60": {"OA": float, "SA": float, "MA": float} or null,
      "above_60_to_65": {"OA": float, "SA": float, "MA": float} or null,
      "above_65": {"OA": float, "SA": float, "MA": float} or null
    },
    "retirement_sums": {
      "brs": int or null,
      "frs": int or null,
      "ers": int or null,
      "year_applicable": int or null
    },
    "interest_rates": {
      "OA": float or null,
      "SA": float or null,
      "MA": float or null,
      "RA": float or null
    }
  },
  "srs": {
    "contribution_cap_citizen_pr": int or null,
    "contribution_cap_foreigner": int or null,
    "withdrawal_age": int or null,
    "taxable_fraction_on_withdrawal": float or null,
    "early_withdrawal_penalty_rate": float or null
  },
  "income_tax": {
    "personal_relief_cap": int or null,
    "cpf_cash_topup_relief_self_max": int or null,
    "cpf_cash_topup_relief_family_max": int or null,
    "srs_relief_max_citizen_pr": int or null,
    "srs_relief_max_foreigner": int or null
  }
}
"""


def get_extract_model() -> str:
    model = os.getenv("RAG_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    if model.startswith("openai/"):
        return model.removeprefix("openai/")
    return model


def get_openai_client():
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    if OpenAI is None:
        raise RuntimeError(
            "Missing dependency: openai. Install the RAG script dependencies "
            "before extracting figures."
        )
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Figure extraction requires an OpenAI API key."
        )
    _openai_client = OpenAI()
    return _openai_client


def load_from_md_cache(md_cache_relative: str) -> str | None:
    path = MARKDOWN_CACHE_DIR / md_cache_relative
    if path.exists():
        log.info("Reading from cache: %s", path)
        return path.read_text(encoding="utf-8")
    return None


def load_from_pdf_fallback(url: str) -> str | None:
    if requests is None:
        raise RuntimeError(
            "Missing dependency: requests. Install it or provide markdown cache files."
        )
    if pdfplumber is None:
        raise RuntimeError(
            "Missing dependency: pdfplumber. Install it or provide markdown cache files."
        )

    log.info("Cache miss; downloading PDF: %s", url)
    tmp_path = None
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            log.warning("PDF download failed: HTTP %s", response.status_code)
            return None

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = Path(tmp.name)

        pages = []
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)

        return "\n\n".join(pages) if pages else None
    except Exception as exc:
        log.error("PDF fallback error: %s", exc)
        return None
    finally:
        if tmp_path:
            tmp_path.unlink(missing_ok=True)


def load_source_text(source: dict[str, str]) -> str | None:
    text = load_from_md_cache(source["md_cache"])
    if text:
        return text
    return load_from_pdf_fallback(source["url"])


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=5, max=30))
def extract_figures(text: str, label: str) -> dict[str, Any]:
    truncated = text[:12000]
    log.info("Extracting figures from: %s", label)

    response = get_openai_client().chat.completions.create(
        model=get_extract_model(),
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Extract financial figures from this document ({label}):\n\n"
                    f"{truncated}"
                ),
            },
        ],
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        log.error("JSON parse error: %s\nRaw output: %s", exc, raw[:300])
        return {}


def deep_merge(base: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in updates.items():
        if value is None:
            continue
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def compute_diff(
    old: dict[str, Any],
    new: dict[str, Any],
    path: str = "",
) -> list[str]:
    changes = []
    for key in sorted(set(old) | set(new)):
        full_path = f"{path}.{key}" if path else key
        old_val = old.get(key)
        new_val = new.get(key)
        if isinstance(old_val, dict) and isinstance(new_val, dict):
            changes.extend(compute_diff(old_val, new_val, full_path))
        elif old_val != new_val:
            changes.append(f"{full_path}: {old_val!r} -> {new_val!r}")
    return changes


def load_existing() -> dict[str, Any]:
    if FIGURES_PATH.exists():
        return json.loads(FIGURES_PATH.read_text(encoding="utf-8"))
    log.warning("annual-figures.json not found, starting fresh.")
    return {}


def save_figures(figures: dict[str, Any]) -> None:
    figures["last_updated"] = datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    FIGURES_PATH.write_text(
        json.dumps(figures, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    log.info("Saved updated figures to %s", FIGURES_PATH)


def run() -> list[str]:
    """
    Process configured sources and update annual-figures.json if needed.

    Returns a list of human-readable change strings.
    """
    get_openai_client()

    existing = load_existing()
    merged = dict(existing)

    for source in SOURCES:
        text = load_source_text(source)
        if not text or len(text.strip()) < 100:
            log.warning("No usable text from %s; skipping", source["label"])
            continue

        extracted = extract_figures(text, source["label"])
        if extracted:
            merged = deep_merge(merged, extracted)

    changes = compute_diff(existing, merged)
    if changes:
        log.info("%s change(s) detected", len(changes))
        for change in changes:
            log.info("  %s", change)
        save_figures(merged)
    else:
        log.info("No changes. annual-figures.json is up to date.")

    return changes


if __name__ == "__main__":
    try:
        result = run()
    except RuntimeError as exc:
        log.error("%s", exc)
        raise SystemExit(1)

    if result:
        print("\nCHANGES DETECTED:")
        for item in result:
            print(f"  {item}")
    else:
        print("\nNo changes detected.")
