"""Translate natural-language Ember questions into one validated read-only plan."""

import os
from datetime import date
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field, model_validator

from lib.clock import singapore_today
from schemas.rag import ChatMessage


PLANNER_MODEL = os.getenv("EMBER_PLANNER_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
EmberMode = Literal["knowledge", "data", "hybrid", "clarification", "unsupported"]
EmberToolName = Literal[
    "expense_summary",
    "spending_comparison",
    "financial_summary",
    "fire_projection",
    "financial_health_review",
]


class EmberPlan(BaseModel):
    """Strict planner output. It intentionally has no SQL or user identifier fields."""

    model_config = ConfigDict(extra="forbid")

    mode: EmberMode
    tool: EmberToolName | None
    start_date: date | None
    end_date: date | None
    comparison_start_date: date | None
    comparison_end_date: date | None
    category_name: str | None = Field(max_length=80)
    requires_explanation: bool
    clarification_question: str | None = Field(max_length=240)

    @model_validator(mode="after")
    def validate_plan(self):
        """Reject contradictory or unbounded plans before any data access occurs."""

        data_modes = {"data", "hybrid"}
        if self.mode in data_modes and self.tool is None:
            raise ValueError("Data plans require an allowlisted tool")
        if self.mode not in data_modes and self.tool is not None:
            raise ValueError("Only data plans may select a tool")
        if self.mode == "clarification" and not self.clarification_question:
            raise ValueError("Clarification plans require a question")
        for start, end in (
            (self.start_date, self.end_date),
            (self.comparison_start_date, self.comparison_end_date),
        ):
            if start and end and start > end:
                raise ValueError("Plan date ranges must be ordered")
            if start and end and (end - start).days > 3660:
                raise ValueError("Plan date ranges cannot exceed ten years")
        return self


class _PlannerOutputBase(BaseModel):
    """Define fields shared by every structured planner response variant."""

    model_config = ConfigDict(extra="forbid")

    start_date: date | None
    end_date: date | None
    comparison_start_date: date | None
    comparison_end_date: date | None
    category_name: str | None = Field(max_length=80)
    requires_explanation: bool
    clarification_question: str | None = Field(max_length=240)


class _KnowledgePlannerOutput(_PlannerOutputBase):
    """Represent a curated-knowledge plan that cannot select a data tool."""

    mode: Literal["knowledge"]
    tool: None


class _DataPlannerOutput(_PlannerOutputBase):
    """Represent a personal-data plan that must select an allowlisted tool."""

    mode: Literal["data", "hybrid"]
    tool: EmberToolName


class _ClarificationPlannerOutput(_PlannerOutputBase):
    """Represent a clarification plan with no access to personal-data tools."""

    mode: Literal["clarification"]
    tool: None
    clarification_question: str = Field(max_length=240)


class _UnsupportedPlannerOutput(_PlannerOutputBase):
    """Represent an unsupported request with no access to personal-data tools."""

    mode: Literal["unsupported"]
    tool: None


class EmberPlannerResponse(BaseModel):
    """Wrap mutually exclusive plan variants in an OpenAI-compatible root object."""

    model_config = ConfigDict(extra="forbid")

    plan: (
        _KnowledgePlannerOutput
        | _DataPlannerOutput
        | _ClarificationPlannerOutput
        | _UnsupportedPlannerOutput
    )


def _format_recent_history(history: list[ChatMessage]) -> str:
    """Provide a small follow-up window without exposing an authenticated user ID."""

    return "\n".join(f"{item.role}: {item.content}" for item in history[-4:]) or "None"


def plan_ember_question(
    question: str,
    history: list[ChatMessage] | None = None,
    *,
    today: date | None = None,
) -> EmberPlan:
    """Use one structured-output call to choose one bounded execution path."""

    current_date = today or singapore_today()
    client = OpenAI()
    completion = client.chat.completions.parse(
        model=PLANNER_MODEL,
        temperature=0,
        store=False,
        response_format=EmberPlannerResponse,
        messages=[
            {
                "role": "system",
                "content": (
                    "You route questions for FireBuddy, a Singapore personal-finance app. "
                    "Return exactly one validated plan in the plan field. Never invent values and "
                    "never request, include, or infer a user identifier. Choose knowledge for general CPF, SRS, "
                    "SSB, IRAS, investing, or FIRE education. Choose data for questions answered "
                    "only from the user's records. Choose hybrid when personal results need general "
                    "educational context. expense_summary totals expenses and category breakdowns "
                    "for a date range. spending_comparison compares two expense periods. "
                    "financial_summary reports net worth and the current monthly pulse. "
                    "fire_projection reports the saved deterministic FIRE calculation. "
                    "financial_health_review reports the deterministic recommended action, cash flow, "
                    "runway, warnings, and anomalies. Resolve relative dates from the supplied date. "
                    "For expense tools, provide start_date and end_date. For comparison, also provide "
                    "comparison dates. Use clarification only when a required period truly cannot be "
                    "inferred. Use unsupported for non-finance or live market-price requests. Set "
                    "requires_explanation false for a simple total or lookup, otherwise true."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Singapore date: {current_date.isoformat()}\n"
                    f"Recent conversation:\n{_format_recent_history(history or [])}\n\n"
                    f"Question:\n{question.strip()}"
                ),
            },
        ],
    )
    response = completion.choices[0].message.parsed
    if response is None:
        raise RuntimeError("Ember planner returned no validated plan")
    return EmberPlan.model_validate(response.plan.model_dump())
