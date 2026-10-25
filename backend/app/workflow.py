from __future__ import annotations

"""Organisation-scoped content review workflow for the local API.

The workflow store is intentionally in-memory.  It provides a real domain boundary
for local development and tests while keeping the persistence label explicit at the
HTTP boundary.  A durable adapter can implement the same operations later without
changing the review contract.
"""

from collections import defaultdict, deque
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from threading import RLock
from typing import Any, Protocol
from uuid import uuid4

from .models import (
    AuditEvent,
    AuditRequest,
    AuditRun,
    AuditStatus,
    Comment,
    CommentCreateRequest,
    ContentCreateRequest,
    ContentItem,
    ContentVersion,
    ContentVersionCreateRequest,
    ContentWorkflowStatus,
    Finding,
    FindingAction,
    FindingActionRecord,
    FindingActionRequest,
    FindingDiff,
    FindingInput,
    FindingSeverity,
    FindingStatus,
    Principal,
    ReviewAction,
    ReviewDecision,
    ReviewRequest,
    Role,
    VaultResource,
)
from .store import InMemoryVaultStore


class WorkflowNotFoundError(LookupError):
    """Raised when an organisation-scoped workflow object is not visible."""


class WorkflowPermissionError(PermissionError):
    """Raised when a principal is not allowed to access or mutate an object."""


class WorkflowStateError(ValueError):
    """Raised when a workflow or finding transition is invalid."""


REVIEW_ROLES = (Role.MANAGER, Role.LEGAL_REVIEWER, Role.BRAND_OWNER)
CONTENT_CREATORS = (Role.CREATOR, Role.MANAGER, Role.BRAND_OWNER, Role.AGENCY)
HIGH_RISK_SEVERITIES = (
    FindingSeverity.CRITICAL,
    FindingSeverity.HIGH,
    FindingSeverity.REVIEW_REQUIRED,
)
REVISION_ALLOWED_STATES = (
    ContentWorkflowStatus.DRAFT,
    ContentWorkflowStatus.AI_CHECKED,
    ContentWorkflowStatus.CHANGES_REQUESTED,
    ContentWorkflowStatus.RESUBMITTED,
    ContentWorkflowStatus.RE_REVIEW_REQUIRED,
)
UNRESOLVED_FINDING_STATUSES = (
    FindingStatus.OPEN,
    FindingStatus.ACCEPTED,
    FindingStatus.EDITED,
)


class RevisionAuditor(Protocol):
    """Adapter implemented by a verification pipeline; output remains candidate data."""

    def __call__(self, principal: Principal, version: ContentVersion) -> AuditRequest: ...


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


class InMemoryWorkflowStore:
    """Tenant-aware state machine and audit ledger used by the local FastAPI service."""

    def __init__(
        self,
        *,
        vault_store: InMemoryVaultStore | None = None,
        revision_auditor: RevisionAuditor | None = None,
    ) -> None:
        self._contents: dict[str, dict[str, ContentItem]] = defaultdict(dict)
        self._versions: dict[str, dict[str, ContentVersion]] = defaultdict(dict)
        self._audits: dict[str, dict[str, AuditRun]] = defaultdict(dict)
        self._findings: dict[str, dict[str, Finding]] = defaultdict(dict)
        self._comments: dict[str, dict[str, Comment]] = defaultdict(dict)
        self._decisions: dict[str, list[ReviewDecision]] = defaultdict(list)
        self._finding_actions: dict[str, list[FindingActionRecord]] = defaultdict(list)
        self._events: dict[str, list[AuditEvent]] = defaultdict(list)
        # The public event hash follows the API's canonical event payload.  Keep a
        # private immutable ID snapshot as an additional local tamper check because
        # the canonical payload intentionally omits the opaque event ID.
        self._event_id_snapshots: dict[str, list[str]] = defaultdict(list)
        self._lock = RLock()
        self._vault_store = vault_store
        self._revision_auditor = revision_auditor

    # -------------------------------------------------------------------------
    # Access and object lookup
    # -------------------------------------------------------------------------
    @staticmethod
    def can_view_content(content: ContentItem, principal: Principal) -> bool:
        if content.organisation_id != principal.organisation_id:
            return False
        if principal.role in (Role.BRAND_OWNER, Role.MANAGER, Role.LEGAL_REVIEWER):
            return True
        if principal.role is Role.AGENCY:
            return bool(
                principal.agency_id
                and content.assigned_agency_id
                and principal.agency_id == content.assigned_agency_id
            )
        return content.owner_user_id == principal.user_id

    @classmethod
    def can_edit_content(cls, content: ContentItem, principal: Principal) -> bool:
        if not cls.can_view_content(content, principal):
            return False
        if principal.role in (Role.CREATOR, Role.AGENCY, Role.MANAGER, Role.BRAND_OWNER):
            return True
        return False

    def _content(self, organisation_id: str, content_id: str) -> ContentItem:
        content = self._contents[organisation_id].get(content_id)
        if content is None:
            raise WorkflowNotFoundError(content_id)
        return content

    def _version(self, organisation_id: str, version_id: str) -> ContentVersion:
        version = self._versions[organisation_id].get(version_id)
        if version is None:
            raise WorkflowNotFoundError(version_id)
        return version

    def get_content(self, principal: Principal, content_id: str) -> ContentItem:
        with self._lock:
            content = self._content(principal.organisation_id, content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(content_id)
            return content.model_copy(deep=True)

    def get_version(self, principal: Principal, version_id: str) -> ContentVersion:
        with self._lock:
            version = self._version(principal.organisation_id, version_id)
            content = self._content(principal.organisation_id, version.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(version_id)
            return version.model_copy(deep=True)

    def list_contents(self, principal: Principal) -> list[ContentItem]:
        with self._lock:
            return [
                item.model_copy(deep=True)
                for item in self._contents[principal.organisation_id].values()
                if self.can_view_content(item, principal)
            ]

    def list_versions(self, principal: Principal, content_id: str) -> list[ContentVersion]:
        with self._lock:
            content = self._content(principal.organisation_id, content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(content_id)
            return sorted(
                (
                    version.model_copy(deep=True)
                    for version in self._versions[principal.organisation_id].values()
                    if version.content_id == content_id
                ),
                key=lambda value: value.version,
            )

    # -------------------------------------------------------------------------
    # Content and revision lifecycle
    # -------------------------------------------------------------------------
    def create_content(
        self,
        principal: Principal,
        payload: ContentCreateRequest,
    ) -> tuple[ContentItem, ContentVersion]:
        if principal.role not in CONTENT_CREATORS:
            raise WorkflowPermissionError(f"role {principal.role.value} cannot create content")
        if not payload.title.strip():
            raise WorkflowStateError("content title must not be blank")
        if not (payload.effective_text or "").strip():
            raise WorkflowStateError("text is required by the workflow adapter; use the ingestion pipeline for files")

        owner_user_id = payload.owner_user_id or principal.user_id
        assigned_agency_id = payload.effective_agency_id
        if principal.role in (Role.CREATOR, Role.AGENCY) and owner_user_id != principal.user_id:
            raise WorkflowPermissionError("creators and agencies may only create content they own")
        if principal.role is Role.CREATOR and assigned_agency_id:
            raise WorkflowPermissionError("only a manager or brand owner may assign an agency")
        if principal.role is Role.AGENCY:
            assigned_agency_id = assigned_agency_id or principal.agency_id
            if not principal.agency_id or assigned_agency_id != principal.agency_id:
                raise WorkflowPermissionError("agency content must be assigned to the caller's agency")

        now = _now()
        content_id = str(uuid4())
        version_id = str(uuid4())
        version = ContentVersion(
            id=version_id,
            organisation_id=principal.organisation_id,
            content_id=content_id,
            version=1,
            source_text=payload.effective_text,
            extracted_text=payload.effective_text,
            workflow_status=ContentWorkflowStatus.DRAFT,
            created_by=principal.user_id,
            created_at=now,
            metadata=payload.metadata,
        )
        content = ContentItem(
            id=content_id,
            organisation_id=principal.organisation_id,
            title=payload.title,
            content_type=payload.content_type,
            owner_user_id=owner_user_id,
            created_by=principal.user_id,
            assigned_agency_id=assigned_agency_id,
            workflow_status=ContentWorkflowStatus.DRAFT,
            current_version_id=version_id,
            metadata=payload.metadata,
            created_at=now,
            updated_at=now,
        )
        with self._lock:
            self._contents[principal.organisation_id][content_id] = content
            self._versions[principal.organisation_id][version_id] = version
            self._append_event(
                principal,
                event_type="content_created",
                object_type="content",
                object_id=content_id,
                metadata={"content_id": content_id, "version_id": version_id, "content_version": 1},
            )
        return content.model_copy(deep=True), version.model_copy(deep=True)

    def create_revision(
        self,
        principal: Principal,
        content_id: str,
        payload: ContentVersionCreateRequest,
    ) -> ContentVersion:
        with self._lock:
            content = self._content(principal.organisation_id, content_id)
            if not self.can_edit_content(content, principal):
                raise WorkflowNotFoundError(content_id)
            previous = self._version(principal.organisation_id, content.current_version_id)
            if previous.workflow_status is ContentWorkflowStatus.IN_REVIEW:
                raise WorkflowStateError("request changes before revising content under review")
            if previous.workflow_status not in REVISION_ALLOWED_STATES:
                raise WorkflowStateError(
                    "approved or released content must be marked for re-review before creating a revision"
                )
            source_text = payload.effective_text
            if source_text is None:
                source_text = previous.source_text
            if not (source_text or "").strip():
                raise WorkflowStateError("revision text must not be empty")
            existing = [
                version.version
                for version in self._versions[principal.organisation_id].values()
                if version.content_id == content_id
            ]
            now = _now()
            version = ContentVersion(
                id=str(uuid4()),
                organisation_id=principal.organisation_id,
                content_id=content_id,
                version=max(existing, default=0) + 1,
                source_text=source_text,
                extracted_text=source_text,
                workflow_status=ContentWorkflowStatus.DRAFT,
                created_by=principal.user_id,
                parent_version_id=previous.id,
                created_at=now,
                metadata={**previous.metadata, **payload.metadata},
            )
            self._versions[principal.organisation_id][version.id] = version
            self._contents[principal.organisation_id][content_id] = content.model_copy(
                update={
                    "current_version_id": version.id,
                    "workflow_status": ContentWorkflowStatus.DRAFT,
                    "updated_at": now,
                }
            )
            self._append_event(
                principal,
                event_type="content_revision_created",
                object_type="content_version",
                object_id=version.id,
                metadata={
                    "content_id": content_id,
                    "parent_version_id": previous.id,
                    "version": version.version,
                    "auto_recheck": payload.auto_recheck,
                },
            )
            return version.model_copy(deep=True)

    # -------------------------------------------------------------------------
    # Auditing and finding lifecycle
    # -------------------------------------------------------------------------
    def create_audit(
        self,
        principal: Principal,
        version_id: str,
        payload: AuditRequest,
        *,
        previous_audit_id: str | None = None,
        audit_status: AuditStatus = AuditStatus.COMPLETED,
        service_metadata: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> tuple[AuditRun, list[Finding]]:
        with self._lock:
            version = self._version(principal.organisation_id, version_id)
            content = self._content(principal.organisation_id, version.content_id)
            if not self.can_edit_content(content, principal):
                raise WorkflowNotFoundError(version_id)
            if content.current_version_id != version.id:
                raise WorkflowStateError("only the current content version can be audited")
            if version.workflow_status in (
                ContentWorkflowStatus.IN_REVIEW,
                ContentWorkflowStatus.APPROVED,
                ContentWorkflowStatus.RELEASED,
            ):
                raise WorkflowStateError("create a revision or require re-review before auditing a reviewed version")
            if version.latest_audit_id is not None:
                raise WorkflowStateError("content versions are immutable; create a new revision before auditing again")
            if not (version.source_text or "").strip():
                raise WorkflowStateError("cannot audit empty content")
            if payload.model_provider or payload.model_name or payload.model_version:
                raise WorkflowStateError("model metadata must be recorded by the configured pipeline, not supplied by a caller")
            for candidate in payload.findings:
                self._validate_finding(version, candidate)
            if previous_audit_id is None:
                previous_audit_id = version.latest_audit_id
                if previous_audit_id is None and version.parent_version_id:
                    previous_audit_id = self._version(
                        principal.organisation_id, version.parent_version_id
                    ).latest_audit_id
            if previous_audit_id is not None:
                previous_audit = self._audits[principal.organisation_id].get(previous_audit_id)
                if previous_audit is None or previous_audit.content_id != content.id:
                    raise WorkflowStateError("comparison audit must belong to the same content item")

            audit_id = str(uuid4())
            now = _now()
            findings: list[Finding] = []
            for finding_input in payload.findings:
                finding = Finding(
                    **finding_input.model_dump(),
                    id=str(uuid4()),
                    organisation_id=principal.organisation_id,
                    content_id=content.id,
                    content_version_id=version.id,
                    audit_run_id=audit_id,
                    created_at=now,
                )
                self._findings[principal.organisation_id][finding.id] = finding
                findings.append(finding)

            previous_findings = self._findings_for_audit(principal.organisation_id, previous_audit_id)
            diff = self._diff_findings(previous_findings, findings) if audit_status is AuditStatus.COMPLETED else FindingDiff()
            audit = AuditRun(
                id=audit_id,
                organisation_id=principal.organisation_id,
                content_id=content.id,
                content_version_id=version.id,
                requested_by=principal.user_id,
                status=audit_status,
                ruleset_version=payload.ruleset_version,
                model_provider=payload.model_provider,
                model_name=payload.model_name,
                model_version=payload.model_version,
                previous_audit_id=previous_audit_id,
                finding_diff=diff,
                service_metadata=service_metadata or {"mode": "validated_candidate_ingestion", "ai_provider": "not_configured"},
                error=error,
                created_at=now,
                completed_at=now,
            )
            self._audits[principal.organisation_id][audit_id] = audit
            target_status = ContentWorkflowStatus.AI_CHECKED
            parent_status = None
            if version.parent_version_id:
                parent_status = self._version(principal.organisation_id, version.parent_version_id).workflow_status
            if version.workflow_status is ContentWorkflowStatus.CHANGES_REQUESTED or parent_status is ContentWorkflowStatus.CHANGES_REQUESTED:
                target_status = ContentWorkflowStatus.RESUBMITTED
            if audit_status in (AuditStatus.FAILED, AuditStatus.REVIEW_REQUIRED):
                target_status = ContentWorkflowStatus.RE_REVIEW_REQUIRED
            self._versions[principal.organisation_id][version.id] = version.model_copy(
                update={
                    "latest_audit_id": audit_id,
                    "workflow_status": target_status,
                    "submitted_at": None,
                }
            )
            self._contents[principal.organisation_id][content.id] = content.model_copy(
                update={
                    "current_version_id": version.id,
                    "workflow_status": target_status,
                    "updated_at": now,
                }
            )
            self._append_event(
                principal,
                event_type=f"audit_{audit_status.value}",
                object_type="audit",
                object_id=audit_id,
                metadata={
                    "content_id": content.id,
                    "content_version_id": version.id,
                    "finding_count": len(findings),
                    "resolved_count": len(diff.resolved_finding_ids),
                    "new_count": len(diff.new_finding_ids),
                    "ruleset_version": payload.ruleset_version,
                },
            )
            for finding in findings:
                self._append_event(
                    principal,
                    event_type="finding_created",
                    object_type="finding",
                    object_id=finding.id,
                    metadata={
                        "content_id": finding.content_id,
                        "content_version_id": finding.content_version_id,
                        "audit_run_id": audit_id,
                        "severity": finding.severity.value,
                        "category": finding.category.value,
                    },
                )
            return audit.model_copy(deep=True), [finding.model_copy(deep=True) for finding in findings]

    def _validate_finding(self, version: ContentVersion, finding: FindingInput) -> None:
        source_text = version.source_text or ""
        if source_text[finding.span.start:finding.span.end] != finding.span.text:
            raise WorkflowStateError("finding span must match the audited content version")
        if not finding.reason.strip():
            raise WorkflowStateError("finding reason must not be blank")
        if finding.evidence is None:
            return
        if self._vault_store is None:
            raise WorkflowStateError("evidence validation is unavailable")
        evidence_source_id = finding.evidence.source_id
        evidence_record_id = finding.evidence.record_id
        evidence_version = finding.evidence.version
        records = []
        for resource in VaultResource:
            for record in self._vault_store.list(version.organisation_id, resource):
                identifier_matches = record.id in (evidence_source_id, evidence_record_id) or record.source_id in (
                    evidence_source_id,
                    evidence_record_id,
                )
                version_matches = evidence_version in {
                    str(record.version),
                    str(record.source_version) if record.source_version is not None else "",
                }
                if identifier_matches and version_matches and record.status.value in {
                    "approved",
                    "expired",
                    "superseded",
                }:
                    records.append(record)
        now = _now()
        records = [
            record for record in records
            if record.status.value != "approved"
            or (
                (record.effective_from is None or record.effective_from.replace(tzinfo=record.effective_from.tzinfo or timezone.utc) <= now)
                and (record.effective_to is None or record.effective_to.replace(tzinfo=record.effective_to.tzinfo or timezone.utc) >= now)
            )
        ]
        if not records:
            raise WorkflowStateError("evidence must identify an applicable approved record in the caller's organisation")
        quote = finding.evidence.quote.strip()
        if not quote or not any(
            quote in _canonical_json(record.value)
            or quote in " ".join(str(value) for value in record.value.values())
            for record in records
        ):
            raise WorkflowStateError("evidence quote must be present in the approved registry record")

    def auto_recheck_revision(
        self,
        principal: Principal,
        version_id: str,
        supplied_findings: list[FindingInput] | None = None,
    ) -> tuple[AuditRun, list[Finding]] | None:
        with self._lock:
            version = self._version(principal.organisation_id, version_id)
            previous_audit_id = None
            if version.parent_version_id:
                previous = self._version(principal.organisation_id, version.parent_version_id)
                previous_audit_id = previous.latest_audit_id
            if supplied_findings is not None:
                payload = AuditRequest(findings=supplied_findings, ruleset_version="validated-recheck-v1")
                return self.create_audit(
                    principal, version_id, payload, previous_audit_id=previous_audit_id
                )
            return self.run_audit(principal, version_id, previous_audit_id=previous_audit_id)

    def run_audit(
        self,
        principal: Principal,
        version_id: str,
        *,
        previous_audit_id: str | None = None,
    ) -> tuple[AuditRun, list[Finding]]:
        """Run a configured server-side auditor, failing visibly when unavailable."""
        with self._lock:
            version = self.get_version(principal, version_id)
            if self._revision_auditor is None:
                return self.create_audit(
                    principal,
                    version_id,
                    AuditRequest(ruleset_version="unconfigured-recheck-v1"),
                    previous_audit_id=previous_audit_id,
                    audit_status=AuditStatus.REVIEW_REQUIRED,
                    service_metadata={"mode": "unconfigured", "automatic_recheck": "not_configured"},
                    error="No verification pipeline is configured for this workflow adapter.",
                )
            try:
                payload = self._revision_auditor(principal, version)
                if not isinstance(payload, AuditRequest):
                    raise WorkflowStateError("auditor returned an invalid result")
                return self.create_audit(
                    principal,
                    version_id,
                    payload,
                    previous_audit_id=previous_audit_id,
                    service_metadata={"mode": "configured_server_auditor"},
                )
            except (WorkflowNotFoundError, WorkflowPermissionError):
                raise
            except Exception:
                return self.create_audit(
                    principal,
                    version_id,
                    AuditRequest(ruleset_version="failed-recheck-v1"),
                    previous_audit_id=previous_audit_id,
                    audit_status=AuditStatus.FAILED,
                    service_metadata={"mode": "configured_server_auditor", "result_validated": False},
                    error="The verification pipeline failed or returned invalid output; human review is required.",
                )

    def get_audit(self, principal: Principal, audit_id: str) -> tuple[AuditRun, list[Finding]]:
        with self._lock:
            audit = self._audits[principal.organisation_id].get(audit_id)
            if audit is None:
                raise WorkflowNotFoundError(audit_id)
            content = self._content(principal.organisation_id, audit.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(audit_id)
            return audit.model_copy(deep=True), [
                finding.model_copy(deep=True)
                for finding in self._findings_for_audit(principal.organisation_id, audit_id)
            ]

    def get_finding(self, principal: Principal, finding_id: str) -> Finding:
        with self._lock:
            finding = self._findings[principal.organisation_id].get(finding_id)
            if finding is None:
                raise WorkflowNotFoundError(finding_id)
            content = self._content(principal.organisation_id, finding.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(finding_id)
            return finding.model_copy(deep=True)

    def act_on_finding(
        self,
        principal: Principal,
        finding_id: str,
        payload: FindingActionRequest,
    ) -> Finding:
        with self._lock:
            finding = self._findings[principal.organisation_id].get(finding_id)
            if finding is None:
                raise WorkflowNotFoundError(finding_id)
            content = self._content(principal.organisation_id, finding.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(finding_id)

            creator_scope = principal.role in (Role.CREATOR, Role.AGENCY)
            if creator_scope and not self.can_edit_content(content, principal):
                raise WorkflowPermissionError("creator may only act on own findings")
            if principal.role not in (*REVIEW_ROLES, Role.CREATOR, Role.AGENCY):
                raise WorkflowPermissionError(f"role {principal.role.value} cannot act on findings")
            if payload.action is FindingAction.OVERRIDE and principal.role not in REVIEW_ROLES:
                raise WorkflowPermissionError("only an authorised reviewer may override a finding")
            version = self._version(principal.organisation_id, finding.content_version_id)
            if content.current_version_id != version.id or version.latest_audit_id != finding.audit_run_id:
                raise WorkflowStateError("actions must target the current version's latest audit")
            if version.workflow_status in (ContentWorkflowStatus.APPROVED, ContentWorkflowStatus.RELEASED):
                raise WorkflowStateError("approved or released findings are immutable; create a revision")
            if payload.action is FindingAction.RESOLVE:
                raise WorkflowStateError("only a completed recheck can resolve a finding")
            if finding.status is FindingStatus.DISMISSED and payload.action not in (
                FindingAction.REOPEN,
                FindingAction.OVERRIDE,
            ):
                raise WorkflowStateError("dismissed findings must be reopened before another action")
            if finding.status is FindingStatus.OVERRIDDEN and payload.action is not FindingAction.REOPEN:
                raise WorkflowStateError("overridden findings are immutable unless explicitly reopened")
            if payload.action is FindingAction.OVERRIDE and finding.severity in HIGH_RISK_SEVERITIES and principal.role is Role.MANAGER:
                raise WorkflowPermissionError("manager cannot override a high-risk finding")
            if payload.action in (FindingAction.DISMISS, FindingAction.OVERRIDE) and not (payload.reason or "").strip():
                raise WorkflowStateError("a written reason is required to dismiss or override a finding")
            if payload.action is FindingAction.EDIT and not (payload.replacement_text or "").strip():
                raise WorkflowStateError("edited findings require replacement_text")

            now = _now()
            updates: dict[str, Any] = {"action_by": principal.user_id, "action_at": now}
            if payload.action is FindingAction.ACCEPT:
                updates["status"] = FindingStatus.ACCEPTED
            elif payload.action is FindingAction.EDIT:
                updates["status"] = FindingStatus.EDITED
                updates["edited_text"] = payload.replacement_text
            elif payload.action is FindingAction.DISMISS:
                updates["status"] = FindingStatus.DISMISSED
                updates["dismiss_reason"] = payload.reason.strip() if payload.reason else None
            elif payload.action is FindingAction.OVERRIDE:
                updates["status"] = FindingStatus.OVERRIDDEN
                updates["override_reason"] = payload.reason.strip() if payload.reason else None
            elif payload.action is FindingAction.REOPEN:
                updates["status"] = FindingStatus.OPEN
                updates["dismiss_reason"] = None
                updates["override_reason"] = None
            else:  # pragma: no cover - enum validation prevents this branch.
                raise WorkflowStateError(f"unsupported finding action {payload.action.value}")
            updated = finding.model_copy(update=updates)
            self._findings[principal.organisation_id][finding_id] = updated
            action_record = FindingActionRecord(
                id=str(uuid4()),
                finding_id=finding_id,
                organisation_id=principal.organisation_id,
                actor_id=principal.user_id,
                actor_role=principal.role,
                action=payload.action,
                reason=payload.reason.strip() if payload.reason else None,
                replacement_text=payload.replacement_text,
                created_at=now,
            )
            self._finding_actions[principal.organisation_id].append(action_record)
            self._append_event(
                principal,
                event_type=f"finding_{payload.action.value}",
                object_type="finding",
                object_id=finding_id,
                metadata={
                    "content_id": finding.content_id,
                    "content_version_id": finding.content_version_id,
                    "reason_provided": bool((payload.reason or "").strip()),
                    "action_record_id": action_record.id,
                    "reason": action_record.reason,
                    "before_status": finding.status.value,
                    "after_status": updated.status.value,
                },
            )
            return updated.model_copy(deep=True)

    @staticmethod
    def _finding_fingerprint(finding: Finding | FindingInput) -> tuple[str, ...]:
        return (
            str(finding.span.start),
            str(finding.span.end),
            finding.span.text,
            finding.category.value,
            finding.verdict.value,
        )

    def _findings_for_audit(self, organisation_id: str, audit_id: str | None) -> list[Finding]:
        if not audit_id:
            return []
        return [
            finding
            for finding in self._findings[organisation_id].values()
            if finding.audit_run_id == audit_id
        ]

    def _diff_findings(
        self,
        previous: list[Finding],
        current: list[Finding],
    ) -> FindingDiff:
        remaining: dict[tuple[str, ...], deque[Finding]] = defaultdict(deque)
        for finding in previous:
            remaining[self._finding_fingerprint(finding)].append(finding)
        new: list[str] = []
        unchanged: list[str] = []
        for finding in current:
            candidates = remaining[self._finding_fingerprint(finding)]
            if candidates:
                candidates.popleft()
                unchanged.append(finding.id)
            else:
                new.append(finding.id)
        resolved = [finding.id for candidates in remaining.values() for finding in candidates]
        return FindingDiff(
            resolved_finding_ids=resolved,
            new_finding_ids=new,
            unchanged_finding_ids=unchanged,
        )

    # -------------------------------------------------------------------------
    # Review state machine
    # -------------------------------------------------------------------------
    def review(
        self,
        principal: Principal,
        version_id: str,
        payload: ReviewRequest,
    ) -> tuple[ContentVersion, ReviewDecision]:
        with self._lock:
            version = self._version(principal.organisation_id, version_id)
            content = self._content(principal.organisation_id, version.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(version_id)
            if content.current_version_id != version.id:
                raise WorkflowStateError("review actions must target the current content version")
            action = payload.action
            current = version.workflow_status
            now = _now()

            if action in (ReviewAction.SUBMIT, ReviewAction.RESUBMIT):
                if principal.role not in (Role.CREATOR, Role.AGENCY, Role.MANAGER, Role.BRAND_OWNER):
                    raise WorkflowPermissionError("role cannot submit content for review")
                if not self.can_edit_content(content, principal):
                    raise WorkflowPermissionError("caller cannot submit this content")
                self._require_completed_audit(principal.organisation_id, version)
                if action is ReviewAction.SUBMIT:
                    if current not in (ContentWorkflowStatus.AI_CHECKED, ContentWorkflowStatus.RESUBMITTED):
                        raise WorkflowStateError("only ai_checked or resubmitted content can enter review")
                    target = ContentWorkflowStatus.IN_REVIEW
                else:
                    if current is not ContentWorkflowStatus.CHANGES_REQUESTED:
                        raise WorkflowStateError("only changes_requested content can be resubmitted")
                    raise WorkflowStateError("create a fresh revision and completed recheck before resubmission")
            elif action is ReviewAction.REQUEST_CHANGES:
                if principal.role not in REVIEW_ROLES:
                    raise WorkflowPermissionError("only an authorised reviewer may request changes")
                if current not in (
                    ContentWorkflowStatus.AI_CHECKED,
                    ContentWorkflowStatus.IN_REVIEW,
                    ContentWorkflowStatus.RESUBMITTED,
                ):
                    raise WorkflowStateError("request changes is only valid after a check or during review")
                if not (payload.reason or payload.comment or "").strip():
                    raise WorkflowStateError("requesting changes requires a written reason or comment")
                target = ContentWorkflowStatus.CHANGES_REQUESTED
            elif action is ReviewAction.APPROVE:
                self._check_approval_permission(principal, content, version)
                if current is not ContentWorkflowStatus.IN_REVIEW:
                    raise WorkflowStateError("only in_review content can be approved")
                self._require_completed_audit(principal.organisation_id, version)
                latest_findings = self._findings_for_audit(principal.organisation_id, version.latest_audit_id)
                blocked = [
                    finding for finding in latest_findings
                    if finding.severity in HIGH_RISK_SEVERITIES
                    and finding.status is not FindingStatus.OVERRIDDEN
                ]
                if principal.role is Role.MANAGER and blocked:
                    raise WorkflowPermissionError(
                        "manager approval is limited to low/medium-risk content; High risk requires legal_reviewer or brand_owner"
                    )
                overrides = set(payload.override_finding_ids)
                if len(payload.override_finding_ids) != len(overrides):
                    raise WorkflowStateError("approval override finding IDs must be unique")
                if overrides:
                    if not (payload.reason or "").strip():
                        raise WorkflowStateError("approval overrides require a written reason")
                    if any(finding_id not in {finding.id for finding in latest_findings} for finding_id in overrides):
                        raise WorkflowStateError("approval overrides must belong to the current audit")
                    if principal.role not in (Role.BRAND_OWNER, Role.LEGAL_REVIEWER):
                        raise WorkflowPermissionError("high-risk overrides require legal_reviewer or brand_owner")
                    if any(
                        finding.status in (FindingStatus.DISMISSED, FindingStatus.OVERRIDDEN)
                        for finding in latest_findings
                        if finding.id in overrides
                    ):
                        raise WorkflowStateError("dismissed or overridden findings must be reopened before another override")
                if any(finding.id not in overrides for finding in blocked):
                    raise WorkflowStateError("unresolved high-risk findings require explicit reviewer overrides and reasons")
                for finding_id in payload.override_finding_ids:
                    self.act_on_finding(
                        principal,
                        finding_id,
                        FindingActionRequest(action=FindingAction.OVERRIDE, reason=payload.reason),
                    )
                target = ContentWorkflowStatus.APPROVED
            elif action is ReviewAction.RELEASE:
                if principal.role not in (Role.MANAGER, Role.BRAND_OWNER):
                    raise WorkflowPermissionError("only a manager or brand owner may release content")
                if current is not ContentWorkflowStatus.APPROVED:
                    raise WorkflowStateError("only approved content can be released")
                target = ContentWorkflowStatus.RELEASED
            elif action is ReviewAction.MARK_RE_REVIEW_REQUIRED:
                if principal.role not in REVIEW_ROLES:
                    raise WorkflowPermissionError("only an authorised reviewer may require re-review")
                if current not in (ContentWorkflowStatus.RELEASED, ContentWorkflowStatus.APPROVED):
                    raise WorkflowStateError("only approved or released content can be marked for re-review")
                if not (payload.reason or payload.comment or "").strip():
                    raise WorkflowStateError("re-review requires a written reason or comment")
                target = ContentWorkflowStatus.RE_REVIEW_REQUIRED
            else:  # pragma: no cover - enum validation prevents this branch.
                raise WorkflowStateError(f"unsupported review action {action.value}")

            updated_version = version.model_copy(
                update={
                    "workflow_status": target,
                    "submitted_at": now if target is ContentWorkflowStatus.IN_REVIEW else version.submitted_at,
                }
            )
            self._versions[principal.organisation_id][version.id] = updated_version
            self._contents[principal.organisation_id][content.id] = content.model_copy(
                update={"workflow_status": target, "updated_at": now}
            )
            decision = ReviewDecision(
                id=str(uuid4()),
                organisation_id=principal.organisation_id,
                content_id=content.id,
                content_version_id=version.id,
                actor_id=principal.user_id,
                actor_role=principal.role,
                action=action,
                reason=payload.reason,
                comment=payload.comment,
                created_at=now,
            )
            self._decisions[principal.organisation_id].append(decision)
            self._append_event(
                principal,
                event_type=f"review_{action.value}",
                object_type="content_version",
                object_id=version.id,
                metadata={
                    "content_id": content.id,
                    "from_status": current.value,
                    "to_status": target.value,
                    "decision_id": decision.id,
                    "reason_provided": bool((payload.reason or payload.comment or "").strip()),
                    "reason": payload.reason,
                    "comment": payload.comment,
                },
            )
            return updated_version.model_copy(deep=True), decision.model_copy(deep=True)

    def _require_completed_audit(self, organisation_id: str, version: ContentVersion) -> AuditRun:
        audit = self._audits[organisation_id].get(version.latest_audit_id or "")
        if audit is None or audit.content_version_id != version.id or audit.status not in {
            AuditStatus.COMPLETED,
            AuditStatus.REVIEW_REQUIRED,
        }:
            raise WorkflowStateError("a completed or explicitly review-required audit of this version is required before review")
        return audit

    def _check_approval_permission(
        self,
        principal: Principal,
        content: ContentItem,
        version: ContentVersion,
    ) -> None:
        if principal.role not in REVIEW_ROLES:
            raise WorkflowPermissionError("only an authorised reviewer may approve content")
        if principal.user_id in (content.owner_user_id, version.created_by):
            raise WorkflowPermissionError("authors and content owners cannot approve their own version")
        if principal.role is Role.MANAGER:
            findings = self._findings_for_audit(principal.organisation_id, version.latest_audit_id)
            blocked = [
                finding
                for finding in findings
                if finding.severity in HIGH_RISK_SEVERITIES
            ]
            if blocked:
                raise WorkflowPermissionError(
                    "manager approval is limited to low/medium-risk content; High risk requires legal_reviewer or brand_owner"
                )

    def _findings_for_version(self, organisation_id: str, version_id: str) -> list[Finding]:
        return [
            finding
            for finding in self._findings[organisation_id].values()
            if finding.content_version_id == version_id
        ]

    # -------------------------------------------------------------------------
    # Threaded comments
    # -------------------------------------------------------------------------
    def create_comment(
        self,
        principal: Principal,
        version_id: str,
        payload: CommentCreateRequest,
    ) -> Comment:
        with self._lock:
            version = self._version(principal.organisation_id, version_id)
            content = self._content(principal.organisation_id, version.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(version_id)
            if not payload.body.strip():
                raise WorkflowStateError("comment body must not be blank")
            anchor = payload.effective_anchor
            finding_id = payload.finding_id
            if payload.parent_comment_id:
                parent = self._comments[principal.organisation_id].get(payload.parent_comment_id)
                if parent is None or parent.content_version_id != version_id:
                    raise WorkflowStateError("parent comment must belong to the same content version")
                if anchor is not None and anchor != parent.anchor:
                    raise WorkflowStateError("thread replies must retain the parent comment's text anchor")
                if finding_id is not None and parent.finding_id not in (None, finding_id):
                    raise WorkflowStateError("thread replies must retain the parent comment's finding anchor")
                anchor = parent.anchor
                finding_id = finding_id or parent.finding_id
            if finding_id:
                finding = self._findings[principal.organisation_id].get(finding_id)
                if finding is None or finding.content_version_id != version_id:
                    raise WorkflowStateError("finding must belong to the same content version")
                if anchor is None:
                    anchor = finding.span
                elif anchor != finding.span:
                    raise WorkflowStateError("comment anchor must match the linked finding span")
            if anchor and (version.source_text or "")[anchor.start:anchor.end] != anchor.text:
                raise WorkflowStateError("comment span must match the exact content version text")
            now = _now()
            comment = Comment(
                id=str(uuid4()),
                organisation_id=principal.organisation_id,
                content_id=content.id,
                content_version_id=version_id,
                author_id=principal.user_id,
                author_role=principal.role,
                anchor=anchor,
                span=anchor,
                finding_id=finding_id,
                parent_comment_id=payload.parent_comment_id,
                body=payload.body.strip(),
                created_at=now,
                updated_at=now,
            )
            self._comments[principal.organisation_id][comment.id] = comment
            self._append_event(
                principal,
                event_type="comment_created",
                object_type="comment",
                object_id=comment.id,
                metadata={
                    "content_id": content.id,
                    "content_version_id": version_id,
                    "parent_comment_id": payload.parent_comment_id,
                    "finding_id": finding_id,
                    "has_span": anchor is not None,
                    "body_sha256": hashlib.sha256(comment.body.encode("utf-8")).hexdigest(),
                    "anchor": anchor.model_dump(mode="json") if anchor else None,
                },
            )
            return comment.model_copy(deep=True)

    def list_comments(self, principal: Principal, version_id: str) -> list[Comment]:
        with self._lock:
            version = self._version(principal.organisation_id, version_id)
            content = self._content(principal.organisation_id, version.content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(version_id)
            return sorted(
                (
                    comment.model_copy(deep=True)
                    for comment in self._comments[principal.organisation_id].values()
                    if comment.content_version_id == version_id
                ),
                key=lambda value: value.created_at,
            )

    # -------------------------------------------------------------------------
    # Hash-chained audit events and JSON export
    # -------------------------------------------------------------------------
    @staticmethod
    def _event_hash_payload(event: AuditEvent, previous_hash: str | None) -> dict[str, Any]:
        """Return the stable public payload used for an event's SHA-256 hash.

        Opaque event IDs are kept as identifiers, but are intentionally excluded from
        the public canonical payload so exported clients can reproduce the digest from
        the documented event fields.  The in-memory adapter separately snapshots IDs
        to detect identifier tampering during local chain verification.
        """

        return {
            "organisation_id": event.organisation_id,
            "actor_id": event.actor_id,
            "actor_role": event.actor_role.value if event.actor_role else None,
            "event_type": event.event_type,
            "object_type": event.object_type,
            "object_id": event.object_id,
            "metadata": event.metadata,
            "prev_hash": previous_hash,
            "occurred_at": event.occurred_at.isoformat(),
        }

    def _append_event(
        self,
        principal: Principal,
        *,
        event_type: str,
        object_type: str,
        object_id: str | None,
        metadata: dict[str, Any],
    ) -> AuditEvent:
        events = self._events[principal.organisation_id]
        prev_hash = events[-1].hash if events else None
        occurred_at = _now()
        event_id = str(uuid4())
        event = AuditEvent(
            id=event_id,
            organisation_id=principal.organisation_id,
            actor_id=principal.user_id,
            actor_role=principal.role,
            event_type=event_type,
            object_type=object_type,
            object_id=object_id,
            metadata=deepcopy(metadata),
            prev_hash=prev_hash,
            hash="",
            occurred_at=occurred_at,
        )
        event_hash = hashlib.sha256(
            _canonical_json(self._event_hash_payload(event, prev_hash)).encode("utf-8")
        ).hexdigest()
        event = event.model_copy(update={"hash": event_hash})
        events.append(event)
        self._event_id_snapshots[principal.organisation_id].append(event_id)
        return event

    def list_events(self, principal: Principal) -> list[AuditEvent]:
        with self._lock:
            if principal.role in (Role.BRAND_OWNER, Role.MANAGER, Role.LEGAL_REVIEWER):
                return [event.model_copy(deep=True) for event in self._events[principal.organisation_id]]
            accessible_content_ids = {
                content.id
                for content in self._contents[principal.organisation_id].values()
                if self.can_view_content(content, principal)
            }
            return [
                event.model_copy(deep=True)
                for event in self._events[principal.organisation_id]
                if event.metadata.get("content_id") in accessible_content_ids
                or event.object_id in accessible_content_ids
            ]

    def verify_chain(self, principal: Principal) -> dict[str, Any]:
        with self._lock:
            events = self._events[principal.organisation_id]
            id_snapshots = self._event_id_snapshots[principal.organisation_id]
            previous_hash: str | None = None
            for index, event in enumerate(events):
                expected = hashlib.sha256(
                    _canonical_json(self._event_hash_payload(event, previous_hash)).encode("utf-8")
                ).hexdigest()
                id_matches = index < len(id_snapshots) and event.id == id_snapshots[index]
                if not id_matches or event.prev_hash != previous_hash or event.hash != expected:
                    return {
                        "organisation_id": principal.organisation_id,
                        "valid": False,
                        "event_count": len(events),
                        "first_invalid_event_id": event.id,
                        "expected_hash": expected,
                        "actual_hash": event.hash,
                    }
                previous_hash = event.hash
            return {
                "organisation_id": principal.organisation_id,
                "valid": True,
                "event_count": len(events),
                "first_invalid_event_id": None,
                "expected_hash": None,
                "actual_hash": None,
            }

    def export_content(self, principal: Principal, content_id: str) -> dict[str, Any]:
        with self._lock:
            content = self._content(principal.organisation_id, content_id)
            if not self.can_view_content(content, principal):
                raise WorkflowNotFoundError(content_id)
            versions = [
                version
                for version in self._versions[principal.organisation_id].values()
                if version.content_id == content_id
            ]
            version_ids = {version.id for version in versions}
            audits = [
                audit
                for audit in self._audits[principal.organisation_id].values()
                if audit.content_version_id in version_ids
            ]
            audit_ids = {audit.id for audit in audits}
            findings = [
                finding
                for finding in self._findings[principal.organisation_id].values()
                if finding.content_version_id in version_ids
            ]
            comments = [
                comment
                for comment in self._comments[principal.organisation_id].values()
                if comment.content_version_id in version_ids
            ]
            decisions = [
                decision
                for decision in self._decisions[principal.organisation_id]
                if decision.content_id == content_id
            ]
            finding_ids = {finding.id for finding in findings}
            finding_actions = [
                action
                for action in self._finding_actions[principal.organisation_id]
                if action.finding_id in finding_ids
            ]
            events = [
                event
                for event in self._events[principal.organisation_id]
                if event.metadata.get("content_id") == content_id
                or event.object_id in {content_id, *version_ids, *audit_ids}
                or event.object_id in finding_ids
                or event.object_id in {comment.id for comment in comments}
            ]
            return {
                "export_schema_version": "workflow-export-v1",
                "persistence": "in_memory_demo",
                "exported_at": _now().isoformat(),
                "organisation_id": principal.organisation_id,
                "content": content.model_dump(mode="json"),
                "versions": [version.model_dump(mode="json") for version in sorted(versions, key=lambda value: value.version)],
                "audits": [audit.model_dump(mode="json") for audit in sorted(audits, key=lambda value: value.created_at)],
                "findings": [finding.model_dump(mode="json") for finding in findings],
                "comments": [comment.model_dump(mode="json") for comment in comments],
                "decisions": [decision.model_dump(mode="json") for decision in decisions],
                "finding_actions": [action.model_dump(mode="json") for action in finding_actions],
                "audit_events": [event.model_dump(mode="json") for event in events],
                "chain_verification": self.verify_chain(principal),
                "audit_events_are_filtered": True,
            }
