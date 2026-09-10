"""Versioned retirement inputs; draft JSON is separate from validated active inputs."""
from typing import Literal
from datetime import date
import json
from pydantic import BaseModel, ConfigDict, Field, model_validator


class RetirementIncome(BaseModel):
    label: str = Field(max_length=80)
    monthlyAmount: float = Field(ge=0, le=99999999)
    startMonth: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    endMonth: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    annualGrowth: float = Field(ge=-0.2, le=0.3)

    @model_validator(mode='after')
    def dates(self):
        """Other income ends exclusively after commencement."""
        if self.endMonth <= self.startMonth:
            raise ValueError('Other income end must follow start')
        return self


class PortfolioOverride(BaseModel):
    amount: float = Field(ge=0, le=99999999)
    date: date


class RetirementPlan(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    version: Literal[2]
    spendingMonth: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    birthMonth: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    retirementMonth: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    endAge: int = Field(ge=50, le=120)
    monthlySpending: float = Field(ge=0, le=99999999)
    monthlyContribution: float = Field(ge=0, le=99999999)
    assetIds: list[str] = Field(max_length=500)
    portfolioOverride: PortfolioOverride | None
    cpfPlan: Literal['unknown', 'standard', 'escalating', 'basic']
    cpfStartAge: int = Field(ge=65, le=70)
    cpfMonthlyPayout: float = Field(ge=0, le=99999999)
    otherIncome: list[RetirementIncome] = Field(max_length=20)
    beforeReturn: float = Field(ge=-0.2, le=0.3)
    afterReturn: float = Field(ge=-0.2, le=0.3)
    inflation: float = Field(ge=0, le=0.2)
    provenance: dict[str, Literal['recorded', 'user-entered', 'assumed']]


class RetirementDraft(BaseModel):
    step: int = Field(ge=0, le=4)
    # Drafts can be incomplete but remain bounded JSON; only active plans calculate.
    inputs: dict

    @model_validator(mode='after')
    def bounded_draft(self):
        """Bound incomplete drafts while keeping partial setup resumable."""
        if len(json.dumps(self.inputs, allow_nan=False)) > 32768:
            raise ValueError('Draft exceeds the supported plan size')
        # Permit blank timeline inputs while retaining a safe, renderable draft shape.
        shape = {**self.inputs}
        for key, placeholder in [('birthMonth', '1900-01'), ('retirementMonth', '2200-01')]:
            if shape.get(key) == '':
                shape[key] = placeholder
        RetirementPlan.model_validate(shape)
        return self


class RetirementOverrides(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    retirementMonth: str | None = Field(default=None, pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    monthlyContribution: float | None = Field(default=None, ge=0, le=99999999)
    monthlySpending: float | None = Field(default=None, ge=0, le=99999999)
    beforeReturn: float | None = Field(default=None, ge=-0.2, le=0.3)
    afterReturn: float | None = Field(default=None, ge=-0.2, le=0.3)
    inflation: float | None = Field(default=None, ge=0, le=0.2)
