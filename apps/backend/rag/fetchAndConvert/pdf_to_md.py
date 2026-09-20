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
import sys
from pathlib import Path

try:
    import pdfplumber
except ModuleNotFoundError:
    pdfplumber = None

SCRIPT_DIR_FOR_IMPORT = str(Path(__file__).parent)
if SCRIPT_DIR_FOR_IMPORT not in sys.path:
    sys.path.append(SCRIPT_DIR_FOR_IMPORT)

from check_pdfs import registry_by_pdf_name

# A converted file smaller than this is almost certainly a failed or partial
# extraction (the CPF retirement sums PDF once converted to 279 bytes).
MIN_MARKDOWN_BYTES = 800
# Refuse a reconversion that loses more than half of the previous cache text.
MAX_SHRINK_RATIO = 0.5

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


SENTENCE_END_CHARS = (".", "?", "!", ":", ";", "\u201d", '"', ")", "*")
# Lines that start a new block even when the previous line has no end punctuation.
BLOCK_START_PATTERN = re.compile(
    r"^(#|\||[-\u2022*]\s|\d+[.)]\s|[A-Z]\.\s|[A-Z]\.\d+\s|\(?[a-z]\)\s)"
)
MIN_WORDS_FOR_WRAPPED_LINE = 8


def should_join_wrapped_line(previous: str, current: str) -> bool:
    """
    Decide whether `current` is the continuation of a sentence wrapped by the PDF.

    pdfplumber returns one line per printed line, so a paragraph arrives as
    several fragments. Joining them keeps sentences whole, which matters for
    chunk boundaries and for the overlap carried between chunks. A line is
    joined when the previous line has no sentence-ending punctuation and either
    the current line starts in lower case or the previous line is long enough
    to be a wrapped body line rather than a heading.
    """

    if not previous or not current:
        return False
    if previous.startswith(("|", "#")) or current.startswith(("|", "#")):
        return False
    if previous.endswith(SENTENCE_END_CHARS):
        return False
    if BLOCK_START_PATTERN.match(current):
        return False
    if current[0].islower():
        return True
    return len(previous.split()) >= MIN_WORDS_FOR_WRAPPED_LINE


NUMBERED_QUESTION_PATTERN = re.compile(r"^(\d{1,2})\. (\S.*)$")


def is_question_tail(previous: str | None, current: str) -> bool:
    """
    Keep a very short line that completes a numbered question.

    Short lines are normally dropped as extraction noise, but a wrapped question
    such as "12. ... back to the" / "Individual Limit?" leaves a two-word tail
    that carries the question mark. It is kept so the join step can restore it.
    """

    return bool(
        previous
        and current.endswith("?")
        and NUMBERED_QUESTION_PATTERN.match(previous)
        and not previous.endswith(SENTENCE_END_CHARS)
    )


def clean_extracted_text(
    text: str,
    source_filename: str,
    *,
    strip_lines: tuple[str, ...] | list[str] = (),
) -> str:
    """
    Light cleanup of raw pdfplumber output.

    The goal is to remove obvious extraction noise and rejoin wrapped lines
    into paragraphs while preserving enough structure for chunking. Exact
    `strip_lines` (repeated page headers and footers) are removed before the
    join so they are never glued into the middle of a sentence.
    """
    lines = text.split("\n")
    cleaned: list[str] = []
    strip_set = {item.strip() for item in strip_lines}

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped in strip_set:
            continue

        if re.fullmatch(r"[-\u2013\u2014]?\s*\d+\s*[-\u2013\u2014]?", stripped):
            continue

        word_count = len(stripped.split())
        if (
            word_count <= 2
            and not stripped.startswith(("-", "\u2022", "#", "|"))
            and not is_question_tail(cleaned[-1] if cleaned else None, stripped)
        ):
            continue

        if cleaned and should_join_wrapped_line(cleaned[-1], stripped):
            cleaned[-1] = f"{cleaned[-1]} {stripped}"
        else:
            cleaned.append(stripped)

    result = "\n\n".join(cleaned)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return f"# Source: {source_filename}\n\n{result}"


def strip_inline_noise(paragraphs: list[str], strip_lines: list[str]) -> list[str]:
    """Remove page header text that survived inside a paragraph; drop emptied ones."""

    if not strip_lines:
        return paragraphs
    result = []
    for paragraph in paragraphs:
        cleaned = paragraph
        for noise in strip_lines:
            cleaned = re.sub(r"\s*" + re.escape(noise) + r"\s*", " ", cleaned)
        cleaned = re.sub(r"[ \t]{2,}", " ", cleaned).strip()
        if cleaned:
            result.append(cleaned)
    return result


def promote_section_headings(paragraphs: list[str], rules: list[dict]) -> list[str]:
    """Turn paragraphs that fully match a section pattern into Markdown headings."""

    compiled = [(re.compile(rule["pattern"]), int(rule["level"])) for rule in rules or []]
    if not compiled:
        return paragraphs
    result = []
    for paragraph in paragraphs:
        promoted = paragraph
        for pattern, level in compiled:
            if pattern.fullmatch(paragraph):
                promoted = f"{'#' * level} {paragraph}"
                break
        result.append(promoted)
    return result


def split_fused_question(text: str, max_heading_chars: int = 160) -> tuple[str, str | None]:
    """
    Separate a question line from an answer that pdfplumber fused onto it.

    Returns (heading_text, body_or_None). When a long answer follows the first
    question mark, the heading stops at that mark and the rest becomes body.
    A question without a usable mark that exceeds the heading cap is truncated
    for the heading while the full line is kept as body, so nothing is lost.
    """

    mark = text.find("?")
    if mark != -1:
        remainder = text[mark + 1:].strip()
        if len(remainder) >= 60 and not remainder.endswith("?"):
            return text[:mark + 1].strip(), remainder

    if len(text) > max_heading_chars:
        cut = text.rfind(" ", 0, max_heading_chars)
        cut = cut if cut > 40 else max_heading_chars
        return text[:cut].rstrip() + " ...", text
    return text, None


def promote_numbered_questions(paragraphs: list[str], config: dict | None) -> list[str]:
    """
    Turn numbered FAQ questions into headings using a monotonic counter.

    A line "N. ..." is a question only when N is exactly one more than the
    last accepted question, which rejects numbered steps inside an answer.
    When the config supplies `section_titles`, a reset to 1 after a higher
    number starts a new part and each part (including the first) gets a
    level-2 heading with the matching title. Without titles a stray "1." is
    treated as a list item, never as a restart.
    """

    if not config or config.get("style") != "numbered":
        return paragraphs
    level = int(config.get("level", 3))
    titles = list(config.get("section_titles") or [])
    expected = 1
    part = -1
    result: list[str] = []

    for paragraph in paragraphs:
        match = NUMBERED_QUESTION_PATTERN.match(paragraph)
        if not match:
            result.append(paragraph)
            continue
        number = int(match.group(1))
        restarts_part = bool(titles) and number == 1 and expected > 1
        if number == expected or restarts_part:
            if number == 1 and titles:
                part += 1
                title = titles[part] if part < len(titles) else f"Part {part + 1}"
                result.append(f"## {title}")
            heading, body = split_fused_question(match.group(2))
            result.append(f"{'#' * level} {number}. {heading}")
            if body:
                result.append(body)
            expected = number + 1
        else:
            result.append(paragraph)
    return result


def dedupe_table_rows(paragraphs: list[str]) -> list[str]:
    """Drop Markdown table rows that repeat an earlier identical row in the file."""

    seen: set[str] = set()
    result = []
    for paragraph in paragraphs:
        if paragraph.startswith("|"):
            if paragraph in seen:
                continue
            seen.add(paragraph)
        result.append(paragraph)
    return result


def recover_structure(markdown: str, structure: dict | None) -> str:
    """
    Apply the registry's deterministic structure rules to converted Markdown.

    Order: strip inline page-header noise, promote section headings, promote
    numbered questions, drop repeated table rows. The `# Source:` first line is
    preserved. Without a config the input is returned unchanged.
    """

    if not structure:
        return markdown
    first_line, separator, rest = markdown.partition("\n\n")
    paragraphs = [item for item in rest.split("\n\n") if item.strip()]
    paragraphs = strip_inline_noise(paragraphs, list(structure.get("strip_lines") or []))
    paragraphs = promote_section_headings(paragraphs, structure.get("promote_sections") or [])
    paragraphs = promote_numbered_questions(paragraphs, structure.get("promote_questions"))
    if structure.get("dedupe_table_rows"):
        paragraphs = dedupe_table_rows(paragraphs)
    return first_line + separator + "\n\n".join(paragraphs)


def table_to_markdown(table: list[list[str | None]]) -> str:
    """
    Render one pdfplumber table as a Markdown table.

    pdfplumber often returns spacer columns that are empty in every row. Those
    are dropped so the header and data rows stay aligned, and cell line breaks
    are collapsed so each value stays in its own cell.
    """

    rows = [[(cell or "").replace("\n", " ").strip() for cell in row] for row in table]
    rows = [row for row in rows if any(row)]
    if len(rows) < 2:
        return ""

    width = max(len(row) for row in rows)
    rows = [row + [""] * (width - len(row)) for row in rows]
    keep = [index for index in range(width) if any(row[index] for row in rows)]
    if len(keep) < 2:
        return ""
    rows = [[row[index] for index in keep] for row in rows]

    header, body = rows[0], rows[1:]
    lines = [
        "| " + " | ".join(cell.replace("|", "/") for cell in header) + " |",
        "|" + "---|" * len(header),
    ]
    lines.extend(
        "| " + " | ".join(cell.replace("|", "/") for cell in row) + " |"
        for row in body
    )
    return "\n".join(lines)


def pdf_to_markdown(
    pdf_path: Path,
    *,
    skip_pages: set[int] | None = None,
    extract_tables: bool = False,
    structure: dict | None = None,
) -> str:
    """
    Extract and clean text from a PDF.

    Pages listed in `skip_pages` (1-based) are dropped, which removes cover and
    table-of-contents pages. With `extract_tables`, tables detected by
    pdfplumber are appended to the page as Markdown tables so row and column
    labels survive extraction. It is opt-in per registry entry because
    infographic-style PDFs produce garbage tables. `structure` applies the
    registry's deterministic heading recovery after cleanup.
    """
    require_pdfplumber()
    skipped = skip_pages or set()
    structure = structure or {}

    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            if page_index in skipped:
                log.info(
                    "Skipping page %s of %s (registry skip_pages)",
                    page_index,
                    pdf_path.name,
                )
                continue
            text = page.extract_text()
            if not (text and text.strip()):
                log.debug(
                    "Page %s of %s had no extractable text",
                    page_index,
                    pdf_path.name,
                )
                continue

            tables = []
            if not extract_tables:
                pages.append(text)
                continue
            try:
                tables = [
                    markdown
                    for markdown in (
                        table_to_markdown(table) for table in page.extract_tables()
                    )
                    if markdown
                ]
            except Exception as exc:  # pragma: no cover - pdfplumber edge cases
                log.debug("Table extraction failed on page %s: %s", page_index, exc)

            if tables:
                text = text + "\n\n" + "\n\n".join(tables)
            pages.append(text)

    if not pages:
        log.warning("No text extracted from %s; it may be scanned", pdf_path.name)
        return ""

    cleaned = clean_extracted_text(
        "\n\n".join(pages),
        pdf_path.name,
        strip_lines=structure.get("strip_lines") or (),
    )
    return recover_structure(cleaned, structure)


def markdown_size_problem(markdown: str, md_path: Path) -> str | None:
    """
    Explain why a converted file looks like a partial extraction, or None.

    A tiny output or a large shrink compared with the committed cache means the
    PDF layout changed or extraction failed. Keeping the old cache and failing
    the run is safer than ingesting a truncated document.
    """

    size = len(markdown.encode("utf-8"))
    if size < MIN_MARKDOWN_BYTES:
        return f"only {size} bytes extracted (minimum {MIN_MARKDOWN_BYTES})"

    if md_path.exists():
        previous_size = md_path.stat().st_size
        if previous_size and size < previous_size * MAX_SHRINK_RATIO:
            return (
                f"new output is {size} bytes but the existing cache is "
                f"{previous_size} bytes; more than half the text was lost"
            )
    return None


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
        registry_entry = registry_by_pdf_name().get(pdf_path.name, {})
        skip_pages = {int(page) for page in registry_entry.get("skip_pages", [])}
        markdown = pdf_to_markdown(
            pdf_path,
            skip_pages=skip_pages,
            extract_tables=bool(registry_entry.get("extract_tables", False)),
            structure=registry_entry.get("structure"),
        )
        if not markdown.strip():
            log.warning("Empty output for %s; skipping save", pdf_path.name)
            return None

        problem = markdown_size_problem(markdown, md_path)
        if problem:
            log.error("Rejected conversion of %s: %s", pdf_path.name, problem)
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
