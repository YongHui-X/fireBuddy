"""
Service layer for the FireBuddy financial advisor RAG endpoint.

This version performs the first complete RAG flow:
- embed the user's question
- retrieve matching chunks from Supabase pgvector
- generate a grounded answer from retrieved context
- return source references for frontend citation display
"""

import os

from openai import OpenAI

from rag.retrieval import retrieve_chunks
from schemas.rag import AdvisorResponse, AdvisorSource, ChatMessage


ANSWER_MODEL = os.getenv("RAG_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
MAX_CONTEXT_CHARS_PER_CHUNK = 1800
MAX_HISTORY_MESSAGES = 6


def format_source_label(source: AdvisorSource) -> str:
    """
    Create a compact source label for current frontend citation lists.

    The API also returns `source_details` for richer future UI states, but the
    active web app currently renders `sources` as a simple string list.
    """

    title = source.title or "Unknown source"
    headline = source.headline
    location = source.url or source.path

    parts = [title]
    if headline and headline != title:
        parts.append(headline)
    if location:
        parts.append(location)

    return " - ".join(parts)


def build_unique_sources(matches: list[dict]) -> list[AdvisorSource]:
    """
    Convert retrieved chunks into unique source citations.

    A single PDF can produce many matching chunks, so this deduplicates by the
    official `source_url` first and uses `source_path` as the fallback key.
    """

    sources = []
    seen_source_keys = set()

    for match in matches:
        source_key = match.get("source_url") or match.get("source_path")
        if not source_key or source_key in seen_source_keys:
            continue

        seen_source_keys.add(source_key)
        sources.append(
            AdvisorSource(
                title=match.get("source_title"),
                url=match.get("source_url"),
                path=match.get("source_path"),
                headline=match.get("headline"),
            )
        )

    return sources


def format_chat_history(history: list[ChatMessage]) -> str:
    """
    Format recent chat turns for follow-up questions.

    History is supporting context only. The final answer still has to be
    grounded in retrieved knowledge-base chunks.
    """

    recent_history = history[-MAX_HISTORY_MESSAGES:]
    lines = []

    for message in recent_history:
        content = message.content.strip()
        if not content:
            continue
        lines.append(f"{message.role}: {content}")

    return "\n".join(lines)


def format_retrieved_context(matches: list[dict]) -> str:
    """
    Turn retrieved rows into the context block sent to the answer model.

    Each row is one chunk from `rag_chunks`. The source fields are included so
    the model can understand where the evidence came from without inventing
    citations or URLs.
    """

    context_blocks = []

    for index, match in enumerate(matches, start=1):
        content = (match.get("content") or "").strip()
        if not content:
            continue

        if len(content) > MAX_CONTEXT_CHARS_PER_CHUNK:
            content = f"{content[:MAX_CONTEXT_CHARS_PER_CHUNK].rstrip()}..."

        context_blocks.append(
            "\n".join(
                [
                    f"[Source {index}]",
                    f"Title: {match.get('source_title') or 'Unknown title'}",
                    f"Headline: {match.get('headline') or 'Unknown headline'}",
                    f"Path: {match.get('source_path') or 'Unknown path'}",
                    f"URL: {match.get('source_url') or 'No source URL'}",
                    "Content:",
                    content,
                ]
            )
        )

    return "\n\n---\n\n".join(context_blocks)


def generate_grounded_answer(question: str, context: str, history: list[ChatMessage] | None = None) -> str:
    """
    Ask the LLM to answer using only the retrieved RAG context.

    This keeps the model's job narrow: synthesize the provided evidence, avoid
    personalized financial advice, and admit when the context is insufficient.
    """

    client = OpenAI()
    history_text = format_chat_history(history or [])
    history_block = (
        f"Recent conversation:\n{history_text}\n\n"
        if history_text
        else ""
    )
    response = client.chat.completions.create(
        model=ANSWER_MODEL,
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are FireBuddy's Singapore personal-finance assistant. "
                    "Answer only using the retrieved context. If the context "
                    "does not contain enough evidence, say that clearly. Do "
                    "not invent facts, URLs, rates, dates, or source names. "
                    "Preserve numeric values and formulas exactly as they "
                    "appear in the context. "
                    "Do not give personalized financial advice; provide "
                    "general educational information only. Do not include "
                    "source numbers in the answer; citations are returned "
                    "separately by the API."
                ),
            },
            {
                "role": "user",
                "content": (
                    history_block +
                    f"Question:\n{question}\n\n"
                    f"Retrieved context:\n{context}\n\n"
                    "Write a concise answer without source-number citations."
                ),
            },
        ],
    )

    answer = response.choices[0].message.content
    return (answer or "").strip()


def answer_financial_advisor_question(question: str, history: list[ChatMessage] | None = None):
    """
    Handle the financial advisor request for the FastAPI route.

    This orchestrates the API-facing RAG flow: validate the question, retrieve
    evidence, generate the answer, and package citations for the frontend.
    """

    cleaned_question = question.strip()

    if not cleaned_question:
        return AdvisorResponse(
            answer="Please ask a question before using the financial advisor.",
            sources=[],
            source_details=[],
        )

    matches = retrieve_chunks(cleaned_question)

    if not matches:
        return AdvisorResponse(
            answer=(
                "I could not find relevant information in the FireBuddy "
                "knowledge base."
            ),
            sources=[],
            source_details=[],
        )

    source_details = build_unique_sources(matches)
    sources = [format_source_label(source) for source in source_details]
    context = format_retrieved_context(matches)

    if not context:
        return AdvisorResponse(
            answer=(
                "I found matching records, but they did not contain readable "
                "context to answer from."
            ),
            sources=sources,
            source_details=source_details,
        )

    answer = generate_grounded_answer(cleaned_question, context, history)

    return AdvisorResponse(
        answer=answer,
        sources=sources,
        source_details=source_details,
    )
