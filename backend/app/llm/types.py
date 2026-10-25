"""Typed records shared by the provider, retrieval, and validation boundaries."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProviderAvailability(StrEnum):
    """Observed availability of an optional model provider."""

    AVAILABLE = "available"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"
    CONFIDENTIAL_BLOCKED = "confidential_blocked"


class LLMRunStatus(StrEnum):
    """Outcome of a model-assisted operation."""

    COMPLETED = "completed"
    NEEDS_HUMAN = "needs_human"
    FAILED = "failed"


class FindingSpan(BaseModel):
    """A candidate excerpt and its offsets in the submitted content."""

    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    start: int = Field(ge=0)
    end: int = Field(ge=0)
    text: str = Field(min_length=1, max_length=12000)

    @model_validator(mode="after")
    def validate_range(self) -> "FindingSpan":
        if self.end <= self.start or self.end - self.start != len(self.text):
            raise ValueError("finding span must contain its exact nonempty text")
        return self


class EvidenceRef(BaseModel):
    """A source/rule reference returned by a model candidate."""

    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    id: str = Field(min_length=1, max_length=256)
    version: str = Field(min_length=1, max_length=256)
    kind: Literal["brand_record", "source", "rule", "asset"] = "brand_record"
    quote: str | None = Field(default=None, min_length=1, max_length=12000)
    applicability: str | None = Field(default=None, max_length=1000)


class CandidateSuggestion(BaseModel):
    """A model-proposed correction, retained only as an untrusted candidate."""

    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    text: str = Field(min_length=1, max_length=12000)
    intent_note: str = Field(min_length=1, max_length=2000)


class CandidateFinding(BaseModel):
    """Schema-constrained, but not yet trusted, model finding."""

    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    span: FindingSpan
    category: Literal[
        "factual", "offer_date", "terminology", "tone", "promotional", "legal",
        "visual", "accessibility", "translation", "security", "fact_mismatch",
        "outdated_fact_or_offer", "unsupported_claim", "terminology_violation",
        "tone_messaging_mismatch", "visual_mismatch", "accessibility_issue",
        "configured_policy_disclaimer", "source_conflict", "guideline_ambiguity",
    ]
    verdict: Literal[
        "supported",
        "contradicted",
        "outdated",
        "unsupported",
        "needs_human",
    ]
    severity: Literal["critical", "high", "medium", "low", "review_required"]
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    reason: str = Field(min_length=1, max_length=2000)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list, max_length=20)
    suggestion: CandidateSuggestion | None = None
    uncertainty: str | None = Field(default=None, max_length=2000)
    instruction_like: bool = False

    @model_validator(mode="after")
    def validate_hard_verdict(self) -> "CandidateFinding":
        if self.verdict in {"contradicted", "outdated"} and not self.evidence_refs:
            raise ValueError("contradicted and outdated findings require evidence")
        if self.verdict == "supported" and self.severity in {"critical", "high"} and not self.evidence_refs:
            raise ValueError("high-severity supported findings require evidence")
        return self


class CandidateOutput(BaseModel):
    """The only accepted shape for an audit model response."""

    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    findings: list[CandidateFinding] = Field(default_factory=list, max_length=40)
    notes: str | None = Field(default=None, max_length=2000)


class VerifierOutput(BaseModel):
    """The only accepted shape for a high-severity verifier response."""

    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    confirmed: bool
    reason: str = Field(min_length=1, max_length=2000)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list, max_length=20)


class ApprovedFact(BaseModel):
    """Minimal approved registry record needed by the LLM boundary.

    ``value`` is intentionally untyped because the existing vault accepts arbitrary
    JSON.  Suggestions may only reuse a value that can be read from this record.
    """

    model_config = ConfigDict(extra="ignore", hide_input_in_errors=True)

    id: str = Field(min_length=1)
    version: str = Field(min_length=1)
    organisation_id: str | None = None
    value: Any
    text: str | None = None
    record_type: str | None = None
    record_key: str | None = None
    status: str
    source_id: str | None = None
    source_version: str | None = None
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    confidential: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("version", "source_version", mode="before")
    @classmethod
    def normalise_version(cls, value: Any) -> Any:
        if isinstance(value, int) and not isinstance(value, bool):
            return str(value)
        return value

    @property
    def is_approved(self) -> bool:
        return self.status.lower() == "approved"

    @property
    def is_confidential(self) -> bool:
        tags = self.metadata.get("tags", [])
        return (
            self.confidential
            or self.metadata.get("confidential") is True
            or self.metadata.get("classification") == "confidential"
            or (isinstance(tags, (list, tuple)) and "confidential" in tags)
        )

    def is_current(self, at: datetime | None = None) -> bool:
        now = at or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        for bound, is_start in ((self.effective_from, True), (self.effective_to, False)):
            if bound is not None:
                bound = bound.replace(tzinfo=timezone.utc) if bound.tzinfo is None else bound
                if (is_start and now < bound) or (not is_start and now >= bound):
                    return False
        return self.is_approved


class InstructionLikeSignal(BaseModel):
    """Detector output preserved for deterministic rules and human review."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    detected: bool = False
    signals: tuple[str, ...] = ()


class ProviderStatus(BaseModel):
    """Safe provider metadata; secrets are intentionally absent."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    provider: str
    availability: ProviderAvailability
    configured: bool = False
    configured_model: str | None = None
    model: str | None = None
    discovered_models: list[str] = Field(default_factory=list)
    reason: str | None = None
    live: bool = False

    @property
    def available(self) -> bool:
        return self.availability in {
            ProviderAvailability.AVAILABLE,
            ProviderAvailability.DEGRADED,
        }

    @property
    def offline(self) -> bool:
        return self.availability == ProviderAvailability.OFFLINE


class LLMReviewResult(BaseModel):
    """Safe result returned to the audit layer.

    Findings are candidates even when ``status`` is ``completed``.  The caller must
    still apply the deterministic/evidence checks and human workflow defined by the
    shared contract.
    """

    model_config = ConfigDict(extra="forbid")

    status: LLMRunStatus
    findings: list[CandidateFinding] = Field(default_factory=list)
    suggestions: list[CandidateSuggestion] = Field(default_factory=list)
    provider_status: ProviderStatus
    reason: str | None = None
    instruction_like: InstructionLikeSignal = Field(default_factory=InstructionLikeSignal)
    verifier_passed: bool = False
    cache_hit: bool = False

    @property
    def needs_human(self) -> bool:
        return self.status == LLMRunStatus.NEEDS_HUMAN
