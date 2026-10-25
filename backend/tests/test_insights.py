from __future__ import annotations

from datetime import datetime, timezone

import pytest

from backend.app.insights import (
    FactRecord,
    GuidelineRecord,
    ReviewActivity,
    approve_suggested_rule_update,
    compute_governance_insights,
)
from backend.app.models import Principal, Role


AS_OF = datetime(2026, 10, 25, 12, tzinfo=timezone.utc)


def principal(role: Role = Role.BRAND_OWNER, organisation_id: str = "org-voltedge") -> Principal:
    return Principal(
        user_id=f"demo-{role.value}",
        organisation_id=organisation_id,
        role=role,
        auth_source="test_override",
    )


def activity(
    activity_id: str,
    finding_id: str,
    occurred_at: str,
    category: str,
    *,
    rule_id: str | None = None,
    rule_name: str | None = None,
    team_id: str | None = None,
    team_name: str | None = None,
    agency_id: str | None = None,
    agency_name: str | None = None,
    verdict: str | None = None,
    action: str | None = None,
    reviewer_outcome: str | None = None,
) -> ReviewActivity:
    return ReviewActivity(
        activity_id=activity_id,
        finding_id=finding_id,
        occurred_at=datetime.fromisoformat(occurred_at.replace("Z", "+00:00")),
        category=category,
        organisation_id="org-voltedge",
        rule_id=rule_id,
        rule_name=rule_name,
        team_id=team_id,
        team_name=team_name,
        agency_id=agency_id,
        agency_name=agency_name,
        verdict=verdict,
        action=action,
        reviewer_outcome=reviewer_outcome,
    )


def test_aggregates_categories_rules_and_privacy_safe_groups() -> None:
    events = [
        activity("a1", "f1", "2026-10-05T10:00:00Z", "unsupported_claim", rule_id="rule-claims", rule_name="Comparative claims", team_id="team-growth", team_name="Growth", agency_id="agency-spark", agency_name="Spark Studio", verdict="needs_human"),
        activity("a2", "f2", "2026-10-12T10:00:00Z", "unsupported_claim", rule_id="rule-claims", rule_name="Comparative claims", team_id="team-growth", team_name="Growth", agency_id="agency-spark", agency_name="Spark Studio", action="dismissed"),
        activity("a3", "f3", "2026-10-20T10:00:00Z", "fact_mismatch", rule_id="rule-battery", rule_name="Battery life", team_id="team-product", team_name="Product", agency_id="agency-spark", agency_name="Spark Studio", verdict="contradicted", reviewer_outcome="overridden"),
    ]

    insights = compute_governance_insights(events, as_of=AS_OF, window_days=30)

    assert insights.sample_size == 3
    assert insights.individual_rankings_included is False
    assert [(item.key, item.count) for item in insights.by_category] == [
        ("unsupported_claim", 2),
        ("fact_mismatch", 1),
    ]
    claims = insights.by_rule[0]
    assert claims.key == "rule-claims"
    assert claims.dismissed_count == 1
    assert claims.needs_human_count == 1
    assert [(item.group_id, item.finding_count) for item in insights.teams] == [
        ("team-growth", 2),
        ("team-product", 1),
    ]
    assert insights.agencies[0].group_name == "Spark Studio"
    assert not any("user" in item.group_id for item in insights.teams)
    assert len(insights.trends) == 5
    assert insights.trends[-1].finding_count == 1


def test_expiry_and_tenant_scope_are_deterministic() -> None:
    events = [
        activity("a1", "f1", "2026-10-25T10:00:00Z", "fact_mismatch"),
        ReviewActivity(
            activity_id="other-org",
            finding_id="other-finding",
            occurred_at=AS_OF,
            category="fact_mismatch",
            organisation_id="org-other",
        ),
    ]
    facts = [
        FactRecord(fact_id="offer-soon", label="Launch offer", expires_at="2026-10-30T00:00:00Z", version="2", organisation_id="org-voltedge"),
        FactRecord(fact_id="offer-later", label="Holiday offer", expires_at="2027-01-01T00:00:00Z", version="1", organisation_id="org-voltedge"),
        FactRecord(fact_id="other-org-fact", label="Other organisation", expires_at="2026-10-26T00:00:00Z", organisation_id="org-other"),
        FactRecord(fact_id="already-expired", label="Old offer", expires_at="2026-10-20T00:00:00Z", status="expired", organisation_id="org-voltedge"),
    ]

    insights = compute_governance_insights(
        events,
        facts=facts,
        organisation_id="org-voltedge",
        as_of=AS_OF,
        expiring_within_days=30,
    )

    assert insights.sample_size == 1
    assert [item.fact_id for item in insights.expiring_facts] == ["offer-soon"]
    assert insights.expiring_facts[0].days_remaining == 5
    assert insights.to_dict()["window_end"] == "2026-10-25T12:00:00Z"


def test_ambiguity_signals_and_owner_only_rule_update_approval() -> None:
    events = [
        activity("a1", "f1", "2026-10-01T10:00:00Z", "tone", rule_id="rule-tone", rule_name="Launch tone", action="dismissed"),
        activity("a2", "f2", "2026-10-02T10:00:00Z", "tone", rule_id="rule-tone", rule_name="Launch tone", action="dismissed"),
        activity("a3", "f3", "2026-10-03T10:00:00Z", "tone", rule_id="rule-tone", rule_name="Launch tone", reviewer_outcome="needs_human"),
        activity("a4", "f4", "2026-10-04T10:00:00Z", "tone", rule_id="rule-tone", rule_name="Launch tone", reviewer_outcome="needs_human"),
    ]
    guidelines = [
        GuidelineRecord(rule_id="rule-tone", text="Use a calm voice.", topic="launch tone", directive="preferred", version="1"),
        GuidelineRecord(rule_id="rule-tone-other", text="Avoid calm language.", topic="launch tone", directive="prohibited", version="2"),
    ]

    insights = compute_governance_insights(events, guidelines=guidelines, as_of=AS_OF)

    signal_types = {signal.signal_type for signal in insights.ambiguity_signals}
    assert "high_dismissal_rate" in signal_types
    assert "frequent_needs_human" in signal_types
    assert "contradictory_guideline" in signal_types
    proposal = next(item for item in insights.suggested_rule_updates if item.generated_label == "AI-generated")
    assert proposal.status == "proposed"
    assert proposal.applied is False
    with pytest.raises(PermissionError):
        approve_suggested_rule_update(proposal, principal=principal(Role.MANAGER))

    approved = approve_suggested_rule_update(
        proposal,
        principal=principal(),
        approved_at=AS_OF,
    )
    assert approved.status == "approved"
    assert approved.approved_by == "demo-brand_owner"
    assert approved.applied is False


def test_mapping_input_and_invalid_window_are_visible() -> None:
    insights = compute_governance_insights(
        [
            {
                "id": "finding-1",
                "created_at": "2026-10-25T10:00:00Z",
                "category": "accessibility",
                "rule": {"id": "rule-alt", "name": "Alt text"},
                "verdict": "needs_human",
                "team": {"id": "team-content", "name": "Content"},
            }
        ],
        as_of=AS_OF,
    )
    assert insights.by_category[0].label == "accessibility"
    assert insights.by_rule[0].label == "Alt text"
    assert insights.teams[0].group_name == "Content"

    with pytest.raises(ValueError, match="window_days"):
        compute_governance_insights([], window_days=0)


def test_duplicate_event_replay_is_idempotent_and_conflicting_data_fails() -> None:
    row = activity("a1", "f1", "2026-10-25T09:00:00Z", "tone", action="dismissed")
    report = compute_governance_insights([row, row], as_of=AS_OF)
    assert report.sample_size == 1
    assert report.by_category[0].count == 1
    with pytest.raises(ValueError, match="conflicting activity data"):
        compute_governance_insights([
            row,
            activity("a1", "f1", "2026-10-25T09:00:00Z", "tone", action="accepted"),
        ], as_of=AS_OF)


def test_multiple_tenants_require_an_explicit_filter() -> None:
    rows = [
        {"id": "a1", "occurred_at": AS_OF, "organisation_id": "org-voltedge", "category": "tone"},
        {"id": "a2", "occurred_at": AS_OF, "organisation_id": "org-voltedge-demo-lab", "category": "tone"},
    ]
    with pytest.raises(ValueError, match="multiple organisations"):
        compute_governance_insights(rows, as_of=AS_OF)
    assert compute_governance_insights(rows, organisation_id="org-voltedge", as_of=AS_OF).sample_size == 1


def test_utc_calendar_window_includes_first_morning_and_excludes_future_activity() -> None:
    rows = [
        activity("first", "f1", "2026-09-26T00:00:00Z", "tone"),
        activity("older", "f2", "2026-09-25T23:59:59Z", "tone"),
        activity("now", "f3", "2026-10-25T12:00:00Z", "tone"),
        activity("future", "f4", "2026-10-25T12:00:01Z", "tone"),
    ]
    report = compute_governance_insights(rows, as_of=AS_OF)
    assert report.sample_size == 2
    assert report.window_start.isoformat() == "2026-09-26T00:00:00+00:00"
    assert sum(point.finding_count for point in report.trends) == 2


def test_small_samples_and_repeated_actions_on_one_finding_are_not_gap_evidence() -> None:
    rows = [
        activity(f"a{index}", "same-finding", f"2026-10-{index:02d}T09:00:00Z", "tone", rule_id="tone", action="dismissed")
        for index in range(1, 8)
    ]
    report = compute_governance_insights(rows, as_of=AS_OF)
    assert report.by_rule[0].count == 7
    assert report.by_rule[0].unique_findings == 1
    assert report.ambiguity_signals == ()
    assert report.suggested_rule_updates == ()


def test_high_overrides_produce_traceable_unapplied_wording_proposals() -> None:
    rows = [
        activity(f"event-{index}", f"finding-{index}", "2026-10-21T09:00:00Z", "tone", rule_id="rule-tone", reviewer_outcome="overridden")
        for index in range(1, 4)
    ]
    guidelines = [GuidelineRecord(rule_id="rule-tone", text="Use a calm launch tone.", version="4")]
    report = compute_governance_insights(rows, guidelines=guidelines, as_of=AS_OF)
    signal = next(signal for signal in report.ambiguity_signals if signal.signal_type == "high_override_rate" and signal.scope == "rule")
    assert signal.evidence == ("activity:event-1", "activity:event-2", "activity:event-3")
    proposal = next(proposal for proposal in report.suggested_rule_updates if proposal.rule_id == "rule-tone")
    assert proposal.rule_version == "4"
    assert proposal.current_wording == "Use a calm launch tone."
    assert proposal.current_wording in proposal.suggested_wording
    assert proposal.generation_method == "deterministic_local_template"
    assert proposal.status == "proposed"
    assert proposal.approved_at is None


@pytest.mark.parametrize("role", [Role.CREATOR, Role.MANAGER, Role.LEGAL_REVIEWER, Role.AGENCY])
def test_non_owner_roles_cannot_approve_rule_updates(role: Role) -> None:
    report = compute_governance_insights(
        [activity(f"a{i}", f"f{i}", "2026-10-21T10:00:00Z", "tone", rule_id="rule-tone", action="dismissed") for i in range(3)],
        as_of=AS_OF,
    )
    with pytest.raises(PermissionError, match="brand_owner"):
        approve_suggested_rule_update(report.suggested_rule_updates[0], principal=principal(role))


def test_owner_approval_is_tenant_scoped_and_preserves_original_proposal() -> None:
    report = compute_governance_insights(
        [activity(f"a{i}", f"f{i}", "2026-10-21T10:00:00Z", "tone", rule_id="rule-tone", action="dismissed") for i in range(3)],
        as_of=AS_OF,
    )
    proposal = report.suggested_rule_updates[0]
    with pytest.raises(PermissionError, match="organisation"):
        approve_suggested_rule_update(proposal, principal=principal(organisation_id="org-voltedge-demo-lab"))
    approved = approve_suggested_rule_update(proposal, principal=principal(), approved_at=AS_OF)
    assert proposal.status == "proposed"
    assert proposal.approved_by is None
    assert approved.status == "approved"
    assert approved.applied is False
    assert approved.approved_at == AS_OF
    with pytest.raises(ValueError, match="status"):
        approve_suggested_rule_update(approved, principal=principal())


def test_only_approved_active_overlapping_guidelines_can_be_conflicting() -> None:
    records = [
        GuidelineRecord(rule_id="email-required", text="Include a qualifier in launch emails.", topic="qualifier", directive="required", scope="email"),
        GuidelineRecord(rule_id="poster-optional", text="The poster qualifier is optional.", topic="qualifier", directive="optional", scope="poster"),
        GuidelineRecord(rule_id="draft-optional", text="The email qualifier is optional.", topic="qualifier", directive="optional", scope="email", status="draft"),
        GuidelineRecord(rule_id="expired-optional", text="The email qualifier is optional.", topic="qualifier", directive="optional", scope="email", effective_to=datetime(2026, 10, 1, tzinfo=timezone.utc)),
    ]
    report = compute_governance_insights([], guidelines=records, organisation_id="org-voltedge", as_of=AS_OF)
    assert report.contradictory_guidelines == ()
    assert report.suggested_rule_updates == ()


def test_drafts_expired_and_future_facts_are_not_upcoming_expiry_signals() -> None:
    facts = [
        {"id": "draft", "name": "Draft VoltEdge offer", "status": "draft", "effective_to": "2026-10-26T12:00:00Z"},
        {"id": "expired", "name": "Expired VoltEdge offer", "status": "approved", "effective_to": "2026-10-24T12:00:00Z"},
        {"id": "future", "name": "Future VoltEdge offer", "status": "approved", "effective_from": "2026-10-28T12:00:00Z", "effective_to": "2026-10-30T12:00:00Z"},
        {"id": "boundary", "name": "VoltEdge offer ending now", "status": "approved", "effective_to": "2026-10-25T12:00:00Z"},
    ]
    report = compute_governance_insights([], facts=facts, as_of=AS_OF)
    assert [fact.fact_id for fact in report.expiring_facts] == ["boundary"]
    assert report.expiring_facts[0].days_remaining == 0


def test_report_is_stable_for_reordered_input_and_empty_data() -> None:
    rows = [
        activity(f"a{i}", f"f{i}", f"2026-10-{i:02d}T10:00:00Z", "tone", rule_id="rule-tone", action="dismissed") for i in range(1, 4)
    ]
    first = compute_governance_insights(rows, as_of=AS_OF).to_dict()
    second = compute_governance_insights(reversed(rows), as_of=AS_OF).to_dict()
    assert first == second
    empty = compute_governance_insights([], as_of=AS_OF)
    assert empty.sample_size == 0
    assert all(point.finding_count == 0 for point in empty.trends)
    assert empty.by_category == ()


def test_mapping_validation_never_invents_evidence_ids_or_rule_text() -> None:
    with pytest.raises(ValueError, match="activity_id"):
        compute_governance_insights([{"occurred_at": AS_OF, "category": "tone"}], as_of=AS_OF)
    with pytest.raises(ValueError, match="wording"):
        compute_governance_insights([], guidelines=[{"id": "rule-without-text"}], as_of=AS_OF)
    report = compute_governance_insights([{
        "id": "camel-case-event",
        "occurred_at": AS_OF,
        "category": "tone",
        "reviewerOutcome": "needs_human",
    }], guidelines=[{"id": "rule-tone", "text": "Use a calm tone.", "polarity": "required"}], as_of=AS_OF)
    assert report.by_category[0].needs_human_count == 1


def test_simulation_is_reproducible_and_covers_real_computed_patterns() -> None:
    from scripts.simulate_review_activity import run_simulation

    first = run_simulation()
    second = run_simulation()
    assert first == second
    assert first["sample_size"] == 10
    assert first["by_category"][0]["key"] == "unsupported_claim"
    assert first["by_category"][0]["count"] == 4
    assert first["contradictory_guidelines"]
    assert len(first["suggested_rule_updates"]) >= 2
    assert all(proposal["applied"] is False for proposal in first["suggested_rule_updates"])
