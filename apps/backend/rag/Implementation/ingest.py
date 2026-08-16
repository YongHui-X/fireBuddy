"""
ingest.py

Ingestion pipeline for FireBuddy RAG knowledge base.
Adapted from Ed Donner's LLM Engineering Week 5 vectorize.py.

Changes from original:
- Reads .md cache files (produced by pdf_to_md.py) instead of raw markdown
- Writes embeddings to Supabase pgvector instead of ChromaDB
- Skips .md files that are backup or system files

Run:
    python backend/rag/ingest.py

Full pipeline (recommended):
    python backend/rag/scripts/update_kb.py
"""

import json
import logging
import os
import random
import re
import sys
import argparse
from pathlib import Path

from dotenv import load_dotenv
# from litellm import completion
from openai import OpenAI
from pydantic import BaseModel, Field
from supabase import create_client
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

BACKEND_DIR = Path(__file__).resolve().parents[2]
RAG_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_DIR / ".env", override=False)

embedding_model = "text-embedding-3-small"
KNOWLEDGE_BASE_PATH = RAG_DIR / "knowledge-base"
FETCH_AND_CONVERT_DIR = RAG_DIR / "fetchAndConvert"
# for handling rate limits to prevent app from crashing
wait = wait_exponential(multiplier=1, min=10, max=240)

WORKERS = 3
MAX_SECTION_SIZE = 4000
CHUNK_OVERLAP_PARAGRAPHS = 1
CHUNK_OVERLAP_MAX_CHARS = 600
SUPABASE_SELECT_PAGE_SIZE = 1000
STALE_DELETE_BATCH_SIZE = 100

if str(FETCH_AND_CONVERT_DIR) not in sys.path:
    sys.path.append(str(FETCH_AND_CONVERT_DIR))

from check_pdfs import PDFS

class Ingestable_Chunk(BaseModel):
    """
    Represents the final chunk shape before database storage.

    `page_content` is the text sent to the embedding model, while `metadata`
    carries source and citation fields that are stored with the vector.
    """

    page_content:str
    metadata: dict

# document = {
#       "source": "apps/backend/rag/knowledge-base/markdown-cache/cpf/cpf-
#   life-payout-examples.md",
#       "type": "pdf_cache",
#       "title": "CPF LIFE Payout Examples",
#       "agency": "CPF",
#       "topic": "cpf_life",
#       "source_url":
#   "https://www.cpf.gov.sg/content/dam/web/member/retirement-income/documents/CPF_LIFE_Payout_Examples.pdf",
#   }


class Chunk(BaseModel):
    """
    Represents a logical section of a source document before embedding.

    This keeps the chunk headline, optional summary, and original text separate
    until `as_result()` joins them into the storage-ready text.
    """

    headline: str = Field(
        description="A brief heading for this chunk, typically a few words, that is most likely to be surfaced in a query",
    )
    summary: str = Field(
        description="A few sentences summarizing the content of this chunk to answer common questions"
    )
    original_text: str = Field(
        description="The original text of this chunk from the provided document, exactly as is, not changed in any way"
    )

    def as_result(self, document, chunk_index: int):
        """
        Convert this chunk into an `Ingestable_Chunk`.

        The method copies document-level citation metadata, adds the chunk's
        index and headline, then joins non-empty text parts into `page_content`.
        """

        metadata = {"source_path": document["source"],
                    "source_type": document["type"],
                    "source_title": document["title"],
                    "source_url": document.get("source_url"),
                    "agency": document.get("agency"),
                    "topic": document.get("topic"),
                    "chunk_index": chunk_index,
                    "headline": self.headline,
                    }
        return Ingestable_Chunk(
            page_content="\n\n".join(
                part for part in [self.headline, self.summary, self.original_text]
                if part
            ),
            metadata=metadata,
        )


class Chunks(BaseModel):
    """
    Container for multiple `Chunk` objects.

    It is not used heavily in the deterministic path yet, but it matches the
    shape we may want if an LLM or batch chunker returns many chunks at once.
    """

    chunks: list[Chunk]

def find_md_files(base_dir: Path) -> list[Path]:
    """
    Find all Markdown files that should be considered for ingestion.

    The search is recursive so it includes both `manual/` notes and
    `markdown-cache/` files converted from official PDFs.
    """

    if not base_dir.exists():
        return []

    return sorted(
        path for path in base_dir.rglob("*.md")
        if path.is_file()
    )


def build_source_url_map() -> dict[str, str]:
    """
    Build a lookup from Markdown cache path to official source PDF URL.

    The PDF registry in `check_pdfs.py` stores `.pdf` destinations, so this
    converts those destinations to `.md` paths to match converted cache files.
    """

    return {
        str(Path(source["dest"]).with_suffix(".md")).replace("\\", "/"): source["url"]
        for source in PDFS
    }


SOURCE_URL_MAP = build_source_url_map()


def md_to_doc_obj(file_path: Path) -> dict:
    """
    Read a Markdown file and convert it into the common document shape.

    This labels whether the file came from `markdown-cache/`, `manual/`, or an
    unknown source, then attaches title, topic, agency, source URL, and text.
    """

    text = file_path.read_text(encoding="utf-8")
    relative_path = file_path.relative_to(KNOWLEDGE_BASE_PATH)

    source_group = relative_path.parts[0]
    source_url = None

    if source_group == "markdown-cache":
        doc_type = "pdf_cache"
        agency = relative_path.parts[1]
        topic = file_path.stem
        cache_path = str(Path(*relative_path.parts[1:])).replace("\\", "/")
        source_url = SOURCE_URL_MAP.get(cache_path)
    elif source_group == "manual":
        doc_type = "manual"
        agency = None
        topic = relative_path.parts[1]
    else:
        doc_type = "unknown"
        agency = None
        topic = file_path.stem

    return {
        "source": str(relative_path).replace("\\", "/"),
        "type": doc_type,
        "title": file_path.stem.replace("-", " ").title(),
        "agency": agency,
        "topic": topic,
        "source_url": source_url,
        "text": text,
    }



def split_by_headings(text: str) -> list[dict]:
    """
    Split Markdown text into sections based on heading lines.

    Each `#`, `##`, etc. heading starts a new section. Text before the first
    heading is grouped under an `Introduction` heading.
    """

    sections = []
    current_heading = "Introduction"
    current_lines = []

    for line in text.splitlines():
        if re.match(r"^#{1,6}\s+", line):
            if current_lines:
                sections.append({
                    "heading": current_heading,
                    "text": "\n".join(current_lines).strip(),
                })

            current_heading = line.lstrip("#").strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append({
            "heading": current_heading,
            "text": "\n".join(current_lines).strip(),
        })

    return [section for section in sections if section["text"]]


def split_large_section(section: dict, max_size: int = MAX_SECTION_SIZE) -> list[dict]:
    """
    Break a large section into smaller paragraph-based chunks.

    PDF-derived Markdown can have weak headings, so a single section can become
    too large. This keeps paragraph groups near `max_size` characters.
    """

    if len(section["text"]) <= max_size:
        return [section]

    paragraphs = section["text"].split("\n\n")
    chunks = []
    current_paragraphs = []

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        candidate_paragraphs = [*current_paragraphs, paragraph]

        if current_paragraphs and paragraph_group_size(candidate_paragraphs) > max_size:
            chunks.append({
                "heading": section["heading"],
                "text": "\n\n".join(current_paragraphs),
            })
            overlap_paragraphs = select_overlap_paragraphs(current_paragraphs)
            overlap_candidate = [*overlap_paragraphs, paragraph]
            current_paragraphs = (
                overlap_paragraphs
                if paragraph_group_size(overlap_candidate) <= max_size
                else []
            )

        current_paragraphs.append(paragraph)

    if current_paragraphs:
        chunks.append({
            "heading": section["heading"],
            "text": "\n\n".join(current_paragraphs),
        })

    return chunks


def paragraph_group_size(paragraphs: list[str]) -> int:
    """Return the stored text size for a paragraph group."""

    if not paragraphs:
        return 0

    return sum(len(paragraph) for paragraph in paragraphs) + (len(paragraphs) - 1) * 2


def select_overlap_paragraphs(paragraphs: list[str]) -> list[str]:
    """
    Carry a small tail from one oversized chunk into the next chunk.

    The overlap belongs here in ingestion, not retrieval, because it makes the
    stored vector text preserve context around chunk boundaries.
    """

    selected: list[str] = []

    for paragraph in reversed(paragraphs[-CHUNK_OVERLAP_PARAGRAPHS:]):
        candidate = [paragraph, *selected]
        if paragraph_group_size(candidate) > CHUNK_OVERLAP_MAX_CHARS:
            continue
        selected = candidate

    return selected


def split_document(text: str) -> list[dict]:
    """
    Split one document into retrieval-sized text chunks.

    The first pass respects Markdown headings. The second pass splits only the
    sections that are still too large for practical embedding and retrieval.
    """

    chunks = []

    for section in split_by_headings(text):
        chunks.extend(split_large_section(section))

    return chunks


def create_chunks(document: dict) -> list[Chunk]:
    """
    Convert split document sections into `Chunk` models.

    The current baseline is deterministic: the section heading becomes the
    headline, summary stays empty, and original text is preserved exactly.
    """

    return [
        Chunk(
            headline=chunk["heading"],
            summary="",
            original_text=chunk["text"],
        )
        for chunk in split_document(document["text"])
    ]


def create_ingestable_chunks(document: dict) -> list[Ingestable_Chunk]:
    """
    Create storage-ready chunks for one source document.

    It creates deterministic `Chunk` objects first, then attaches source
    metadata and chunk indexes through `Chunk.as_result()`.
    """

    return [
        chunk.as_result(document, chunk_index)
        for chunk_index, chunk in enumerate(create_chunks(document))
    ]


def create_all_ingestable_chunks(documents: list[dict]) -> list[Ingestable_Chunk]:
    """
    Create one flat list of storage-ready chunks for the whole corpus.

    Supabase ingestion works row by row, so this removes the per-document
    nesting after all document chunks have been created.
    """

    chunks = []

    for document in documents:
        chunks.extend(create_ingestable_chunks(document))

    return chunks


def get_required_env(name: str) -> str:
    """
    Read a required environment variable.

    This fails immediately with a clear message when a required key is missing,
    instead of letting OpenAI or Supabase fail later with a vague error.
    """

    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_supabase_client():
    """
    Create the Supabase client used for ingestion writes.

    Ingestion uses backend credentials because it is an admin data-loading job
    that writes shared RAG content, not user-owned frontend data.
    """

    supabase_url = get_required_env("SUPABASE_URL")
    supabase_key = (
        os.getenv("SUPABASE_SECRET_KEY", "").strip()
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    )

    if not supabase_key:
        raise RuntimeError(
            "Missing required environment variable: "
            "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
        )

    return create_client(supabase_url, supabase_key)


def has_supabase_env() -> bool:
    """
    Check whether dry-run cleanup can inspect Supabase safely.

    Normal ingestion still calls `get_supabase_client()` so missing credentials
    fail loudly. Dry runs remain useful without credentials and simply skip the
    optional stale-row inspection.
    """

    has_url = bool(os.getenv("SUPABASE_URL", "").strip())
    has_key = bool(
        os.getenv("SUPABASE_SECRET_KEY", "").strip()
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    )
    return has_url and has_key


@retry(wait=wait, stop=stop_after_attempt(5))
def embed_text(client: OpenAI, text: str) -> list[float]:
    """
    Generate an embedding vector for one chunk of text.

    The retry wrapper tries up to 5 times, helping the script survive temporary
    OpenAI rate limits or transient API failures without hanging forever.
    """

    response = client.embeddings.create(
        model=embedding_model,
        input=text,
    )
    return response.data[0].embedding


def chunk_to_row(chunk: Ingestable_Chunk, embedding: list[float]) -> dict:
    """
    Convert an ingestable chunk into the exact `rag_chunks` table payload.

    This separates database field mapping from the upsert call, making it easier
    to inspect or adjust schema mapping without changing embedding logic.
    """

    metadata = chunk.metadata
    return {
        "source_path": metadata["source_path"],
        "source_type": metadata["source_type"],
        "source_title": metadata["source_title"],
        "source_url": metadata.get("source_url"),
        "agency": metadata.get("agency"),
        "topic": metadata.get("topic"),
        "chunk_index": metadata["chunk_index"],
        "headline": metadata["headline"],
        "content": chunk.page_content,
        "embedding": embedding,
    }


def upsert_chunk(supabase_client, chunk: Ingestable_Chunk, embedding: list[float]):
    """
    Write one embedded chunk into Supabase.

    The upsert conflict target is `source_path,chunk_index`, so rerunning
    ingestion updates the same logical chunk instead of duplicating rows.
    """

    row = chunk_to_row(chunk, embedding)
    return (
        supabase_client.table("rag_chunks")
        .upsert(row, on_conflict="source_path,chunk_index")
        .execute()
    )


def chunk_storage_key(source_path: str | None, chunk_index) -> tuple[str, int] | None:
    """
    Normalize a chunk's unique storage key.

    Stale cleanup compares the deterministic `(source_path, chunk_index)` key
    used by the Supabase upsert constraint rather than comparing row content.
    """

    if not source_path:
        return None

    try:
        return (source_path, int(chunk_index))
    except (TypeError, ValueError):
        return None


def build_current_chunk_keys(
    ingestable_chunks: list[Ingestable_Chunk],
) -> set[tuple[str, int]]:
    """Build the current valid key set from generated ingestable chunks."""

    keys = set()

    for chunk in ingestable_chunks:
        key = chunk_storage_key(
            chunk.metadata.get("source_path"),
            chunk.metadata.get("chunk_index"),
        )
        if key:
            keys.add(key)

    return keys


def fetch_existing_chunk_rows(supabase_client) -> list[dict]:
    """
    Read existing RAG chunk identifiers from Supabase in pages.

    Only `id`, `source_path`, and `chunk_index` are needed to determine stale
    rows and delete them with filtered Supabase Data API calls.
    """

    rows = []
    start = 0

    while True:
        end = start + SUPABASE_SELECT_PAGE_SIZE - 1
        response = (
            supabase_client.table("rag_chunks")
            .select("id,source_path,chunk_index")
            .range(start, end)
            .execute()
        )
        page = response.data or []
        rows.extend(page)

        if len(page) < SUPABASE_SELECT_PAGE_SIZE:
            break

        start += SUPABASE_SELECT_PAGE_SIZE

    return rows


def find_stale_chunk_rows(
    existing_rows: list[dict],
    current_keys: set[tuple[str, int]],
) -> list[dict]:
    """Return database rows that no longer exist in the current knowledge base."""

    stale_rows = []

    for row in existing_rows:
        key = chunk_storage_key(row.get("source_path"), row.get("chunk_index"))
        if key and key not in current_keys:
            stale_rows.append(row)

    return stale_rows


def delete_stale_chunk_rows(supabase_client, stale_rows: list[dict]) -> int:
    """
    Delete stale RAG chunks by id using filtered Supabase delete calls.

    The Supabase Python API should always delete with filters. Deleting by id
    avoids complex composite-key filters and keeps each request bounded.
    """

    stale_ids = [row["id"] for row in stale_rows if row.get("id")]

    for start in range(0, len(stale_ids), STALE_DELETE_BATCH_SIZE):
        batch_ids = stale_ids[start:start + STALE_DELETE_BATCH_SIZE]
        (
            supabase_client.table("rag_chunks")
            .delete()
            .in_("id", batch_ids)
            .execute()
        )

    return len(stale_ids)


def cleanup_stale_chunks(
    supabase_client,
    current_keys: set[tuple[str, int]],
    *,
    dry_run: bool = False,
) -> int:
    """
    Remove rows for chunks that disappeared from the current full index.

    This runs only after successful upserts in normal ingestion. In dry-run
    mode it reports the stale count and leaves Supabase untouched.
    """

    existing_rows = fetch_existing_chunk_rows(supabase_client)
    stale_rows = find_stale_chunk_rows(existing_rows, current_keys)

    if dry_run:
        print(
            "\nDry-run stale cleanup: "
            f"{len(stale_rows)} row(s) would be deleted from public.rag_chunks."
        )
        return len(stale_rows)

    if not stale_rows:
        print("\nStale cleanup complete. No obsolete rag_chunks rows found.")
        return 0

    deleted_count = delete_stale_chunk_rows(supabase_client, stale_rows)
    print(
        "\nStale cleanup complete. "
        f"Deleted {deleted_count} obsolete rag_chunks row(s)."
    )
    return deleted_count


def print_chunk_size_summary(documents: list[dict]) -> None:
    """
    Print chunk counts and largest chunk size for each document.

    This is a quick safety check that the deterministic chunker is not producing
    huge sections that would be poor retrieval candidates.
    """

    print("\n--- Chunk Size Summary ---")

    for doc in documents:
        chunks = split_document(doc["text"])
        largest_chunk = max(
            (len(chunk["text"]) for chunk in chunks),
            default=0,
        )

        print(
            f"{doc['title']}: "
            f"{len(chunks)} chunk(s), "
            f"largest chunk {largest_chunk} characters"
        )


def print_sample_chunk(ingestable_chunks: list[Ingestable_Chunk]) -> None:
    """
    Print one repeatable sample chunk for manual inspection.

    A fixed random seed keeps the sample stable between runs, which makes it
    easier to notice accidental metadata or content-format changes.
    """

    if not ingestable_chunks:
        return

    random.seed(42)
    sample_chunk = random.choice(ingestable_chunks)

    print("\n--- Random Ingestable Chunk Example ---")
    print(f"Metadata: {sample_chunk.metadata}")
    print(sample_chunk.page_content[:500])


def main(
    *,
    limit: int | None = None,
    dry_run: bool = False,
    skip_cleanup: bool = False,
):
    """
    Run the full ingestion workflow.

    The workflow loads Markdown documents, chunks them, optionally limits the
    batch for testing, and either dry-runs or embeds/upserts into Supabase.
    """

    files = find_md_files(KNOWLEDGE_BASE_PATH)
    print(f"Found {len(files)} markdown files")

    documents = [md_to_doc_obj(file_path) for file_path in files]
    print(f"Loaded {len(documents)} documents")

    print_chunk_size_summary(documents)

    ingestable_chunks = create_all_ingestable_chunks(documents)
    using_limit = limit is not None
    if using_limit:
        ingestable_chunks = ingestable_chunks[:limit]

    print(f"\nCreated {len(ingestable_chunks)} ingestable chunks")
    print_sample_chunk(ingestable_chunks)
    current_keys = build_current_chunk_keys(ingestable_chunks)

    if dry_run:
        print("\nDry run complete. No embeddings created and no rows written.")
        if skip_cleanup:
            print("Stale cleanup skipped because --skip-cleanup was set.")
        elif using_limit:
            print("Stale cleanup skipped because --limit is a partial index.")
        elif has_supabase_env():
            cleanup_stale_chunks(
                get_supabase_client(),
                current_keys,
                dry_run=True,
            )
        else:
            print(
                "Dry-run stale cleanup skipped because Supabase credentials "
                "are not configured."
            )
        return

    openai_client = OpenAI()
    supabase_client = get_supabase_client()

    for chunk in tqdm(ingestable_chunks, desc="Embedding and upserting chunks"):
        embedding = embed_text(openai_client, chunk.page_content)
        upsert_chunk(supabase_client, chunk, embedding)

    print(f"\nUpserted {len(ingestable_chunks)} chunks into public.rag_chunks")

    if skip_cleanup:
        print("Stale cleanup skipped because --skip-cleanup was set.")
    elif using_limit:
        print("Stale cleanup skipped because --limit is a partial index.")
    else:
        cleanup_stale_chunks(supabase_client, current_keys)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Embed and ingest FireBuddy RAG knowledge-base chunks"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Only ingest the first N chunks; useful for smoke tests",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build and inspect chunks without creating embeddings or writing rows",
    )
    parser.add_argument(
        "--skip-cleanup",
        action="store_true",
        help="Skip stale rag_chunks cleanup after successful upserts",
    )
    args = parser.parse_args()

    main(limit=args.limit, dry_run=args.dry_run, skip_cleanup=args.skip_cleanup)
