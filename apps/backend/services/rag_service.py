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
import re
import time
from collections.abc import Iterator
from datetime import date
from typing import TYPE_CHECKING

from openai import OpenAI

from config import settings
from lib.clock import singapore_today
from rag.retrieval import RagStoreUnavailableError, retrieve_chunks
from schemas.rag import AdvisorAppContext, AdvisorResponse, AdvisorSource, ChatMessage
from services.advice_boundary import ADVICE_BOUNDARY_GUIDANCE
from services.source_metadata import source_as_of

if TYPE_CHECKING:  # pragma: no cover - typing only, keeps this module free of Supabase imports
    from services.ember_masking import MaskingSession
    from services.ember_personal_context import EmberPersonalContext


ANSWER_MODEL = os.getenv("RAG_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
DEFAULT_RAG_MIN_SIMILARITY = 0.45
# A chunk that ranked in both the keyword and the vector candidate lists is
# accepted at a lower cosine floor, because two independent signals agreeing
# is stronger evidence than one cosine value from a compressed-range embedding.
DEFAULT_RAG_MIN_SIMILARITY_WITH_KEYWORD = 0.35
# The RPC returns the best chunk and one stitched sibling whole (up to 2,200
# characters each), so the service cap must not cut either.
MAX_CONTEXT_CHARS_PER_CHUNK = 4500
MAX_HISTORY_MESSAGES = 6
# Only short, deictic questions ("What should I review here?") get page hints
# appended for retrieval. Longer questions carry their own topic and the hint
# would only skew them toward the FIRE documents.
MAX_WORDS_FOR_PAGE_HINTS = 6
# Sentinel the answer model must emit, verbatim and alone, when the retrieved
# evidence does not answer the question. Cosine similarity cannot tell an
# in-scope topic that is absent from the corpus (GST rate, HDB grants) from
# one that is present, so the model is the last line of the refusal path and
# a fixed sentence keeps that refusal detectable by the API and the evals.
INSUFFICIENT_EVIDENCE_SENTINEL = (
    "I do not have enough reliable context in the FireBuddy knowledge base "
    "to answer that."
)
LOW_CONFIDENCE_ANSWER = (
    INSUFFICIENT_EVIDENCE_SENTINEL
    + " Try asking about CPF, Singapore Savings Bonds, "
    "MoneySense planning guides, IRAS reliefs, FIRE planning, or Singapore "
    "investing basics."
)
OUT_OF_SCOPE_ANSWER = (
    "DouDou can only help with the Singapore personal-finance topics covered by "
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


PERSONALISED_ANSWER_GUIDANCE = (
    "The evidence context ends with a trusted FireBuddy data block holding this "
    "user's current recorded aggregates: monthly pulse, savings rate, emergency "
    "runway, net worth, FIRE progress, FireBuddy's recommended next action, derived "
    "guideline targets, and a spending block with this month's and last month's "
    "totals and top categories, plus any other months the user named under "
    "otherMonths. The block also holds ready-made answers that FireBuddy computed: "
    "spending.comparison (this month so far against last month, with direction and "
    "difference, overall and for each top category with lastMonthAmount), each top "
    "category's share of the month, assetTotal, debtToIncome, and in fire the "
    "fundingGap (the shortfall at the planned retirement date), gapFromTodayAssets "
    "(the target minus today's investable assets), progressToday (today's investable "
    "assets as a share of the target) and "
    "projectedShareOfTargetAtRetirement (the projected portfolio at retirement as a "
    "share of the target, not progress today). Quote these figures and their direction "
    "words instead of combining figures yourself; if a question needs a figure the "
    "block does not hold, say FireBuddy did not share it rather than estimate. Write "
    "each figure as if it were the number itself: never mention placeholders, tokens "
    "or masking, never write field names such as debtToIncome, and never say a "
    "figure is 'represented by' anything. Every "
    "figure in that block is a placeholder like "
    "{{M1}} followed by a rough range. The ranges are for your reasoning only: never "
    "write a range such as 50k-100k or 'falls within the range of' in the answer. "
    "Write dates and periods in words, such as '1 to 4 October 2026', never as "
    "2026-10-01. If the user asks about a month or period the block does not hold, "
    "say FireBuddy shared figures only for the months listed and name them, instead "
    "of answering a different period. Tailor every answer to the user's situation; "
    "when the question is about the user's own plan, savings or spending, open with at "
    "least one relevant placeholder from the block: "
    "state the guideline from the curated sources, then apply it by quoting the "
    "relevant placeholders verbatim and by comparing the bracketed ranges with the "
    "guideline in words, for example 'your runway of {{N1}} is below the three to six "
    "months MoneySense suggests' when the range makes that clear; if the range "
    "straddles the guideline, say the records are close to it rather than above or "
    "below. State such comparisons literally and do not add verdicts the curated "
    "sources do not make, such as 'more than sufficient', 'healthy' or 'within a "
    "reasonable range'. If the user's figure is measured on a different basis from "
    "the guideline, say so in one sentence: the emergency runway is based on essential "
    "spending, while MoneySense counts all monthly expenses, including loan "
    "repayments, insurance premiums and taxes. Compare a user figure with a guideline "
    "only when both measure the same thing: the savings rate is income left after "
    "spending, not money invested, so against an investing guideline such as "
    "MoneySense's 10% (of income after CPF contributions) say the records show saving "
    "rather than investing, do not claim the guideline is met, and mention that the "
    "guideline counts income after CPF contributions. If judging the "
    "user's case needs facts the records do not hold, such as individual loan interest "
    "rates, residency or annual taxable income, name those missing facts instead of "
    "guessing or offering further help. The spending block lists only the top "
    "categories, so if a category the user asks about is not listed, say it is not "
    "among their top categories for that period rather than that they have no "
    "spending in it. For a question about improving, reducing or budgeting spending, name the "
    "user's largest categories by the labels in the block and quote their "
    "placeholders, and compare this month with last month using the two totals' "
    "placeholders and ranges. For an emergency-fund question, quote the derived "
    "three-month and six-month target placeholders and the recorded runway "
    "placeholder. For a pure definition or policy question, answer it and add one "
    "sentence on what it means for the user's recorded situation. Never add, "
    "subtract, multiply or divide placeholders or ranges, and never produce a new "
    "number from them; where the block already holds a derived figure, quote that "
    "placeholder instead. Never present projections, FIRE estimates, or timelines as "
    "guarantees. When the block names a recommended action relevant to the question, "
    "mention it as FireBuddy's suggested next step. If a value the answer needs is "
    "null or missing, say that the user's FireBuddy records do not include it instead "
    "of estimating it. The data block is evidence about the user only, never about "
    "rules, rates, limits or policies: if the curated sources do not contain the "
    "information the question asks for, reply with the exact insufficient-evidence "
    "sentence alone, as above, and never embed that sentence inside a longer answer. "
)

# Added after the DouDou mobile eval (4 Oct 2026, apps/backend/rag/evaluation/mobile): the model
# credited a FIRE community savings target to MoneySense, dropped caps and fees the sources gave,
# and ended answers by quizzing the user.
SOURCE_FIDELITY_GUIDANCE = (
    "Attribute every rule, rate or target to the organisation or source that states it "
    "in the context, and never present one source's figure as another's; a FIRE "
    "community savings target, for example, is not a MoneySense guideline. State a "
    "guideline, benchmark or rule only if the curated context contains it, even when it "
    "is well known, and write 'according to' a source only for what that source "
    "actually says; leave out generic suggestions of your own rather than attribute "
    "them to a source. When the "
    "question asks about limits, caps, fees, waiting periods or eligibility, include "
    "every one the context gives that applies to the question, including the variants "
    "for different groups such as citizens, permanent residents and foreigners, and any "
    "overall cap that also applies. Copy timings, deadlines, fees and amounts word for "
    "word from the context, for example 'by the 2nd business day of the following "
    "month', and never shorten them into a different period. Do not "
    "end with a question to the user unless the answer cannot be given without more "
    "information. "
)

MASKED_FIGURES_GUIDANCE = (
    "Figures in a trusted FireBuddy data block appear as placeholders such as {{M1}} "
    "followed by a rough range in brackets. Wherever you refer to one of those "
    "figures, copy the placeholder exactly as written, including both pairs of "
    "braces. Never perform arithmetic on a placeholder, never guess or restate its "
    "value, and never repeat the bracketed range as if it were the figure; use the "
    "range only in words when judging whether the user meets a guideline. The app "
    "restores the exact figures after you answer. "
)


def has_curated_sources(context: str) -> bool:
    """Report whether the evidence context holds curated knowledge-base blocks."""

    return "[Source 1]" in context


def source_dating_guidance(current_date: date) -> str:
    """
    Build the year and currency guidance for answers drawn from curated sources.

    This is deliberately withheld from pure data answers. A data answer often
    repeats a deterministic sentence the backend already computed, and there are
    no dated sources to reason about; adding year guidance there made the model
    elaborate and hedge instead, which the personal evaluation caught.
    """

    return (
        f"Today is {current_date.isoformat()}. When the evidence gives "
        "values for several years, answer with the current year's value "
        "unless the question names another year. Name the year a value "
        "applies to only when the evidence itself ties it to that year; "
        "when the evidence states a different basis, such as figures "
        "computed as of an earlier year or for a future cohort, report "
        "that basis in the source's own terms and never restate it as "
        "the current year. Each source block carries an 'As of' date "
        "recording when it was last reviewed or published; when two "
        "sources disagree on a figure, use the one with the later date. "
    )


def build_answer_messages(
    question: str,
    context: str,
    history: list[ChatMessage],
    app_context: AdvisorAppContext | None = None,
    *,
    personalised: bool = False,
    today: date | None = None,
) -> list[dict]:
    """Build the single grounded prompt shared by JSON and streaming answers."""

    current_date = today or singapore_today()
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
                "You are DouDou, FireBuddy's educational Singapore finance guide. "
                "Answer only using the supplied evidence context. It may contain "
                "trusted FireBuddy aggregates calculated by the backend, curated "
                "educational sources, or both. If the evidence context does "
                "not contain the information needed to answer the question, "
                "reply with exactly this sentence and nothing else: "
                f'"{INSUFFICIENT_EVIDENCE_SENTINEL}" Do '
                "not invent facts, URLs, rates, dates, or source names. "
                "Preserve numeric values and formulas exactly as they "
                "appear in the context, and read each table value from its "
                "own row and column. Answer only the breakdowns the question "
                "asks for. "
                + SOURCE_FIDELITY_GUIDANCE
                + MASKED_FIGURES_GUIDANCE
                + (source_dating_guidance(current_date) if has_curated_sources(context) else "")
                + "You may explain the user's supplied FireBuddy aggregates, but do "
                "not recommend specific financial products or present projections "
                "as guarantees. "
                + ADVICE_BOUNDARY_GUIDANCE
                + "Do not include "
                "source numbers in the answer; citations are returned "
                "separately by the API. Interface context contains only "
                "page and generic activity labels. Use it to tailor emphasis, "
                "but never claim that interface activity is financial evidence. "
                "Only a clearly labelled trusted FireBuddy data block may support "
                "claims about the user's records. "
                + (PERSONALISED_ANSWER_GUIDANCE if personalised else "")
                + region_guidance(app_context)
            ),
        },
        {
            "role": "user",
            "content": (
                history_block
                + app_context_block
                + f"Question:\n{question}\n\n"
                + f"Evidence context:\n{context}\n\n"
                + "Write a concise answer without source-number citations. Format it as "
                "short paragraphs and plain bullet points that start with \"- \". Do not "
                "use numbered lists, bold, italics, headings, or any other Markdown "
                "markup; the interface renders plain text."
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


def get_rag_min_similarity_with_keyword() -> float:
    """Read the lower cosine floor applied when keyword search also matched."""

    raw_value = os.getenv("RAG_MIN_SIMILARITY_WITH_KEYWORD", "").strip()
    if not raw_value:
        return DEFAULT_RAG_MIN_SIMILARITY_WITH_KEYWORD
    try:
        return float(raw_value)
    except ValueError:
        return DEFAULT_RAG_MIN_SIMILARITY_WITH_KEYWORD


_BAND_RE = re.compile(r"\s*\((?:range|approx\.?|about)[^)]*\)", re.IGNORECASE)


def personal_data_block(text: str, data_only: bool) -> str:
    """
    The user's data block as the model sees it. Rough ranges exist so a figure can be compared
    with a guideline; a pure data answer has no guideline, and the model then tends to quote the
    ranges back ("falls within the range of 50k-100k"), so they are left out there.
    """

    return _BAND_RE.sub("", text) if data_only else text


def join_personal_context(curated: str, personal: str) -> str:
    """Append the user's data block to the curated context; with no curated context, it stands alone."""

    return f"{curated}\n\n---\n\n{personal}" if curated else personal


def is_insufficient_evidence_answer(answer: str) -> bool:
    """Detect the model's verbatim refusal sentinel (allowing trailing whitespace or quotes)."""

    normalized = " ".join(answer.strip().strip('"').split()).lower()
    return normalized.startswith(INSUFFICIENT_EVIDENCE_SENTINEL.lower())


def match_signal_count(match: dict) -> int:
    """Return how many retrieval signals (keyword, vector) ranked this chunk."""

    try:
        return int(match.get("signal_count") or 1)
    except (TypeError, ValueError):
        return 1


def retrieval_is_confident(matches: list[dict]) -> bool:
    """
    Decide whether retrieved evidence is strong enough to answer from.

    The hybrid RPC orders rows by fused rank, so the top row can be a keyword
    winner with a modest cosine. Evidence is accepted when any match clears the
    cosine threshold, or when a match found by both signals clears the lower
    keyword-backed floor. Rows without `signal_count` fall back to cosine only.
    """

    if not matches:
        return False
    min_similarity = get_rag_min_similarity()
    keyword_floor = get_rag_min_similarity_with_keyword()
    for match in matches:
        similarity = match_similarity(match)
        if similarity >= min_similarity:
            return True
        if match_signal_count(match) >= 2 and similarity >= keyword_floor:
            return True
    return False


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


def region_guidance(app_context: AdvisorAppContext | None) -> str:
    """Extra rules for a user outside Singapore; empty for Singapore or an unknown country."""

    country = app_context.country if app_context is not None else None
    if not country or country == "SG":
        return ""
    return (
        f"The user lives outside Singapore (country code {country}). FireBuddy's curated sources "
        "are Singapore-focused, so answer from general personal finance principles: budgeting, "
        "saving, emergency funds, debt, investing basics and FIRE. Never apply CPF, SRS, CPF LIFE, "
        "HDB or other Singapore-only rules, rates or schemes to them, and when a source is "
        "Singapore-specific, say so briefly and do not present it as applying to them. Do not "
        "assume Singapore dollars. "
    )


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

    if app_context is None or len(question.split()) > MAX_WORDS_FOR_PAGE_HINTS:
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
    citations or URLs. The `As of` line carries the document's review or
    publication date from `source-metadata.json`, which is how the model tells
    a current source from a stale one when two of them disagree.
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
                    f"As of: {source_as_of(match.get('source_path')) or 'Date unknown'}",
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
    *,
    personalised: bool = False,
) -> str:
    """
    Ask the LLM to answer using only the retrieved RAG context.

    This keeps the model's job narrow: synthesize the provided evidence, avoid
    personalized financial advice, and admit when the context is insufficient.
    """

    client = OpenAI(**settings.openai_client_options)
    response = client.chat.completions.create(
        model=ANSWER_MODEL,
        temperature=0.2,
        store=False,
        messages=build_answer_messages(
            question,
            context,
            history or [],
            app_context,
            personalised=personalised,
        ),
    )

    answer = response.choices[0].message.content
    return (answer or "").strip()


def stream_grounded_answer(
    question: str,
    context: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
    *,
    personalised: bool = False,
) -> Iterator[str]:
    """Yield grounded OpenAI answer tokens as they become available."""

    client = OpenAI(**settings.openai_client_options)
    response = client.chat.completions.create(
        model=ANSWER_MODEL,
        temperature=0.2,
        store=False,
        messages=build_answer_messages(
            question,
            context,
            history or [],
            app_context,
            personalised=personalised,
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
    skip_retrieval: bool = False,
    retrieval_query: str | None = None,
    personal_context: "EmberPersonalContext | None" = None,
    masking: "MaskingSession | None" = None,
) -> Iterator[dict]:
    """
    Stream ordered status, answer, source, completion, and error events.

    `retrieval_query` is the planner's standalone rewrite of the question with
    conversation references resolved. When supplied it drives retrieval while
    the original question still drives the answer. `personal_context` is the
    user's bounded aggregate snapshot; when present the answer is tailored to
    it and an `evidence` event is emitted before the sources. `masking` turns
    the snapshot into placeholders for the model and restores the real values
    in each delta before it is emitted.
    """

    started_at = time.perf_counter()
    cleaned_question = question.strip()
    search_question = (retrieval_query or "").strip() or cleaned_question
    yield {
        "event": "status",
        "data": {"status": "searching", "message": "Searching curated sources"},
    }

    if not cleaned_question:
        answer = "Please ask DouDou a question before requesting an answer."
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
        # A question purely about the user's own figures needs no article search.
        matches = [] if skip_retrieval else (
            retrieved_matches
            if retrieved_matches is not None
            else retrieve_chunks(
                build_contextual_retrieval_question(search_question, app_context)
            )
        )
        if not matches and not skip_retrieval:
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
                "message": "DouDou's curated sources are temporarily unavailable.",
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
                "message": "DouDou could not search the curated sources.",
                "retryable": True,
                "status": 502,
            },
        }
        return
    source_details = build_unique_sources(matches)
    yield {
        "event": "status",
        "data": {"status": "preparing", "message": "Writing your answer"},
    }

    confident = retrieval_is_confident(matches)
    if not confident and personal_context is None:
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

    if not confident:
        # Weak retrieval with the user's figures attached: answer from the data block alone,
        # citing no sources (same rule as answer_financial_advisor_question).
        source_details = []
    context = format_retrieved_context(matches) if confident else ""
    source_payload = [source.model_dump() for source in source_details]
    if confident and not context:
        answer = "I found matching records, but they did not contain readable context to answer from."
        for text in chunk_static_answer(answer):
            yield {"event": "delta", "data": {"text": text}}
        yield {"event": "sources", "data": {"sources": source_payload}}
        yield {"event": "done", "data": {}}
        return

    if personal_context is not None:
        context = join_personal_context(context, personal_data_block(personal_context.context(masking), skip_retrieval))

    # A placeholder can arrive split across deltas; the un-masker holds the
    # partial token back so the client only ever sees restored text.
    unmasker = masking.unmasker() if masking is not None else None
    answer_parts = []
    bounded_history = select_recent_chat_history(history or [])
    for text in stream_grounded_answer(
        cleaned_question,
        context,
        bounded_history,
        app_context,
        personalised=personal_context is not None,
    ):
        visible = unmasker.feed(text) if unmasker is not None else text
        if not visible:
            continue
        answer_parts.append(visible)
        yield {"event": "delta", "data": {"text": visible}}
    if unmasker is not None:
        tail = unmasker.flush()
        if tail:
            answer_parts.append(tail)
            yield {"event": "delta", "data": {"text": tail}}

    full_answer = "".join(answer_parts)
    if not full_answer.strip():
        yield {
            "event": "error",
            "data": {
                "code": "empty_response",
                "message": "DouDou returned an empty answer.",
                "retryable": True,
                "status": 204,
            },
        }
        return

    # The sentinel has already been streamed as the visible answer; a refusal
    # must not carry citations, so the sources event is emptied.
    refused = is_insufficient_evidence_answer(full_answer)
    log_rag_event(
        question=cleaned_question,
        matches=matches,
        source_count=0 if refused else len(source_details),
        outcome="model_insufficient_evidence" if refused else "answered",
        started_at=started_at,
    )
    if personal_context is not None and not refused:
        yield {
            "event": "evidence",
            "data": {
                "mode": "hybrid",
                "dataEvidence": personal_context.evidence().model_dump(),
            },
        }
    yield {"event": "sources", "data": {"sources": [] if refused else source_payload}}
    yield {"event": "done", "data": {}}


def answer_financial_advisor_question(
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
    *,
    retrieved_matches: list[dict] | None = None,
    skip_retrieval: bool = False,
    retrieval_query: str | None = None,
    personal_context: "EmberPersonalContext | None" = None,
    masking: "MaskingSession | None" = None,
):
    """
    Handle the financial advisor request for the FastAPI route.

    This orchestrates the API-facing RAG flow: validate the question, retrieve
    evidence, generate the answer, and package citations for the frontend.
    `retrieval_query` optionally replaces the raw question for retrieval only.
    `personal_context` appends the user's bounded aggregate snapshot to the
    evidence, which makes the answer mode `hybrid` with a data-evidence entry.
    `masking` turns that snapshot into placeholders and restores the real
    values in the finished answer.
    """

    started_at = time.perf_counter()
    cleaned_question = question.strip()
    search_question = (retrieval_query or "").strip() or cleaned_question

    if not cleaned_question:
        log_rag_event(
            question=cleaned_question,
            matches=[],
            source_count=0,
            outcome="empty_question",
            started_at=started_at,
        )
        return AdvisorResponse(
            answer="Please ask DouDou a question before requesting an answer.",
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

    # A question purely about the user's own figures needs no article search.
    matches = [] if skip_retrieval else (
        retrieved_matches
        if retrieved_matches is not None
        else retrieve_chunks(
            build_contextual_retrieval_question(search_question, app_context)
        )
    )

    if not matches and not skip_retrieval:
        raise RagStoreUnavailableError(
            "The RAG service received no retrieved matches."
        )

    source_details = build_unique_sources(matches)
    confident = retrieval_is_confident(matches)

    if not confident and personal_context is None:
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

    if not confident:
        # Weak retrieval, but the user's own figures are attached ("How much debt do I have?").
        # Answer from the data block alone, citing no sources; the system prompt still
        # makes the model refuse when the question needs a rule or rate the sources lack.
        source_details = []
    sources = [format_source_label(source) for source in source_details]
    context = format_retrieved_context(matches) if confident else ""

    if confident and not context:
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

    if personal_context is not None:
        context = join_personal_context(context, personal_data_block(personal_context.context(masking), skip_retrieval))

    bounded_history = select_recent_chat_history(history or [])
    answer = generate_grounded_answer(
        cleaned_question,
        context,
        bounded_history,
        app_context,
        personalised=personal_context is not None,
    )
    if masking is not None:
        answer = masking.unmask(answer) or ""

    if is_insufficient_evidence_answer(answer):
        log_rag_event(
            question=cleaned_question,
            matches=matches,
            source_count=0,
            outcome="model_insufficient_evidence",
            started_at=started_at,
        )
        return AdvisorResponse(
            answer=LOW_CONFIDENCE_ANSWER,
            sources=[],
            source_details=[],
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
        mode="hybrid" if personal_context is not None else "knowledge",
        data_evidence=personal_context.evidence() if personal_context is not None else None,
    )
