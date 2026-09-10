"""Bounded Ember orchestration across personal data tools and curated RAG."""

from collections.abc import Iterator
import logging

from rag.retrieval import RagStoreUnavailableError, retrieve_chunks
from schemas.rag import (
    AdvisorAppContext,
    AdvisorDataEvidence,
    AdvisorResponse,
    ChatMessage,
)
from services.ember_data_tools import EmberDataResult, run_ember_data_tool
from services.ember_planner import EmberPlan, plan_ember_question
from services.rag_service import (
    OUT_OF_SCOPE_ANSWER,
    answer_financial_advisor_question,
    build_contextual_retrieval_question,
    build_unique_sources,
    chunk_static_answer,
    format_retrieved_context,
    format_source_label,
    generate_grounded_answer,
    get_rag_min_similarity,
    match_similarity,
    select_recent_chat_history,
    stream_financial_advisor_question,
)


logger = logging.getLogger(__name__)


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
    if not matches or max(match_similarity(match) for match in matches) < get_rag_min_similarity():
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
    source_details = []
    if plan.mode == "hybrid":
        source_context, source_details = _retrieve_hybrid_context(question, app_context)

    answer = result.exact_answer
    if plan.requires_explanation:
        combined_context = result.context()
        if source_context:
            combined_context += "\n\nCurated educational context:\n" + source_context
        generated = generate_grounded_answer(
            question,
            combined_context,
            select_recent_chat_history(history),
            app_context,
        )
        if generated:
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
        return answer_financial_advisor_question(question, history, app_context)
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
    plan = plan_ember_question(question, bounded_history)
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
    plan = plan_ember_question(question, bounded_history)
    if plan.mode == "knowledge":
        yield from stream_financial_advisor_question(question, bounded_history, app_context)
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
