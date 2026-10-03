from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatMessage(BaseModel):
  role: Literal["user", "assistant"]
  content: str = Field(..., min_length=1, max_length=4000)

  @field_validator("content", mode="before")
  @classmethod
  def normalize_content(cls, value):
    """Collapse message whitespace before enforcing content length limits."""

    if isinstance(value, str):
      return " ".join(value.split())
    return value


class AdvisorAppAction(BaseModel):
  model_config = ConfigDict(populate_by_name=True)

  type: Literal["create", "update", "delete", "calculate"]
  label: str = Field(..., min_length=1, max_length=80)
  occurred_at: datetime = Field(..., alias="occurredAt")

  @field_validator("label")
  @classmethod
  def normalize_label(cls, value):
    """Collapse action label whitespace before it enters the model prompt."""

    return " ".join(value.split()) if isinstance(value, str) else value


class AdvisorAppContext(BaseModel):
  model_config = ConfigDict(populate_by_name=True)

  current_page: str = Field(..., alias="currentPage", min_length=1, max_length=60)
  current_path: str = Field(..., alias="currentPath", min_length=1, max_length=100)
  recent_actions: list[AdvisorAppAction] = Field(
    default_factory=list,
    alias="recentActions",
    max_length=5,
  )


MAX_CLIENT_SNAPSHOT_CHARS = 3600


class AdvisorClientSnapshot(BaseModel):
  """A snapshot the device computed and masked itself. Only placeholders and bands should be inside."""

  model_config = ConfigDict(populate_by_name=True)

  effective_date: str = Field(..., alias="effectiveDate", min_length=10, max_length=10)
  facts: dict

  @field_validator("facts")
  @classmethod
  def bound_facts(cls, value: dict):
    """Refuse oversized or non-JSON blocks; the backend never inspects the figures themselves."""

    import json

    if len(json.dumps(value)) > MAX_CLIENT_SNAPSHOT_CHARS:
      raise ValueError("Client snapshot is too large")
    return value


class AdvisorRequest(BaseModel):
  model_config = ConfigDict(populate_by_name=True)

  question: str = Field(..., min_length=1, max_length=2000)
  history: list[ChatMessage] = Field(default_factory=list, max_length=20)
  app_context: AdvisorAppContext | None = Field(default=None, alias="appContext")
  # Set by a device that keeps the records: it scrubbed the text and masked the snapshot itself,
  # so the backend forwards tokens untouched and the device restores the values.
  client_masked: bool = Field(default=False, alias="clientMasked")
  client_snapshot: AdvisorClientSnapshot | None = Field(default=None, alias="clientSnapshot")

  @field_validator("question")
  @classmethod
  def validate_question(cls, v):
    """Trim questions and reject whitespace-only input."""

    if not v or not v.strip():
      raise ValueError("Question cannot be empty")
    return v.strip()


class AdvisorSource(BaseModel):
  title: str | None = None
  url: str | None = None
  path: str | None = None
  headline: str | None = None


class AdvisorDataEvidence(BaseModel):
  tool: Literal[
    "expense_summary",
    "spending_comparison",
    "financial_summary",
    "fire_projection",
    "financial_health_review",
    "figure_lookup",
    "personal_context",
  ]
  label: str
  period: str
  record_count: int | None = None
  destination: str


class AdvisorResponse(BaseModel):
  answer: str
  sources: list[str] = Field(default_factory=list)
  source_details: list[AdvisorSource] = Field(default_factory=list)
  mode: Literal["knowledge", "data", "hybrid", "clarification", "unsupported"] = "knowledge"
  data_evidence: AdvisorDataEvidence | None = None
