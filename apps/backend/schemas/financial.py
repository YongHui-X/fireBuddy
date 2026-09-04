from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


Money = Annotated[Decimal, Field(max_digits=10, decimal_places=2)]
PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)]
Rate = Annotated[Decimal, Field(max_digits=8, decimal_places=6)]


def singapore_today() -> date:
    """Apply Singapore calendar boundaries to user-entered financial facts."""

    return datetime.now(ZoneInfo("Asia/Singapore")).date()


class FinancialModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CreateWealthPositionRequest(FinancialModel):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    position_kind: Literal["asset", "liability"]
    position_type: Literal["cash", "investment", "property", "mortgage", "loan", "cpf", "other"]
    liquidity_class: Literal["liquid", "less_liquid", "restricted"]
    include_in_fi: bool = False
    is_emergency_fund: bool = False
    restriction_type: Literal["none", "cpf", "other_restricted"] = "none"
    currency: Literal["SGD"] = "SGD"

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        """Normalize whitespace before enforcing active-name uniqueness."""

        return " ".join(value.strip().split())

    @model_validator(mode="after")
    def validate_classification(self):
        """Reject combinations that cannot participate safely in calculations."""

        if self.position_kind == "liability" and (self.include_in_fi or self.is_emergency_fund):
            raise ValueError("Liabilities cannot be included in FI or designated as emergency funds")
        if self.is_emergency_fund and (
            self.position_kind != "asset"
            or self.liquidity_class != "liquid"
            or self.restriction_type != "none"
        ):
            raise ValueError("Emergency funds must be liquid, unrestricted assets")
        if self.position_type == "cpf" and (
            self.liquidity_class != "restricted" or self.restriction_type != "cpf"
        ):
            raise ValueError("CPF positions must use CPF restriction and restricted liquidity")
        if self.position_type != "cpf" and self.restriction_type == "cpf":
            raise ValueError("CPF restriction is only valid for CPF positions")
        if self.liquidity_class == "restricted" and self.restriction_type == "none":
            raise ValueError("Restricted positions require a restriction type")
        if self.liquidity_class != "restricted" and self.restriction_type != "none":
            raise ValueError("Only restricted positions can have a restriction type")
        return self


class UpdateWealthPositionRequest(FinancialModel):
    name: Annotated[str | None, Field(min_length=1, max_length=80)] = None
    position_kind: Literal["asset", "liability"] | None = None
    position_type: Literal["cash", "investment", "property", "mortgage", "loan", "cpf", "other"] | None = None
    liquidity_class: Literal["liquid", "less_liquid", "restricted"] | None = None
    include_in_fi: bool | None = None
    is_emergency_fund: bool | None = None
    restriction_type: Literal["none", "cpf", "other_restricted"] | None = None
    currency: Literal["SGD"] | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        """Normalize a supplied position name without requiring it for every edit."""

        return " ".join(value.strip().split()) if value is not None else None

    @model_validator(mode="after")
    def require_one_field(self):
        """Reject empty edits while classification is validated after merging current state."""

        if not self.model_fields_set:
            raise ValueError("At least one wealth position field must be provided")
        return self


class WealthSnapshotResponse(FinancialModel):
    id: UUID
    user_id: UUID
    wealth_position_id: UUID
    value_date: date
    amount: Money
    created_at: datetime
    updated_at: datetime


class WealthPositionResponse(CreateWealthPositionRequest):
    id: UUID
    user_id: UUID
    is_archived: bool
    archived_at: datetime | None
    latest_snapshot: WealthSnapshotResponse | None = None
    created_at: datetime
    updated_at: datetime


class CreateWealthSnapshotRequest(FinancialModel):
    value_date: date
    amount: Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]

    @field_validator("value_date")
    @classmethod
    def reject_future_date(cls, value: date) -> date:
        """Snapshots are historical facts and cannot be future dated."""

        if value > singapore_today():
            raise ValueError("Snapshot date cannot be in the future")
        return value


class UpdateWealthSnapshotRequest(CreateWealthSnapshotRequest):
    pass


class CreateWealthContributionRequest(FinancialModel):
    wealth_position_id: UUID
    contribution_date: date
    amount: PositiveMoney
    note: Annotated[str | None, Field(max_length=240)] = None

    @field_validator("contribution_date")
    @classmethod
    def reject_future_date(cls, value: date) -> date:
        """Contributions describe completed investments, not scheduled payments."""

        if value > singapore_today():
            raise ValueError("Contribution date cannot be in the future")
        return value


class UpdateWealthContributionRequest(FinancialModel):
    contribution_date: date
    amount: PositiveMoney
    note: Annotated[str | None, Field(max_length=240)] = None

    @field_validator("contribution_date")
    @classmethod
    def reject_future_date(cls, value: date) -> date:
        """Corrections must continue to represent completed contributions."""

        if value > singapore_today():
            raise ValueError("Contribution date cannot be in the future")
        return value


class WealthContributionResponse(CreateWealthContributionRequest):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class FireProfileInput(FinancialModel):
    monthly_contribution: Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
    expected_return_rate: Annotated[Decimal, Field(ge=Decimal("-0.20"), le=Decimal("0.30"))]
    inflation_rate: Annotated[Decimal, Field(ge=0, le=Decimal("0.20"))]
    withdrawal_rate: Annotated[Decimal, Field(ge=Decimal("0.01"), le=Decimal("0.10"))]
    retirement_spending_override: PositiveMoney | None = None
    target_fi_date: date | None = None
    birth_year: Annotated[int | None, Field(ge=1900, le=2200)] = None

    @field_validator("target_fi_date")
    @classmethod
    def require_future_target(cls, value: date | None) -> date | None:
        """A target date is useful only when it is still in the future."""

        if value is not None and value <= singapore_today():
            raise ValueError("Target FI date must be in the future")
        return value


class FireProfileResponse(FireProfileInput):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class FireProfileEnvelope(FinancialModel):
    configured: bool
    profile: FireProfileResponse | None


class EssentialCategoriesRequest(FinancialModel):
    category_ids: list[UUID]

    @field_validator("category_ids")
    @classmethod
    def unique_categories(cls, value: list[UUID]) -> list[UUID]:
        """Avoid duplicate inserts while retaining the user's chosen order."""

        return list(dict.fromkeys(value))


class EssentialCategoriesResponse(EssentialCategoriesRequest):
    pass


class FireCalculationRequest(FinancialModel):
    as_of: date | None = None


class FireScenarioRequest(FireCalculationRequest):
    monthly_contribution: Annotated[Decimal | None, Field(ge=0, max_digits=10, decimal_places=2)] = None
    retirement_spending: PositiveMoney | None = None

    @model_validator(mode="after")
    def require_override(self):
        """Temporary scenarios must change at least one supported assumption."""

        if self.monthly_contribution is None and self.retirement_spending is None:
            raise ValueError("Provide a contribution or retirement spending override")
        return self


class FireWarningResponse(FinancialModel):
    code: str
    message: str


class FirePathPointResponse(FinancialModel):
    date: date
    amount: Money
    kind: Literal["actual", "projected"]


class SpendingBaselineResponse(FinancialModel):
    status: Literal["available", "limited", "insufficient_data", "manual_override"]
    source: Literal["transactions", "manual_override", "none"]
    start_date: date | None
    end_date: date | None
    completed_months: int
    expense_total: Money | None
    annualised_spending: Money | None


class FireAssumptionsResponse(FinancialModel):
    monthly_contribution: Money
    nominal_annual_return: Rate
    inflation_rate: Rate
    real_annual_return: Rate
    withdrawal_rate: Rate
    contribution_timing: Literal["month_end"]
    horizon_months: int


class FireCalculationResponse(FinancialModel):
    status: Literal["already_reached", "projected", "unreachable", "insufficient_data"]
    effective_date: date
    current_investable_assets: Money | None
    fi_target: Money | None
    progress_rate: Rate | None
    progress_rate_capped: Rate | None
    estimated_months: int | None
    estimated_fi_year: int | None
    required_monthly_investment: Money | None
    assumptions: FireAssumptionsResponse | None
    spending_baseline: SpendingBaselineResponse
    actual_path: list[FirePathPointResponse]
    projected_path: list[FirePathPointResponse]
    warnings: list[FireWarningResponse]


class MonthlyMoneyPulseResponse(FinancialModel):
    month: str
    income: Money
    spending: Money
    savings_amount: Money
    savings_rate: Rate | None
    savings_rate_status: Literal["available", "unavailable"]
    invested_amount: Money
    completeness: Literal["complete", "limited"]


class RecommendedActionResponse(FinancialModel):
    action_type: str
    title: str
    rationale: str
    evidence: str
    destination: str
    limitations: str | None
    rule_id: str


class TransactionAnomalyResponse(FinancialModel):
    transaction_id: UUID
    kind: Literal["possible_duplicate", "high_category_amount"]
    label: str
    explanation: str
    evidence_period: str


class FinancialSummaryResponse(FinancialModel):
    effective_date: date
    net_worth: Money | None
    asset_total: Money | None
    liability_total: Money | None
    prior_month_net_worth: Money | None
    monthly_net_worth_change: Money | None
    investable_assets: Money | None
    emergency_eligible_assets: Money | None
    average_monthly_essential_spending: Money | None
    emergency_runway_months: Rate | None
    latest_snapshot_date: date | None
    snapshot_status: Literal["missing", "current", "stale", "mixed"]
    pulse: MonthlyMoneyPulseResponse
    fire: FireCalculationResponse
    recommended_action: RecommendedActionResponse | None
    transaction_anomalies: list[TransactionAnomalyResponse]
    warnings: list[FireWarningResponse]


def serialize_row(model: type[FinancialModel], row: dict[str, Any], **extras: Any):
    """Construct a camel-case compatible schema from a Supabase row."""

    return model.model_validate({**row, **extras})
