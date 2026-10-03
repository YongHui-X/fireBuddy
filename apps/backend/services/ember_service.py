"""Bounded Ember orchestration across personal data tools and curated RAG.

Every request runs behind the user's AI consent level and a masking session:
the planner and the answer model only ever see a scrubbed question, scrubbed
history and placeholder tokens for the user's figures and names. Real values
are put back into the answer here, before anything is returned or streamed.
"""

from collections.abc import Iterator
import json
import logging

from rag.retrieval import RagStoreUnavailableError, retrieve_chunks
from schemas.profile import AiPreference
from schemas.rag import (
    AdvisorAppContext,
    AdvisorClientSnapshot,
    AdvisorDataEvidence,
    AdvisorResponse,
    ChatMessage,
)
from services.ai_preference import AI_DISABLED_ANSWER, GUIDE_ONLY_DATA_ANSWER, load_ai_preference
from services.ember_data_tools import EmberDataResult, run_ember_data_tool
from services.ember_masking import MAX_MASKED_CONTEXT_CHARS, MaskingSession, load_user_names
from services.ember_personal_context import EmberPersonalContext, build_personal_context
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
    is_clearly_out_of_scope,
    is_insufficient_evidence_answer,
    retrieval_is_confident,
    select_recent_chat_history,
    stream_financial_advisor_question,
)


logger = logging.getLogger(__name__)


def _unsupported_plan() -> EmberPlan:
    """Build the fixed refusal plan used when the keyword screen rejects a question."""

    return EmberPlan(
        mode="unsupported", tool=None, start_date=None, end_date=None,
        comparison_start_date=None, comparison_end_date=None, category_name=None,
        requires_explanation=False, clarification_question=None,
    )


def _plan(
    raw_question: str,
    question: str,
    history: list[ChatMessage],
    session: MaskingSession,
    *,
    allow_personalise: bool,
    client_masked: bool = False,
) -> EmberPlan:
    """
    Screen obvious non-finance and live-price questions before the planner.

    The deterministic screen is free and cannot be talked into a clarification
    or a tool call, so it runs first, on the raw text. The planner only sees the
    scrubbed question and history; any token it echoes back is restored here.
    """

    if is_clearly_out_of_scope(raw_question):
        return _unsupported_plan()
    plan = plan_ember_question(question, history)
    # Tokens echoed by the planner are restored here, unless the device holds the map.
    if not client_masked:
        plan = plan.model_copy(update={
            "category_name": session.unmask(plan.category_name),
            "clarification_question": session.unmask(plan.clarification_question),
        })
    # A device that keeps the records has no rows on the server for a tool to read; its
    # masked snapshot carries the same aggregates, so every question becomes a knowledge answer.
    if client_masked and plan.mode in {"data", "hybrid"} and plan.tool != "figure_lookup":
        plan = plan.model_copy(update={"mode": "knowledge", "tool": None, "figure_key": None, "figure_year": None})
    # A personalised account tailors every knowledge answer to the masked snapshot.
    if plan.mode == "knowledge":
        plan = plan.model_copy(update={"personalise": allow_personalise})
    return plan


def _personal_context(user_id: str, session: MaskingSession) -> EmberPersonalContext | None:
    """Build the user's aggregate snapshot; degrade to plain knowledge on failure or when the masked block is too long."""

    try:
        context = build_personal_context(user_id)
        masked_length = len(json.dumps(session.mask_facts(context.facts)))
        if masked_length > MAX_MASKED_CONTEXT_CHARS:
            raise ValueError(f"Masked personal context is {masked_length} characters; the bound is {MAX_MASKED_CONTEXT_CHARS}")
        return context
    except Exception:
        logger.exception("ember_personal_context_failed")
        return None


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
    session: MaskingSession,
) -> AdvisorResponse:
    """Run one server-selected tool and optionally ask the model to explain its masked aggregates."""

    result = run_ember_data_tool(user_id, plan)
    source_context = ""
    source_details = list(result.sources)
    if plan.mode == "hybrid":
        source_context, hybrid_sources = _retrieve_hybrid_context(
            session.retrieval_text(plan.retrieval_query) or question, app_context
        )
        source_details.extend(hybrid_sources)

    # A hybrid answer always explains when curated context was retrieved; a
    # plain data answer explains only when the planner asked for it. The
    # deterministic sentence never goes to the model, so it needs no masking.
    answer = result.exact_answer
    if plan.requires_explanation or bool(source_context):
        combined_context = result.context(session)
        if source_context:
            combined_context += "\n\nCurated educational context:\n" + source_context
        generated = session.unmask(generate_grounded_answer(
            question,
            combined_context,
            select_recent_chat_history(history),
            app_context,
        ))
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


def _client_context(snapshot: AdvisorClientSnapshot | None) -> EmberPersonalContext | None:
    """Wrap a device-masked snapshot; it is forwarded verbatim and never re-masked."""

    if snapshot is None:
        return None
    return EmberPersonalContext(facts=snapshot.facts, effective_date=snapshot.effective_date)


def _execute_plan(
    user_id: str,
    question: str,
    plan: EmberPlan,
    history: list[ChatMessage],
    app_context: AdvisorAppContext | None,
    session: MaskingSession,
    *,
    client_masked: bool = False,
    client_snapshot: AdvisorClientSnapshot | None = None,
) -> AdvisorResponse:
    """Execute one branch only. There is no iterative or autonomous tool loop."""

    if plan.mode == "knowledge":
        if client_masked:
            personal_context = _client_context(client_snapshot) if plan.personalise else None
        else:
            personal_context = _personal_context(user_id, session) if plan.personalise else None
        return answer_financial_advisor_question(
            question,
            history,
            app_context,
            retrieval_query=session.retrieval_text(plan.retrieval_query or question),
            personal_context=personal_context,
            # With a device-held map the server has nothing to restore; tokens pass through.
            masking=None if client_masked else session,
        )
    if plan.mode == "clarification":
        return AdvisorResponse(
            answer=plan.clarification_question or "Which period would you like me to review?",
            mode="clarification",
        )
    if plan.mode == "unsupported":
        return AdvisorResponse(answer=OUT_OF_SCOPE_ANSWER, mode="unsupported")
    return _execute_data_plan(user_id, question, plan, history, app_context, session)


def _guide_only_refusal(plan: EmberPlan) -> bool:
    """A Guide-level account may not run tools over its own records; public figures are fine."""

    return plan.mode in {"data", "hybrid"} and plan.tool != "figure_lookup"


def _prepare(
    user_id: str,
    question: str,
    history: list[ChatMessage],
    *,
    client_masked: bool = False,
) -> tuple[MaskingSession, str, list[ChatMessage]]:
    """Build the request's masking session and scrub everything the user typed.

    A device that already scrubbed its text is left alone: scrubbing again would mint
    server-side tokens that collide with the device's own numbering.
    """

    if client_masked:
        return MaskingSession(), question.strip(), list(history)
    session = MaskingSession(load_user_names(user_id))
    return session, session.scrub_question(question.strip()), session.scrub_history(history)


def answer_ember_question(
    user_id: str,
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
    *,
    preference: AiPreference | None = None,
    client_masked: bool = False,
    client_snapshot: AdvisorClientSnapshot | None = None,
) -> AdvisorResponse:
    """Check consent, scrub, plan once, then execute one bounded knowledge or data path."""

    level = preference or load_ai_preference(user_id)
    if level == "off":
        return AdvisorResponse(answer=AI_DISABLED_ANSWER, mode="unsupported")

    bounded_history = history or []
    session, scrubbed_question, scrubbed_history = _prepare(user_id, question, bounded_history, client_masked=client_masked)
    plan = _plan(question, scrubbed_question, scrubbed_history, session, allow_personalise=level == "personalised", client_masked=client_masked)
    if level == "guide" and _guide_only_refusal(plan):
        return AdvisorResponse(answer=GUIDE_ONLY_DATA_ANSWER, mode="unsupported")
    return _execute_plan(
        user_id, scrubbed_question, plan, scrubbed_history, app_context, session,
        client_masked=client_masked, client_snapshot=client_snapshot if level == "personalised" else None,
    )


def _static_stream(answer: str) -> Iterator[dict]:
    for text in chunk_static_answer(answer):
        yield {"event": "delta", "data": {"text": text}}
    yield {"event": "sources", "data": {"sources": []}}
    yield {"event": "done", "data": {}}


def stream_ember_question(
    user_id: str,
    question: str,
    history: list[ChatMessage] | None = None,
    app_context: AdvisorAppContext | None = None,
    *,
    preference: AiPreference | None = None,
    client_masked: bool = False,
    client_snapshot: AdvisorClientSnapshot | None = None,
) -> Iterator[dict]:
    """Stream planner status and the single selected execution path as typed SSE events."""

    bounded_history = history or []
    yield {
        "event": "status",
        "data": {"status": "searching", "message": "Understanding your question"},
    }
    level = preference or load_ai_preference(user_id)
    if level == "off":
        yield from _static_stream(AI_DISABLED_ANSWER)
        return

    session, scrubbed_question, scrubbed_history = _prepare(user_id, question, bounded_history, client_masked=client_masked)
    plan = _plan(question, scrubbed_question, scrubbed_history, session, allow_personalise=level == "personalised", client_masked=client_masked)
    if level == "guide" and _guide_only_refusal(plan):
        yield from _static_stream(GUIDE_ONLY_DATA_ANSWER)
        return
    snapshot = client_snapshot if level == "personalised" else None

    if plan.mode == "knowledge":
        personal_context = None
        if plan.personalise:
            yield {
                "event": "status",
                "data": {"status": "preparing", "message": "Reading your FireBuddy data"},
            }
            personal_context = _client_context(snapshot) if client_masked else _personal_context(user_id, session)
        yield from stream_financial_advisor_question(
            scrubbed_question,
            scrubbed_history,
            app_context,
            retrieval_query=session.retrieval_text(plan.retrieval_query or scrubbed_question),
            personal_context=personal_context,
            masking=None if client_masked else session,
        )
        return

    yield {
        "event": "status",
        "data": {
            "status": "preparing",
            "message": "Reading your FireBuddy data" if plan.mode in {"data", "hybrid"} else "Preparing an answer",
        },
    }
    response = _execute_plan(
        user_id, scrubbed_question, plan, scrubbed_history, app_context, session,
        client_masked=client_masked, client_snapshot=snapshot,
    )
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
