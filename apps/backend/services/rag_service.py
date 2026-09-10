"""
Service layer for the FireBuddy financial advisor RAG endpoint.

This version performs the first complete RAG flow:
- embed the user's question
- retrieve matching chunks from Supabase pgvector
- generate a grounded answer from retrieved context
- return source references for frontend citation display
"""

import hashlib
import logging
import os
import time
from collections.abc import Iterator

from openai import OpenAI

from rag.retrieval import RagStoreUnavailableError, retrieve_chunks
from schemas.rag import AdvisorAppContext, AdvisorResponse, AdvisorSource, ChatMessage


ANSWER_MODEL = os.getenv("RAG_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
DEFAULT_RAG_MIN_SIMILARITY = 0.45
MAX_CONTEXT_CHARS_PER_CHUNK = 1800
MAX_HISTORY_MESSAGES = 6
LOW_CONFIDENCE_ANSWER = (
    "I do not have enough reliable context in the FireBuddy knowledge base "
    "to answer that. Try asking about CPF, Singapore Savings Bonds, "
    "MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore "
    "investing basics."
)
OUT_OF_SCOPE_ANSWER = (
    "Ember can only help with the Singapore personal-finance topics covered by "
    "FireBuddy, such as CPF, MoneySense planning, Singapore Savings Bonds, "
    "IRAS reliefs, investing basics, and FIRE planning."
)
SUPPORTED_FINANCE_TERMS = {
    "account", "allocation", "asset", "bond", "budget", "cash", "cpf",
    "cpfis", "debt", "emergency fund", "expense", "finance", "financial",
    "fire", "fund", "income", "insurance", "interest", "invest", "iras",
    "money", "moneysense", "portfolio", "reit", "relief", "retire", "saving",
    "srs", "ssb", "tax", "t-bill", "withdrawal",
}
OUT_OF_SCOPE_TERMS = {
    "code", "coding", "diagnose", "football", "legal advice", "medical advice",
    "movie", "recipe", "sports score", "translate", "weather",
}
LIVE_MARKET_TERMS = {"bitcoin", "crypto", "exchange rate", "share price", "stock price"}
PAGE_RETRIEVAL_HINTS = {
    "Home dashboard": "Singapore personal finance and FIRE planning",
    "Transactions": "income expenses spending and FIRE planning",
    "Categories": "budgeting spending categories and FIRE planning",
    "Accounts": "cash accounts emergency savings and financial planning",
    "Insights": "spending insights budgeting and FIRE planning",
    "Wealth": "assets liabilities liquidity CPF and FIRE planning",
    "FIRE setup": "Singapore FIRE assumptions and retirement planning",
    "Spending Plan": "budgeting spending plan and FIRE planning",
    "Life Goals": "financial goals saving investing and FIRE planning",
    "Add transaction": "financial record keeping income and expenses",
    "Profile": "Singapore personal financial planning",
}

logger = logging.getLogger(__name__)


def build_answer_messages(
    question: str,
    context: str,
    history: list[ChatMessage],
    app_context: AdvisorAppContext | None = None,
) -> list[dict]:
    """Build the single grounded prompt shared by JSON and streaming answers."""

    history_text = format_chat_history(history)
    history_block = (
        f"Recent conversation:\n{history_text}\n\n"
        if history_text
        else ""
    )
    app_context_text = format_app_context(app_context)
    app_context_block = (
        f"FireBuddy interface context:\n{app_context_text}\n\n"
        if app_context_text
        else ""
    )
    return [
        {
            "role": "system",
            "content": (
                "You are Ember, FireBuddy's educational Singapore finance guide. "
                "Answer only using the supplied evidence context. It may contain "
                "trusted FireBuddy aggregates calculated by the backend, curated "
                "educational sources, or both. If the context "
                "does not contain enough evidence, say that clearly. Do "
                "not invent facts, URLs, rates, dates, or source names. "
                "Preserve numeric values and formulas exactly as they "
                "appear in the context. "
                "For tables, associate each value only with its explicit "
                "row and column. Do not invent a breakdown or reuse a "
                "number from a different row or column. Omit any table "
                "value whose label is ambiguous in the retrieved text. "
                "When one percentage applies separately to Ordinary Wages "
                "and Additional Wages, state it once as the applicable "
                "rate. Never join repeated OW and AW rates with a plus "
                "sign because that falsely implies they should be added. "
                "Answer only the breakdowns the question asks for. "
                "You may explain the user's supplied FireBuddy aggregates, but do "
                "not recommend specific financial products or present projections "
                "as guarantees. Do not include "
                "source numbers in the answer; citations are returned "
                "separately by the API. Interface context contains only "
                "page and generic activity labels. Use it to tailor emphasis, "
                "but never claim that interface activity is financial evidence. "
                "Only a clearly labelled trusted FireBuddy data block may support "
                "claims about the user's records."
            ),
        },
        {
            "role": "user",
            "content": (
                history_block
                + app_context_block
                + f"Question:\n{question}\n\n"
                + f"Evidence context:\n{context}\n\n"
                + "Write a concise answer without source-number citations."
            ),
        },
    ]


def is_clearly_out_of_scope(question: str) -> bool:
    """Identify obvious unsupported or live-market requests before paid retrieval."""

    normalized = " ".join(question.lower().split())
    asks_for_live_value = any(
        term in normalized for term in ("current", "right now", "today", "live")
    ) and any(term in normalized for term in LIVE_MARKET_TERMS)
    if asks_for_live_value:
        return True

    if any(term in normalized for term in SUPPORTED_FINANCE_TERMS):
        return False

    return any(term in normalized for term in OUT_OF_SCOPE_TERMS)


def get_rag_min_similarity() -> float:
    """
    Read the minimum retrieval confidence threshold for answer generation.

    `RAG_MIN_SIMILARITY` lets the backend refuse weak retrieval results without
    changing code. Invalid values fall back to the conservative V1 default.
    """

    raw_value = os.getenv("RAG_MIN_SIMILARITY", "").strip()
    if not raw_value:
        return DEFAULT_RAG_MIN_SIMILARITY

    try:
        return float(raw_value)
    except ValueError:
        logger.warning(
            "Invalid RAG_MIN_SIMILARITY value; using default",
            extra={
                "configured_value_length": len(raw_value),
                "default": DEFAULT_RAG_MIN_SIMILARITY,
            },
        )
        return DEFAULT_RAG_MIN_SIMILARITY


def question_hash(question: str) -> str:
    """
    Build a privacy-conscious identifier for request correlation.

    The full question is never logged. A short SHA-256 prefix lets backend logs
    group repeated questions without exposing the user's wording.
    """

    return hashlib.sha256(question.encode("utf-8")).hexdigest()[:16]


def match_similarity(match: dict) -> float:
    """Return a numeric similarity value from a retrieval match."""

    try:
        return float(match.get("similarity") or 0.0)
    except (TypeError, ValueError):
        return 0.0


def log_rag_event(
    *,
    question: str,
    matches: list[dict],
    source_count: int,
    outcome: str,
    started_at: float,
) -> None:
    """
    Log RAG request metadata without recording the raw user question.

    The fields capture enough information for retrieval debugging: stable
    question hash, question length, top source paths, top similarities, source
    count, outcome, and latency.
    """

    top_matches = matches[:5]
    log_fields = {
        "question_hash": question_hash(question),
        "question_length": len(question),
        "top_source_paths": [
            match.get("source_path") for match in top_matches
        ],
        "top_similarities": [
            round(match_similarity(match), 4) for match in top_matches
        ],
        "source_count": source_count,
        "outcome": outcome,
        "latency_ms": round((time.perf_counter() - started_at) * 1000, 2),
    }
    logger.info("rag_advisor_request %s", log_fields, extra=log_fields)


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


def select_recent_chat_history(history: list[ChatMessage]) -> list[ChatMessage]:
    """Bound generation context to the backend's most recent chat window."""

    return history[-MAX_HISTORY_MESSAGES:]


def format_app_context(app_context: AdvisorAppContext | None) -> str:
    """Format bounded, nonfinancial interface metadata for answer tailoring."""

    if app_context is None:
        return ""

    lines = [
        f"Current page: {app_context.current_page}",
        f"Current path: {app_context.current_path}",
    ]
    if app_context.recent_actions:
        lines.append("Recent actions:")
        lines.extend(
            f"- {action.label}"
            for action in app_context.recent_actions[-5:]
        )
    else:
        lines.append("Recent actions: none recorded in this session")
    return "\n".join(lines)


def build_contextual_retrieval_question(
    question: str,
    app_context: AdvisorAppContext | None,
) -> str:
    """Add bounded page and action hints so short contextual questions retrieve relevant guidance."""

    if app_context is None:
        return question

    page_hint = PAGE_RETRIEVAL_HINTS.get(app_context.current_page, "")
    action_hints = " ".join(action.label for action in app_context.recent_actions[-5:])
    hints = " ".join(part for part in (page_hint, action_hints) if part)
    return f"{question} Context: {hints}" if hints else question


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


def generate_grounded_answer(
    question: str,
    context: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
) -> str:
    """
    Ask the LLM to answer using only the retrieved RAG context.

    This keeps the model's job narrow: synthesize the provided evidence, avoid
    personalized financial advice, and admit when the context is insufficient.
    """

    client = OpenAI()
    response = client.chat.completions.create(
        model=ANSWER_MODEL,
        temperature=0.2,
        store=False,
        messages=build_answer_messages(
            question,
            context,
            history or [],
            app_context,
        ),
    )

    answer = response.choices[0].message.content
    return (answer or "").strip()


def stream_grounded_answer(
    question: str,
    context: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
) -> Iterator[str]:
    """Yield grounded OpenAI answer tokens as they become available."""

    client = OpenAI()
    response = client.chat.completions.create(
        model=ANSWER_MODEL,
        temperature=0.2,
        store=False,
        messages=build_answer_messages(
            question,
            context,
            history or [],
            app_context,
        ),
        stream=True,
    )

    for chunk in response:
        if not chunk.choices:
            continue
        content = chunk.choices[0].delta.content
        if content:
            yield content


def chunk_static_answer(answer: str, chunk_size: int = 72) -> Iterator[str]:
    """Split deterministic refusals and no-match answers into visible deltas."""

    for start in range(0, len(answer), chunk_size):
        yield answer[start:start + chunk_size]


def stream_financial_advisor_question(
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
    *,
    retrieved_matches: list[dict] | None = None,
) -> Iterator[dict]:
    """Stream ordered status, answer, source, completion, and error events."""

    started_at = time.perf_counter()
    cleaned_question = question.strip()
    yield {
        "event": "status",
        "data": {"status": "searching", "message": "Searching curated sources"},
    }

    if not cleaned_question:
        answer = "Please ask Ember a question before requesting an answer."
        for text in chunk_static_answer(answer):
            yield {"event": "delta", "data": {"text": text}}
        yield {"event": "sources", "data": {"sources": []}}
        yield {"event": "done", "data": {}}
        return

    if is_clearly_out_of_scope(cleaned_question):
        log_rag_event(
            question=cleaned_question,
            matches=[],
            source_count=0,
            outcome="out_of_scope_refusal",
            started_at=started_at,
        )
        for text in chunk_static_answer(OUT_OF_SCOPE_ANSWER):
            yield {"event": "delta", "data": {"text": text}}
        yield {"event": "sources", "data": {"sources": []}}
        yield {"event": "done", "data": {}}
        return

    try:
        matches = (
            retrieved_matches
            if retrieved_matches is not None
            else retrieve_chunks(
                build_contextual_retrieval_question(cleaned_question, app_context)
            )
        )
        if not matches:
            raise RagStoreUnavailableError(
                "The RAG service received no retrieved matches."
            )
    except RagStoreUnavailableError:
        logger.error(
            "rag_knowledge_base_unavailable",
            extra={"question_hash": question_hash(cleaned_question)},
        )
        yield {
            "event": "error",
            "data": {
                "code": "knowledge_base_unavailable",
                "message": "Ember's curated sources are temporarily unavailable.",
                "retryable": True,
                "status": 503,
            },
        }
        return
    except Exception:
        logger.exception(
            "rag_retrieval_failed",
            extra={"question_hash": question_hash(cleaned_question)},
        )
        yield {
            "event": "error",
            "data": {
                "code": "retrieval",
                "message": "Ember could not search the curated sources.",
                "retryable": True,
                "status": 502,
            },
        }
        return
    source_details = build_unique_sources(matches)
    yield {
        "event": "status",
        "data": {"status": "preparing", "message": "Preparing a grounded answer"},
    }

    strongest_similarity = max(match_similarity(match) for match in matches)
    if strongest_similarity < get_rag_min_similarity():
        log_rag_event(
            question=cleaned_question,
            matches=matches,
            source_count=len(source_details),
            outcome="low_confidence_refusal",
            started_at=started_at,
        )
        for text in chunk_static_answer(LOW_CONFIDENCE_ANSWER):
            yield {"event": "delta", "data": {"text": text}}
        yield {"event": "sources", "data": {"sources": []}}
        yield {"event": "done", "data": {}}
        return

    context = format_retrieved_context(matches)
    source_payload = [source.model_dump() for source in source_details]
    if not context:
        answer = "I found matching records, but they did not contain readable context to answer from."
        for text in chunk_static_answer(answer):
            yield {"event": "delta", "data": {"text": text}}
        yield {"event": "sources", "data": {"sources": source_payload}}
        yield {"event": "done", "data": {}}
        return

    answer_parts = []
    bounded_history = select_recent_chat_history(history or [])
    for text in stream_grounded_answer(
        cleaned_question,
        context,
        bounded_history,
        app_context,
    ):
        answer_parts.append(text)
        yield {"event": "delta", "data": {"text": text}}

    if not "".join(answer_parts).strip():
        yield {
            "event": "error",
            "data": {
                "code": "empty_response",
                "message": "Ember returned an empty answer.",
                "retryable": True,
                "status": 204,
            },
        }
        return

    log_rag_event(
        question=cleaned_question,
        matches=matches,
        source_count=len(source_details),
        outcome="answered",
        started_at=started_at,
    )
    yield {"event": "sources", "data": {"sources": source_payload}}
    yield {"event": "done", "data": {}}


def answer_financial_advisor_question(
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
    *,
    retrieved_matches: list[dict] | None = None,
):
    """
    Handle the financial advisor request for the FastAPI route.

    This orchestrates the API-facing RAG flow: validate the question, retrieve
    evidence, generate the answer, and package citations for the frontend.
    """

    started_at = time.perf_counter()
    cleaned_question = question.strip()

    if not cleaned_question:
        log_rag_event(
            question=cleaned_question,
            matches=[],
            source_count=0,
            outcome="empty_question",
            started_at=started_at,
        )
        return AdvisorResponse(
            answer="Please ask Ember a question before requesting an answer.",
            sources=[],
            source_details=[],
        )

    if is_clearly_out_of_scope(cleaned_question):
        log_rag_event(
            question=cleaned_question,
            matches=[],
            source_count=0,
            outcome="out_of_scope_refusal",
            started_at=started_at,
        )
        return AdvisorResponse(
            answer=OUT_OF_SCOPE_ANSWER,
            sources=[],
            source_details=[],
        )

    matches = (
        retrieved_matches
        if retrieved_matches is not None
        else retrieve_chunks(
            build_contextual_retrieval_question(cleaned_question, app_context)
        )
    )

    if not matches:
        raise RagStoreUnavailableError(
            "The RAG service received no retrieved matches."
        )

    strongest_similarity = max(match_similarity(match) for match in matches)
    source_details = build_unique_sources(matches)

    if strongest_similarity < get_rag_min_similarity():
        log_rag_event(
            question=cleaned_question,
            matches=matches,
            source_count=len(source_details),
            outcome="low_confidence_refusal",
            started_at=started_at,
        )
        return AdvisorResponse(
            answer=LOW_CONFIDENCE_ANSWER,
            sources=[],
            source_details=[],
        )

    sources = [format_source_label(source) for source in source_details]
    context = format_retrieved_context(matches)

    if not context:
        log_rag_event(
            question=cleaned_question,
            matches=matches,
            source_count=len(source_details),
            outcome="empty_context",
            started_at=started_at,
        )
        return AdvisorResponse(
            answer=(
                "I found matching records, but they did not contain readable "
                "context to answer from."
            ),
            sources=sources,
            source_details=source_details,
        )

    bounded_history = select_recent_chat_history(history or [])
    answer = generate_grounded_answer(
        cleaned_question,
        context,
        bounded_history,
        app_context,
    )

    log_rag_event(
        question=cleaned_question,
        matches=matches,
        source_count=len(source_details),
        outcome="answered",
        started_at=started_at,
    )

    return AdvisorResponse(
        answer=answer,
        sources=sources,
        source_details=source_details,
    )
