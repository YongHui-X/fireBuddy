from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
  role: Literal["user", "assistant"]
  content: str = Field(..., min_length=1, max_length=4000)


class AdvisorRequest(BaseModel):
  question: str = Field(..., min_length=1, max_length=2000)
  history: list[ChatMessage] = Field(default_factory=list, max_length=20)

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


class AdvisorResponse(BaseModel):
  answer: str
  sources: list[str] = Field(default_factory=list)
  source_details: list[AdvisorSource] = Field(default_factory=list)
