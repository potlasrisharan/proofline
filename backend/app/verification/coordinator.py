"""Coordinator for the offline verification layer.

The coordinator is deliberately independent of FastAPI, Pydantic, ingestion, and
persistence.  The audit pipeline can pass a ``NormalizedDocument`` mapping, a typed
object, or plain text and can adapt the returned dataclasses to its API models.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Protocol

from .claims import DEFAULT_REGULATED_KEYWORDS, extract_claims
from .matching import link_claims_to_facts
from .rules import RuleOptions, run_deterministic_rules
from .types import Claim, ClaimFactLink, Finding


class DocumentLike(Protocol):
    """Minimum document interface accepted by ``coordinate_verification``."""

    text: str


class ApprovedRecordLike(Protocol):
    """Marker protocol for generic approved records.

    The implementation reads attributes/mapping keys defensively, so a pipeline can
    pass the existing ``VaultRecord`` Pydantic objects without importing them here.
    """

    id: str
    version: str
    value: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class AuditOptions:
    """Runtime knobs that remain deterministic and provider-independent."""

    content_version_id: str = ""
    today: date | None = None
    scope: Mapping[str, Any] = field(default_factory=dict)
    regulated_keywords: Sequence[str] = ()
    term_policy: Any = None
    disclaimer_requirements: Any = None
    image_metadata: Mapping[str, Any] | Sequence[Mapping[str, Any]] | None = None
    contrast_pairs: Sequence[Mapping[str, Any] | Sequence[Any]] = ()
    observed_colours: Sequence[Any] = ()
    approved_palette: Any = None
    fuzzy_terms: bool = True
    extraction_status: str = "complete"
    extraction_message: str | None = None
    ruleset_version: str = "deterministic-offline-v1"


@dataclass(frozen=True, slots=True)
class VerificationResult:
    """Offline audit result for the pipeline/API adapter."""

    claims: tuple[Claim, ...]
    claim_links: tuple[ClaimFactLink, ...]
    findings: tuple[Finding, ...]
    status: str
    service_metadata: Mapping[str, Any] = field(default_factory=dict)
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "claims": [claim.to_dict() for claim in self.claims],
            "claim_links": [link.to_dict() for link in self.claim_links],
            "findings": [finding.to_dict() for finding in self.findings],
            "status": self.status,
            "service_metadata": dict(self.service_metadata),
            "error": self.error,
        }


def _field(document: Any, name: str, default: Any = None) -> Any:
    if isinstance(document, Mapping):
        return document.get(name, default)
    return getattr(document, name, default)


def _document_text(document: Any) -> str:
    if isinstance(document, str):
        return document
    text = _field(document, "text", _field(document, "extracted_text", _field(document, "source_text", "")))
    return text if isinstance(text, str) else str(text or "")


def _document_metadata(document: Any) -> Mapping[str, Any]:
    raw = _field(document, "metadata", {})
    return raw if isinstance(raw, Mapping) else {}


def _merge_option_metadata(options: AuditOptions, document: Any) -> AuditOptions:
    metadata = _document_metadata(document)
    return AuditOptions(
        content_version_id=options.content_version_id,
        today=options.today,
        scope={**(metadata.get("scope", {}) if isinstance(metadata.get("scope", {}), Mapping) else {}), **options.scope},
        regulated_keywords=options.regulated_keywords or tuple(metadata.get("regulated_keywords", ()) or ()),
        term_policy=options.term_policy if options.term_policy is not None else metadata.get("term_policy", metadata.get("terminology_policy")),
        disclaimer_requirements=options.disclaimer_requirements if options.disclaimer_requirements is not None else metadata.get("disclaimer_requirements", metadata.get("required_disclaimers")),
        image_metadata=options.image_metadata if options.image_metadata is not None else _field(document, "image_metadata"),
        contrast_pairs=options.contrast_pairs or tuple(metadata.get("contrast_pairs", ()) or ()),
        observed_colours=options.observed_colours or tuple(metadata.get("observed_colours", metadata.get("observed_colors", ())) or ()),
        approved_palette=options.approved_palette if options.approved_palette is not None else metadata.get("approved_palette", metadata.get("palette")),
        fuzzy_terms=options.fuzzy_terms,
        extraction_status=str(options.extraction_status or _field(document, "extraction_status", "complete")),
        extraction_message=options.extraction_message or _field(document, "extraction_message"),
        ruleset_version=options.ruleset_version,
    )


def _unsupported_extraction_finding(options: AuditOptions, text: str) -> Finding | None:
    from .types import FindingSeverity, FindingVerdict, Span, stable_id

    if options.extraction_status in {"complete", ""} and text.strip():
        return None
    message = options.extraction_message or (
        "The document could not be fully extracted; deterministic claim checks were not treated as a successful audit."
    )
    return Finding(
        id=stable_id("finding", "extraction", options.content_version_id, options.extraction_status, message),
        content_version_id=options.content_version_id,
        span=Span(0, len(text), text),
        category="accessibility_issue" if options.extraction_status == "partial" else "unsupported_claim",
        verdict=FindingVerdict.NEEDS_HUMAN,
        severity=FindingSeverity.REVIEW_REQUIRED,
        confidence=1.0,
        method="rule",
        evidence=None,
        reason=message,
        metadata={"extraction_status": options.extraction_status, "audit_not_successful": True},
    )


def coordinate_verification(
    *,
    document: Any,
    approved_records: Iterable[Any] = (),
    options: AuditOptions | None = None,
) -> VerificationResult:
    """Extract, link, and deterministically check an offline document.

    Missing records produce explicit unmatched/unsupported links and findings.  No
    checker can turn a missing record into a contradiction, and no suggestion can use
    a value absent from an approved record.
    """

    options = _merge_option_metadata(options or AuditOptions(), document)
    text = _document_text(document)
    if not text.strip():
        finding = _unsupported_extraction_finding(options, text)
        findings = (finding,) if finding else ()
        return VerificationResult(
            claims=(),
            claim_links=(),
            findings=findings,
            status="review_required",
            service_metadata={"deterministic": "implemented", "external_provider": "not_used", "extraction_status": options.extraction_status},
            error=options.extraction_message or "no extractable text supplied",
        )

    claims = tuple(
        extract_claims(
            text,
            today=options.today,
            regulated_keywords=options.regulated_keywords or DEFAULT_REGULATED_KEYWORDS,
            include_security_candidates=True,
        )
    )
    records = tuple(approved_records)
    links = tuple(
        link_claims_to_facts(
            claims,
            records,
            today=options.today,
            scope=options.scope,
        )
    )
    findings = list(
        run_deterministic_rules(
            text,
            claims=claims,
            approved_records=records,
            claim_links=links,
            term_policy=options.term_policy,
            disclaimer_requirements=options.disclaimer_requirements,
            image_metadata=options.image_metadata,
            contrast_pairs=options.contrast_pairs,
            observed_colours=options.observed_colours,
            approved_palette=options.approved_palette,
            options=RuleOptions(
                content_version_id=options.content_version_id,
                today=options.today,
                scope=options.scope,
                fuzzy_terms=options.fuzzy_terms,
                ruleset_version=options.ruleset_version,
            ),
        )
    )
    extraction_finding = _unsupported_extraction_finding(options, text)
    if extraction_finding is not None:
        findings.append(extraction_finding)
    status = "review_required" if extraction_finding is not None or any(str(finding.verdict) == "needs_human" for finding in findings) else "completed"
    return VerificationResult(
        claims=claims,
        claim_links=links,
        findings=tuple(findings),
        status=status,
        service_metadata={
            "deterministic": "implemented",
            "external_provider": "not_used",
            "ruleset_version": options.ruleset_version,
            "extraction_status": options.extraction_status,
        },
    )


# Alias kept intentionally small for an audit pipeline that uses verb-first naming.
run_verification = coordinate_verification
