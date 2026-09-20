"""
Download and hash-check configured source PDFs for the RAG knowledge base.

This helper only manages source PDF files and pdf_hashes.json. It does not
convert PDFs, extract figures, or ingest anything.
"""

import argparse
import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import requests
except ModuleNotFoundError:
    requests = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
RAG_DIR = SCRIPT_DIR.parent
DEFAULT_KNOWLEDGE_BASE_DIR = RAG_DIR / "knowledge-base"
KNOWLEDGE_BASE_DIR = Path(
    os.getenv("RAG_KNOWLEDGE_BASE_DIR", DEFAULT_KNOWLEDGE_BASE_DIR)
)
SOURCE_PDF_DIR = Path(
    os.getenv("RAG_SOURCE_PDF_DIR", KNOWLEDGE_BASE_DIR / "source-pdfs")
)
HASHES_PATH = RAG_DIR / "pdf_hashes.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
    ),
}

# Registry fields:
#   label, dest, url   required; dest is relative to source-pdfs/ and the
#                      markdown cache mirrors it with a .md suffix.
#   published          optional ISO date the agency published or last updated
#                      the PDF. Several are recoverable only from the URL
#                      string. ingest.py copies it into source-metadata.json as
#                      the document's `as_of` date so the answer prompt can
#                      prefer the fresher of two sources that disagree. Omit it
#                      rather than guess; an absent date is reported as unknown.
#   superseded_by      optional manual/ path. The PDF is still downloaded and
#                      hash-checked so a change still triggers a Telegram
#                      alert, but its markdown cache is NOT ingested because a
#                      hand-authored table document replaces it.
#   skip_pages         optional 1-based page numbers dropped during conversion,
#                      used for cover and table-of-contents pages that would
#                      otherwise become keyword-heavy chunks with no answers.
#   extract_tables     optional; append pdfplumber tables as Markdown tables.
#                      Enable only for PDFs with real grid tables; infographic
#                      layouts produce garbage tables.
#   structure          optional deterministic structure recovery applied by
#                      pdf_to_md.recover_structure():
#                        strip_lines            exact page header/footer strings
#                                               removed standalone and inline
#                        promote_sections       [{pattern, level}] regexes whose
#                                               full-line match becomes a heading
#                        promote_questions      {style: "numbered", level, section_titles?}
#                                               numbered questions become headings
#                                               when the counter advances by one;
#                                               a reset to 1 starts a new titled part
#                        dedupe_table_rows      drop repeated "|" table rows
#                        merge_sibling_sections ingest merges small sibling Q&A
#                                               sections under the same parent
PDFS = [
    {
        "label": "CPF Contribution Rates 2026",
        "dest": "cpf/cpf-contribution-rates-2026.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf",
        "published": "2026-01-01",
        "superseded_by": "manual/cpf/cpf-contribution-rates-2026.md",
    },
    {
        "label": "CPF Allocation Rates 2026",
        "dest": "cpf/cpf-allocation-rates-2026.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf",
        "published": "2026-01-01",
        "superseded_by": "manual/cpf/cpf-allocation-rates-2026.md",
    },
    {
        "label": "CPF Retirement Sums",
        "dest": "cpf/cpf-retirement-sums.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/general-documents/Retirement%20Sums.pdf",
        "superseded_by": "manual/cpf/cpf-retirement-sums.md",
    },
    {
        "label": "CPF LIFE Payout Examples",
        "dest": "cpf/cpf-life-payout-examples.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/retirement-income/documents/CPF_LIFE_Payout_Examples.pdf",
        "superseded_by": "manual/cpf/cpf-life-payout-examples.md",
    },
    {
        "label": "CPFIS Investment Products",
        "dest": "cpf/cpfis-investment-products.pdf",
        "extract_tables": True,
        "url": "https://www.cpf.gov.sg/content/dam/web/member/growing-your-savings/documents/CPFISInvestmentProducts.pdf",
        "published": "2025-09-01",
        "structure": {
            "promote_sections": [
                {"pattern": r"^Up to \d+% of investible savings.*can be invested in:$", "level": 2},
            ],
            "dedupe_table_rows": True,
        },
    },
    {
        "label": "CPFIS Instruments and Investment Limits",
        "dest": "cpf/cpfis-instruments-and-limits.pdf",
        "extract_tables": True,
        "url": "https://www.cpf.gov.sg/content/dam/web/member/faq/documents/INV_InstrumentsunderCPFIS.pdf",
        "published": "2022-12-01",
    },
    {
        "label": "MoneySense Basic Financial Planning Guide",
        "dest": "moneysense/basic-financial-planning-guide.pdf",
        "extract_tables": True,
        "url": "https://www.moneysense.gov.sg/files/streamlined%20basic%20financial%20planning%20guide.pdf",
    },
    {
        "label": "MoneySense Basic Financial Planning Guide FAQs",
        "dest": "moneysense/basic-financial-planning-guide-faqs.pdf",
        "extract_tables": True,
        "url": "https://www.moneysense.gov.sg/files/faqs%20for%20consumers%20on%20basic%20financial%20planning%20%28for%207%20oct%202023%29.pdf",
        "published": "2023-10-07",
        "structure": {
            "strip_lines": ["in c ollaboration with"],
            # The FAQ numbering restarts at 1 in each of four unlabelled parts;
            # the section titles below name those parts in document order.
            "promote_questions": {
                "style": "numbered",
                "level": 3,
                "section_titles": [
                    "About the Basic Financial Planning Guide",
                    "Emergency funds",
                    "Insurance protection",
                    "Investing, retirement and home purchase",
                ],
            },
            "dedupe_table_rows": True,
            "merge_sibling_sections": True,
        },
    },
    {
        "label": "MoneySense Retirement Booklet English 2024",
        "dest": "moneysense/retirement-booklet-english-2024.pdf",
        "url": "https://www.moneysense.gov.sg/files/MoneySense_Retirement_Booklet__English____2024_Sep.pdf",
        "published": "2024-09-01",
    },
    {
        "label": "IRAS Tax Relief for Individuals",
        "dest": "iras/tax-relief-individuals.pdf",
        "url": "https://www.iras.gov.sg/media/docs/default-source/uploadedfiles/pdf/tax-relief_individuals-fa-%28edited%29.pdf?sfvrsn=4fb8ebd5_2",
        # The PDF states "correct as at 18 Feb 2019" and covers YA 2019. It
        # carried an expired Bicentennial Bonus rebate and a superseded
        # $7,000 CPF cash top-up relief, and its two-column infographic layout
        # flattens into prose that separates amounts from the reliefs they
        # belong to. Superseded by a hand-authored current table.
        "published": "2019-02-18",
        "superseded_by": "manual/iras/tax-reliefs.md",
    },
    {
        "label": "MAS Singapore Savings Bonds Factsheet",
        "dest": "mas/singapore-savings-bonds-factsheet.pdf",
        "extract_tables": True,
        "url": "https://www.mas.gov.sg/-/media/mas/sgs/sgs-announcements-pdf/ssb-pdf/faq/ssb-factsheet-english-updated-1-feb-2019-002.pdf",
        # The product terms in this 2019 factsheet are still accurate, but its
        # step-up worked example (0.9% first year, 2.4% effective) and its
        # "10-year SGS yield has generally been between 2% to 3%" commentary
        # describe the decade to 2019. Superseded by a hand-authored terms
        # table that carries no example rates.
        "published": "2019-02-01",
        "superseded_by": "manual/mas/singapore-savings-bonds.md",
    },
    {
        "label": "MAS Singapore Savings Bonds FAQs",
        "dest": "mas/singapore-savings-bonds-faqs.pdf",
        "url": "https://www.mas.gov.sg/-/media/mas/sgs/sgs-announcements-pdf/ssb-pdf/faq/2022-06-13-ssb-faqs.pdf",
        "published": "2022-06-13",
        # Pages 2 to 4 are the table of contents: question titles without answers.
        "skip_pages": [2, 3, 4],
        "structure": {
            "strip_lines": ["MONETARY AUTHORITY OF SINGAPORE"],
            "promote_sections": [
                {"pattern": r"^[A-D]\. [A-Z][A-Z0-9 &()/,'\-]+$", "level": 2},
                {"pattern": r"^[A-D]\.\d+ [A-Z][A-Z0-9 &()/,'\-]+$", "level": 3},
            ],
            "promote_questions": {"style": "numbered", "level": 4},
            "merge_sibling_sections": True,
        },
    },
]


def structure_for_cache_path(cache_path: str) -> dict[str, Any]:
    """Return the structure-recovery config for a markdown cache path, or {}."""

    return registry_by_cache_path().get(cache_path, {}).get("structure") or {}


def registry_by_cache_path() -> dict[str, dict[str, Any]]:
    """Index the registry by markdown cache path (forward slashes, .md suffix)."""

    return {
        str(Path(source["dest"]).with_suffix(".md")).replace("\\", "/"): source
        for source in PDFS
    }


def registry_by_pdf_name() -> dict[str, dict[str, Any]]:
    """Index the registry by PDF filename for the converter."""

    return {Path(source["dest"]).name: source for source in PDFS}


def require_requests() -> None:
    if requests is None:
        raise RuntimeError(
            "Missing dependency: requests. Install it before downloading PDFs."
        )


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_hashes() -> dict[str, dict[str, str]]:
    """
    Read the hash index, accepting the older plain-string form.

    Entries used to be `{dest: sha256}`. They now also record when the file was
    last fetched, which is the only evidence of freshness for a PDF whose
    agency publishes no date anywhere. A legacy string is read as a hash with
    an unknown fetch time rather than forcing every source to re-download.
    """

    if not HASHES_PATH.exists():
        return {}

    raw = json.loads(HASHES_PATH.read_text(encoding="utf-8"))
    return {
        dest: ({"sha256": entry} if isinstance(entry, str) else entry)
        for dest, entry in raw.items()
    }


def hash_of(entry: dict[str, str] | str | None) -> str | None:
    """Return the stored SHA-256 from either the current or the legacy shape."""

    if entry is None:
        return None
    return entry if isinstance(entry, str) else entry.get("sha256")


def save_hashes(hashes: dict[str, dict[str, str]]) -> None:
    HASHES_PATH.write_text(
        json.dumps(hashes, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def download_pdf(source: dict[str, str]) -> bytes:
    require_requests()
    response = requests.get(source["url"], headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.content


def run(
    *,
    force: bool = False,
    sources: list[dict[str, str]] = PDFS,
    source_pdf_dir: Path = SOURCE_PDF_DIR,
) -> dict[str, list[dict[str, Any]]]:
    """
    Download configured PDFs and detect hash changes.

    Returns a report with changed, skipped, and failed source entries.
    """
    report = {"changed": [], "skipped": [], "failed": []}
    hashes = load_hashes()
    next_hashes = dict(hashes)

    source_pdf_dir.mkdir(parents=True, exist_ok=True)

    for source in sources:
        label = source["label"]
        dest = source["dest"]
        dest_path = source_pdf_dir / dest

        try:
            log.info("Checking PDF: %s", label)
            content = download_pdf(source)
            new_hash = sha256_bytes(content)
            old_hash = hash_of(hashes.get(dest))
            file_missing = not dest_path.exists()
            has_changed = force or file_missing or old_hash != new_hash

            if not has_changed:
                log.info("Unchanged: %s", label)
                report["skipped"].append(
                    {**source, "path": str(dest_path), "hash": new_hash}
                )
                continue

            dest_path.parent.mkdir(parents=True, exist_ok=True)
            dest_path.write_bytes(content)
            next_hashes[dest] = {
                "sha256": new_hash,
                "fetched_at": datetime.now(timezone.utc)
                .replace(microsecond=0)
                .isoformat(),
            }
            report["changed"].append(
                {
                    **source,
                    "path": str(dest_path),
                    "old_hash": old_hash,
                    "new_hash": new_hash,
                    "reason": "forced" if force else "changed",
                }
            )
            log.info("Saved PDF: %s", dest_path)
        except Exception as exc:
            log.error("Failed PDF check [%s]: %s", label, exc)
            report["failed"].append({**source, "error": str(exc)})

    if next_hashes != hashes:
        save_hashes(next_hashes)
        log.info("Updated hash index: %s", HASHES_PATH)

    log.info(
        "PDF changed: %s | skipped: %s | failed: %s",
        len(report["changed"]),
        len(report["skipped"]),
        len(report["failed"]),
    )
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Download and hash-check configured RAG source PDFs"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Write PDFs even when the stored hash is unchanged",
    )
    args = parser.parse_args()

    result = run(force=args.force)
    if result["failed"]:
        raise SystemExit(1)
