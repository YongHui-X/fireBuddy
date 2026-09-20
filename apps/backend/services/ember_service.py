"""Bounded Ember orchestration across personal data tools and curated RAG."""

from collections.abc import Iterator
import logging
import os

from rag.retrieval import RagStoreUnavailableError, retrieve_chunks
from schemas.rag import (
    AdvisorAppContext,
    AdvisorDataEvidence,
    AdvisorResponse,
    ChatMessage,
)
from services.ember_data_tools import EmberDataResult, run_ember_data_tool
from services.ember_personal_context import EmberPersonalContext, build_personal_context
from services.ember_planner import EmberPlan, plan_ember_question, should_personalise
from services.rag_service import (
    OUT_OF_SCOPE_ANSWER,
    answer_financial_advisor_question,
    build_contextual_retrieval_question,
    build_unique_sources,
    chunk_static_answer,
    format_retrieved_context,
    format_source_label,
    generate_grounded_answer,
    is_clearly_out_of_scope,
    is_insufficient_evidence_answer,
    retrieval_is_confident,
    select_recent_chat_history,
    stream_financial_advisor_question,
)


def _unsupported_plan() -> EmberPlan:
    """Build the fixed refusal plan used when the keyword screen rejects a question."""

    return EmberPlan(
        mode="unsupported", tool=None, start_date=None, end_date=None,
        comparison_start_date=None, comparison_end_date=None, category_name=None,
        requires_explanation=False, clarification_question=None,
    )


def _plan(question: str, history: list[ChatMessage]) -> EmberPlan:
    """
    Screen obvious non-finance and live-price questions before the planner.

    The deterministic screen is free and cannot be talked into a clarification
    or a tool call, so it runs first. Everything else goes to the planner.
    """

    if is_clearly_out_of_scope(question):
        return _unsupported_plan()
    plan = plan_ember_question(question, history)
    if plan.mode == "knowledge" and not plan.personalise and (
        PERSONALISE_MODE == "always" or should_personalise(question)
    ):
        plan = plan.model_copy(update={"personalise": True})
    return plan


def _personal_context(user_id: str) -> EmberPersonalContext | None:
    """Build the user's aggregate snapshot; degrade to plain knowledge on failure."""

    try:
        return build_personal_context(user_id)
    except Exception:
        logger.exception("ember_personal_context_failed")
        return None


logger = logging.getLogger(__name__)

# "always": every knowledge answer is tailored to the user's aggregate snapshot.
# "auto": only when the planner or the keyword fallback asks for it.
PERSONALISE_MODE = (os.getenv("EMBER_PERSONALISE_MODE", "always").strip().lower() or "always")


def _evidence(result: EmberDataResult) -> AdvisorDataEvidence:
    """Expose calculation provenance without leaking raw financial records."""

    return AdvisorDataEvidence(
        tool=result.tool,
        label=result.label,
        period=result.period,
        record_count=result.record_count,
        destination=result.destination,
    )


def _retrieve_hybrid_context(question: str, app_context: AdvisorAppContext | None) -> tuple[str, list]:
    """Retrieve optional educational evidence while preserving a valid data answer on RAG failure."""

    try:
        matches = retrieve_chunks(build_contextual_retrieval_question(question, app_context))
    except RagStoreUnavailableError:
        return "", []
    except Exception:
        logger.exception("ember_hybrid_retrieval_failed")
        return "", []
    if not retrieval_is_confident(matches):
        return "", []
    return format_retrieved_context(matches), build_unique_sources(matches)


def _execute_data_plan(
    user_id: str,
    question: str,
    plan: EmberPlan,
    history: list[ChatMessage],
    app_context: AdvisorAppContext | None,
) -> AdvisorResponse:
    """Run one server-selected tool and optionally ask the model to explain its aggregates."""

    result = run_ember_data_tool(user_id, plan)
    source_context = ""
    source_details = list(result.sources)
    if plan.mode == "hybrid":
        source_context, hybrid_sources = _retrieve_hybrid_context(
            plan.retrieval_query or question, app_context
        )
        source_details.extend(hybrid_sources)

    # A hybrid answer always explains when curated context was retrieved; a
    # plain data answer explains only when the planner asked for it.
    answer = result.exact_answer
    if plan.requires_explanation or bool(source_context):
        combined_context = result.context()
        if source_context:
            combined_context += "\n\nCurated educational context:\n" + source_context
        generated = generate_grounded_answer(
            question,
            combined_context,
            select_recent_chat_history(history),
            app_context,
        )
        # The deterministic sentence is the authoritative answer for a data
        # plan. The model only adds explanation; if it declines with the
        # insufficient-evidence sentinel, the exact answer stands.
        if generated and not is_insufficient_evidence_answer(generated):
            answer = generated

    return AdvisorResponse(
        answer=answer,
        sources=[format_source_label(source) for source in source_details],
        source_details=source_details,
        mode=plan.mode,
        data_evidence=_evidence(result),
    )


def _execute_plan(
    user_id: str,
    question: str,
    plan: EmberPlan,
    history: list[ChatMessage],
    app_context: AdvisorAppContext | None,
) -> AdvisorResponse:
    """Execute one branch only. There is no iterative or autonomous tool loop."""

    if plan.mode == "knowledge":
        return answer_financial_advisor_question(
            question,
            history,
            app_context,
            retrieval_query=plan.retrieval_query,
            personal_context=_personal_context(user_id) if plan.personalise else None,
        )
    if plan.mode == "clarification":
        return AdvisorResponse(
            answer=plan.clarification_question or "Which period would you like me to review?",
            mode="clarification",
        )
    if plan.mode == "unsupported":
        return AdvisorResponse(answer=OUT_OF_SCOPE_ANSWER, mode="unsupported")
    return _execute_data_plan(user_id, question, plan, history, app_context)


def answer_ember_question(
    user_id: str,
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
) -> AdvisorResponse:
    """Plan once, then execute one bounded knowledge or data path."""

    bounded_history = history or []
    plan = _plan(question, bounded_history)
    return _execute_plan(user_id, question.strip(), plan, bounded_history, app_context)


def stream_ember_question(
    user_id: str,
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
) -> Iterator[dict]:
    """Stream planner status and the single selected execution path as typed SSE events."""

    bounded_history = history or []
    yield {
        "event": "status",
        "data": {"status": "searching", "message": "Understanding your question"},
    }
    plan = _plan(question, bounded_history)
    if plan.mode == "knowledge":
        personal_context = None
        if plan.personalise:
            yield {
                "event": "status",
                "data": {"status": "preparing", "message": "Reading your FireBuddy data"},
            }
            personal_context = _personal_context(user_id)
        yield from stream_financial_advisor_question(
            question,
            bounded_history,
            app_context,
            retrieval_query=plan.retrieval_query,
            personal_context=personal_context,
        )
        return

    yield {
        "event": "status",
        "data": {
            "status": "preparing",
            "message": "Reading your FireBuddy data" if plan.mode in {"data", "hybrid"} else "Preparing an answer",
        },
    }
    response = _execute_plan(user_id, question.strip(), plan, bounded_history, app_context)
    for text in chunk_static_answer(response.answer):
        yield {"event": "delta", "data": {"text": text}}
    if response.data_evidence is not None:
        yield {
            "event": "evidence",
            "data": {
                "mode": response.mode,
                "dataEvidence": response.data_evidence.model_dump(),
            },
        }
    yield {
        "event": "sources",
        "data": {"sources": [source.model_dump() for source in response.source_details]},
    }
    yield {"event": "done", "data": {}}
