"""
PDF-focused knowledge base update helper for FireBuddy.

For now this script only downloads and hash-checks source PDFs by default.
Markdown conversion and figure extraction are opt-in. Ingestion is intentionally
not wired here yet.

Run from apps/backend:
    python rag/scripts/update_kb.py
    python rag/scripts/update_kb.py --force
    python rag/scripts/update_kb.py --convert-md
    python rag/scripts/update_kb.py --extract-figures
    python rag/scripts/update_kb.py --notify
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Callable

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
RAG_DIR = SCRIPT_DIR.parent
KNOWLEDGE_BASE_DIR = RAG_DIR / "knowledge-base"
SOURCE_PDF_DIR = KNOWLEDGE_BASE_DIR / "source-pdfs"
MARKDOWN_CACHE_DIR = KNOWLEDGE_BASE_DIR / "markdown-cache"


def run_step(label: str, fn: Callable):
    log.info("")
    log.info("=" * 60)
    log.info("STEP: %s", label)
    log.info("=" * 60)
    try:
        return True, fn()
    except Exception as exc:
        log.error("Step failed [%s]: %s", label, exc)
        return False, None


def main(
    *,
    force: bool = False,
    convert_md: bool = False,
    extract_figures: bool = False,
    notify: bool = False,
    ci_mode: bool = False,
) -> int:
    from check_pdfs import run as check_pdfs_run

    ok, pdf_report = run_step(
        "Download and hash-check PDFs",
        lambda: check_pdfs_run(force=force),
    )

    if not ok or not pdf_report:
        return 1

    changed_sources = pdf_report.get("changed", [])
    failed_sources = pdf_report.get("failed", [])
    changed_pdf_paths = [Path(source["path"]) for source in changed_sources]

    if convert_md:
        from pdf_to_md import run as pdf_to_md_run

        paths_to_convert = changed_pdf_paths if changed_pdf_paths else None
        run_step(
            "Convert PDFs to markdown cache",
            lambda: pdf_to_md_run(only_paths=paths_to_convert),
        )
    else:
        log.info("")
        log.info("Skipping markdown conversion. Pass --convert-md to enable it.")

    figure_changes = []
    if extract_figures:
        from fetch_figures import run as fetch_figures_run

        _, figure_changes = run_step(
            "Extract annual figures",
            fetch_figures_run,
        )
        figure_changes = figure_changes or []
    else:
        log.info("Skipping figure extraction. Pass --extract-figures to enable it.")

    log.info("")
    log.info("=" * 60)
    log.info("KB UPDATE COMPLETE")
    log.info("  PDF changed:    %s", len(changed_sources))
    log.info("  PDF skipped:    %s", len(pdf_report.get("skipped", [])))
    log.info("  PDF failed:     %s", len(failed_sources))
    log.info("  Figure changes: %s", len(figure_changes))
    log.info("  Ingestion:      skipped; RAG ingestion is not implemented in scripts")
    log.info("=" * 60)

    has_changes = bool(changed_sources or figure_changes)
    has_failures = bool(failed_sources)

    if notify and (has_changes or has_failures):
        from notify import send_notification

        run_step(
            "Send Telegram notification",
            lambda: send_notification(
                figure_changes=figure_changes,
                pdf_changes=[source["label"] for source in changed_sources],
                pdf_failures=[source["label"] for source in failed_sources],
            ),
        )
    elif notify:
        log.info("No changes or failures; skipping notification.")

    if has_failures:
        return 1
    if ci_mode and has_changes:
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FireBuddy PDF knowledge base updater")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Write PDFs even when the stored hash is unchanged",
    )
    parser.add_argument(
        "--convert-md",
        action="store_true",
        help="Also convert downloaded PDFs to markdown cache files",
    )
    parser.add_argument(
        "--extract-figures",
        action="store_true",
        help="Also update annual-figures.json using the LLM extractor",
    )
    parser.add_argument(
        "--ci",
        action="store_true",
        help="Exit 1 if changes are detected",
    )
    parser.add_argument(
        "--notify",
        action="store_true",
        help="Send a Telegram notification if changes or failures occur",
    )
    args = parser.parse_args()

    sys.exit(
        main(
            force=args.force,
            convert_md=args.convert_md,
            extract_figures=args.extract_figures,
            notify=args.notify,
            ci_mode=args.ci,
        )
    )
