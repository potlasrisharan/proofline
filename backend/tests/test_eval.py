"""Independent, contract-derived QA for the offline Phase 2 evaluation set.

These tests intentionally exercise the oracle and evaluation harness rather than
implementation-specific classes.  The integration runner is allowed to fail while
the Phase 2 pipeline is being integrated; failures must remain visible in its report.
"""

from __future__ import annotations

from collections.abc import Mapping

import pytest

try:  # The same tests should run from the repository root or from ``backend``.
    from backend.app.eval import (
        GOLDEN_CASES,
        GoldenCase,
        canonical_category,
        format_report,
        outcome_from_response,
        run_evaluation,
    )
except ModuleNotFoundError:  # pragma: no cover - package-context fallback
    from app.eval import (  # type: ignore[no-redef]
        GOLDEN_CASES,
        GoldenCase,
        canonical_category,
        format_report,
        outcome_from_response,
        run_evaluation,
    )


REQUIRED_CASE_IDS = {
    "wrong-battery-number",
    "correct-battery-number",
    "up-to-supported-number",
    "up-to-overclaim",
    "expired-offer",
    "valid-offer",
    "banned-term",
    "preferred-term",
    "missing-disclaimer",
    "comparative-no-source",
    "low-contrast-normal-text",
    "missing-alt-text",
    "claim-with-no-source",
    "conflicting-evidence",
    "no-key-tone-needs-human",
    "confidential-no-external-call",
    "pii-masking-before-model",
    "instruction-like-text",
    "pdf-extraction-failure",
    "docx-extraction-failure",
    "image-extraction-failure",
    "tenant-owner-can-read-own-content",
    "tenant-cannot-read-other-content",
    "finding-action-accept-auditable",
    "finding-action-dismiss-requires-reason",
    "finding-action-edit-auditable",
    "risk-breakdown-exposure-one",
    "risk-breakdown-exposure-three-regulated",
    "critical-expired-offer-escalation",
    "revision-recheck-resolves-number",
    "revision-recheck-preserves-history",
    "revision-recheck-new-finding",
}


def _case_by_id(case_id: str) -> GoldenCase:
    return next(case for case in GOLDEN_CASES if case.case_id == case_id)


def _expected_category(case: GoldenCase) -> str | None:
    if not case.expected_categories:
        return None
    return canonical_category(next(iter(case.expected_categories)))


def _oracle_response(case: GoldenCase) -> Mapping[str, object]:
    """Return a deliberately generic response shaped like the public contract."""

    category = _expected_category(case)
    finding: dict[str, object] = {}
    if category:
        finding = {
            "category": category,
            "verdict": next(iter(case.expected_verdicts), "supported"),
        }
    return {
        "status": next(iter(case.expected_status)),
        "findings": [finding] if finding else [],
    }


def test_golden_set_has_at_least_forty_cases_and_unique_ids() -> None:
    assert len(GOLDEN_CASES) >= 40, "Phase 2 requires at least 40 meaningful offline cases"
    ids = [case.case_id for case in GOLDEN_CASES]
    assert len(ids) == len(set(ids)), "golden case IDs must be stable and unique"


def test_required_prd_and_contract_scenarios_are_present() -> None:
    actual_ids = {case.case_id for case in GOLDEN_CASES}
    missing = REQUIRED_CASE_IDS - actual_ids
    assert not missing, f"missing required independent QA cases: {sorted(missing)}"


def test_all_examples_are_fictional_voltedge_cases() -> None:
    for case in GOLDEN_CASES:
        assert "VoltEdge" in case.description or "voltedge" in case.case_id.lower()
        payload_text = str(case.payload)
        assert "VoltEdge" in payload_text or "voltedge" in payload_text.lower()
        for record in case.records:
            assert "voltedge" in str(record).lower(), f"non-VoltEdge fixture in {case.case_id}"


def test_compliant_negatives_exist_for_precision_measurement() -> None:
    negatives = [case for case in GOLDEN_CASES if "negative" in case.tags and not case.expected_categories]
    assert len(negatives) >= 10, "precision needs compliant negatives, not only positive violation cases"
    assert {case.category for case in negatives} >= {
        "factual",
        "offer_date",
        "terminology",
        "promotional",
        "accessibility",
        "precision_negative",
    }


def test_hard_verdicts_always_have_fixture_evidence() -> None:
    for case in GOLDEN_CASES:
        if case.expected_verdicts & {"contradicted", "outdated"}:
            assert case.records, f"{case.case_id} expects a hard verdict without approved evidence"


def test_missing_evidence_cases_abstain_instead_of_calling_claim_false() -> None:
    for case in GOLDEN_CASES:
        if "evidence" in case.tags or "abstain" in case.tags:
            assert not case.expected_verdicts.intersection({"contradicted", "outdated"}), (
                f"{case.case_id} turns missing/conflicting evidence into a hard contradiction"
            )


def test_extraction_failure_cases_require_visible_non_success_state() -> None:
    extraction_cases = [case for case in GOLDEN_CASES if "extraction" in case.tags]
    assert len(extraction_cases) >= 5
    for case in extraction_cases:
        assert case.expected_status.intersection({"failed", "review_required"}), (
            f"{case.case_id} could incorrectly report successful audit after extraction failure"
        )


def test_confidential_case_declares_hard_no_external_call_invariant() -> None:
    confidential = [case for case in GOLDEN_CASES if case.confidential]
    assert confidential, "the golden set must exercise confidential content"
    for case in confidential:
        assert case.requires_no_external_call
        assert case.payload.get("confidential") is True


def test_pii_case_contains_email_and_phone_for_masking_assertion() -> None:
    pii_cases = [case for case in GOLDEN_CASES if case.requires_pii_masking]
    assert pii_cases, "the golden set must exercise PII masking"
    text = str(pii_cases[0].payload)
    assert "@" in text
    assert "202-555" in text


def test_instruction_like_content_is_expected_to_need_human_review() -> None:
    case = _case_by_id("instruction-like-text")
    assert "security" in {canonical_category(value) for value in case.expected_categories}
    assert "needs_human" in case.expected_verdicts
    assert case.expected_status.intersection({"review_required", "completed"})


def test_risk_cases_keep_score_as_triage_not_truth_probability() -> None:
    risk_cases = [case for case in GOLDEN_CASES if "risk" in case.tags]
    assert len(risk_cases) >= 3
    for case in risk_cases:
        exposure = case.payload.get("metadata", {}).get("exposure")
        if exposure is not None:
            assert exposure in {1, 2, 3}
        # The oracle does not permit a probability claim in the expected metadata.
        assert "probability" not in str(case.payload).lower()


def test_revision_cases_are_distinct_and_do_not_overwrite_history() -> None:
    revision_cases = [case for case in GOLDEN_CASES if "revision" in case.tags]
    assert len(revision_cases) >= 3
    assert {case.case_id for case in revision_cases} >= {
        "revision-recheck-resolves-number",
        "revision-recheck-preserves-history",
        "revision-recheck-new-finding",
    }
    assert any("history" in case.tags for case in revision_cases)


def test_evaluator_maps_extended_contract_categories_to_review_categories() -> None:
    response = {
        "status": "completed",
        "findings": [
            {"category": "fact_mismatch", "verdict": "contradicted"},
            {"category": "configured_policy_disclaimer", "verdict": "unsupported"},
        ],
    }
    outcome = outcome_from_response(_case_by_id("wrong-battery-number"), response)
    assert outcome.actual_categories == {"factual", "legal"}
    assert outcome.actual_verdicts == {"contradicted", "unsupported"}
    assert outcome.status == "completed"


def test_evaluator_accepts_nested_audit_response_shape() -> None:
    case = _case_by_id("conflicting-evidence")
    outcome = outcome_from_response(
        case,
        {
            "audit": {
                "status": "review_required",
                "findings": [{"category": "source_conflict", "verdict": "needs_human"}],
            }
        },
    )
    assert outcome.status == "review_required"
    assert outcome.actual_categories == {"source_conflict"}
    assert outcome.actual_verdicts == {"needs_human"}


def test_golden_oracle_runner_measures_perfect_precision_and_recall() -> None:
    outcomes = run_evaluation(_oracle_response, validate=False)
    report = format_report(outcomes)
    assert "Honest failures: 0" in report
    assert "precision" in report and "recall" in report
    assert "1.000" in report


def test_runner_failures_are_reported_honestly_and_not_converted_to_passes() -> None:
    def broken_runner(case: GoldenCase) -> Mapping[str, object]:
        del case
        raise RuntimeError("offline pipeline unavailable")

    cases = GOLDEN_CASES[:2]
    outcomes = run_evaluation(broken_runner, cases)
    assert all(outcome.failure for outcome in outcomes)
    report = format_report(outcomes)
    assert "Honest failures: 2" in report
    assert "offline pipeline unavailable" in report


@pytest.mark.parametrize("case_id", sorted(REQUIRED_CASE_IDS))
def test_required_case_has_explicit_description(case_id: str) -> None:
    case = _case_by_id(case_id)
    assert len(case.description) >= 20
    assert case.payload["metadata"]["case_id"] == case_id
