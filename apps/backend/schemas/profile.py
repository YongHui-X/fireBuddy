from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


AiPreference = Literal["off", "guide", "personalised"]


class ProfileModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ProfileResponse(ProfileModel):
    id: str
    email: str
    ai_preference: AiPreference = "off"
    ai_consented_at: datetime | None = None


class AiPreferenceUpdate(ProfileModel):
    ai_preference: AiPreference
