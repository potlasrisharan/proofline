"""Validated audit persistence beside the local human-review workflow.

This adapter extends the workflow store instead of creating another set of content
identities.  Engine-produced records can therefore be reviewed/exported through the
existing role-aware workflow routes.  Storage remains explicitly non-persistent.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import TypedDict
from uuid import uuid4

from .models import (
    AuditRun,
    AuditStatus,
    Claim,
    ClaimFactLink,
    ContentItem,
    ContentVersion,
    ContentWorkflowStatus,
    Finding,
    FindingActionRecord,
    FindingActionRequest,
    Principal,
)
from .workflow import InMemoryWorkflowStore, WorkflowNotFoundError, WorkflowStateError
from .store import InMemoryVaultStore


# Compatibility names for callers which only need the content boundary.
ContentNotFoundError = WorkflowNotFoundError
ContentVersionNotFoundError = WorkflowNotFoundError
FindingNotFoundError = WorkflowNotFoundError


class ContentBundle(TypedDict):
    content: ContentItem
    content_version: ContentVersion
    audit: AuditRun | None
    findings: list[Finding]
    claims: list[Claim]
    claim_links: list[ClaimFactLink]
    actions: list[FindingActionRecord]


class ContentStore(InMemoryWorkflowStore):
    """Local tenant/role-aware storage for immutable versions, audits and links."""

    persistence = "in_memory_demo"

    def __init__(self, *, vault_store: InMemoryVaultStore | None = None) -> None:
        super().__init__(vault_store=vault_store)
        self._raw_inputs: dict[str, str | bytes] = {}
        self._claims: dict[str, dict[str, list[Claim]]] = defaultdict(dict)
        self._claim_links: dict[str, dict[str, list[ClaimFactLink]]] = defaultdict(dict)
        self._actions: dict[str, dict[str, list[FindingActionRecord]]] = defaultdict(
            lambda: defaultdict(list)
        )

    def save_raw_input(self, content_version_id: str, value: str | bytes) -> None:
        with self._lock:
            self._raw_inputs[content_version_id] = value

    def get_raw_input(self, principal: Principal, content_version_id: str) -> str | bytes | None:
        self.get_version(principal, content_version_id)
        with self._lock:
            return self._raw_inputs.get(content_version_id)

    def save_engine_audit(
        self,
        *,
        principal: Principal,
        audit: AuditRun,
        findings: list[Finding],
        claims: list[Claim],
        claim_links: list[ClaimFactLink],
        extracted_text: str,
        metadata: dict[str, object],
    ) -> None:
        """Append one validated audit without rewriting an earlier version/audit."""

        organisation_id = principal.organisation_id
        with self._lock:
            version = self._version(organisation_id, audit.content_version_id)
            content = self._content(organisation_id, version.content_id)
            if not self.can_edit_content(content, principal):
                raise WorkflowNotFoundError(version.id)
            if audit.id in self._audits[organisation_id]:
                raise WorkflowStateError("audit IDs are immutable and may not be overwritten")
            if version.latest_audit_id is not None:
                raise WorkflowStateError("a new audit requires a new immutable content version")
            if audit.organisation_id != organisation_id or audit.content_id != content.id:
                raise WorkflowStateError("audit scope does not match the authenticated content")
            for row in [*findings, *claims, *claim_links]:
                if (
                    row.organisation_id != organisation_id
                    or row.content_id != content.id
                    or row.content_version_id != version.id
                    or row.audit_run_id != audit.id
                ):
                    raise WorkflowStateError("audit record scope does not match its content version")

            previous_findings = self._findings_for_audit(organisation_id, audit.previous_audit_id)
            audit = audit.model_copy(
                update={"finding_diff": self._diff_findings(previous_findings, findings)}
            )
            self._audits[organisation_id][audit.id] = audit.model_copy(deep=True)
            for finding in findings:
                self._findings[organisation_id][finding.id] = finding.model_copy(deep=True)
            self._claims[organisation_id][audit.id] = [claim.model_copy(deep=True) for claim in claims]
            self._claim_links[organisation_id][audit.id] = [link.model_copy(deep=True) for link in claim_links]
            parent_status = None
            if version.parent_version_id:
                parent_status = self._version(
                    organisation_id, version.parent_version_id
                ).workflow_status
            # An audit finding is evidence for human review, not an automatic
            # request-changes decision.  That decision must remain an explicit,
            # named reviewer action.  A provider/extraction failure is different:
            # the version must remain visibly blocked for re-review.
            if audit.status in {AuditStatus.FAILED, AuditStatus.PENDING, AuditStatus.RUNNING}:
                workflow_status = ContentWorkflowStatus.RE_REVIEW_REQUIRED
            elif parent_status is ContentWorkflowStatus.CHANGES_REQUESTED:
                workflow_status = ContentWorkflowStatus.RESUBMITTED
            else:
                workflow_status = ContentWorkflowStatus.AI_CHECKED
            now = datetime.now(timezone.utc)
            self._versions[organisation_id][version.id] = version.model_copy(
                update={
                    "latest_audit_id": audit.id,
                    "extracted_text": extracted_text,
                    "metadata": {**version.metadata, **metadata},
                    "workflow_status": workflow_status,
                },
                deep=True,
            )
            # A slow audit for an older revision must never move the current-version
            # pointer backwards if another request created a revision meanwhile.
            if content.current_version_id == version.id:
                self._contents[organisation_id][content.id] = content.model_copy(
                    update={"workflow_status": workflow_status, "updated_at": now},
                    deep=True,
                )
            self._append_event(
                principal,
                event_type="engine_audit_saved",
                object_type="audit",
                object_id=audit.id,
                metadata={
                    "content_id": content.id,
                    "content_version_id": version.id,
                    "finding_count": len(findings),
                    "claim_count": len(claims),
                    "claim_link_count": len(claim_links),
                    "status": audit.status.value,
                    "ruleset_version": audit.ruleset_version,
                },
            )

    def get_current_bundle(self, principal: Principal, content_id: str) -> ContentBundle:
        content = self.get_content(principal, content_id)
        return self.get_version_bundle(principal, content.current_version_id)

    def get_version_bundle(self, principal: Principal, content_version_id: str) -> ContentBundle:
        with self._lock:
            version = self.get_version(principal, content_version_id)
            content = self.get_content(principal, version.content_id)
            audit = self._audits[principal.organisation_id].get(version.latest_audit_id or "")
            findings = self._findings_for_audit(principal.organisation_id, version.latest_audit_id)
            claims = self._claims[principal.organisation_id].get(version.latest_audit_id or "", [])
            links = self._claim_links[principal.organisation_id].get(version.latest_audit_id or "", [])
            actions = [
                action
                for finding in findings
                for action in self._actions[principal.organisation_id].get(finding.id, [])
            ]
            return {
                "content": content.model_copy(deep=True),
                "content_version": version.model_copy(deep=True),
                "audit": audit.model_copy(deep=True) if audit else None,
                "findings": [finding.model_copy(deep=True) for finding in findings],
                "claims": [claim.model_copy(deep=True) for claim in claims],
                "claim_links": [link.model_copy(deep=True) for link in links],
                "actions": [action.model_copy(deep=True) for action in actions],
            }

    def act_on_finding(
        self,
        principal: Principal,
        finding_id: str,
        payload: FindingActionRequest,
    ) -> Finding:
        with self._lock:
            finding = super().act_on_finding(principal, finding_id, payload)
            action = FindingActionRecord(
                id=str(uuid4()),
                finding_id=finding_id,
                organisation_id=principal.organisation_id,
                actor_id=principal.user_id,
                actor_role=principal.role,
                action=payload.action,
                reason=payload.reason,
                replacement_text=payload.replacement_text,
                created_at=finding.action_at or datetime.now(timezone.utc),
            )
            self._actions[principal.organisation_id][finding_id].append(action)
            return finding.model_copy(deep=True)


InMemoryContentStore = ContentStore
