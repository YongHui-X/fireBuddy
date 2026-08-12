"""
Refresh the FireBuddy knowledge base and optionally rebuild its vector index.

Run from the repository root:
    python apps/backend/rag/fetchAndConvert/update_kb.py
    python apps/backend/rag/fetchAndConvert/update_kb.py --force
    python apps/backend/rag/fetchAndConvert/update_kb.py --convert-md
    python apps/backend/rag/fetchAndConvert/update_kb.py --extract-figures
    python apps/backend/rag/fetchAndConvert/update_kb.py --convert-md --extract-figures --ingest
    python apps/backend/rag/fetchAndConvert/update_kb.py --notify
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
    ingest: bool = False,
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

    conversion_ok = True
    if convert_md:
        from pdf_to_md import run as pdf_to_md_run

        paths_to_convert = changed_pdf_paths if changed_pdf_paths else None
        conversion_ok, _ = run_step(
            "Convert PDFs to markdown cache",
            lambda: pdf_to_md_run(only_paths=paths_to_convert),
        )
    else:
        log.info("")
        log.info("Skipping markdown conversion. Pass --convert-md to enable it.")

    figure_changes = []
    figures_ok = True
    if extract_figures:
        from fetch_figures import run as fetch_figures_run

        figures_ok, figure_changes = run_step(
            "Extract annual figures",
            fetch_figures_run,
        )
        figure_changes = figure_changes or []
    else:
        log.info("Skipping figure extraction. Pass --extract-figures to enable it.")

    ingestion_ok = True
    ingested = False
    if ingest and conversion_ok and figures_ok:
        implementation_dir = RAG_DIR / "Implementation"
        if str(implementation_dir) not in sys.path:
            sys.path.insert(0, str(implementation_dir))
        from ingest import main as ingest_main

        ingestion_ok, _ = run_step("Embed and upsert RAG chunks", ingest_main)
        ingested = ingestion_ok
    elif ingest:
        ingestion_ok = False
        log.error("Skipping ingestion because an earlier refresh step failed.")

    log.info("")
    log.info("=" * 60)
    log.info("KB UPDATE COMPLETE")
    log.info("  PDF changed:    %s", len(changed_sources))
    log.info("  PDF skipped:    %s", len(pdf_report.get("skipped", [])))
    log.info("  PDF failed:     %s", len(failed_sources))
    log.info("  Figure changes: %s", len(figure_changes))
    log.info("  Ingestion:      %s", "complete" if ingested else "skipped")
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

    if has_failures or not conversion_ok or not figures_ok or not ingestion_ok:
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
        "--ingest",
        action="store_true",
        help="Embed and upsert the refreshed Markdown knowledge base",
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
            ingest=args.ingest,
        )
    )
