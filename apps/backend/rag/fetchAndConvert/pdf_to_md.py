"""
Convert source PDFs into markdown cache files for the future RAG pipeline.

This script is intentionally limited to PDF text extraction. It does not chunk,
embed, or ingest anything into a vector database.

Run from the repo root:
    python apps/backend/rag/scripts/pdf_to_md.py
    python apps/backend/rag/scripts/pdf_to_md.py --changed-only
"""

import argparse
import logging
import os
import re
from pathlib import Path

try:
    import pdfplumber
except ModuleNotFoundError:
    pdfplumber = None

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
MARKDOWN_CACHE_DIR = Path(
    os.getenv("RAG_MARKDOWN_CACHE_DIR", KNOWLEDGE_BASE_DIR / "markdown-cache")
)


def require_pdfplumber() -> None:
    if pdfplumber is None:
        raise RuntimeError(
            "Missing dependency: pdfplumber. Install the RAG script dependencies "
            "before converting PDFs."
        )


def clean_extracted_text(text: str, source_filename: str) -> str:
    """
    Light cleanup of raw pdfplumber output.

    The goal is to remove obvious extraction noise while preserving enough
    original structure for the later RAG implementation to decide how to chunk.
    """
    lines = text.split("\n")
    cleaned = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if re.fullmatch(r"[-\u2013\u2014]?\s*\d+\s*[-\u2013\u2014]?", stripped):
            continue

        word_count = len(stripped.split())
        if word_count <= 2 and not stripped.startswith(("-", "\u2022", "#")):
            continue

        cleaned.append(stripped)

    result = "\n\n".join(cleaned)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return f"# Source: {source_filename}\n\n{result}"


def pdf_to_markdown(pdf_path: Path) -> str:
    """Extract and clean text from a PDF."""
    require_pdfplumber()

    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                pages.append(text)
            else:
                log.debug(
                    "Page %s of %s had no extractable text",
                    page_index,
                    pdf_path.name,
                )

    if not pages:
        log.warning("No text extracted from %s; it may be scanned", pdf_path.name)
        return ""

    return clean_extracted_text("\n\n".join(pages), pdf_path.name)


def get_markdown_path(
    pdf_path: Path,
    *,
    source_pdf_dir: Path = SOURCE_PDF_DIR,
    markdown_cache_dir: Path = MARKDOWN_CACHE_DIR,
) -> Path:
    try:
        relative_pdf_path = pdf_path.resolve().relative_to(source_pdf_dir.resolve())
    except ValueError:
        relative_pdf_path = Path(pdf_path.name)

    return markdown_cache_dir / relative_pdf_path.with_suffix(".md")


def convert_pdf(
    pdf_path: Path,
    *,
    source_pdf_dir: Path = SOURCE_PDF_DIR,
    markdown_cache_dir: Path = MARKDOWN_CACHE_DIR,
) -> Path | None:
    """
    Convert a single PDF to a sibling .md file.

    Returns the markdown path on success, or None on failure.
    """
    md_path = get_markdown_path(
        pdf_path,
        source_pdf_dir=source_pdf_dir,
        markdown_cache_dir=markdown_cache_dir,
    )

    log.info("Converting: %s", pdf_path)
    try:
        markdown = pdf_to_markdown(pdf_path)
        if not markdown.strip():
            log.warning("Empty output for %s; skipping save", pdf_path.name)
            return None

        md_path.parent.mkdir(parents=True, exist_ok=True)
        md_path.write_text(markdown, encoding="utf-8")
        size_kb = len(markdown.encode("utf-8")) / 1024
        log.info("Saved: %s (%.1f KB)", md_path, size_kb)
        return md_path
    except Exception as exc:
        log.error("Failed to convert %s: %s", pdf_path, exc)
        return None


def is_markdown_current(
    pdf_path: Path,
    *,
    source_pdf_dir: Path = SOURCE_PDF_DIR,
    markdown_cache_dir: Path = MARKDOWN_CACHE_DIR,
) -> bool:
    md_path = get_markdown_path(
        pdf_path,
        source_pdf_dir=source_pdf_dir,
        markdown_cache_dir=markdown_cache_dir,
    )
    return md_path.exists() and md_path.stat().st_mtime >= pdf_path.stat().st_mtime


def find_pdf_files(source_pdf_dir: Path) -> list[Path]:
    if not source_pdf_dir.exists():
        log.warning(
            "Source PDF directory does not exist: %s. "
            "Create it or run check_pdfs.py first.",
            source_pdf_dir,
        )
        return []

    return sorted(source_pdf_dir.rglob("*.pdf"))


def run(
    only_paths: list[Path] | None = None,
    *,
    changed_only: bool = False,
    source_pdf_dir: Path = SOURCE_PDF_DIR,
    markdown_cache_dir: Path = MARKDOWN_CACHE_DIR,
) -> dict:
    """
    Convert PDFs to markdown cache files.

    Args:
        only_paths: If provided, only these PDF paths are converted.
        changed_only: If true, skip PDFs whose .md cache is newer than the PDF.
        knowledge_base_dir: Directory scanned in full mode.

    Returns:
        A report dict with converted, skipped, failed, and missing lists.
    """
    report = {"converted": [], "skipped": [], "failed": [], "missing": []}

    if only_paths is None:
        pdf_files = find_pdf_files(source_pdf_dir)
        log.info("Found %s PDF(s) under %s", len(pdf_files), source_pdf_dir)
    else:
        pdf_files = []
        for path in only_paths:
            pdf_path = Path(path)
            if pdf_path.exists():
                pdf_files.append(pdf_path)
            else:
                log.warning("PDF path does not exist: %s", pdf_path)
                report["missing"].append(str(pdf_path))
        log.info("Selective mode: processing %s PDF(s)", len(pdf_files))

    if not pdf_files:
        log.info("No PDFs to process.")
        return report

    for pdf_path in pdf_files:
        if changed_only and is_markdown_current(
            pdf_path,
            source_pdf_dir=source_pdf_dir,
            markdown_cache_dir=markdown_cache_dir,
        ):
            log.info("Up to date, skipping: %s", pdf_path)
            report["skipped"].append(str(pdf_path))
            continue

        result = convert_pdf(
            pdf_path,
            source_pdf_dir=source_pdf_dir,
            markdown_cache_dir=markdown_cache_dir,
        )
        if result:
            report["converted"].append(str(result))
        else:
            report["failed"].append(str(pdf_path))

    log.info(
        "Converted: %s | Skipped: %s | Failed: %s | Missing: %s",
        len(report["converted"]),
        len(report["skipped"]),
        len(report["failed"]),
        len(report["missing"]),
    )
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PDFs to markdown cache")
    parser.add_argument(
        "--changed-only",
        action="store_true",
        help="Skip PDFs whose .md cache is newer than the PDF",
    )
    args = parser.parse_args()

    result = run(changed_only=args.changed_only)
    if result["failed"] or result["missing"]:
        raise SystemExit(1)
