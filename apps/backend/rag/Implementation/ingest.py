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
from multiprocessing import Pool
from pathlib import Path

from dotenv import load_dotenv
from litellm import completion
from openai import OpenAI
from pydantic import BaseModel, Field
from supabase import create_client
from tenacity import retry, wait_exponential
from tqdm import tqdm

load_dotenv(override=True)

model = "openai/gpt-4.1-nano"

DB_NAME = str(Path(__file__).parent.parent / "preprocessed_db")
collection_name = "docs"
embedding_model = "text-embedding-3-large"
KNOWLEDGE_BASE_PATH = Path(__file__).parent.parent / "knowledge-base"
AVERAGE_CHUNK_SIZE = 100
# for handling rate limits to prevent app from crashing
wait = wait_exponential(multiplier=1, min=10, max=240)

WORKERS = 3

openai = OpenAI()

class Ingestable_Chunk(BaseModel):
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
            page_content=self.headline + "\n\n" + self.summary + "\n\n" + self.original_text,
            metadata=metadata,
        )