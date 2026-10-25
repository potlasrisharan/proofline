"""Local Fact-Change Impact Radar.

This module is intentionally a small, deterministic, in-memory capability.  It
tracks the relationship between a stored claim and the exact approved fact
version used for that claim.  When an approved version changes or a validity
window ends, the store creates an auditable re-review task for matching stored
content.

The implementation does not connect to Supabase, an external audit engine, or
any publishing system.  The response models expose ``persistence`` and
``implementation_status`` so callers cannot mistake this local adapter for
durable production infrastructure.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from enum import StrEnum
from threading import RLock
from typing import Any, Literal
from uuid import uuid4

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

from .models import Principal, Role


PERSISTENCE = "in_memory_demo"
IMPLEMENTATION_STATUS = "implemented_local_stub_persistence"


class ImpactContentStatus(StrEnum):
    """Workflow states that are eligible for impact revalidation."""

    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    RE_REVIEW_REQUIRED = "re_review_required"


class ImpactFactStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"


class ImpactReason(StrEnum):
    FACT_CHANGED = "fact_changed"
    FACT_EXPIRED = "fact_expired"


class ImpactTaskStatus(StrEnum):
    OPEN = "open"
    RECHECKED = "rechecked"


class ImpactNotFoundError(LookupError):
    """Raised when an impact record is not visible in the requested tenant."""


class ImpactValidationError(ValueError):
    """Raised when a claim cannot be linked to a known fact version."""


class ImpactStateError(ValueError):
    """Raised when a fact transition or task operation is invalid."""


class ImpactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FactVersionCreateRequest(ImpactInput):
    fact_id: str = Field(min_length=1)
    value: str = Field(min_length=1)
    unit: str | None = None
    status: Literal[ImpactFactStatus.DRAFT, ImpactFactStatus.APPROVED] = ImpactFactStatus.DRAFT
    effective_from: AwareDatetime | None = None
    effective_to: AwareDatetime | None = None
    source_id: str | None = None
    source_version: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_window(self) -> "FactVersionCreateRequest":
        if self.effective_from and self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to must not precede effective_from")
        if not self.value.strip() or not self.fact_id.strip():
            raise ValueError("fact_id and value must not be blank")
        if (self.source_id is None) != (self.source_version is None):
            raise ValueError("source_id and source_version must be supplied together")
        return self


class FactValidityEndRequest(ImpactInput):
    fact_version: int | None = Field(default=None, ge=1)
    effective_to: AwareDatetime


class FactVersion(BaseModel):
    id: str
    organisation_id: str
    fact_id: str
    fact_version: int = Field(ge=1)
    value: str
    unit: str | None = None
    status: ImpactFactStatus
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    source_id: str | None = None
    source_version: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    approved_by: str | None = None
    created_at: datetime
    approved_at: datetime | None = None
    supersedes_version: int | None = None

    @property
    def version(self) -> int:
        """Compatibility accessor for clients that call the field ``version``."""

        return self.fact_version


class ImpactClaimCreateRequest(ImpactInput):
    claim_id: str | None = None
    claim_text: str = Field(min_length=1)
    fact_id: str = Field(min_length=1)
    fact_version: int = Field(ge=1)
    normalized_value: str | int | float | None = None
    unit: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ImpactContentCreateRequest(ImpactInput):
    content_id: str | None = None
    content_version_id: str | None = None
    title: str = Field(min_length=1)
    workflow_status: Literal[
        ImpactContentStatus.DRAFT,
        ImpactContentStatus.IN_REVIEW,
        ImpactContentStatus.APPROVED,
    ] = ImpactContentStatus.DRAFT
    claims: list[ImpactClaimCreateRequest] = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StoredContent(BaseModel):
    id: str
    organisation_id: str
    title: str
    current_content_version_id: str
    workflow_status: ImpactContentStatus
    previous_workflow_status: ImpactContentStatus | None = None
    re_review_required: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    created_at: datetime
    updated_at: datetime


class StoredClaim(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    claim_text: str
    fact_id: str
    fact_version: int
    normalized_value: str | int | float | None = None
    unit: str | None = None
    workflow_status: ImpactContentStatus
    re_review_required: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    created_at: datetime


class ImpactAuditEvent(BaseModel):
    id: str
    organisation_id: str
    event_type: str
    object_id: str
    actor_id: str
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReReviewTask(BaseModel):
    id: str
    organisation_id: str
    content_id: str
    content_version_id: str
    claim_id: str
    fact_id: str
    old_fact_version: int
    new_fact_version: int | None = None
    old_value: str
    new_value: str | None = None
    old_source_id: str | None = None
    old_source_version: str | None = None
    new_source_id: str | None = None
    new_source_version: str | None = None
    reason: ImpactReason
    status: ImpactTaskStatus = ImpactTaskStatus.OPEN
    created_by: str
    created_at: datetime
    updated_at: datetime
    rechecked_at: datetime | None = None
    recheck_ids: list[str] = Field(default_factory=list)
    audit_event_ids: list[str] = Field(default_factory=list)


class ImpactItem(BaseModel):
    """One claim/content relationship affected by a fact transition."""

    task_id: str
    content_id: str
    content_version_id: str
    claim_id: str
    title: str
    workflow_status: ImpactContentStatus
    previous_workflow_status: ImpactContentStatus | None = None
    re_review_required: bool
    claim_text: str
    fact_id: str
    old_fact_version: int
    new_fact_version: int | None = None
    old_value: str
    new_value: str | None = None
    old_source_id: str | None = None
    old_source_version: str | None = None
    new_source_id: str | None = None
    new_source_version: str | None = None
    reason: ImpactReason
    task_status: ImpactTaskStatus
    created_at: datetime


class ImpactListResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    organisation_id: str
    fact_id: str | None = None
    status: Literal["available", "no_affected_content"]
    items: list[ImpactItem]
    affected_content: list[ImpactItem]
    affected_content_count: int = Field(ge=0)
    affected_claim_count: int = Field(ge=0)
    task_count: int = Field(ge=0)
    message: str


class ImpactFactVersionResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    item: FactVersion
    impact: ImpactListResponse | None = None


class ImpactContentResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    content: StoredContent
    claims: list[StoredClaim]


class RecheckAllRequest(ImpactInput):
    fact_id: str | None = None
    note: str | None = None


class ImpactRecheckResult(BaseModel):
    id: str
    task_id: str
    content_id: str
    content_version_id: str
    claim_id: str
    fact_id: str
    linked_fact_version: int
    checked_fact_version: int | None
    linked_value: str
    current_value: str | None
    verdict: Literal["outdated", "needs_human"]
    evidence: dict[str, str] | None = None
    reason: str
    method: Literal["deterministic_fact_version_check"] = "deterministic_fact_version_check"
    actor_id: str
    created_at: datetime


class RecheckAllResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    organisation_id: str
    recheck_run_id: str
    status: Literal["completed_review_required", "no_affected_content"]
    checked_content_count: int = Field(ge=0)
    checked_claim_count: int = Field(ge=0)
    tasks: list[ReReviewTask]
    results: list[ImpactRecheckResult]
    message: str


class ImpactEventsResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    organisation_id: str
    items: list[ImpactAuditEvent]


class ImpactFactVersionsResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    items: list[FactVersion]


class ImpactRechecksResponse(BaseModel):
    persistence: Literal["in_memory_demo"] = PERSISTENCE
    implementation_status: Literal["implemented_local_stub_persistence"] = IMPLEMENTATION_STATUS
    items: list[ImpactRecheckResult]


class ImpactRadarStore:
    """Tenant-scoped, non-persistent store for the local impact capability."""

    eligible_content_statuses = frozenset(
        {
            ImpactContentStatus.DRAFT,
            ImpactContentStatus.IN_REVIEW,
            ImpactContentStatus.APPROVED,
        }
    )

    def __init__(self) -> None:
        self._facts: dict[str, dict[str, list[FactVersion]]] = defaultdict(lambda: defaultdict(list))
        self._contents: dict[str, dict[str, StoredContent]] = defaultdict(dict)
        self._claims: dict[str, dict[str, StoredClaim]] = defaultdict(dict)
        self._tasks: dict[str, dict[str, ReReviewTask]] = defaultdict(dict)
        self._task_keys: dict[str, dict[tuple[str, str, int, int | None, ImpactReason], str]] = defaultdict(dict)
        self._events: dict[str, list[ImpactAuditEvent]] = defaultdict(list)
        self._rechecks: dict[str, list[ImpactRecheckResult]] = defaultdict(list)
        self._lock = RLock()

    def create_fact_version(
        self,
        organisation_id: str,
        request: FactVersionCreateRequest,
        actor: Principal | str,
    ) -> FactVersion:
        actor_id = self._actor_id(actor)
        now = datetime.now(timezone.utc)
        with self._lock:
            self._check_actor(organisation_id, actor, require_owner=request.status is ImpactFactStatus.APPROVED)
            if request.effective_from and request.effective_from > now:
                raise ImpactValidationError("future-effective fact activation is not implemented locally")
            versions = self._facts[organisation_id][request.fact_id]
            previous_approved = self._latest_approved(versions)
            next_version = max((item.fact_version for item in versions), default=0) + 1
            record = FactVersion(
                id=str(uuid4()),
                organisation_id=organisation_id,
                fact_id=request.fact_id,
                fact_version=next_version,
                value=request.value,
                unit=request.unit,
                status=request.status,
                effective_from=request.effective_from,
                effective_to=request.effective_to,
                source_id=request.source_id,
                source_version=request.source_version,
                metadata=request.metadata,
                created_by=actor_id,
                approved_by=actor_id if request.status is ImpactFactStatus.APPROVED else None,
                created_at=now,
                approved_at=now if request.status is ImpactFactStatus.APPROVED else None,
                supersedes_version=(
                    previous_approved.fact_version
                    if request.status is ImpactFactStatus.APPROVED and previous_approved
                    else None
                ),
            )
            if request.status is ImpactFactStatus.APPROVED and previous_approved:
                self._replace_fact(
                    organisation_id,
                    previous_approved.model_copy(update={"status": ImpactFactStatus.SUPERSEDED}),
                )
            versions.append(record)
            event = self._record_event(
                organisation_id,
                "fact_version_created",
                record.id,
                actor_id,
                {
                    "fact_id": request.fact_id,
                    "new_fact_version": record.fact_version,
                    "new_value": record.value,
                    "old_fact_version": previous_approved.fact_version if previous_approved else None,
                    "old_value": previous_approved.value if previous_approved else None,
                    "status": record.status.value,
                },
            )
            if request.status is ImpactFactStatus.APPROVED and previous_approved:
                for prior in versions:
                    if prior.status is ImpactFactStatus.SUPERSEDED:
                        self._mark_affected(
                            organisation_id,
                            old_fact=prior,
                            new_fact=record,
                            reason=ImpactReason.FACT_CHANGED,
                            actor_id=actor_id,
                            trigger_event_id=event.id,
                        )
            self._expire_due(organisation_id)
            return self._find_fact_version(
                organisation_id, record.fact_id, record.fact_version
            ).model_copy(deep=True)

    def approve_fact_version(
        self,
        organisation_id: str,
        fact_id: str,
        fact_version: int,
        actor: Principal | str,
    ) -> FactVersion:
        actor_id = self._actor_id(actor)
        now = datetime.now(timezone.utc)
        with self._lock:
            self._check_actor(organisation_id, actor, require_owner=True)
            current = self._find_fact_version(organisation_id, fact_id, fact_version)
            if current.status is not ImpactFactStatus.DRAFT:
                raise ImpactStateError("only draft impact fact versions can be approved")
            previous_approved = self._latest_approved(self._facts[organisation_id][fact_id])
            if previous_approved and previous_approved.fact_version >= fact_version:
                raise ImpactStateError("an older draft cannot supersede a newer approved version")
            if previous_approved:
                self._replace_fact(
                    organisation_id,
                    previous_approved.model_copy(update={"status": ImpactFactStatus.SUPERSEDED}),
                )
            approved = current.model_copy(
                update={
                    "status": ImpactFactStatus.APPROVED,
                    "approved_by": actor_id,
                    "approved_at": now,
                    "supersedes_version": previous_approved.fact_version if previous_approved else None,
                }
            )
            self._replace_fact(organisation_id, approved)
            event = self._record_event(
                organisation_id,
                "fact_version_approved",
                approved.id,
                actor_id,
                {
                    "fact_id": fact_id,
                    "new_fact_version": approved.fact_version,
                    "new_value": approved.value,
                    "old_fact_version": previous_approved.fact_version if previous_approved else None,
                    "old_value": previous_approved.value if previous_approved else None,
                },
            )
            if previous_approved:
                for prior in self._facts[organisation_id][fact_id]:
                    if prior.status is ImpactFactStatus.SUPERSEDED:
                        self._mark_affected(
                            organisation_id,
                            old_fact=prior,
                            new_fact=approved,
                            reason=ImpactReason.FACT_CHANGED,
                            actor_id=actor_id,
                            trigger_event_id=event.id,
                        )
            self._expire_due(organisation_id)
            return self._find_fact_version(
                organisation_id, approved.fact_id, approved.fact_version
            ).model_copy(deep=True)

    def end_fact_validity(
        self,
        organisation_id: str,
        fact_id: str,
        request: FactValidityEndRequest,
        actor: Principal | str,
    ) -> FactVersion:
        actor_id = self._actor_id(actor)
        now = datetime.now(timezone.utc)
        with self._lock:
            self._check_actor(organisation_id, actor, require_owner=True)
            if request.effective_to > now:
                raise ImpactValidationError("validity cannot end in the future; use the fact validity window")
            versions = self._facts[organisation_id][fact_id]
            current = (
                self._find_fact_version(organisation_id, fact_id, request.fact_version)
                if request.fact_version is not None
                else self._latest_approved(versions)
            )
            if current is None:
                raise ImpactNotFoundError(fact_id)
            if current.status is ImpactFactStatus.EXPIRED:
                return current.model_copy(deep=True)
            if current.status is not ImpactFactStatus.APPROVED:
                raise ImpactStateError("only an approved fact version can be expired")
            if current.effective_from and request.effective_to < current.effective_from:
                raise ImpactValidationError("effective_to must not precede effective_from")
            expired = current.model_copy(
                update={"status": ImpactFactStatus.EXPIRED, "effective_to": request.effective_to}
            )
            self._replace_fact(organisation_id, expired)
            event = self._record_event(
                organisation_id,
                "fact_validity_ended",
                expired.id,
                actor_id,
                {
                    "fact_id": fact_id,
                    "fact_version": expired.fact_version,
                    "old_value": expired.value,
                    "new_value": None,
                    "previous_effective_to": current.effective_to.isoformat() if current.effective_to else None,
                    "effective_to": request.effective_to.isoformat(),
                },
            )
            self._mark_affected(
                organisation_id,
                old_fact=expired,
                new_fact=None,
                reason=ImpactReason.FACT_EXPIRED,
                actor_id=actor_id,
                trigger_event_id=event.id,
            )
            return expired.model_copy(deep=True)

    def register_content(
        self,
        organisation_id: str,
        request: ImpactContentCreateRequest,
        actor: Principal | str,
    ) -> tuple[StoredContent, list[StoredClaim]]:
        actor_id = self._actor_id(actor)
        now = datetime.now(timezone.utc)
        content_id = request.content_id or str(uuid4())
        content_version_id = request.content_version_id or str(uuid4())
        with self._lock:
            self._check_actor(organisation_id, actor)
            ids = [claim.claim_id for claim in request.claims if claim.claim_id]
            if len(ids) != len(set(ids)) or any(item in self._claims[organisation_id] for item in ids):
                raise ImpactValidationError("claim ids must be new and unique; history cannot be overwritten")
            if any(
                claim.content_version_id == content_version_id
                for claim in self._claims[organisation_id].values()
            ):
                raise ImpactValidationError("content version already exists; history cannot be overwritten")
            for claim_request in request.claims:
                fact = self._find_fact_version(
                    organisation_id,
                    claim_request.fact_id,
                    claim_request.fact_version,
                )
                if fact.status is ImpactFactStatus.DRAFT:
                    raise ImpactValidationError("claims must link to an approved, superseded, or expired fact version")
            previous = self._contents[organisation_id].get(content_id)
            content = StoredContent(
                id=content_id,
                organisation_id=organisation_id,
                title=request.title,
                current_content_version_id=content_version_id,
                workflow_status=(
                    ImpactContentStatus.RE_REVIEW_REQUIRED
                    if previous and previous.re_review_required
                    else request.workflow_status
                ),
                previous_workflow_status=previous.previous_workflow_status if previous else None,
                re_review_required=previous.re_review_required if previous else False,
                metadata={**(previous.metadata if previous else {}), **request.metadata},
                created_by=previous.created_by if previous else actor_id,
                created_at=previous.created_at if previous else now,
                updated_at=now,
            )
            self._contents[organisation_id][content_id] = content
            claims: list[StoredClaim] = []
            for claim_request in request.claims:
                claim = StoredClaim(
                    id=claim_request.claim_id or str(uuid4()),
                    organisation_id=organisation_id,
                    content_id=content_id,
                    content_version_id=content_version_id,
                    claim_text=claim_request.claim_text,
                    fact_id=claim_request.fact_id,
                    fact_version=claim_request.fact_version,
                    normalized_value=claim_request.normalized_value,
                    unit=claim_request.unit,
                    workflow_status=request.workflow_status,
                    re_review_required=content.re_review_required,
                    metadata=claim_request.metadata,
                    created_by=actor_id,
                    created_at=now,
                )
                self._claims[organisation_id][claim.id] = claim
                claims.append(claim)
            self._record_event(
                organisation_id,
                "content_registered_for_impact",
                content_id,
                actor_id,
                {
                    "content_version_id": content_version_id,
                    "claim_ids": [claim.id for claim in claims],
                    "workflow_status": request.workflow_status.value,
                },
            )
            self._reconcile_links(organisation_id, actor_id)
            self._expire_due(organisation_id)
            content = self._contents[organisation_id][content_id]
            return content.model_copy(deep=True), [
                self._claims[organisation_id][claim.id].model_copy(deep=True) for claim in claims
            ]

    def list_affected(
        self,
        organisation_id: str,
        *,
        fact_id: str | None = None,
    ) -> ImpactListResponse:
        with self._lock:
            self._expire_due(organisation_id)
            tasks = [
                task
                for task in self._tasks[organisation_id].values()
                if (fact_id is None or task.fact_id == fact_id)
            ]
            tasks.sort(key=lambda task: (task.created_at, task.id))
            items = [self._task_to_item(organisation_id, task) for task in tasks]
            content_ids = {item.content_id for item in items}
            return ImpactListResponse(
                organisation_id=organisation_id,
                fact_id=fact_id,
                status="available" if items else "no_affected_content",
                items=items,
                affected_content=items,
                affected_content_count=len(content_ids),
                affected_claim_count=len({item.claim_id for item in items}),
                task_count=len(items),
                message=(
                    "Affected stored content is marked re-review required."
                    if items
                    else "No stored draft, in-review, or approved content is affected."
                ),
            )

    def recheck_all_affected(
        self,
        organisation_id: str,
        actor: Principal | str,
        *,
        fact_id: str | None = None,
        note: str | None = None,
    ) -> RecheckAllResponse:
        actor_id = self._actor_id(actor)
        run_id = str(uuid4())
        now = datetime.now(timezone.utc)
        with self._lock:
            self._check_actor(organisation_id, actor)
            self._expire_due(organisation_id)
            tasks = [
                task
                for task in self._tasks[organisation_id].values()
                if (fact_id is None or task.fact_id == fact_id)
            ]
            tasks.sort(key=lambda task: (task.created_at, task.id))
            updated: list[ReReviewTask] = []
            results: list[ImpactRecheckResult] = []
            for task in tasks:
                current = self._latest_approved(self._facts[organisation_id][task.fact_id])
                linked = self._find_fact_version(organisation_id, task.fact_id, task.old_fact_version)
                has_evidence = bool(linked.source_id and linked.source_version)
                if current and current.source_id and current.source_version:
                    has_evidence = True
                evidence_fact = current if current and current.source_id and current.source_version else linked
                result = ImpactRecheckResult(
                    id=str(uuid4()),
                    task_id=task.id,
                    content_id=task.content_id,
                    content_version_id=task.content_version_id,
                    claim_id=task.claim_id,
                    fact_id=task.fact_id,
                    linked_fact_version=task.old_fact_version,
                    checked_fact_version=current.fact_version if current else None,
                    linked_value=task.old_value,
                    current_value=current.value if current else None,
                    verdict="outdated" if has_evidence else "needs_human",
                    evidence=(
                        {
                            "fact_id": evidence_fact.fact_id,
                            "fact_version": str(evidence_fact.fact_version),
                            "source_id": evidence_fact.source_id or "",
                            "source_version": evidence_fact.source_version or "",
                            "quote": evidence_fact.value,
                        }
                        if has_evidence
                        else None
                    ),
                    reason=(
                        "The stored claim references a superseded fact version; review against the current approved fact."
                        if current and has_evidence
                        else "The linked approved fact has expired; review the offer before using this content."
                        if has_evidence
                        else "The linked fact changed or expired, but no source reference was recorded. A human must verify the evidence."
                    ),
                    actor_id=actor_id,
                    created_at=now,
                )
                event = self._record_event(
                    organisation_id,
                    "impact_recheck_completed",
                    task.id,
                    actor_id,
                    {
                        "recheck_run_id": run_id,
                        "content_id": task.content_id,
                        "content_version_id": task.content_version_id,
                        "claim_id": task.claim_id,
                        "fact_id": task.fact_id,
                        "old_fact_version": task.old_fact_version,
                        "new_fact_version": task.new_fact_version,
                        "old_value": task.old_value,
                        "new_value": task.new_value,
                        "recheck_id": result.id,
                        "verdict": result.verdict,
                        "note": note,
                    },
                )
                updated_task = task.model_copy(
                    update={
                        "status": ImpactTaskStatus.RECHECKED,
                        "updated_at": now,
                        "rechecked_at": now,
                        "recheck_ids": [*task.recheck_ids, result.id],
                        "audit_event_ids": [*task.audit_event_ids, event.id],
                    }
                )
                self._tasks[organisation_id][task.id] = updated_task
                updated.append(updated_task)
                results.append(result)
                self._rechecks[organisation_id].append(result)
            return RecheckAllResponse(
                organisation_id=organisation_id,
                recheck_run_id=run_id,
                status="completed_review_required" if updated else "no_affected_content",
                checked_content_count=len({task.content_id for task in updated}),
                checked_claim_count=len({task.claim_id for task in updated}),
                tasks=[task.model_copy(deep=True) for task in updated],
                results=results,
                message=(
                    "Every affected stored claim was re-checked against fact version and validity. This bounded deterministic check does not edit or approve content; human re-review remains required."
                    if updated
                    else "No affected content was available for an explicit re-check request."
                ),
            )

    def list_events(self, organisation_id: str) -> list[ImpactAuditEvent]:
        with self._lock:
            return [event.model_copy(deep=True) for event in self._events[organisation_id]]

    def list_rechecks(self, organisation_id: str) -> list[ImpactRecheckResult]:
        with self._lock:
            return [result.model_copy(deep=True) for result in self._rechecks[organisation_id]]

    def get_content(self, organisation_id: str, content_id: str) -> StoredContent:
        with self._lock:
            content = self._contents[organisation_id].get(content_id)
            if content is None:
                raise ImpactNotFoundError(content_id)
            return content.model_copy(deep=True)

    def list_content_claims(self, organisation_id: str, content_id: str) -> list[StoredClaim]:
        with self._lock:
            self.get_content(organisation_id, content_id)
            return [
                claim.model_copy(deep=True)
                for claim in self._claims[organisation_id].values()
                if claim.content_id == content_id
            ]

    def list_fact_versions(self, organisation_id: str, fact_id: str) -> list[FactVersion]:
        with self._lock:
            versions = self._facts[organisation_id].get(fact_id)
            if not versions:
                raise ImpactNotFoundError(fact_id)
            return [fact.model_copy(deep=True) for fact in versions]

    def get_fact_version(self, organisation_id: str, fact_id: str, fact_version: int) -> FactVersion:
        with self._lock:
            return self._find_fact_version(organisation_id, fact_id, fact_version).model_copy(deep=True)

    # Readable aliases make the local adapter straightforward to use from a test or demo.
    add_fact_version = create_fact_version
    add_content = register_content
    find_affected = list_affected
    request_recheck_all = recheck_all_affected
    expire_fact = end_fact_validity

    def _mark_affected(
        self,
        organisation_id: str,
        *,
        old_fact: FactVersion,
        new_fact: FactVersion | None,
        reason: ImpactReason,
        actor_id: str,
        trigger_event_id: str,
    ) -> None:
        for claim in list(self._claims[organisation_id].values()):
            if claim.fact_id != old_fact.fact_id or claim.fact_version != old_fact.fact_version:
                continue
            content = self._contents[organisation_id].get(claim.content_id)
            if content is None or (
                content.workflow_status not in self.eligible_content_statuses
                and content.workflow_status is not ImpactContentStatus.RE_REVIEW_REQUIRED
            ):
                continue
            claim_updated = claim.model_copy(update={"re_review_required": True})
            self._claims[organisation_id][claim.id] = claim_updated
            self._contents[organisation_id][content.id] = content.model_copy(
                update={
                    "re_review_required": True,
                    "workflow_status": ImpactContentStatus.RE_REVIEW_REQUIRED,
                    "previous_workflow_status": content.previous_workflow_status or content.workflow_status,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            key = (
                claim.content_id,
                claim.id,
                old_fact.fact_version,
                new_fact.fact_version if new_fact else None,
                reason,
            )
            if key in self._task_keys[organisation_id]:
                continue
            now = datetime.now(timezone.utc)
            task = ReReviewTask(
                id=str(uuid4()),
                organisation_id=organisation_id,
                content_id=claim.content_id,
                content_version_id=claim.content_version_id,
                claim_id=claim.id,
                fact_id=old_fact.fact_id,
                old_fact_version=old_fact.fact_version,
                new_fact_version=new_fact.fact_version if new_fact else None,
                old_value=old_fact.value,
                new_value=new_fact.value if new_fact else None,
                old_source_id=old_fact.source_id,
                old_source_version=old_fact.source_version,
                new_source_id=new_fact.source_id if new_fact else None,
                new_source_version=new_fact.source_version if new_fact else None,
                reason=reason,
                created_by=actor_id,
                created_at=now,
                updated_at=now,
                audit_event_ids=[trigger_event_id],
            )
            self._tasks[organisation_id][task.id] = task
            self._task_keys[organisation_id][key] = task.id

    def _reconcile_links(self, organisation_id: str, actor_id: str) -> None:
        """Catch stale/expired links registered after the triggering fact change."""

        for fact_id, versions in self._facts[organisation_id].items():
            current = self._latest_approved(versions)
            for previous in versions:
                if previous.status not in (ImpactFactStatus.SUPERSEDED, ImpactFactStatus.EXPIRED):
                    continue
                reason = (
                    ImpactReason.FACT_EXPIRED
                    if previous.status is ImpactFactStatus.EXPIRED
                    else ImpactReason.FACT_CHANGED
                )
                # A reconciliation event records why a newly registered stale link is flagged.
                existing_event = next(
                    (
                        event
                        for event in reversed(self._events[organisation_id])
                        if event.metadata.get("fact_id") == fact_id
                    ),
                    None,
                )
                if existing_event:
                    self._mark_affected(
                        organisation_id,
                        old_fact=previous,
                        new_fact=current if reason is ImpactReason.FACT_CHANGED else None,
                        reason=reason,
                        actor_id=actor_id,
                        trigger_event_id=existing_event.id,
                    )

    def _expire_due(self, organisation_id: str) -> None:
        """Observe natural validity endings without a scheduler or external service."""

        now = datetime.now(timezone.utc)
        for versions in list(self._facts[organisation_id].values()):
            for fact in list(versions):
                if (
                    fact.status is ImpactFactStatus.APPROVED
                    and fact.effective_to is not None
                    and fact.effective_to <= now
                ):
                    self.end_fact_validity(
                        organisation_id,
                        fact.fact_id,
                        FactValidityEndRequest(
                            fact_version=fact.fact_version,
                            effective_to=fact.effective_to,
                        ),
                        "system:validity-check",
                    )

    def _task_to_item(self, organisation_id: str, task: ReReviewTask) -> ImpactItem:
        claim = self._claims[organisation_id].get(task.claim_id)
        content = self._contents[organisation_id].get(task.content_id)
        if claim is None or content is None:
            raise ImpactValidationError(f"impact task points to missing stored record: {task.id}")
        return ImpactItem(
            task_id=task.id,
            content_id=content.id,
            content_version_id=task.content_version_id,
            claim_id=claim.id,
            title=content.title,
            workflow_status=content.workflow_status,
            previous_workflow_status=content.previous_workflow_status,
            re_review_required=content.re_review_required,
            claim_text=claim.claim_text,
            fact_id=task.fact_id,
            old_fact_version=task.old_fact_version,
            new_fact_version=task.new_fact_version,
            old_value=task.old_value,
            new_value=task.new_value,
            old_source_id=task.old_source_id,
            old_source_version=task.old_source_version,
            new_source_id=task.new_source_id,
            new_source_version=task.new_source_version,
            reason=task.reason,
            task_status=task.status,
            created_at=task.created_at,
        )

    def _record_event(
        self,
        organisation_id: str,
        event_type: str,
        object_id: str,
        actor_id: str,
        metadata: dict[str, Any],
    ) -> ImpactAuditEvent:
        event = ImpactAuditEvent(
            id=str(uuid4()),
            organisation_id=organisation_id,
            event_type=event_type,
            object_id=object_id,
            actor_id=actor_id,
            created_at=datetime.now(timezone.utc),
            metadata=metadata,
        )
        self._events[organisation_id].append(event)
        return event

    def _find_fact_version(
        self,
        organisation_id: str,
        fact_id: str,
        fact_version: int | None,
    ) -> FactVersion:
        versions = self._facts[organisation_id].get(fact_id, [])
        if fact_version is None:
            current = self._latest_approved(versions)
            if current is None:
                raise ImpactNotFoundError(fact_id)
            return current
        for record in versions:
            if record.fact_version == fact_version:
                return record
        raise ImpactNotFoundError(f"{fact_id}:{fact_version}")

    @staticmethod
    def _latest_approved(versions: list[FactVersion]) -> FactVersion | None:
        approved = [record for record in versions if record.status is ImpactFactStatus.APPROVED]
        return max(approved, key=lambda record: record.fact_version, default=None)

    def _replace_fact(self, organisation_id: str, replacement: FactVersion) -> None:
        records = self._facts[organisation_id][replacement.fact_id]
        for index, record in enumerate(records):
            if record.id == replacement.id:
                records[index] = replacement
                return
        raise ImpactNotFoundError(replacement.id)

    @staticmethod
    def _actor_id(actor: Principal | str) -> str:
        return actor.user_id if isinstance(actor, Principal) else actor

    @staticmethod
    def _check_actor(organisation_id: str, actor: Principal | str, *, require_owner: bool = False) -> None:
        if isinstance(actor, Principal):
            if actor.organisation_id != organisation_id:
                raise PermissionError("actor organisation does not match the stored record")
            allowed = {Role.BRAND_OWNER} if require_owner else {Role.BRAND_OWNER, Role.MANAGER}
            if actor.role not in allowed:
                raise PermissionError("this impact operation requires an authorised registry owner or manager")


# Alias named after the feature workstream for callers that prefer a more explicit adapter name.
InMemoryImpactStore = ImpactRadarStore


def seed_voltedge_impact_demo(
    store: ImpactRadarStore,
    *,
    organisation_id: str = "org-voltedge",
    actor: str = "user-voltedge-owner",
) -> dict[str, Any]:
    """Seed a compact fictional VoltEdge scenario for deterministic local tests."""

    owner = Principal(
        user_id=actor,
        organisation_id=organisation_id,
        role=Role.BRAND_OWNER,
        auth_source="test_override",
    )
    battery = store.create_fact_version(
        organisation_id,
        FactVersionCreateRequest(
            fact_id="fact-voltedge-novabook-battery",
            value="Up to 10 hours",
            unit="hours",
            status=ImpactFactStatus.APPROVED,
            source_id="source-voltedge-novabook-spec-v1",
            source_version="1",
        ),
        owner,
    )
    offer = store.create_fact_version(
        organisation_id,
        FactVersionCreateRequest(
            fact_id="fact-voltedge-october-offer",
            value="20% off NovaBook S1",
            unit="percent",
            status=ImpactFactStatus.APPROVED,
            effective_from=datetime(2026, 10, 1, tzinfo=timezone.utc),
            effective_to=datetime(2026, 10, 15, 23, 59, 59, tzinfo=timezone.utc),
            source_id="source-voltedge-offer-v1",
            source_version="1",
        ),
        owner,
    )
    battery_content = store.register_content(
        organisation_id,
        ImpactContentCreateRequest(
            content_id="content-voltedge-battery-email",
            content_version_id="content-version-voltedge-battery-v1",
            title="VoltEdge NovaBook S1 launch email",
            workflow_status=ImpactContentStatus.APPROVED,
            claims=[
                ImpactClaimCreateRequest(
                    claim_id="claim-voltedge-battery-email",
                    claim_text="VoltEdge NovaBook S1 delivers up to 10 hours of battery life.",
                    fact_id=battery.fact_id,
                    fact_version=battery.fact_version,
                    normalized_value=10,
                    unit="hours",
                )
            ],
        ),
        owner,
    )
    offer_content = store.register_content(
        organisation_id,
        ImpactContentCreateRequest(
            content_id="content-voltedge-offer-social",
            content_version_id="content-version-voltedge-offer-v1",
            title="VoltEdge October offer social post",
            workflow_status=ImpactContentStatus.IN_REVIEW,
            claims=[
                ImpactClaimCreateRequest(
                    claim_id="claim-voltedge-offer-social",
                    claim_text="Get 20% off VoltEdge NovaBook S1.",
                    fact_id=offer.fact_id,
                    fact_version=offer.fact_version,
                    normalized_value=20,
                    unit="percent",
                )
            ],
        ),
        owner,
    )
    return {
        "battery": battery,
        "offer": offer,
        "battery_content": battery_content,
        "offer_content": offer_content,
    }
