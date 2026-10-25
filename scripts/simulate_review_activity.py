#!/usr/bin/env python3
"""Run a deterministic VoltEdge governance-insights simulation.

The simulation is deliberately synthetic and local.  It contains no reviewer names,
customer data, credentials, network calls, or model calls.  Running it with the same
``--as-of`` value produces byte-for-byte stable JSON when the default formatting is
used:

    python3 scripts/simulate_review_activity.py > /tmp/voltedge-insights.json
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any

# Keep direct execution (``python3 scripts/simulate_review_activity.py``) working
# without requiring the repository to be installed as a package.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.insights import (
    FactRecord,
    GuidelineRecord,
    ReviewActivity,
    compute_governance_insights,
)


DEFAULT_AS_OF = "2026-10-25T12:00:00Z"


def _timestamp(value: str) -> datetime:
    candidate = value[:-1] + "+00:00" if value.endswith("Z") else value
    parsed = datetime.fromisoformat(candidate)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _activity(
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
        occurred_at=_timestamp(occurred_at),
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


def build_demo_data() -> tuple[list[ReviewActivity], list[FactRecord], list[GuidelineRecord]]:
    """Return fictional VoltEdge activity, facts, and guidelines in stable order."""

    activities = [
        _activity(
            "activity-001",
            "finding-001",
            "2026-10-02T09:00:00Z",
            "unsupported_claim",
            rule_id="rule-comparative-claims",
            rule_name="Comparative claims",
            team_id="team-growth",
            team_name="Growth",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            reviewer_outcome="needs_human",
        ),
        _activity(
            "activity-002",
            "finding-002",
            "2026-10-05T09:00:00Z",
            "unsupported_claim",
            rule_id="rule-comparative-claims",
            rule_name="Comparative claims",
            team_id="team-growth",
            team_name="Growth",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            action="dismissed",
        ),
        _activity(
            "activity-003",
            "finding-003",
            "2026-10-08T09:00:00Z",
            "unsupported_claim",
            rule_id="rule-comparative-claims",
            rule_name="Comparative claims",
            team_id="team-growth",
            team_name="Growth",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            action="dismissed",
        ),
        _activity(
            "activity-004",
            "finding-004",
            "2026-10-11T09:00:00Z",
            "tone_messaging_mismatch",
            rule_id="rule-launch-tone",
            rule_name="Launch tone",
            team_id="team-content",
            team_name="Content",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            reviewer_outcome="needs_human",
        ),
        _activity(
            "activity-005",
            "finding-005",
            "2026-10-14T09:00:00Z",
            "tone_messaging_mismatch",
            rule_id="rule-launch-tone",
            rule_name="Launch tone",
            team_id="team-content",
            team_name="Content",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            reviewer_outcome="overridden",
        ),
        _activity(
            "activity-006",
            "finding-006",
            "2026-10-17T09:00:00Z",
            "tone_messaging_mismatch",
            rule_id="rule-launch-tone",
            rule_name="Launch tone",
            team_id="team-content",
            team_name="Content",
            agency_id="agency-lantern",
            agency_name="Lantern Works",
            action="dismissed",
        ),
        _activity(
            "activity-007",
            "finding-007",
            "2026-10-19T09:00:00Z",
            "fact_mismatch",
            rule_id="rule-novabook-battery",
            rule_name="NovaBook battery life",
            team_id="team-product",
            team_name="Product",
            agency_id="agency-lantern",
            agency_name="Lantern Works",
            verdict="contradicted",
            reviewer_outcome="overridden",
        ),
        _activity(
            "activity-008",
            "finding-008",
            "2026-10-21T09:00:00Z",
            "accessibility_issue",
            rule_id="rule-alt-text",
            rule_name="Alt text",
            team_id="team-content",
            team_name="Content",
            agency_id="agency-lantern",
            agency_name="Lantern Works",
            reviewer_outcome="needs_human",
        ),
        _activity(
            "activity-009",
            "finding-009",
            "2026-10-23T09:00:00Z",
            "outdated_fact_or_offer",
            rule_id="rule-launch-offer",
            rule_name="Launch offer expiry",
            team_id="team-growth",
            team_name="Growth",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            verdict="outdated",
        ),
        _activity(
            "activity-010",
            "finding-010",
            "2026-10-24T09:00:00Z",
            "unsupported_claim",
            rule_id="rule-comparative-claims",
            rule_name="Comparative claims",
            team_id="team-growth",
            team_name="Growth",
            agency_id="agency-spark",
            agency_name="Spark Studio",
            reviewer_outcome="needs_human",
        ),
    ]
    facts = [
        FactRecord(
            fact_id="fact-launch-offer",
            label="NovaBook launch offer",
            expires_at=_timestamp("2026-10-30T23:59:59Z"),
            version="3",
            source_id="source-voltedge-offer-v3",
            organisation_id="org-voltedge",
        ),
        FactRecord(
            fact_id="fact-summer-offer",
            label="Summer upgrade offer",
            expires_at=_timestamp("2026-11-18T23:59:59Z"),
            version="2",
            source_id="source-voltedge-summer-v2",
            organisation_id="org-voltedge",
        ),
    ]
    guidelines = [
        GuidelineRecord(
            rule_id="rule-comparative-claims",
            text="Use a comparative claim only when an approved benchmark is linked.",
            version="2",
            topic="comparative claims",
            directive="required",
            organisation_id="org-voltedge",
        ),
        GuidelineRecord(
            rule_id="rule-comparative-claims-copy",
            text="Comparative wording is optional when the product is clearly better.",
            version="1",
            topic="comparative claims",
            directive="optional",
            conflicts_with=("rule-comparative-claims",),
            organisation_id="org-voltedge",
        ),
        GuidelineRecord(
            rule_id="rule-launch-tone",
            text="Use a clear, capable, never exaggerated launch voice.",
            version="4",
            topic="launch tone",
            directive="preferred",
            organisation_id="org-voltedge",
        ),
    ]
    return activities, facts, guidelines


def run_simulation(*, as_of: str = DEFAULT_AS_OF) -> dict[str, Any]:
    activities, facts, guidelines = build_demo_data()
    insights = compute_governance_insights(
        activities,
        facts=facts,
        guidelines=guidelines,
        organisation_id="org-voltedge",
        as_of=_timestamp(as_of),
        window_days=30,
        expiring_within_days=30,
    )
    return insights.to_dict()


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate deterministic fictional VoltEdge review activity.")
    parser.add_argument(
        "--as-of",
        default=DEFAULT_AS_OF,
        help=f"ISO timestamp used as the report end (default: {DEFAULT_AS_OF})",
    )
    parser.add_argument("--compact", action="store_true", help="Emit one-line JSON.")
    args = parser.parse_args()
    result = run_simulation(as_of=args.as_of)
    if args.compact:
        print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    else:
        print(json.dumps(result, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
