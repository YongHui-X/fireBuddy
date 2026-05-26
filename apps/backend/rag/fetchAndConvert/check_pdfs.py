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

PDFS = [
    {
        "label": "CPF Contribution Rates 2026",
        "dest": "cpf/cpf-contribution-rates-2026.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf",
    },
    {
        "label": "CPF Allocation Rates 2026",
        "dest": "cpf/cpf-allocation-rates-2026.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf",
    },
    {
        "label": "CPF Retirement Sums",
        "dest": "cpf/cpf-retirement-sums.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/general-documents/Retirement%20Sums.pdf",
    },
    {
        "label": "CPF LIFE Payout Examples",
        "dest": "cpf/cpf-life-payout-examples.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/retirement-income/documents/CPF_LIFE_Payout_Examples.pdf",
    },
    {
        "label": "CPFIS Investment Products",
        "dest": "cpf/cpfis-investment-products.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/growing-your-savings/documents/CPFISInvestmentProducts.pdf",
    },
    {
        "label": "CPFIS Instruments and Investment Limits",
        "dest": "cpf/cpfis-instruments-and-limits.pdf",
        "url": "https://www.cpf.gov.sg/content/dam/web/member/faq/documents/INV_InstrumentsunderCPFIS.pdf",
    },
    {
        "label": "MoneySense Basic Financial Planning Guide",
        "dest": "moneysense/basic-financial-planning-guide.pdf",
        "url": "https://www.moneysense.gov.sg/files/streamlined%20basic%20financial%20planning%20guide.pdf",
    },
    {
        "label": "MoneySense Basic Financial Planning Guide FAQs",
        "dest": "moneysense/basic-financial-planning-guide-faqs.pdf",
        "url": "https://www.moneysense.gov.sg/files/faqs%20for%20consumers%20on%20basic%20financial%20planning%20%28for%207%20oct%202023%29.pdf",
    },
    {
        "label": "MoneySense Retirement Booklet English 2024",
        "dest": "moneysense/retirement-booklet-english-2024.pdf",
        "url": "https://www.moneysense.gov.sg/files/MoneySense_Retirement_Booklet__English____2024_Sep.pdf",
    },
    {
        "label": "IRAS Tax Relief for Individuals",
        "dest": "iras/tax-relief-individuals.pdf",
        "url": "https://www.iras.gov.sg/media/docs/default-source/uploadedfiles/pdf/tax-relief_individuals-fa-%28edited%29.pdf?sfvrsn=4fb8ebd5_2",
    },
    {
        "label": "MAS Singapore Savings Bonds Factsheet",
        "dest": "mas/singapore-savings-bonds-factsheet.pdf",
        "url": "https://www.mas.gov.sg/-/media/mas/sgs/sgs-announcements-pdf/ssb-pdf/faq/ssb-factsheet-english-updated-1-feb-2019-002.pdf",
    },
    {
        "label": "MAS Singapore Savings Bonds FAQs",
        "dest": "mas/singapore-savings-bonds-faqs.pdf",
        "url": "https://www.mas.gov.sg/-/media/mas/sgs/sgs-announcements-pdf/ssb-pdf/faq/2022-06-13-ssb-faqs.pdf",
    },
]


def require_requests() -> None:
    if requests is None:
        raise RuntimeError(
            "Missing dependency: requests. Install it before downloading PDFs."
        )


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_hashes() -> dict[str, str]:
    if not HASHES_PATH.exists():
        return {}
    return json.loads(HASHES_PATH.read_text(encoding="utf-8"))


def save_hashes(hashes: dict[str, str]) -> None:
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
            old_hash = hashes.get(dest)
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
            next_hashes[dest] = new_hash
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
