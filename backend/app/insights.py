"""Deterministic, local governance analytics for saved review activity.

This module deliberately has no database, model, or network dependency.  Callers pass
already-authorised activity and registry records for one organisation, and the module
returns reproducible aggregates.  It does not retain reviewer identities or rank
individuals; team and agency results are aggregate-only.

The implementation is intentionally conservative:

* missing evidence is represented by ``needs_human``/review signals, not a hard truth
  claim;
* contradictory guidelines are emitted only when an explicit conflict or opposing
  directives are present;
* clearer wording is a proposal labelled ``AI-generated`` and remains unapplied until
  a brand owner explicitly approves it.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass, replace
from datetime import date, datetime, timedelta, timezone
import hashlib
import re
from typing import Any, Iterable, Mapping, Sequence

from .models import Principal, Role


UTC = timezone.utc
DEFAULT_ORGANISATION_ID = "org-voltedge"
DEFAULT_WINDOW_DAYS = 30
DEFAULT_EXPIRING_WITHIN_DAYS = 30
ANALYTICS_VERSION = "local-deterministic-v1"
MIN_SIGNAL_SAMPLE_SIZE = 3
SIGNAL_RATE_THRESHOLD = 0.5


def _parse_datetime(value: datetime | date | str | None) -> datetime | None:
    """Parse common ISO/RFC3339 values and normalise them to UTC."""

    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime.combine(value, datetime.min.time())
    elif isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        if candidate.endswith("Z"):
            candidate = f"{candidate[:-1]}+00:00"
        try:
            parsed = datetime.fromisoformat(candidate)
        except ValueError as exc:
            raise ValueError(f"invalid ISO timestamp: {value!r}") from exc
    else:
        raise TypeError(f"expected a date/time value, got {type(value).__name__}")

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _iso(value: datetime | date | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    return value.isoformat()


def _normalise_token(value: object | None) -> str:
    if value is None:
        return ""
    token = str(value).strip().casefold()
    token = re.sub(r"[^a-z0-9]+", "_", token)
    return token.strip("_")


def _display_label(value: str) -> str:
    words = re.sub(r"[_-]+", " ", value.strip()).split()
    if not words:
        return "Unlabelled"
    return " ".join([words[0].capitalize(), *words[1:]])


def _as_tuple(value: object | None) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        return (value,)
    if isinstance(value, Mapping):
        return tuple(str(key) for key in value)
    if isinstance(value, Iterable):
        return tuple(str(item) for item in value if str(item).strip())
    return (str(value),)


@dataclass(frozen=True)
class ReviewActivity:
    """One finding/reviewer event supplied to the local analytics engine.

    A row represents one observed review event.  ``finding_id`` can repeat when a
    finding is revisited; ``unique_findings`` in the aggregate output keeps that
    distinction visible.  No reviewer/actor identity is stored in this type.
    """

    activity_id: str
    finding_id: str
    occurred_at: datetime
    category: str
    organisation_id: str = DEFAULT_ORGANISATION_ID
    rule_id: str | None = None
    rule_name: str | None = None
    rule_version: str | None = None
    team_id: str | None = None
    team_name: str | None = None
    agency_id: str | None = None
    agency_name: str | None = None
    verdict: str | None = None
    action: str | None = None
    status: str | None = None
    reviewer_outcome: str | None = None
    evidence_status: str | None = None

    def __post_init__(self) -> None:
        occurred_at = _parse_datetime(self.occurred_at)
        if occurred_at is None:
            raise ValueError("occurred_at must not be empty")
        object.__setattr__(self, "occurred_at", occurred_at)
        if not self.activity_id.strip():
            raise ValueError("activity_id must not be empty")
        if not self.finding_id.strip():
            raise ValueError("finding_id must not be empty")
        if not self.category.strip():
            raise ValueError("category must not be empty")

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "ReviewActivity":
        """Coerce a compact Finding/review-event mapping into an activity row."""

        team = value.get("team")
        agency = value.get("agency")
        team_id = value.get("team_id") or (team.get("id") if isinstance(team, Mapping) else None)
        team_name = value.get("team_name") or (team.get("name") if isinstance(team, Mapping) else team if isinstance(team, str) else None)
        agency_id = value.get("agency_id") or (agency.get("id") if isinstance(agency, Mapping) else None)
        agency_name = value.get("agency_name") or (agency.get("name") if isinstance(agency, Mapping) else agency if isinstance(agency, str) else None)
        rule = value.get("rule")
        rule_id = value.get("rule_id") or (rule.get("id") if isinstance(rule, Mapping) else None)
        rule_name = value.get("rule_name") or (rule.get("name") if isinstance(rule, Mapping) else None)
        occurred_at = value.get("occurred_at") or value.get("created_at") or value.get("timestamp")
        parsed_at = _parse_datetime(occurred_at)
        if parsed_at is None:
            raise ValueError("review activity requires occurred_at, created_at, or timestamp")
        activity_id = value.get("activity_id") or value.get("id")
        finding_id = value.get("finding_id") or value.get("findingId") or value.get("id")
        if activity_id is None or finding_id is None:
            raise ValueError("review activity requires an activity_id and finding_id (or a compact Finding id)")
        reviewer_outcome = value.get("reviewer_outcome") or value.get("reviewerOutcome")
        action = value.get("action") or value.get("creator_action")
        return cls(
            activity_id=str(activity_id),
            finding_id=str(finding_id),
            occurred_at=parsed_at,
            category=str(value.get("category") or "uncategorised"),
            organisation_id=str(value.get("organisation_id") or value.get("organization_id") or DEFAULT_ORGANISATION_ID),
            rule_id=str(rule_id) if rule_id is not None else None,
            rule_name=str(rule_name) if rule_name is not None else None,
            rule_version=str(value["rule_version"]) if value.get("rule_version") is not None else None,
            team_id=str(team_id) if team_id is not None else None,
            team_name=str(team_name) if team_name is not None else None,
            agency_id=str(agency_id) if agency_id is not None else None,
            agency_name=str(agency_name) if agency_name is not None else None,
            verdict=str(value["verdict"]) if value.get("verdict") is not None else None,
            action=str(action) if action is not None else None,
            status=str(value["status"]) if value.get("status") is not None else None,
            reviewer_outcome=str(reviewer_outcome) if reviewer_outcome is not None else None,
            evidence_status=str(value["evidence_status"]) if value.get("evidence_status") is not None else None,
        )


@dataclass(frozen=True)
class FactRecord:
    """A versioned fact/rule record with an optional validity end."""

    fact_id: str
    label: str
    expires_at: datetime | None = None
    version: str | None = None
    status: str = "approved"
    source_id: str | None = None
    organisation_id: str | None = None
    effective_from: datetime | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "expires_at", _parse_datetime(self.expires_at))
        object.__setattr__(self, "effective_from", _parse_datetime(self.effective_from))

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "FactRecord":
        raw_value = value.get("value")
        label = value.get("label") or value.get("name") or value.get("title") or value.get("key")
        if label is None and isinstance(raw_value, Mapping):
            label = raw_value.get("label") or raw_value.get("name") or raw_value.get("key") or raw_value.get("term")
        fact_id = value.get("fact_id") or value.get("record_id") or value.get("id")
        if fact_id is None:
            raise ValueError("fact record requires fact_id, record_id, or id")
        if label is None:
            label = str(fact_id)
        expires_at = value.get("expires_at") or value.get("expires_on") or value.get("expiry_date") or value.get("effective_to")
        return cls(
            fact_id=str(fact_id),
            label=str(label),
            expires_at=_parse_datetime(expires_at),
            version=str(value["version"]) if value.get("version") is not None else (str(value["source_version"]) if value.get("source_version") is not None else None),
            status=str(value.get("status") or "approved"),
            source_id=str(value["source_id"]) if value.get("source_id") is not None else None,
            organisation_id=str(value["organisation_id"]) if value.get("organisation_id") is not None else None,
            effective_from=_parse_datetime(value.get("effective_from")),
        )


@dataclass(frozen=True)
class GuidelineRecord:
    """A guideline used for explicit contradiction/ambiguity detection."""

    rule_id: str
    text: str
    version: str | None = None
    topic: str | None = None
    directive: str | None = None
    conflicts_with: tuple[str, ...] = ()
    organisation_id: str | None = None
    scope: str = "workspace"
    status: str = "approved"
    effective_from: datetime | None = None
    effective_to: datetime | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "effective_from", _parse_datetime(self.effective_from))
        object.__setattr__(self, "effective_to", _parse_datetime(self.effective_to))

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "GuidelineRecord":
        rule_id = value.get("rule_id") or value.get("record_id") or value.get("id")
        if rule_id is None:
            raise ValueError("guideline requires rule_id, record_id, or id")
        text = value.get("text") or value.get("wording") or value.get("title") or value.get("name")
        raw_value = value.get("value")
        if text is None and isinstance(raw_value, Mapping):
            text = raw_value.get("text") or raw_value.get("wording") or raw_value.get("rule")
        if not text:
            raise ValueError("guideline requires text or wording; a rule ID alone is not evidence")
        conflicts_with = value.get("conflicts_with") or value.get("conflictsWith") or value.get("contradicts")
        directive = value.get("directive") or value.get("polarity")
        return cls(
            rule_id=str(rule_id),
            text=str(text),
            version=str(value["version"]) if value.get("version") is not None else (str(value["source_version"]) if value.get("source_version") is not None else None),
            topic=str(value["topic"]) if value.get("topic") is not None else None,
            directive=str(directive) if directive is not None else None,
            conflicts_with=_as_tuple(conflicts_with),
            organisation_id=str(value["organisation_id"]) if value.get("organisation_id") is not None else None,
            scope=str(value.get("scope") or "workspace"),
            status=str(value.get("status") or "approved"),
            effective_from=_parse_datetime(value.get("effective_from")),
            effective_to=_parse_datetime(value.get("effective_to")),
        )


@dataclass(frozen=True)
class FindingAggregate:
    key: str
    label: str
    count: int
    unique_findings: int
    dismissed_count: int
    overridden_count: int
    needs_human_count: int
    contradicted_count: int
    dismissal_rate: float
    override_rate: float
    needs_human_rate: float


@dataclass(frozen=True)
class GroupAggregate:
    group_type: str
    group_id: str
    group_name: str
    finding_count: int
    unique_findings: int
    dismissed_count: int
    overridden_count: int
    needs_human_count: int
    needs_human_rate: float


@dataclass(frozen=True)
class TrendPoint:
    period_start: date
    period_end: date
    finding_count: int
    unique_findings: int
    dismissed_count: int
    overridden_count: int
    needs_human_count: int


@dataclass(frozen=True)
class ExpiringFact:
    fact_id: str
    label: str
    version: str | None
    expires_at: datetime
    days_remaining: int
    status: str
    source_id: str | None = None


@dataclass(frozen=True)
class ContradictoryGuideline:
    conflict_id: str
    topic: str
    rule_ids: tuple[str, ...]
    rule_versions: tuple[str | None, ...]
    explanation: str


@dataclass(frozen=True)
class AmbiguitySignal:
    signal_id: str
    signal_type: str
    scope: str
    key: str
    label: str
    count: int
    sample_size: int
    rate: float | None
    explanation: str
    evidence: tuple[str, ...] = ()


@dataclass(frozen=True)
class SuggestedRuleUpdate:
    """Owner-reviewed wording proposal; approval never activates it automatically."""

    proposal_id: str
    organisation_id: str | None
    rule_id: str | None
    title: str
    current_wording: str | None
    suggested_wording: str
    rule_version: str | None = None
    generated_label: str = "AI-generated"
    generation_method: str = "deterministic_local_template"
    evidence_summary: str = ""
    evidence: tuple[str, ...] = ()
    status: str = "proposed"
    approval_required_role: str = "brand_owner"
    approved_by: str | None = None
    approved_at: datetime | None = None
    applied: bool = False

    def approve(
        self,
        *,
        principal: Principal,
        approved_at: datetime | None = None,
    ) -> "SuggestedRuleUpdate":
        """Record explicit owner approval while keeping the proposal unapplied."""

        if principal.role is not Role.BRAND_OWNER:
            raise PermissionError("only a brand_owner can approve a suggested rule update")
        if self.organisation_id != principal.organisation_id:
            raise PermissionError("suggested rule update is not visible in this organisation")
        if self.status != "proposed":
            raise ValueError(f"cannot approve a proposal in status {self.status!r}")
        return replace(
            self,
            status="approved",
            approved_by=principal.user_id,
            approved_at=_parse_datetime(approved_at) or datetime.now(UTC),
            applied=False,
        )


@dataclass(frozen=True)
class GovernanceInsights:
    analytics_version: str
    organisation_id: str | None
    window_start: datetime
    window_end: datetime
    window_days: int
    sample_size: int
    individual_rankings_included: bool
    by_category: tuple[FindingAggregate, ...] = ()
    by_rule: tuple[FindingAggregate, ...] = ()
    teams: tuple[GroupAggregate, ...] = ()
    agencies: tuple[GroupAggregate, ...] = ()
    trends: tuple[TrendPoint, ...] = ()
    expiring_facts: tuple[ExpiringFact, ...] = ()
    ambiguity_signals: tuple[AmbiguitySignal, ...] = ()
    contradictory_guidelines: tuple[ContradictoryGuideline, ...] = ()
    suggested_rule_updates: tuple[SuggestedRuleUpdate, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-safe wire shape for the API or simulation script."""

        def convert(value: Any) -> Any:
            if isinstance(value, datetime):
                return _iso(value)
            if isinstance(value, date):
                return value.isoformat()
            if isinstance(value, tuple):
                return [convert(item) for item in value]
            if isinstance(value, list):
                return [convert(item) for item in value]
            if isinstance(value, dict):
                return {key: convert(item) for key, item in value.items()}
            return value

        return convert(asdict(self))


def _coerce_activities(activities: Iterable[ReviewActivity | Mapping[str, Any]]) -> list[ReviewActivity]:
    return [
        item if isinstance(item, ReviewActivity) else ReviewActivity.from_mapping(item)
        for item in activities
    ]


def _coerce_facts(facts: Iterable[FactRecord | Mapping[str, Any]]) -> list[FactRecord]:
    return [item if isinstance(item, FactRecord) else FactRecord.from_mapping(item) for item in facts]


def _coerce_guidelines(guidelines: Iterable[GuidelineRecord | Mapping[str, Any]]) -> list[GuidelineRecord]:
    return [item if isinstance(item, GuidelineRecord) else GuidelineRecord.from_mapping(item) for item in guidelines]


def _group_by_activity_key(
    events: Sequence[ReviewActivity],
    *,
    key: str,
) -> dict[str, list[ReviewActivity]]:
    grouped: dict[str, list[ReviewActivity]] = defaultdict(list)
    for event in events:
        value = getattr(event, key)
        if value:
            grouped[str(value)].append(event)
    return grouped


def _rate(count: int, total: int) -> float:
    return round(count / total, 4) if total else 0.0


def _is_dismissed(activity: ReviewActivity) -> bool:
    values = {_normalise_token(activity.action), _normalise_token(activity.status), _normalise_token(activity.reviewer_outcome)}
    return bool(values & {"dismissed", "dismiss"})


def _is_overridden(activity: ReviewActivity) -> bool:
    values = {_normalise_token(activity.action), _normalise_token(activity.status), _normalise_token(activity.reviewer_outcome)}
    return bool(values & {"overridden", "override"})


def _is_needs_human(activity: ReviewActivity) -> bool:
    values = {
        _normalise_token(activity.verdict),
        _normalise_token(activity.reviewer_outcome),
        _normalise_token(activity.evidence_status),
    }
    return bool(values & {"needs_human", "needs_review", "review_required"})


def _is_contradicted(activity: ReviewActivity) -> bool:
    return _normalise_token(activity.verdict) in {"contradicted", "outdated"}


def _aggregate(events: Sequence[ReviewActivity], *, key: str, label: str) -> FindingAggregate:
    dismissed = sum(_is_dismissed(event) for event in events)
    overridden = sum(_is_overridden(event) for event in events)
    needs_human = sum(_is_needs_human(event) for event in events)
    contradicted = sum(_is_contradicted(event) for event in events)
    count = len(events)
    return FindingAggregate(
        key=key,
        label=label,
        count=count,
        unique_findings=len({event.finding_id for event in events}),
        dismissed_count=dismissed,
        overridden_count=overridden,
        needs_human_count=needs_human,
        contradicted_count=contradicted,
        dismissal_rate=_rate(dismissed, count),
        override_rate=_rate(overridden, count),
        needs_human_rate=_rate(needs_human, count),
    )


def _sorted_aggregates(grouped: Mapping[str, list[ReviewActivity]], labels: Mapping[str, str]) -> tuple[FindingAggregate, ...]:
    aggregates = [_aggregate(events, key=key, label=labels.get(key, _display_label(key))) for key, events in grouped.items()]
    return tuple(sorted(aggregates, key=lambda item: (-item.count, -item.unique_findings, item.key)))


def _group_aggregates(events: Sequence[ReviewActivity], *, group_type: str) -> tuple[GroupAggregate, ...]:
    grouped: dict[str, list[ReviewActivity]] = defaultdict(list)
    labels: dict[str, set[str]] = defaultdict(set)
    for event in events:
        group_id = event.team_id if group_type == "team" else event.agency_id
        group_name = event.team_name if group_type == "team" else event.agency_name
        if not group_id:
            continue
        grouped[group_id].append(event)
        labels[group_id].add(group_name or group_id)

    result: list[GroupAggregate] = []
    for group_id, group_events in grouped.items():
        needs_human = sum(_is_needs_human(event) for event in group_events)
        result.append(
            GroupAggregate(
                group_type=group_type,
                group_id=group_id,
                group_name=min(labels[group_id]),
                finding_count=len(group_events),
                unique_findings=len({event.finding_id for event in group_events}),
                dismissed_count=sum(_is_dismissed(event) for event in group_events),
                overridden_count=sum(_is_overridden(event) for event in group_events),
                needs_human_count=needs_human,
                needs_human_rate=_rate(needs_human, len(group_events)),
            )
        )
    return tuple(sorted(result, key=lambda item: (-item.finding_count, item.group_id)))


def _week_start(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _build_trends(events: Sequence[ReviewActivity], *, window_start: datetime, window_end: datetime) -> tuple[TrendPoint, ...]:
    first = _week_start(window_start.date())
    last = _week_start(window_end.date())
    buckets: dict[date, list[ReviewActivity]] = defaultdict(list)
    for event in events:
        buckets[_week_start(event.occurred_at.date())].append(event)

    points: list[TrendPoint] = []
    cursor = first
    while cursor <= last:
        bucket = buckets.get(cursor, [])
        points.append(
            TrendPoint(
                period_start=cursor,
                period_end=cursor + timedelta(days=6),
                finding_count=len(bucket),
                unique_findings=len({event.finding_id for event in bucket}),
                dismissed_count=sum(_is_dismissed(event) for event in bucket),
                overridden_count=sum(_is_overridden(event) for event in bucket),
                needs_human_count=sum(_is_needs_human(event) for event in bucket),
            )
        )
        cursor += timedelta(days=7)
    return tuple(points)


_OPPOSITE_DIRECTIVES = {
    "allow": {"prohibit", "forbid", "forbidden", "banned", "disallow", "deny"},
    "preferred": {"banned", "prohibited", "forbidden", "disallowed"},
    "required": {"optional", "forbidden", "prohibited", "disallowed"},
    "prohibit": {"allow", "preferred", "required", "permitted"},
    "forbid": {"allow", "preferred", "required", "permitted"},
    "banned": {"allow", "preferred", "required", "permitted"},
    "optional": {"required", "mandatory"},
    "permitted": {"prohibit", "forbid", "banned"},
}


def _directives_conflict(left: str | None, right: str | None) -> bool:
    if not left or not right:
        return False
    left_token = _normalise_token(left)
    right_token = _normalise_token(right)
    return right_token in _OPPOSITE_DIRECTIVES.get(left_token, set()) or left_token in _OPPOSITE_DIRECTIVES.get(right_token, set())


def _find_contradictions(guidelines: Sequence[GuidelineRecord]) -> tuple[ContradictoryGuideline, ...]:
    guidelines = sorted(guidelines, key=lambda item: (item.rule_id, item.version or ""))
    by_id = {guideline.rule_id: guideline for guideline in guidelines}
    pairs: dict[tuple[str, str], tuple[GuidelineRecord, GuidelineRecord, str]] = {}

    for guideline in guidelines:
        for other_id in guideline.conflicts_with:
            other = by_id.get(other_id)
            if other is None or other.rule_id == guideline.rule_id or other.scope != guideline.scope:
                continue
            pair_values = sorted((guideline.rule_id, other.rule_id))
            pair = (pair_values[0], pair_values[1])
            pairs[pair] = (guideline, other, "The guidelines explicitly reference one another as conflicting.")

    topics: dict[tuple[str, str], list[GuidelineRecord]] = defaultdict(list)
    for guideline in guidelines:
        if guideline.topic:
            topics[(_normalise_token(guideline.topic), guideline.scope)].append(guideline)
    for records in topics.values():
        for index, left in enumerate(records):
            for right in records[index + 1 :]:
                if _directives_conflict(left.directive, right.directive):
                    pair_values = sorted((left.rule_id, right.rule_id))
                    pair = (pair_values[0], pair_values[1])
                    pairs[pair] = (left, right, "The guidelines share a topic but use opposing directives.")

    results: list[ContradictoryGuideline] = []
    for pair, (left, right, explanation) in pairs.items():
        topic = min(topic for topic in (left.topic, right.topic) if topic) if (left.topic or right.topic) else "related guidance"
        digest = hashlib.sha256(f"{pair[0]}|{by_id[pair[0]].version}|{pair[1]}|{by_id[pair[1]].version}|{topic}".encode("utf-8")).hexdigest()[:12]
        results.append(
            ContradictoryGuideline(
                conflict_id=f"guideline-conflict-{digest}",
                topic=topic,
                rule_ids=pair,
                rule_versions=(
                    by_id[pair[0]].version,
                    by_id[pair[1]].version,
                ),
                explanation=explanation,
            )
        )
    return tuple(sorted(results, key=lambda item: (item.topic.casefold(), item.rule_ids)))


def _signal_id(signal_type: str, scope: str, key: str) -> str:
    digest = hashlib.sha256(f"{signal_type}|{scope}|{key}".encode("utf-8")).hexdigest()[:12]
    return f"ambiguity-{digest}"


def _suggestion_id(signal: AmbiguitySignal) -> str:
    digest = hashlib.sha256(f"{signal.signal_id}|{signal.key}".encode("utf-8")).hexdigest()[:12]
    return f"rule-update-{digest}"


def _make_suggestion(
    signal: AmbiguitySignal,
    *,
    organisation_id: str | None,
    guideline_by_id: Mapping[str, GuidelineRecord],
) -> SuggestedRuleUpdate:
    current: str | None = None
    rule_id: str | None = signal.key if signal.scope == "rule" else None
    if signal.signal_type == "contradictory_guideline":
        rule_id = next((item[5:].split("@", 1)[0] for item in signal.evidence if item.startswith("rule:")), None)
    guideline = guideline_by_id.get(rule_id) if rule_id is not None else None
    if guideline is not None:
        current = guideline.text
    if signal.signal_type == "contradictory_guideline":
        wording = f"When approved guidance for {signal.label} conflicts within the same scope, require brand-owner clarification. Do not select one instruction or approve the disputed wording until the conflicting versions have been explicitly resolved."
        title = f"Resolve contradictory guidance for {signal.label}"
    elif signal.signal_type == "high_dismissal_rate":
        wording = f"For {signal.label}, flag only text that conflicts with an applicable approved instruction. Identify the triggering phrase and exact rule version. Where the context is insufficient, request human review rather than asserting a violation."
        title = f"Clarify dismissal-prone rule: {signal.label}"
    elif signal.signal_type == "high_override_rate":
        wording = f"For {signal.label}, cite the applicable approved evidence and scope for each finding. An authorised reviewer may override a finding only with a recorded reason; an override does not change this rule."
        title = f"Clarify override-prone rule: {signal.label}"
    else:
        wording = f"For {signal.label}, use only approved evidence that matches the product, market, channel, and validity window. If evidence is absent, conflicting, or inapplicable, mark the claim needs_human and request an authorised reviewer decision."
        title = f"Clarify human-review rule: {signal.label}"

    if current:
        wording = f"{current.rstrip()}\n\nClarification: {wording}"

    return SuggestedRuleUpdate(
        proposal_id=_suggestion_id(signal),
        organisation_id=organisation_id,
        rule_id=rule_id,
        title=title,
        current_wording=current,
        suggested_wording=wording,
        rule_version=guideline.version if guideline else None,
        generated_label="AI-generated",
        generation_method="deterministic_local_template",
        evidence_summary=signal.explanation,
        evidence=signal.evidence,
    )


def _build_ambiguity_signals(
    *,
    by_category: Sequence[FindingAggregate],
    by_rule: Sequence[FindingAggregate],
    contradictions: Sequence[ContradictoryGuideline],
    category_groups: Mapping[str, Sequence[ReviewActivity]],
    rule_groups: Mapping[str, Sequence[ReviewActivity]],
) -> tuple[AmbiguitySignal, ...]:
    signals: list[AmbiguitySignal] = []
    for scope, aggregates in (("rule", by_rule), ("category", by_category)):
        for aggregate in aggregates:
            checks = (
                ("high_dismissal_rate", aggregate.dismissal_rate, "dismissals", aggregate.dismissed_count),
                ("high_override_rate", aggregate.override_rate, "overrides", aggregate.overridden_count),
                ("frequent_needs_human", aggregate.needs_human_rate, "needs_human outcomes", aggregate.needs_human_count),
            )
            for signal_type, rate, label, count in checks:
                if aggregate.unique_findings < MIN_SIGNAL_SAMPLE_SIZE or count < 2 or rate < SIGNAL_RATE_THRESHOLD:
                    continue
                signal_label = aggregate.label
                signals.append(
                    AmbiguitySignal(
                        signal_id=_signal_id(signal_type, scope, aggregate.key),
                        signal_type=signal_type,
                        scope=scope,
                        key=aggregate.key,
                        label=signal_label,
                        count=count,
                        sample_size=aggregate.count,
                        rate=rate,
                        explanation=f"{count} of {aggregate.count} {label} were recorded for {signal_label} ({rate:.0%}).",
                        evidence=tuple(
                            f"activity:{event.activity_id}"
                            for event in (rule_groups if scope == "rule" else category_groups)[aggregate.key]
                        ),
                    )
                )

    for contradiction in contradictions:
        signals.append(
            AmbiguitySignal(
                signal_id=_signal_id("contradictory_guideline", "guideline", contradiction.conflict_id),
                signal_type="contradictory_guideline",
                scope="guideline",
                key=contradiction.conflict_id,
                label=contradiction.topic,
                count=1,
                sample_size=1,
                rate=None,
                explanation=contradiction.explanation,
                evidence=tuple(
                    f"rule:{rule_id}{'@' + version if version is not None else ''}"
                    for rule_id, version in zip(contradiction.rule_ids, contradiction.rule_versions)
                ),
            )
        )
    return tuple(sorted(signals, key=lambda item: (item.signal_type, item.scope, item.key)))


def _approved_at_time(
    records: Sequence[FactRecord | GuidelineRecord],
    *,
    organisation_id: str | None,
    as_of: datetime,
) -> list[FactRecord | GuidelineRecord]:
    """Keep only tenant-scoped records active at the report timestamp."""

    active: list[FactRecord | GuidelineRecord] = []
    for record in records:
        if organisation_id is not None and record.organisation_id not in (None, organisation_id):
            continue
        if record.status.casefold() != "approved":
            continue
        if isinstance(record, GuidelineRecord):
            if record.effective_from is not None and record.effective_from > as_of:
                continue
            if record.effective_to is not None and record.effective_to <= as_of:
                continue
        else:
            if record.effective_from is not None and record.effective_from > as_of:
                continue
        active.append(record)
    return active


def compute_governance_insights(
    activities: Iterable[ReviewActivity | Mapping[str, Any]],
    *,
    facts: Iterable[FactRecord | Mapping[str, Any]] = (),
    guidelines: Iterable[GuidelineRecord | Mapping[str, Any]] = (),
    organisation_id: str | None = None,
    as_of: datetime | date | str | None = None,
    window_days: int = DEFAULT_WINDOW_DAYS,
    expiring_within_days: int = DEFAULT_EXPIRING_WITHIN_DAYS,
) -> GovernanceInsights:
    """Compute deterministic governance insights for one already-scoped dataset.

    ``as_of`` is recommended for reproducible reports.  If omitted, the latest
    activity timestamp is used; an empty dataset uses the Unix epoch rather than the
    wall clock.  The caller is responsible for authorising and scoping input rows.
    """

    if window_days < 1:
        raise ValueError("window_days must be at least 1")
    if expiring_within_days < 0:
        raise ValueError("expiring_within_days must not be negative")

    all_activities = _coerce_activities(activities)
    all_facts = _coerce_facts(facts)
    all_guidelines = _coerce_guidelines(guidelines)
    selected_organisation = organisation_id
    if selected_organisation is None:
        organisations = {
            item.organisation_id
            for item in [*all_activities, *all_facts, *all_guidelines]
            if item.organisation_id is not None
        }
        if len(organisations) > 1:
            raise ValueError("organisation_id is required for a dataset containing multiple organisations")
        selected_organisation = next(iter(organisations), None)
    if selected_organisation is not None:
        selected_activities = [item for item in all_activities if item.organisation_id == selected_organisation]
    else:
        selected_activities = all_activities

    parsed_as_of = _parse_datetime(as_of)
    if parsed_as_of is None:
        parsed_as_of = max((item.occurred_at for item in selected_activities), default=datetime(1970, 1, 1, tzinfo=UTC))
    window_start = (parsed_as_of - timedelta(days=window_days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    event_by_id: dict[str, ReviewActivity] = {}
    for event in selected_activities:
        if not window_start <= event.occurred_at <= parsed_as_of:
            continue
        existing = event_by_id.get(event.activity_id)
        if existing is not None and existing != event:
            raise ValueError(f"conflicting activity data for activity_id {event.activity_id!r}")
        event_by_id[event.activity_id] = event
    window_events = sorted(event_by_id.values(), key=lambda item: (item.occurred_at, item.activity_id))

    category_groups: dict[str, list[ReviewActivity]] = defaultdict(list)
    category_labels: dict[str, str] = {}
    rule_groups: dict[str, list[ReviewActivity]] = defaultdict(list)
    rule_labels: dict[str, str] = {}
    for event in window_events:
        category_key = _normalise_token(event.category) or "uncategorised"
        category_groups[category_key].append(event)
        category_labels.setdefault(category_key, event.category.strip())
        if event.rule_id:
            rule_key = event.rule_id.strip()
            rule_groups[rule_key].append(event)
            rule_labels.setdefault(rule_key, event.rule_name.strip() if event.rule_name else rule_key)

    by_category = _sorted_aggregates(category_groups, category_labels)
    by_rule = _sorted_aggregates(rule_groups, rule_labels)
    selected_facts = [
        item for item in _approved_at_time(all_facts, organisation_id=selected_organisation, as_of=parsed_as_of)
        if isinstance(item, FactRecord)
    ]
    selected_guidelines = [
        item for item in _approved_at_time(all_guidelines, organisation_id=selected_organisation, as_of=parsed_as_of)
        if isinstance(item, GuidelineRecord)
    ]

    expiring_limit = parsed_as_of + timedelta(days=expiring_within_days)
    expiring_facts = tuple(
        ExpiringFact(
            fact_id=fact.fact_id,
            label=fact.label,
            version=fact.version,
            expires_at=fact.expires_at,  # type: ignore[arg-type]
            days_remaining=max(0, (fact.expires_at.date() - parsed_as_of.date()).days),  # type: ignore[union-attr]
            status=fact.status,
            source_id=fact.source_id,
        )
        for fact in sorted(
            (
                fact
                for fact in selected_facts
                if fact.expires_at is not None
                and parsed_as_of <= fact.expires_at <= expiring_limit
            ),
            key=lambda item: (item.expires_at or datetime.max.replace(tzinfo=UTC), item.fact_id),
        )
    )

    contradictions = _find_contradictions(selected_guidelines)
    ambiguity_signals = _build_ambiguity_signals(
        by_category=by_category,
        by_rule=by_rule,
        contradictions=contradictions,
        category_groups=category_groups,
        rule_groups=rule_groups,
    )
    guideline_by_id = {guideline.rule_id: guideline for guideline in selected_guidelines}
    suggestions = tuple(
        _make_suggestion(signal, organisation_id=selected_organisation, guideline_by_id=guideline_by_id)
        for signal in ambiguity_signals
    )

    return GovernanceInsights(
        analytics_version=ANALYTICS_VERSION,
        organisation_id=selected_organisation,
        window_start=window_start,
        window_end=parsed_as_of,
        window_days=window_days,
        sample_size=len(window_events),
        individual_rankings_included=False,
        by_category=by_category,
        by_rule=by_rule,
        teams=_group_aggregates(window_events, group_type="team"),
        agencies=_group_aggregates(window_events, group_type="agency"),
        trends=_build_trends(window_events, window_start=window_start, window_end=parsed_as_of),
        expiring_facts=expiring_facts,
        ambiguity_signals=ambiguity_signals,
        contradictory_guidelines=contradictions,
        suggested_rule_updates=suggestions,
    )


def compute_insights(*args: Any, **kwargs: Any) -> GovernanceInsights:
    """Short alias for callers that use the generic analytics name."""

    return compute_governance_insights(*args, **kwargs)


def approve_suggested_rule_update(
    proposal: SuggestedRuleUpdate,
    *,
    principal: Principal,
    approved_at: datetime | None = None,
) -> SuggestedRuleUpdate:
    """Record an explicit brand-owner approval without changing any live rule."""

    return proposal.approve(principal=principal, approved_at=approved_at)


__all__ = [
    "ANALYTICS_VERSION",
    "AmbiguitySignal",
    "ContradictoryGuideline",
    "ExpiringFact",
    "FactRecord",
    "FindingAggregate",
    "GovernanceInsights",
    "GroupAggregate",
    "GuidelineRecord",
    "ReviewActivity",
    "SuggestedRuleUpdate",
    "TrendPoint",
    "approve_suggested_rule_update",
    "compute_governance_insights",
    "compute_insights",
]
