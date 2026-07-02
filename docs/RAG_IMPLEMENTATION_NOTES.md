# RAG Implementation Notes

This document records implementation decisions, problems encountered, and
follow-up work for the FireBuddy RAG pipeline. It is separate from the
knowledge-base documents and must not be ingested as financial context.

## Current Scope

The current work focuses on deterministic ingestion:

```text
Markdown documents
-> source metadata
-> heading-based sections
-> paragraph fallback for oversized sections
-> Chunk objects
-> Ingestable_Chunk objects
-> OpenAI embeddings
-> Supabase rag_chunks upsert
```

Retrieval is wired as a smoke-test CLI in `answer.py`. Final answer generation
is not wired yet.

## Decisions

### Use a custom Markdown loader first

The knowledge base already has controlled Markdown input under
`apps/backend/rag/knowledge-base/`. A small custom loader keeps the first
working ingestion path easy to inspect. LangChain loaders can be reconsidered
if the pipeline later ingests mixed source formats directly.

### Include manual and PDF-cache documents

The knowledge base contains two useful source types:

- `manual/`: hand-written retrieval context
- `markdown-cache/`: text extracted from official PDFs

The loader records `source_type`, `agency`, and `topic` so retrieval results can
be traced and citations can distinguish official content from manual notes.

### Reuse the PDF registry for citation URLs

Official PDF URLs already live in `fetchAndConvert/check_pdfs.py`. The ingest
loader builds a Markdown-path-to-URL lookup from that registry rather than
duplicating URLs in another file. Manual documents retain `source_url: None`.

### Start with deterministic chunking

Manual notes preserve Markdown headings well. PDF-derived Markdown often does
not. The current strategy:

1. Split on Markdown headings.
2. Keep sections at or below `4,000` characters intact.
3. Split oversized sections into paragraph groups.

The `4,000` character threshold is an initial retrieval-oriented limit, roughly
`800-1,000` English tokens. It should be tuned later using retrieval tests.

### Keep exact finance figures separate

Exact annual values remain in `annual-figures.json` rather than the vector
store. Retrieval is intended for qualitative context; exact numerical facts
need a controlled lookup path.

## Problems Encountered

### Manual documents were initially treated like PDF cache documents

The first loader assumption used a single source shape. Scanning the full
knowledge base found manual FIRE and investing notes as well as cached PDFs.

Resolution: derive metadata from the relative path and label documents as
`manual`, `pdf_cache`, or `unknown`.

### Heading splitting was insufficient for PDF-derived Markdown

Manual notes split into focused sections, but many PDF cache files only contain
one generated `# Source:` heading. Some resulting sections exceeded `40,000`
characters.

Resolution: retain heading splitting and add paragraph grouping only for
oversized sections.

### Chunk sizes exceeded the configured limit slightly

The first paragraph fallback counted paragraph characters but did not count the
two newline characters inserted between paragraphs.

Resolution: include separator length when calculating the candidate chunk
size. The measured corpus now stays at or below `4,000` characters per chunk.

### Empty summaries produced extra blank lines

The deterministic baseline intentionally leaves `summary` empty. Concatenating
the empty field added unnecessary whitespace to `page_content`.

Resolution: join only non-empty content fields.

### PDF-derived chunks have generic headlines

PDF cache files usually have one generated Markdown heading such as
`# Source: singapore-savings-bonds-faqs.pdf`. Paragraph fallback chunks inherit
that heading, so multiple chunks from one PDF currently share the same generic
headline.

Resolution: keep the generic heading for the deterministic baseline. Revisit
descriptive chunk headlines only after retrieval testing shows whether they
improve recall enough to justify additional logic or LLM calls.

### Absolute source paths were not portable

The first storage-ready metadata used an absolute Windows path. That path would
be machine-specific if written to Supabase.

Resolution: store paths relative to the RAG knowledge-base directory using
forward slashes.

## Completed Wiring

- Created the `rag_chunks` pgvector table and `match_rag_chunks` RPC.
- Switched active embeddings to `text-embedding-3-small` so the 1,536-dimension
  vectors work with the pgvector `ivfflat` index.
- Added `ingest.py --dry-run` and `ingest.py --limit` for safe smoke tests.
- Successfully ingested the current 94 deterministic chunks into Supabase.
- Added `answer.py` retrieval smoke testing against the Supabase RPC.

## Follow-Up Work

- Decide whether deterministic empty summaries are sufficient after retrieval
  tests, or whether guarded LLM-generated summaries improve recall.
- Add retrieval tests with representative Singapore finance questions.
- Add final answer generation from retrieved chunks.
- Add guarded knowledge-base refresh monitoring and regression alerts before
  considering agentic routing or self-healing behavior.
