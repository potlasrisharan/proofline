"""Shared, dependency-light verification dataclasses.

These types intentionally mirror the Phase 2 contract without importing Pydantic
models from the API layer.  ``to_dict`` helpers make adapting them to the API models
straightforward while preserving exact source spans and evidence quotes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from hashlib import sha1
from typing import Any, Mapping


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


def _json_value(value: Any) -> Any:
    """Convert common verification values into JSON-friendly values."""

    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if isinstance(value, Mapping):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [_json_value(item) for item in value]
    return str(value)


@dataclass(frozen=True, slots=True)
class Span:
    """An immutable character span into the normalised document text."""

    start: int
    end: int
    text: str

    def __post_init__(self) -> None:
        if self.start < 0 or self.end < self.start:
            raise ValueError("span must have non-negative, ordered offsets")
        if self.end - self.start != len(self.text):
            raise ValueError("span text length must match its character offsets")

    def to_dict(self) -> dict[str, Any]:
        return {"start": self.start, "end": self.end, "text": self.text}


@dataclass(frozen=True, slots=True)
class Evidence:
    """A source or configured rule excerpt supporting a finding."""

    source_type: str
    source_id: str
    version: str
    quote: str
    record_id: str | None = None

    def __post_init__(self) -> None:
        if not self.source_type or not self.source_id or not self.version or not self.quote:
            raise ValueError("evidence requires source type, id, version, and quote")

    def to_dict(self) -> dict[str, str | None]:
        result: dict[str, str | None] = {
            "source_type": self.source_type,
            "source_id": self.source_id,
            "version": self.version,
            "quote": self.quote,
        }
        if self.record_id is not None:
            result["record_id"] = self.record_id
        return result


@dataclass(frozen=True, slots=True)
class Suggestion:
    """A proposed correction; it never mutates content or approved records."""

    text: str
    intent_note: str

    def to_dict(self) -> dict[str, str]:
        return {"text": self.text, "intent_note": self.intent_note}


@dataclass(frozen=True, slots=True)
class Claim:
    """A candidate claim with an exact immutable span and normalised value."""

    id: str
    span: Span
    kind: str
    normalized_value: Any = None
    unit: str | None = None
    qualifier: str | None = None
    comparator: str | None = None
    regulated: bool = False
    evidence_quote: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    @property
    def text(self) -> str:
        return self.span.text

    @property
    def start(self) -> int:
        return self.span.start

    @property
    def end(self) -> int:
        return self.span.end

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "text": self.text,
            "start": self.start,
            "end": self.end,
            "kind": self.kind,
            "normalized_value": _json_value(self.normalized_value),
            "unit": self.unit,
            "qualifier": self.qualifier,
            "comparator": self.comparator,
            "regulated": self.regulated,
            "evidence_quote": self.evidence_quote,
            "metadata": _json_value(dict(self.metadata)),
        }


@dataclass(frozen=True, slots=True)
class ClaimFactLink:
    """A retained Claim–Fact Ledger link for one audit."""

    claim_id: str
    fact_id: str | None
    fact_version: str | None
    link_status: str
    evidence_quote: str | None = None
    evidence_quotes: tuple[str, ...] = ()
    candidate_fact_ids: tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "claim_id": self.claim_id,
            "fact_id": self.fact_id,
            "fact_version": self.fact_version,
            "link_status": self.link_status,
            "evidence_quote": self.evidence_quote,
            "evidence_quotes": list(self.evidence_quotes),
            "candidate_fact_ids": list(self.candidate_fact_ids),
            "metadata": _json_value(dict(self.metadata)),
        }


@dataclass(frozen=True, slots=True)
class Finding:
    """The compact evidence-aware finding shape consumed by the API layer."""

    id: str
    content_version_id: str
    span: Span
    category: str
    verdict: FindingVerdict | str
    severity: FindingSeverity | str
    confidence: float
    method: str
    evidence: Evidence | None
    reason: str
    suggestion: Suggestion | None = None
    status: str = "open"
    dismiss_reason: str | None = None
    evidence_refs: tuple[Evidence, ...] = ()
    rule_id: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not 0 <= self.confidence <= 1:
            raise ValueError("finding confidence must be between 0 and 1")
        if self.verdict in (FindingVerdict.CONTRADICTED, FindingVerdict.OUTDATED) and self.evidence is None:
            raise ValueError("contradicted and outdated findings require evidence")

    @property
    def evidence_status(self) -> str:
        if self.verdict in (FindingVerdict.CONTRADICTED, FindingVerdict.OUTDATED):
            return "supported_mismatch"
        if self.verdict == FindingVerdict.UNSUPPORTED:
            return "unsupported_unverified"
        if self.verdict == FindingVerdict.NEEDS_HUMAN:
            return "review_required"
        return "style_suggestion"

    def to_dict(self) -> dict[str, Any]:
        refs = self.evidence_refs or ((self.evidence,) if self.evidence else ())
        return {
            "id": self.id,
            "content_version_id": self.content_version_id,
            "span": self.span.to_dict(),
            "category": str(self.category),
            "verdict": str(self.verdict),
            "severity": str(self.severity),
            "confidence": self.confidence,
            "method": self.method,
            "evidence": self.evidence.to_dict() if self.evidence else None,
            "evidence_refs": [item.to_dict() for item in refs],
            "evidence_status": self.evidence_status,
            "reason": self.reason,
            "suggestion": self.suggestion.to_dict() if self.suggestion else None,
            "status": self.status,
            "dismiss_reason": self.dismiss_reason,
            "rule_id": self.rule_id,
            "metadata": _json_value(dict(self.metadata)),
        }


def stable_id(prefix: str, *parts: object) -> str:
    """Create a deterministic local identifier without claiming persistence."""

    material = "\x1f".join(str(part) for part in parts)
    digest = sha1(material.encode("utf-8"), usedforsecurity=False).hexdigest()[:16]
    return f"{prefix}_{digest}"
