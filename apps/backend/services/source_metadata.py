"""
Source-currency lookup for the Ember answer prompt.

Two curated documents can disagree about a figure because one of them is old:
the IRAS relief leaflet still carries YA 2019 wording beside rules that are
still current. Retrieval ranking cannot resolve that, because the question is
not which document matches the query but which one is fresher. The answer
model can resolve it, given the dates.

Currency is a property of a document, not of a chunk, and the corpus is 24
ingested documents, so the dates live in a generated lookup file rather than in
three `rag_chunks` columns behind a migration. `ingest.py` writes
`rag/source-metadata.json` from manual front matter and the `check_pdfs.py`
registry; this module reads it the same way `ember_figure_tools.py` reads
`annual-figures.json`.
"""

import json
import logging
from functools import lru_cache
from pathlib import Path


SOURCE_METADATA_PATH = (
    Path(__file__).resolve().parents[1] / "rag" / "source-metadata.json"
)

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_source_metadata() -> dict[str, dict]:
    """
    Read the generated source-currency map, or an empty map if it is absent.

    A missing or unreadable file must not break answering: the provenance line
    is an enhancement, and the advisor still has the evidence context without
    it. The failure is logged once because `lru_cache` caches the empty result.
    """

    try:
        data = json.loads(SOURCE_METADATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning(
            "Source metadata unavailable at %s; answers will omit source dates",
            SOURCE_METADATA_PATH,
        )
        return {}

    sources = data.get("sources")
    return sources if isinstance(sources, dict) else {}


def source_as_of(source_path: str | None) -> str | None:
    """Return the ISO date a source was last reviewed or published, if known."""

    if not source_path:
        return None
    return load_source_metadata().get(source_path, {}).get("as_of") or None
