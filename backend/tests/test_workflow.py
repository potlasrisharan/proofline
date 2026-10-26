from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient
import pytest

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.models import (
    AuditRequest,
    CommentAnchor,
    ContentCreateRequest,
    ContentVersionCreateRequest,
    FindingCategory,
    FindingInput,
    FindingMethod,
    FindingSeverity,
    FindingVerdict,
    Principal,
    Role,
)
from backend.app.store import InMemoryVaultStore
from backend.app.workflow import InMemoryWorkflowStore


ORG = "org-voltedge-workflow"
TEXT = "VoltEdge NovaBook has a bold new design."


def headers(role: str = "creator", user: str | None = None, *, organisation: str = ORG, agency: str | None = None) -> dict[str, str]:
    result = {
        "X-Proofline-User": user or f"voltedge-{role}",
        "X-Proofline-Organisation": organisation,
        "X-Proofline-Role": role,
    }
    if agency:
        result["X-Proofline-Agency"] = agency
    return result


def principal(role: Role = Role.CREATOR, user: str | None = None) -> Principal:
    return Principal(
        user_id=user or f"voltedge-{role.value}",
        organisation_id=ORG,
        role=role,
        auth_source="test_override",
    )


def candidate(text: str = TEXT, excerpt: str = "bold", *, severity: FindingSeverity = FindingSeverity.MEDIUM) -> FindingInput:
    start = text.index(excerpt)
    return FindingInput(
        span=CommentAnchor(start=start, end=start + len(excerpt), text=excerpt),
        category=FindingCategory.TONE,
        verdict=FindingVerdict.NEEDS_HUMAN,
        severity=severity,
        confidence=0.7,
        method=FindingMethod.RULE,
        reason="No approved evidence establishes the intended tone; human review is required.",
    )


def setup(
    findings: list[FindingInput] | None = None,
    *,
    auditor: Callable | None = None,
    actor_headers: dict[str, str] | None = None,
) -> tuple[TestClient, InMemoryWorkflowStore, dict, dict]:
    vault = InMemoryVaultStore()
    store = InMemoryWorkflowStore(vault_store=vault, revision_auditor=auditor)
    app = create_app(store=vault, workflow_store=store, settings=Settings(dev_auth_enabled=True))
    client = TestClient(app)
    created = client.post(
        "/v1/content",
        headers=actor_headers or headers(),
        json={"title": "VoltEdge launch", "text": TEXT},
    )
    assert created.status_code == 201, created.text
    content = created.json()["item"]
    audit, saved = store.create_audit(
        principal(), content["current_version_id"], AuditRequest(findings=findings or [])
    )
    return client, store, content, {"audit": audit, "findings": saved}


def review(client: TestClient, version_id: str, action: str, *, role: str = "creator", **values):
    return client.post(
        f"/v1/content-versions/{version_id}/review",
        headers=headers(role),
        json={"action": action, **values},
    )


def test_complete_revision_review_release_and_revalidation_flow_preserves_history() -> None:
    client, store, content, first = setup(
        [candidate()], auditor=lambda _actor, _version: AuditRequest(findings=[])
    )
    first_id = content["current_version_id"]
    assert review(client, first_id, "request_changes", role="manager", reason="Use approved language.").status_code == 200
    revised = client.post(
        f"/v1/content/{content['id']}/versions",
        headers=headers(),
        json={"text": "VoltEdge NovaBook has a thoughtful new design."},
    )
    assert revised.status_code == 201
    versions = revised.json()["items"]
    assert versions[0]["source_text"] == TEXT
    assert versions[0]["workflow_status"] == "changes_requested"
    current = versions[-1]
    assert current["workflow_status"] == "resubmitted"
    assert current["parent_version_id"] == first_id
    audit = client.get(f"/v1/audits/{current['latest_audit_id']}", headers=headers()).json()
    assert audit["audit"]["finding_diff"]["resolved_finding_ids"] == [first["findings"][0].id]
    assert review(client, current["id"], "submit").json()["content_version"]["workflow_status"] == "in_review"
    assert review(client, current["id"], "approve", role="manager").json()["content_version"]["workflow_status"] == "approved"
    assert review(client, current["id"], "release", role="manager").json()["content_version"]["workflow_status"] == "released"
    required = review(client, current["id"], "mark_re_review_required", role="brand_owner", reason="VoltEdge specification changed.")
    assert required.json()["content_version"]["workflow_status"] == "re_review_required"
    assert review(client, current["id"], "submit").status_code == 409
    assert client.get("/v1/audit-events/verify-chain", headers=headers("manager")).json()["valid"] is True


@pytest.mark.parametrize("severity", [FindingSeverity.LOW, FindingSeverity.MEDIUM])
def test_manager_can_approve_low_and_medium_risk(severity: FindingSeverity) -> None:
    client, _store, content, _ = setup([candidate(severity=severity)])
    version_id = content["current_version_id"]
    assert review(client, version_id, "submit").status_code == 200
    assert review(client, version_id, "approve", role="manager").status_code == 200


@pytest.mark.parametrize("severity", [FindingSeverity.HIGH, FindingSeverity.CRITICAL, FindingSeverity.REVIEW_REQUIRED])
def test_high_risk_requires_specialist_with_explicit_written_override(severity: FindingSeverity) -> None:
    client, _store, content, result = setup([candidate(severity=severity)])
    version_id = content["current_version_id"]
    finding_id = result["findings"][0].id
    assert review(client, version_id, "submit").status_code == 200
    assert review(client, version_id, "approve", role="manager").status_code == 403
    assert review(client, version_id, "approve", role="creator").status_code == 403
    assert review(client, version_id, "approve", role="legal_reviewer").status_code == 409
    assert review(client, version_id, "approve", role="legal_reviewer", override_finding_ids=[finding_id]).status_code == 409
    approved = review(
        client,
        version_id,
        "approve",
        role="legal_reviewer",
        override_finding_ids=[finding_id],
        reason="Reviewed the evidence gap and approved this fictional VoltEdge test wording.",
    )
    assert approved.status_code == 200
    saved = client.get(f"/v1/findings/{finding_id}", headers=headers()).json()["finding"]
    assert saved["status"] == "overridden"
    assert saved["override_reason"]


def test_creator_dismissal_does_not_bypass_high_risk_approval_permission() -> None:
    client, _store, content, result = setup([candidate(severity=FindingSeverity.HIGH)])
    finding_id = result["findings"][0].id
    route = f"/v1/findings/{finding_id}/action"
    assert client.post(route, headers=headers(), json={"action": "dismiss", "reason": "   "}).status_code == 409
    assert client.post(route, headers=headers(), json={"action": "dismiss", "reason": "Creator disputes wording."}).status_code == 200
    version_id = content["current_version_id"]
    assert review(client, version_id, "submit").status_code == 200
    assert review(client, version_id, "approve", role="manager").status_code == 403
    assert review(client, version_id, "approve", role="brand_owner").status_code == 409


def test_own_content_separation_of_duties_and_stale_version_protection() -> None:
    client, store, content, _ = setup()
    version_id = content["current_version_id"]
    assert review(client, version_id, "submit").status_code == 200
    own_manager = client.post(
        f"/v1/content-versions/{version_id}/review",
        headers=headers("manager", "voltedge-creator"),
        json={"action": "approve"},
    )
    assert own_manager.status_code == 403
    assert client.post(f"/v1/content/{content['id']}/versions", headers=headers(), json={"text": "Revision under review"}).status_code == 409
    assert review(client, version_id, "request_changes", role="manager", reason="Revise.").status_code == 200
    revision = store.create_revision(principal(), content["id"], ContentVersionCreateRequest(text="Updated VoltEdge wording", auto_recheck=False))
    store.create_audit(principal(), revision.id, AuditRequest())
    assert review(client, version_id, "approve", role="manager").status_code == 409
    assert client.post(f"/v1/findings/not-present/action", headers=headers(), json={"action": "accept"}).status_code == 404


def test_creators_only_read_and_act_on_own_findings_with_shared_store_tenant_checks() -> None:
    client, _store, content, result = setup([candidate()])
    finding_id = result["findings"][0].id
    for other in [headers(user="voltedge-other"), headers(organisation="org-other")]:
        assert client.get(f"/v1/content/{content['id']}", headers=other).status_code == 404
        assert client.get(f"/v1/findings/{finding_id}", headers=other).status_code == 404
        assert client.get(f"/v1/audits/{result['audit'].id}", headers=other).status_code == 404
        assert client.get(f"/v1/content/{content['id']}/export", headers=other).status_code == 404
        assert client.post(f"/v1/findings/{finding_id}/action", headers=other, json={"action": "accept"}).status_code == 404


def test_agency_scope_is_server_authenticated_and_never_grants_final_approval() -> None:
    client, store, _content, _ = setup()
    assigned = client.post(
        "/v1/content",
        headers=headers("manager"),
        json={"title": "VoltEdge agency campaign", "text": TEXT, "assigned_agency_id": "voltedge-agency-a"},
    ).json()["item"]
    visible = headers("agency", "voltedge-agency-member", agency="voltedge-agency-a")
    hidden = headers("agency", "voltedge-other-agency", agency="voltedge-agency-b")
    assert client.get(f"/v1/content/{assigned['id']}", headers=visible).status_code == 200
    assert client.get(f"/v1/content/{assigned['id']}", headers=hidden).status_code == 404
    assert client.get(f"/v1/content/{assigned['id']}", headers=headers("agency")).status_code == 404
    assert client.get("/v1/content", headers=visible).json()["items"] == [assigned]
    assert client.post(
        f"/v1/content-versions/{assigned['current_version_id']}/review",
        headers=visible,
        json={"action": "approve"},
    ).status_code == 403
    spoof = client.post(
        "/v1/content",
        headers=visible,
        json={"title": "Wrong engagement", "text": TEXT, "assigned_agency_id": "voltedge-agency-b"},
    )
    assert spoof.status_code == 403


def test_span_comment_replies_retain_anchor_and_reject_cross_version_threads() -> None:
    client, store, content, result = setup([candidate()])
    version_id = content["current_version_id"]
    comment = client.post(
        f"/v1/content-versions/{version_id}/comments",
        headers=headers("manager"),
        json={"body": "Please substantiate this wording.", "finding_id": result["findings"][0].id},
    )
    assert comment.status_code == 201
    root = comment.json()["items"][0]
    assert root["anchor"]["text"] == "bold"
    reply = client.post(
        f"/v1/content-versions/{version_id}/comments",
        headers=headers(),
        json={"body": "I will revise it.", "parent_comment_id": root["id"]},
    )
    assert reply.status_code == 201
    assert reply.json()["items"][-1]["anchor"] == root["anchor"]
    assert reply.json()["items"][-1]["span"] == root["anchor"]
    invalid = client.post(
        f"/v1/content-versions/{version_id}/comments",
        headers=headers(),
        json={"body": "Invalid anchor", "span": {"start": 0, "end": 4, "text": "fake"}},
    )
    assert invalid.status_code == 409
    revision = store.create_revision(principal(), content["id"], ContentVersionCreateRequest(text="New VoltEdge text", auto_recheck=False))
    assert client.post(
        f"/v1/content-versions/{revision.id}/comments",
        headers=headers(),
        json={"body": "Cross-version reply", "parent_comment_id": root["id"]},
    ).status_code == 409


def test_request_changes_requires_explanation_and_fresh_recheck_before_resubmission() -> None:
    client, _store, content, _ = setup()
    version_id = content["current_version_id"]
    assert review(client, version_id, "request_changes", role="manager", reason=" ").status_code == 409
    assert review(client, version_id, "submit").status_code == 200
    assert review(client, version_id, "request_changes", role="manager", comment="Please revise the title.").status_code == 200
    assert review(client, version_id, "resubmit").status_code == 409


def test_automatic_recheck_reports_unconfigured_and_failed_pipeline_without_false_resolution() -> None:
    client, _store, content, _ = setup([candidate()])
    saved = client.post(f"/v1/content/{content['id']}/versions", headers=headers(), json={"text": "Updated VoltEdge draft"})
    assert saved.status_code == 201
    version = saved.json()["items"][-1]
    audit = client.get(f"/v1/audits/{version['latest_audit_id']}", headers=headers()).json()["audit"]
    assert audit["status"] == "review_required"
    assert audit["finding_diff"]["resolved_finding_ids"] == []
    assert version["workflow_status"] == "re_review_required"
    assert review(client, version["id"], "submit").status_code == 409

    def broken(_principal, _version):
        raise TimeoutError("synthetic provider timeout")

    client, _store, content, _ = setup([candidate()], auditor=broken)
    failed = client.post(f"/v1/content/{content['id']}/versions", headers=headers(), json={"text": "Updated VoltEdge draft"})
    version = failed.json()["items"][-1]
    audit = client.get(f"/v1/audits/{version['latest_audit_id']}", headers=headers()).json()["audit"]
    assert audit["status"] == "failed"
    assert audit["error"]


def test_recheck_diff_detects_resolved_new_and_duplicate_unchanged_findings() -> None:
    first_text = "VoltEdge bold bold and clear."
    store = InMemoryWorkflowStore(revision_auditor=lambda _p, v: AuditRequest(findings=[candidate(v.source_text or "", "clear")]))
    actor = principal()
    content, version = store.create_content(actor, ContentCreateRequest(title="VoltEdge diff", text=first_text))
    one = candidate(first_text, "bold")
    two = one.model_copy(update={"span": CommentAnchor(start=14, end=18, text="bold")})
    initial, saved = store.create_audit(actor, version.id, AuditRequest(findings=[one, two]))
    revision = store.create_revision(actor, content.id, ContentVersionCreateRequest(text="VoltEdge clear."))
    current, findings = store.auto_recheck_revision(actor, revision.id)
    assert current.previous_audit_id == initial.id
    assert set(current.finding_diff.resolved_finding_ids) == {finding.id for finding in saved}
    assert current.finding_diff.new_finding_ids == [findings[0].id]
    assert current.finding_diff.unchanged_finding_ids == []
    assert store.get_audit(actor, initial.id)[1][0].status.value == "open"


def test_audit_and_action_apis_reject_forged_results_and_manual_resolution() -> None:
    client, _store, content, result = setup([candidate()])
    version_id = content["current_version_id"]
    assert client.post(
        f"/v1/content-versions/{version_id}/audit",
        headers=headers(),
        json={"findings": [candidate().model_dump(mode="json")]},
    ).status_code == 409
    finding_id = result["findings"][0].id
    assert client.post(f"/v1/findings/{finding_id}/action", headers=headers(), json={"action": "resolve"}).status_code == 409


def test_written_action_history_and_json_export_survive_reopen() -> None:
    client, _store, content, result = setup([candidate()])
    finding_id = result["findings"][0].id
    path = f"/v1/findings/{finding_id}/action"
    assert client.post(path, headers=headers(), json={"action": "dismiss", "reason": "This is a fictional VoltEdge draft."}).status_code == 200
    assert client.post(path, headers=headers(), json={"action": "reopen"}).status_code == 200
    report = client.get(f"/v1/content/{content['id']}/export", headers=headers()).json()
    assert report["persistence"] == "in_memory_demo"
    assert report["versions"][0]["source_text"] == TEXT
    assert report["findings"][0]["content_version_id"] == content["current_version_id"]
    assert report["finding_actions"][0]["reason"] == "This is a fictional VoltEdge draft."
    assert report["audit_events"][1]["prev_hash"] == report["audit_events"][0]["hash"]
    assert report["chain_verification"]["valid"] is True


def test_review_decisions_are_listed_and_exported_with_current_review_metadata() -> None:
    client, _store, content, _ = setup()
    version_id = content["current_version_id"]
    assert review(client, version_id, "submit").status_code == 200
    requested = review(
        client,
        version_id,
        "request_changes",
        role="manager",
        reason="Use the approved VoltEdge launch wording.",
        comment="Please revise before the next review.",
    )
    assert requested.status_code == 200, requested.text

    decisions = client.get(
        f"/v1/content-versions/{version_id}/review-decisions",
        headers=headers("manager"),
    )
    assert decisions.status_code == 200, decisions.text
    rows = decisions.json()["items"]
    assert [row["action"] for row in rows] == ["submit", "request_changes"]
    assert rows[-1]["actor_id"] == "voltedge-manager"
    assert rows[-1]["comment"] == "Please revise before the next review."

    report = client.get(f"/v1/content/{content['id']}/export", headers=headers("creator"))
    assert report.status_code == 200, report.text
    exported = report.json()
    assert exported["review_status"] == "changes_requested"
    assert exported["content_version_id"] == version_id
    assert exported["audit_date"]
    assert exported["decisions"] == exported["review_decisions"]
    assert len(exported["review_decisions"]) == 2


def test_dashboard_summary_aggregates_saved_records_and_scopes_creator_visibility() -> None:
    client, store, content, _ = setup([candidate(severity=FindingSeverity.HIGH)])
    version_id = content["current_version_id"]
    assert review(client, version_id, "submit").status_code == 200
    assert review(
        client,
        version_id,
        "request_changes",
        role="manager",
        reason="Please revise the fictional VoltEdge wording.",
    ).status_code == 200

    manager = principal(Role.MANAGER, user="voltedge-manager")
    second_content, second_version = store.create_content(
        manager,
        ContentCreateRequest(title="VoltEdge second item", text="A second saved draft."),
    )
    store.create_audit(manager, second_version.id, AuditRequest())

    manager_summary = client.get("/v1/dashboard/summary", headers=headers("manager"))
    assert manager_summary.status_code == 200, manager_summary.text
    manager_body = manager_summary.json()
    assert manager_body["persistence"] == "in_memory_demo"
    assert manager_body["organisation_id"] == ORG
    assert manager_body["content_count"] == 2
    assert manager_body["audited_content_count"] == 2
    assert manager_body["audited_version_count"] == 2
    assert manager_body["audit_count"] == 2
    assert manager_body["finding_count"] == 1
    assert manager_body["open_high_priority_findings"] == 1
    assert manager_body["finding_category_counts"] == {"tone": 1}
    assert manager_body["approval_state_counts"] == {"ai_checked": 1, "changes_requested": 1}
    assert manager_body["review_decision_count"] == 2
    assert manager_body["decisions_by_action"] == {"request_changes": 1, "submit": 1}

    creator_summary = client.get("/v1/dashboard/summary", headers=headers("creator"))
    assert creator_summary.status_code == 200, creator_summary.text
    creator_body = creator_summary.json()
    assert creator_body["content_count"] == 1
    assert creator_body["audited_content_count"] == 1
    assert creator_body["audit_count"] == 1
    assert creator_body["finding_count"] == 1
    assert creator_body["review_decision_count"] == 2
    assert second_content.id not in {
        item["id"] for item in client.get("/v1/content", headers=headers("creator")).json()["items"]
    }

    assert client.get("/v1/dashboard/summary?window_days=0", headers=headers("manager")).status_code == 422


def test_hash_chain_verifier_detects_metadata_and_event_id_tampering() -> None:
    client, store, _content, _ = setup()
    verification = client.get("/v1/audit-events/verify-chain", headers=headers("brand_owner")).json()
    assert verification["valid"] is True
    first = store._events[ORG][0]
    store._events[ORG][0] = first.model_copy(update={"id": "tampered-event-id"})
    verification = client.get("/v1/audit-events/verify-chain", headers=headers("brand_owner")).json()
    assert verification["valid"] is False
    assert verification["first_invalid_event_id"] == "tampered-event-id"
    store._events[ORG][0] = first.model_copy(update={"metadata": {"content_id": "tampered"}})
    assert client.get("/v1/audit-events/verify-chain", headers=headers("brand_owner")).json()["valid"] is False


def test_returned_store_snapshots_cannot_mutate_saved_content_or_ledger() -> None:
    _client, store, content, _ = setup()
    snapshot = store.get_content(principal(), content["id"])
    snapshot.title = "Untracked edit"
    events = store.list_events(principal())
    events[0].metadata["content_id"] = "other"
    assert store.get_content(principal(), content["id"]).title == "VoltEdge launch"
    assert store.verify_chain(principal())["valid"] is True
