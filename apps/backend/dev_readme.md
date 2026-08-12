# FireBuddy Backend

This is the new FastAPI backend scaffold for the target monorepo layout.

Current status:
- This folder provides the intended route structure for future migration
- The handlers are scaffolds, not finished business logic

## RAG chunk overlap

The RAG ingestion script lives at `apps/backend/rag/Implementation/ingest.py`.
It first splits Markdown by headings. Only sections that are still too large
are split again by paragraph groups in `split_large_section()`.

Chunk overlap is added inside `split_large_section()`. When a paragraph would
push the current chunk over `MAX_SECTION_SIZE`, the script saves the current
chunk, then carries a small tail from that saved chunk into the next chunk.

Current overlap settings:

- `CHUNK_OVERLAP_PARAGRAPHS = 1`
- `CHUNK_OVERLAP_MAX_CHARS = 600`

In plain English, the next chunk repeats the previous chunk's final paragraph
when that paragraph is 600 characters or shorter. If repeating it would make
the next chunk too large, the overlap is skipped for that boundary.

Example:

```text
Chunk 1:
Paragraph A
Paragraph B

Chunk 2:
Paragraph B
Paragraph C
```

This helps retrieval because facts near a chunk boundary are not separated from
their surrounding context. The overlap is stored in `rag_chunks.content`, so it
only affects Supabase after the ingestion script is rerun without `--dry-run`.
