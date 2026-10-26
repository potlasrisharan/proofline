from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Role(StrEnum):
    CREATOR = "creator"
    MANAGER = "manager"
    LEGAL_REVIEWER = "legal_reviewer"
    BRAND_OWNER = "brand_owner"
    AGENCY = "agency"


class RegistryStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"
    RETIRED = "retired"


class VaultResource(StrEnum):
    FACTS = "facts"
    TERMS = "terms"
    GUIDELINES = "guidelines"
    DISCLAIMERS = "disclaimers"
    ASSETS = "assets"


class Principal(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: str = Field(min_length=1)
    organisation_id: str = Field(min_length=1)
    role: Role
    auth_source: Literal["proofline_jwt", "supabase_jwt", "development_header", "test_override"]
    agency_id: str | None = Field(default=None, min_length=1)


class VaultCreateRequest(BaseModel):
    value: dict[str, Any] = Field(min_length=1)
    source_id: str | None = None
    source_version: str | None = None
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class VaultRecord(BaseModel):
    id: str
    organisation_id: str
    resource: VaultResource
    version: int = Field(ge=1)
    status: RegistryStatus
    value: dict[str, Any]
    source_id: str | None = None
    source_version: str | None = None
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    approved_by: str | None = None
    created_at: datetime
    approved_at: datetime | None = None


class VaultListResponse(BaseModel):
    resource: VaultResource
    organisation_id: str
    persistence: Literal["in_memory_demo"]
    items: list[VaultRecord]


class VaultRecordResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    item: VaultRecord


class ContentType(StrEnum):
    TEXT = "text"
    PDF = "pdf"
    DOCX = "docx"
    IMAGE = "image"
    OTHER = "other"


class ContentWorkflowStatus(StrEnum):
    DRAFT = "draft"
    AI_CHECKED = "ai_checked"
    CHANGES_REQUESTED = "changes_requested"
    RESUBMITTED = "resubmitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    RELEASED = "released"
    RE_REVIEW_REQUIRED = "re_review_required"


class AuditStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    REVIEW_REQUIRED = "review_required"


class FindingCategory(StrEnum):
    # Compact review-facing names from the original contract.
    FACTUAL = "factual"
    OFFER_DATE = "offer_date"
    TERMINOLOGY = "terminology"
    TONE = "tone"
    PROMOTIONAL = "promotional"
    LEGAL = "legal"
    VISUAL = "visual"
    ACCESSIBILITY = "accessibility"
    TRANSLATION = "translation"
    # Extended persistence names used by the Phase 3 workflow.
    FACT_MISMATCH = "fact_mismatch"
    OUTDATED_FACT_OR_OFFER = "outdated_fact_or_offer"
    UNSUPPORTED_CLAIM = "unsupported_claim"
    TERMINOLOGY_VIOLATION = "terminology_violation"
    TONE_MESSAGING_MISMATCH = "tone_messaging_mismatch"
    VISUAL_MISMATCH = "visual_mismatch"
    ACCESSIBILITY_ISSUE = "accessibility_issue"
    CONFIGURED_POLICY_DISCLAIMER = "configured_policy_disclaimer"
    SOURCE_CONFLICT = "source_conflict"
    GUIDELINE_AMBIGUITY = "guideline_ambiguity"
    SECURITY = "security"


class FindingVerdict(StrEnum):
    SUPPORTED = "supported"
    CONTRADICTED = "contradicted"
    OUTDATED = "outdated"
    UNSUPPORTED = "unsupported"
    NEEDS_HUMAN = "needs_human"


class FindingSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    REVIEW_REQUIRED = "review_required"


class FindingMethod(StrEnum):
    RULE = "rule"
    LLM = "llm"
    HYBRID = "hybrid"


class FindingStatus(StrEnum):
    OPEN = "open"
    ACCEPTED = "accepted"
    EDITED = "edited"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    OVERRIDDEN = "overridden"


class FindingAction(StrEnum):
    ACCEPT = "accept"
    EDIT = "edit"
    RESOLVE = "resolve"
    DISMISS = "dismiss"
    OVERRIDE = "override"
    REOPEN = "reopen"


class ReviewAction(StrEnum):
    SUBMIT = "submit"
    RESUBMIT = "resubmit"
    REQUEST_CHANGES = "request_changes"
    APPROVE = "approve"
    RELEASE = "release"
    MARK_RE_REVIEW_REQUIRED = "mark_re_review_required"


class CommentAnchor(BaseModel):
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    text: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_range(self) -> "CommentAnchor":
        if self.end < self.start:
            raise ValueError("comment span end must be greater than or equal to start")
        return self


class ContentFileInput(BaseModel):
    data_base64: str | None = None
    base64: str | None = None
    filename: str | None = None
    mime_type: str | None = None


class ContentCreateRequest(BaseModel):
    title: str = Field(default="Untitled content", min_length=1)
    content_type: ContentType = ContentType.TEXT
    source_text: str | None = None
    text: str | None = None
    file_base64: str | None = None
    base64_data: str | None = None
    file: ContentFileInput | None = None
    filename: str | None = Field(default=None, min_length=1)
    mime_type: str | None = Field(default=None, min_length=1)
    confidential: bool = False
    exposure: int = Field(default=1, ge=1, le=3)
    regulated: bool = False
    regulatory_context: str | None = None
    tags: list[str] = Field(default_factory=list)
    product: str | None = None
    market: str | None = None
    channel: str | None = None
    language: str | None = None
    organisation_id: str | None = None
    owner_user_id: str | None = Field(default=None, min_length=1)
    assigned_agency_id: str | None = Field(default=None, min_length=1)
    agency_id: str | None = Field(default=None, min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @property
    def effective_text(self) -> str | None:
        return self.source_text if self.source_text is not None else self.text

    @property
    def effective_agency_id(self) -> str | None:
        return self.assigned_agency_id or self.agency_id


class ContentVersionCreateRequest(BaseModel):
    source_text: str | None = None
    text: str | None = None
    file_base64: str | None = None
    base64_data: str | None = None
    file: ContentFileInput | None = None
    filename: str | None = Field(default=None, min_length=1)
    mime_type: str | None = Field(default=None, min_length=1)
    confidential: bool | None = None
    exposure: int | None = Field(default=None, ge=1, le=3)
    regulated: bool | None = None
    regulatory_context: str | None = None
    tags: list[str] = Field(default_factory=list)
    product: str | None = None
    market: str | None = None
    channel: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    auto_recheck: bool = True

    @property
    def effective_text(self) -> str | None:
        return self.source_text if self.source_text is not None else self.text


class ContentItem(BaseModel):
    id: str
    organisation_id: str
    title: str
    content_type: ContentType
    owner_user_id: str
    created_by: str
    assigned_agency_id: str | None = None
    workflow_status: ContentWorkflowStatus
    current_version_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class ContentVersion(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    version: int = Field(ge=1)
    source_text: str | None = None
    extracted_text: str | None = None
    workflow_status: ContentWorkflowStatus
    created_by: str
    parent_version_id: str | None = None
    latest_audit_id: str | None = None
    created_at: datetime
    submitted_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    source_type: str = Field(min_length=1)
    source_id: str = Field(min_length=1)
    version: str = Field(min_length=1)
    quote: str = Field(min_length=1)
    record_id: str | None = None


class FindingSuggestion(BaseModel):
    text: str = Field(min_length=1)
    intent_note: str = Field(min_length=1)


class FindingInput(BaseModel):
    span: CommentAnchor
    category: FindingCategory
    verdict: FindingVerdict
    severity: FindingSeverity
    confidence: float = Field(ge=0, le=1)
    method: FindingMethod
    evidence: Evidence | None = None
    reason: str = Field(min_length=1)
    suggestion: FindingSuggestion | None = None

    @model_validator(mode="after")
    def require_evidence_for_hard_verdict(self) -> "FindingInput":
        if self.verdict in (FindingVerdict.CONTRADICTED, FindingVerdict.OUTDATED) and self.evidence is None:
            raise ValueError("contradicted and outdated findings require evidence")
        return self


class Finding(FindingInput):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    audit_run_id: str
    status: FindingStatus = FindingStatus.OPEN
    dismiss_reason: str | None = None
    override_reason: str | None = None
    action_by: str | None = None
    action_at: datetime | None = None
    edited_text: str | None = None
    created_at: datetime
    risk_score: dict[str, Any] | None = None


class Claim(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    audit_run_id: str
    text: str = Field(min_length=1)
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    kind: str = Field(min_length=1)
    normalized_value: Any | None = None
    unit: str | None = None
    qualifier: str | None = None
    comparator: str | None = None
    regulated: bool = False


class ClaimFactLink(BaseModel):
    id: str
    claim_id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    audit_run_id: str
    fact_id: str | None = None
    fact_version: str | None = None
    link_status: Literal[
        "supported",
        "contradicted",
        "outdated",
        "unsupported",
        "conflict",
        "unmatched",
    ]
    evidence_quote: str | None = None


class FindingActionRequest(BaseModel):
    action: FindingAction
    reason: str | None = None
    replacement_text: str | None = None


class FindingActionRecord(BaseModel):
    id: str
    finding_id: str
    organisation_id: str
    actor_id: str
    actor_role: Role
    action: FindingAction
    reason: str | None = None
    replacement_text: str | None = None
    created_at: datetime


class FindingDiff(BaseModel):
    resolved_finding_ids: list[str] = Field(default_factory=list)
    new_finding_ids: list[str] = Field(default_factory=list)
    unchanged_finding_ids: list[str] = Field(default_factory=list)


class AuditRequest(BaseModel):
    findings: list[FindingInput] = Field(default_factory=list)
    ruleset_version: str = Field(default="deterministic-in_memory-v1", min_length=1)
    model_provider: str | None = None
    model_name: str | None = None
    model_version: str | None = None


class AuditRun(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    requested_by: str
    status: AuditStatus
    ruleset_version: str
    model_provider: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    previous_audit_id: str | None = None
    finding_diff: FindingDiff = Field(default_factory=FindingDiff)
    claims: list[Claim] = Field(default_factory=list)
    claim_links: list[ClaimFactLink] = Field(default_factory=list)
    risk: dict[str, Any] = Field(default_factory=dict)
    service_metadata: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class ReviewRequest(BaseModel):
    action: ReviewAction
    reason: str | None = None
    comment: str | None = None
    override_finding_ids: list[str] = Field(default_factory=list)


class ReviewDecision(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    actor_id: str
    actor_role: Role
    action: ReviewAction
    reason: str | None = None
    comment: str | None = None
    created_at: datetime


class CommentCreateRequest(BaseModel):
    body: str = Field(min_length=1)
    anchor: CommentAnchor | None = None
    span: CommentAnchor | None = None
    parent_comment_id: str | None = Field(default=None, min_length=1)
    finding_id: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_anchor_aliases(self) -> "CommentCreateRequest":
        if self.anchor is not None and self.span is not None and self.anchor != self.span:
            raise ValueError("anchor and span must identify the same text range")
        return self

    @property
    def effective_anchor(self) -> CommentAnchor | None:
        return self.anchor or self.span


class Comment(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    author_id: str
    author_role: Role
    anchor: CommentAnchor | None = None
    span: CommentAnchor | None = None
    finding_id: str | None = None
    parent_comment_id: str | None = None
    body: str
    created_at: datetime
    updated_at: datetime


class AuditEvent(BaseModel):
    id: str
    organisation_id: str
    actor_id: str | None = None
    actor_role: Role | None = None
    event_type: str
    object_type: str
    object_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    prev_hash: str | None = None
    hash: str
    occurred_at: datetime


class AuditChainVerification(BaseModel):
    organisation_id: str
    valid: bool
    event_count: int = Field(ge=0)
    first_invalid_event_id: str | None = None
    expected_hash: str | None = None
    actual_hash: str | None = None


class ContentResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    item: ContentItem


class ContentListResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    items: list[ContentItem]


class ContentVersionsResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    items: list[ContentVersion]


class AuditResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    audit: AuditRun
    findings: list[Finding]


class FindingResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    finding: Finding


class CommentsResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    items: list[Comment]


class ReviewDecisionResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    content_version: ContentVersion
    decision: ReviewDecision


class ReviewDecisionsResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    content_version_id: str
    items: list[ReviewDecision]


class AuditEventsResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    items: list[AuditEvent]


class DashboardSummaryResponse(BaseModel):
    """Saved-record aggregates exposed by the local dashboard boundary.

    The summary is deliberately count-based and organisation/visibility scoped.  It
    reports the in-memory adapter explicitly so the response cannot be mistaken for
    durable production analytics.
    """

    persistence: Literal["in_memory_demo"]
    organisation_id: str
    generated_at: datetime
    window_start: datetime | None = None
    window_end: datetime
    window_days: int | None = None
    content_count: int = Field(ge=0)
    audited_content_count: int = Field(ge=0)
    audited_version_count: int = Field(ge=0)
    audit_count: int = Field(ge=0)
    finding_count: int = Field(ge=0)
    open_finding_count: int = Field(ge=0)
    open_high_priority_findings: int = Field(ge=0)
    open_high_priority_finding_count: int = Field(ge=0)
    content_status_counts: dict[str, int] = Field(default_factory=dict)
    approval_state_counts: dict[str, int] = Field(default_factory=dict)
    audit_status_counts: dict[str, int] = Field(default_factory=dict)
    finding_category_counts: dict[str, int] = Field(default_factory=dict)
    findings_by_category: dict[str, int] = Field(default_factory=dict)
    finding_severity_counts: dict[str, int] = Field(default_factory=dict)
    review_decision_count: int = Field(ge=0)
    review_decision_counts: dict[str, int] = Field(default_factory=dict)
    decisions_by_action: dict[str, int] = Field(default_factory=dict)


class ContentAuditResponse(BaseModel):
    """Stable Phase 2 content workflow response.

    ``status`` is the audit status, while ``workflow_status`` exposes the immutable
    content version's workflow state. The persistence marker is intentionally local.
    """

    content_id: str
    content_version_id: str
    audit_id: str | None = None
    findings: list[Finding] = Field(default_factory=list)
    claims: list[Claim] = Field(default_factory=list)
    claim_links: list[ClaimFactLink] = Field(default_factory=list)
    risk: dict[str, Any] = Field(default_factory=dict)
    status: str
    workflow_status: ContentWorkflowStatus | None = None
    persistence: Literal["in_memory_demo"]
    content: ContentItem | None = None
    content_version: ContentVersion | None = None
    audit: AuditRun | None = None
    service_metadata: dict[str, Any] = Field(default_factory=dict)
    actions: list[FindingActionRecord] = Field(default_factory=list)
    versions: list[ContentVersion] = Field(default_factory=list)
    audits: list[AuditRun] = Field(default_factory=list)
    error: str | None = None
    finding: Finding | None = None
    action: FindingActionRecord | None = None
