"""Pure deterministic evidence-first verification rules.

Each checker returns compact ``Finding`` dataclasses and never calls an external
provider.  A hard ``contradicted`` or ``outdated`` verdict is emitted only when an
approved record/rule supplied by the caller provides evidence.  Missing, weak, or
conflicting evidence becomes ``unsupported`` or ``needs_human``.
"""

from __future__ import annotations

import math
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from .claims import extract_security_candidates
from .matching import (
    FactMatch,
    RecordView,
    match_claim_to_fact,
    record_validity,
)
from .normalization import normalize_key, normalize_quantity
from .types import (
    Claim,
    ClaimFactLink,
    Evidence,
    Finding,
    FindingSeverity,
    FindingVerdict,
    Span,
    Suggestion,
    stable_id,
)


@dataclass(frozen=True, slots=True)
class RuleOptions:
    content_version_id: str = ""
    today: date | None = None
    scope: Mapping[str, Any] = field(default_factory=dict)
    fuzzy_terms: bool = True
    regulated: bool = False
    exposure: int = 1
    ruleset_version: str = "deterministic-offline-v1"


def _text_span(text: str, needle: str | None = None) -> Span:
    if needle:
        start = text.casefold().find(needle.casefold())
        if start >= 0:
            return Span(start=start, end=start + len(needle), text=text[start : start + len(needle)])
    return Span(start=0, end=len(text), text=text)


def _claim_span(claim: Claim | None, text: str = "") -> Span:
    return claim.span if claim is not None else _text_span(text)


def _candidate_evidence(match: FactMatch) -> tuple[Evidence, ...]:
    return tuple(record.evidence for record in match.candidates)


def _make_finding(
    *,
    span: Span,
    category: str,
    verdict: FindingVerdict | str,
    severity: FindingSeverity | str,
    reason: str,
    content_version_id: str = "",
    evidence: Evidence | None = None,
    evidence_refs: Sequence[Evidence] = (),
    suggestion: Suggestion | None = None,
    rule_id: str | None = None,
    confidence: float = 1.0,
    metadata: Mapping[str, Any] | None = None,
) -> Finding:
    # ``Finding`` enforces the contract invariant for hard verdicts.  If a caller
    # asks for one without evidence, abstain rather than fabricating a source.
    if verdict in (FindingVerdict.CONTRADICTED, FindingVerdict.OUTDATED) and evidence is None:
        verdict = FindingVerdict.NEEDS_HUMAN
        metadata = {**(metadata or {}), "abstained_from_hard_verdict": True}
    return Finding(
        id=stable_id("finding", category, verdict, span.start, span.end, span.text, reason),
        content_version_id=content_version_id,
        span=span,
        category=category,
        verdict=verdict,
        severity=severity,
        confidence=max(0.0, min(1.0, confidence)),
        method="rule",
        evidence=evidence,
        evidence_refs=tuple(evidence_refs),
        reason=reason,
        suggestion=suggestion,
        rule_id=rule_id,
        metadata={"ruleset_version": "deterministic-offline-v1", **(metadata or {})},
    )


def _suggestion_for_record(
    claim: Claim,
    record: RecordView,
    *,
    intent_note: str,
    disclaimer_text: str | None = None,
) -> Suggestion | None:
    """Build a suggestion only from values explicitly present in the approved record."""

    replacement = record.value.get("approved_text", record.value.get("wording", record.value.get("suggestion")))
    if isinstance(replacement, str) and replacement.strip():
        return Suggestion(replacement.strip(), intent_note)
    key = record.value.get("key") or record.value.get("fact_key") or record.value.get("attribute") or record.value.get("name")
    value = record.value.get("value", record.value.get("amount", record.value.get("approved_value")))
    unit = record.value.get("unit", record.value.get("units"))
    if key is None or value is None:
        return None
    qualifier = normalize_key(record.value.get("qualifier"))
    if qualifier in {"up to", "at most"}:
        approved = f"Up to {value}{f' {unit}' if unit else ''}"
    elif qualifier in {"at least", "from", "starting at"}:
        approved = f"{qualifier.title()} {value}{f' {unit}' if unit else ''}"
    else:
        approved = f"{value}{f' {unit}' if unit else ''}"
    if normalize_key(str(key)) in {"battery life", "battery duration", "battery runtime"} or normalize_key(str(record.value.get("attribute"))) == "battery life":
        approved = f"{approved} of battery life"
    if disclaimer_text:
        approved = f"{approved}* {disclaimer_text.strip()}"
    if normalize_key(approved) == normalize_key(claim.text):
        return None
    return Suggestion(approved, intent_note)


def check_numeric_mismatches(
    text: str,
    claims: Sequence[Claim],
    approved_records: Iterable[Any],
    *,
    content_version_id: str = "",
    today: date | None = None,
    scope: Mapping[str, Any] | None = None,
    disclaimer_text: str | None = None,
) -> list[Finding]:
    """Flag a numeric/price/percentage/unit mismatch only with an applicable fact."""

    findings: list[Finding] = []
    records = list(approved_records)
    for claim in claims:
        if claim.kind not in {"quantity", "number", "price", "percentage", "date", "date_range"}:
            continue
        match = match_claim_to_fact(claim, records, today=today, scope=scope)
        if match.status == "contradicted" and match.record is not None:
            findings.append(
                _make_finding(
                    span=claim.span,
                    category="fact_mismatch",
                    verdict=FindingVerdict.CONTRADICTED,
                    # A direct mismatch against an applicable approved fact is a
                    # high-risk review item regardless of whether the value is a
                    # product quantity, price, or date.  The reviewer still sees the
                    # deterministic evidence and the risk breakdown separately.
                    severity=FindingSeverity.CRITICAL,
                    evidence=match.record.evidence,
                    evidence_refs=(match.record.evidence,),
                    content_version_id=content_version_id,
                    confidence=1.0 if match.exact_key and match.scope_complete else 0.85,
                    reason=(
                        f"The submitted {claim.kind} {claim.text!r} is not compatible with the approved "
                        f"value in fact {match.record.id} version {match.record.version}."
                    ),
                    suggestion=_suggestion_for_record(
                        claim,
                        match.record,
                        intent_note="Use the supplied approved value after human review.",
                        disclaimer_text=disclaimer_text,
                    ),
                    metadata={"fact_id": match.record.id, "fact_version": match.record.version, "match_reason": match.reason},
                )
            )
        elif match.status == "conflict":
            findings.append(
                _make_finding(
                    span=claim.span,
                    category="source_conflict",
                    verdict=FindingVerdict.NEEDS_HUMAN,
                    severity=FindingSeverity.REVIEW_REQUIRED,
                    evidence_refs=_candidate_evidence(match),
                    content_version_id=content_version_id,
                    confidence=1.0,
                    reason="Multiple applicable approved fact versions conflict or cannot be scoped safely; no numeric verdict was asserted.",
                    metadata={"candidate_fact_ids": [record.id for record in match.candidates]},
                )
            )
        elif (
            match.status == "unsupported"
            and match.record is not None
            and not (claim.kind in {"quantity", "number", "price", "percentage"} and match.record.value.get("claim"))
        ):
            findings.append(
                _make_finding(
                    span=claim.span,
                    category="unsupported_claim",
                    verdict=FindingVerdict.NEEDS_HUMAN,
                    severity=FindingSeverity.REVIEW_REQUIRED,
                    evidence=match.record.evidence,
                    evidence_refs=(match.record.evidence,),
                    content_version_id=content_version_id,
                    confidence=0.5,
                    reason=(
                        "An approved record was found, but its scope, validity, qualifier, or units were not "
                        "sufficient to establish a deterministic comparison; human review is required."
                    ),
                    metadata={"evidence_not_sufficient": True, "match_reason": match.reason},
                )
            )
        elif match.status == "unmatched":
            findings.append(
                _make_finding(
                    span=claim.span,
                    category="unsupported_claim",
                    verdict=FindingVerdict.UNSUPPORTED,
                    severity=FindingSeverity.REVIEW_REQUIRED,
                    content_version_id=content_version_id,
                    confidence=0.65,
                    reason="No sufficiently applicable approved fact was supplied; the value was not treated as false.",
                    metadata={"evidence_not_found": True},
                )
            )
    return findings


def check_offer_validity(
    text: str,
    claims: Sequence[Claim],
    approved_records: Iterable[Any],
    *,
    content_version_id: str = "",
    today: date | None = None,
    scope: Mapping[str, Any] | None = None,
) -> list[Finding]:
    """Flag expired offers and route future/invalid windows to human review."""

    records = list(approved_records)
    findings: list[Finding] = []
    for claim in claims:
        if claim.kind not in {"price", "percentage", "date", "date_range", "promotional", "quantity"}:
            continue
        match = match_claim_to_fact(claim, records, today=today, scope=scope)
        if match.record is None:
            continue
        validity = match.validity or record_validity(match.record, today=today)
        if validity == "expired":
            findings.append(
                _make_finding(
                    span=claim.span,
                    category="outdated_fact_or_offer",
                    verdict=FindingVerdict.OUTDATED,
                    severity=FindingSeverity.CRITICAL,
                    evidence=match.record.evidence,
                    evidence_refs=(match.record.evidence,),
                    content_version_id=content_version_id,
                    reason=f"The applicable approved offer/fact {match.record.id} version {match.record.version} expired before the audit date.",
                    metadata={"validity": validity, "fact_id": match.record.id, "fact_version": match.record.version},
                )
            )
        elif validity in {"not_yet_valid", "invalid_validity"}:
            findings.append(
                _make_finding(
                    span=claim.span,
                    category="offer_date",
                    verdict=FindingVerdict.NEEDS_HUMAN,
                    severity=FindingSeverity.REVIEW_REQUIRED,
                    evidence=match.record.evidence,
                    evidence_refs=(match.record.evidence,),
                    content_version_id=content_version_id,
                    reason=(
                        f"The applicable approved validity window for {match.record.id} is {validity}; "
                        "a reviewer must confirm that the planned publication date and offer scope are valid."
                    ),
                    metadata={"validity": validity, "fact_id": match.record.id, "fact_version": match.record.version},
                )
            )
    return findings


def _policy_items(policy: Any, kind: str) -> list[dict[str, Any]]:
    if isinstance(policy, Mapping):
        raw = policy.get(kind, policy.get(f"{kind}_terms", policy.get(f"{kind}_phrases", ())))
    else:
        raw = policy
    if isinstance(raw, str):
        raw = [raw]
    if isinstance(raw, Mapping):
        # Map preferred term -> aliases, or term -> metadata.
        raw = [{"term": key, "aliases": value} for key, value in raw.items()]
    result: list[dict[str, Any]] = []
    if not isinstance(raw, Iterable):
        return result
    for item in raw:
        if isinstance(item, str):
            result.append({"term": item})
        elif isinstance(item, Mapping):
            term = item.get(
                "term",
                item.get(
                    "phrase",
                    item.get(
                        "name",
                        item.get("text", item.get("required_text", item.get("approved_text"))),
                    ),
                ),
            )
            if term:
                result.append({str(key): value for key, value in item.items()} | {"term": str(term)})
    return result


def _term_evidence(item: Mapping[str, Any], *, quote: str) -> Evidence | None:
    rule_id = item.get("id", item.get("rule_id", item.get("source_id")))
    version = item.get("version", item.get("rule_version", item.get("source_version")))
    if not rule_id or version is None:
        return None
    return Evidence("rule", str(rule_id), str(version), quote)


def _term_matches(text: str, term: str, *, fuzzy: bool) -> list[tuple[int, int, bool]]:
    if not term.strip():
        return []
    pattern = re.compile(r"(?<!\w)" + r"\s+".join(re.escape(part) for part in term.strip().split()) + r"(?!\w)", re.IGNORECASE)
    matches = [(match.start(), match.end(), False) for match in pattern.finditer(text)]
    if not fuzzy or matches or len(term) < 5:
        return matches
    # A one-edit fuzzy match applies only to a single whole word. It never matches a
    # substring inside a larger word.
    if len(term.split()) != 1:
        return matches
    normal = normalize_key(term)
    for word in re.finditer(r"\w+", text, re.UNICODE):
        candidate = normalize_key(word.group(0))
        if len(candidate) >= 4 and abs(len(candidate) - len(normal)) <= 1 and _edit_distance(candidate, normal) <= 1:
            matches.append((word.start(), word.end(), True))
    return sorted(set(matches))


def _edit_distance(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for index, character in enumerate(left, start=1):
        current = [index]
        for other_index, other in enumerate(right, start=1):
            current.append(min(current[-1] + 1, previous[other_index] + 1, previous[other_index - 1] + (character != other)))
        previous = current
    return previous[-1]


def check_terms(
    text: str,
    policy: Any,
    *,
    content_version_id: str = "",
    fuzzy: bool = True,
) -> list[Finding]:
    """Apply configured banned/preferred terms using whole-word boundaries."""

    findings: list[Finding] = []
    for kind in ("banned", "preferred"):
        for item in _policy_items(policy, kind):
            term = str(item["term"])
            for start, end, fuzzy_hit in _term_matches(text, term, fuzzy=fuzzy):
                span = Span(start, end, text[start:end])
                evidence = _term_evidence(item, quote=f"{kind} term: {term}")
                if kind == "banned":
                    verdict = FindingVerdict.CONTRADICTED if evidence else FindingVerdict.NEEDS_HUMAN
                    severity = FindingSeverity.MEDIUM
                    replacement = item.get("preferred", item.get("replacement", item.get("approved_term")))
                    suggestion = Suggestion(str(replacement), "Use the configured approved term.") if replacement else None
                    reason = f"The configured banned term {term!r} appears as a whole word."
                else:
                    verdict = FindingVerdict.NEEDS_HUMAN
                    severity = FindingSeverity.LOW
                    preferred = item.get("preferred", item.get("approved_term", term))
                    aliases = item.get("aliases", item.get("avoid", item.get("banned", ())))
                    if isinstance(aliases, str):
                        aliases = [aliases]
                    reason = f"The text uses a configured non-preferred term {text[start:end]!r}; review the preferred wording {preferred!r}."
                    suggestion = Suggestion(str(preferred), "Use the configured preferred term.") if preferred and text[start:end].casefold() != str(preferred).casefold() else None
                findings.append(
                    _make_finding(
                        span=span,
                        category="terminology_violation",
                        verdict=verdict,
                        severity=severity,
                        evidence=evidence,
                        evidence_refs=(evidence,) if evidence else (),
                        content_version_id=content_version_id,
                        suggestion=suggestion,
                        rule_id=str(item.get("id", item.get("rule_id"))) if item.get("id", item.get("rule_id")) else None,
                        confidence=0.9 if fuzzy_hit else 1.0,
                        reason=reason + (" Fuzzy match; confirm intent." if fuzzy_hit else ""),
                        metadata={"term": term, "fuzzy_match": fuzzy_hit},
                    )
                )
    return findings


def check_required_disclaimers(
    text: str,
    requirements: Any,
    *,
    content_version_id: str = "",
    fuzzy: bool = False,
) -> list[Finding]:
    """Report missing configured disclaimers; never invent replacement text."""

    items = _policy_items(requirements, "required") or _policy_items(requirements, "disclaimers")
    findings: list[Finding] = []
    for item in items:
        wording = str(item.get("text", item.get("required_text", item.get("term", item.get("phrase", "")))))
        if not wording:
            continue
        if _term_matches(text, wording, fuzzy=fuzzy):
            continue
        evidence = _term_evidence(item, quote=f"required disclaimer: {wording}")
        verdict = FindingVerdict.CONTRADICTED if evidence else FindingVerdict.NEEDS_HUMAN
        findings.append(
            _make_finding(
                span=Span(0, len(text), text),
                category="configured_policy_disclaimer",
                verdict=verdict,
                severity=FindingSeverity.HIGH if item.get("blocking", False) else FindingSeverity.MEDIUM,
                evidence=evidence,
                evidence_refs=(evidence,) if evidence else (),
                content_version_id=content_version_id,
                reason=f"The configured disclaimer {wording!r} was not found in the submitted content.",
                suggestion=Suggestion(wording, "Add the exact configured disclaimer after human/legal review.") if item.get("allow_suggestion", True) else None,
                rule_id=str(item.get("id", item.get("rule_id"))) if item.get("id", item.get("rule_id")) else None,
                metadata={"required_text": wording, "evidence_not_found_in_content": True},
            )
        )
    return findings


def check_comparative_claims(
    text: str,
    claims: Sequence[Claim],
    claim_links: Sequence[ClaimFactLink] = (),
    *,
    content_version_id: str = "",
) -> list[Finding]:
    """Flag superlatives, guarantees, and comparisons unless substantiated."""

    links_by_claim = {link.claim_id: link for link in claim_links}
    findings: list[Finding] = []
    for claim in claims:
        if claim.kind not in {"comparative", "guarantee", "promotional"}:
            continue
        link = links_by_claim.get(claim.id)
        if link and link.link_status == "supported" and link.fact_id:
            continue
        evidence_refs: tuple[Evidence, ...] = ()
        if link:
            evidence_refs = tuple(Evidence("brand_record", fact_id, link.fact_version or "unknown", quote) for fact_id, quote in zip(link.candidate_fact_ids, link.evidence_quotes))
        if link and link.link_status == "conflict":
            verdict = FindingVerdict.NEEDS_HUMAN
            reason = "The comparative or guarantee claim has conflicting possible approved evidence; reviewer substantiation is required."
            severity = FindingSeverity.REVIEW_REQUIRED
        else:
            verdict = FindingVerdict.UNSUPPORTED
            reason = "No approved substantiation was linked to this comparative, superlative, guarantee, or free claim; absence of evidence is not a finding that the claim is false."
            severity = FindingSeverity.HIGH if claim.kind in {"guarantee", "comparative"} else FindingSeverity.MEDIUM
        findings.append(
            _make_finding(
                span=claim.span,
                category="unsupported_claim",
                verdict=verdict,
                severity=severity,
                evidence_refs=evidence_refs,
                content_version_id=content_version_id,
                confidence=0.9 if claim.kind == "guarantee" else 0.8,
                reason=reason,
                metadata={"comparator": claim.comparator, "claim_kind": claim.kind},
            )
        )
    return findings


def _parse_rgb(value: Any) -> tuple[int, int, int] | None:
    if isinstance(value, Mapping):
        raw = value.get("rgb", value.get("value", value.get("hex")))
        if raw is not None and raw is not value:
            return _parse_rgb(raw)
        try:
            return tuple(max(0, min(255, int(value[channel]))) for channel in ("r", "g", "b"))  # type: ignore[return-value]
        except (KeyError, TypeError, ValueError):
            return None
    if isinstance(value, (tuple, list)) and len(value) >= 3:
        try:
            return tuple(max(0, min(255, int(channel))) for channel in value[:3])  # type: ignore[return-value]
        except (TypeError, ValueError):
            return None
    text = str(value or "").strip().casefold()
    named = {"black": (0, 0, 0), "white": (255, 255, 255), "red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255), "yellow": (255, 255, 0), "gray": (128, 128, 128), "grey": (128, 128, 128)}
    if text in named:
        return named[text]
    if text.startswith("#"):
        text = text[1:]
        if len(text) in {3, 4}:
            text = "".join(character * 2 for character in text[:3])
        if len(text) in {6, 8}:
            try:
                return tuple(int(text[index : index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]
            except ValueError:
                return None
    match = re.fullmatch(r"rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*[\d.]+)?\s*\)", text)
    if match:
        return tuple(max(0, min(255, int(group))) for group in match.groups())  # type: ignore[return-value]
    return None


def _relative_luminance(rgb: tuple[int, int, int]) -> float:
    channels = []
    for channel in rgb:
        value = channel / 255
        channels.append(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast_ratio(foreground: Any, background: Any) -> float | None:
    fg, bg = _parse_rgb(foreground), _parse_rgb(background)
    if fg is None or bg is None:
        return None
    light, dark = sorted((_relative_luminance(fg), _relative_luminance(bg)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


def check_contrast(
    foreground: Any,
    background: Any,
    *,
    text: str | None = None,
    large_text: bool = False,
    content_version_id: str = "",
) -> list[Finding]:
    """Measure WCAG 2.2 minimum contrast (4.5:1 normal, 3:1 large text)."""

    ratio = contrast_ratio(foreground, background)
    if ratio is None:
        return []
    threshold = 3.0 if large_text else 4.5
    if ratio >= threshold:
        return []
    label = text or f"{foreground} on {background}"
    return [
        _make_finding(
            span=_text_span(label),
            category="accessibility_issue",
            verdict=FindingVerdict.CONTRADICTED,
            severity=FindingSeverity.MEDIUM,
            evidence=Evidence("rule", "wcag-2.2-1.4.3", "2.2", f"Measured contrast ratio {ratio:.2f}:1; required threshold {threshold:.1f}:1."),
            content_version_id=content_version_id,
            confidence=1.0,
            reason=f"Measured foreground/background contrast is {ratio:.2f}:1, below the {threshold:.1f}:1 WCAG minimum for {'large' if large_text else 'normal'} text.",
            metadata={"ratio": ratio, "threshold": threshold, "large_text": large_text},
        )
    ]


def check_missing_alt_text(
    metadata: Mapping[str, Any] | Sequence[Mapping[str, Any]] | None,
    *,
    text: str = "",
    content_version_id: str = "",
) -> list[Finding]:
    """Flag missing alt text only when image metadata is available."""

    if metadata is None:
        return []
    images: list[Mapping[str, Any]]
    if isinstance(metadata, Mapping):
        raw = metadata.get("images", metadata.get("image_metadata"))
        images = list(raw) if isinstance(raw, Sequence) and not isinstance(raw, (str, bytes)) else [metadata]
    else:
        images = list(metadata)
    findings: list[Finding] = []
    for index, image in enumerate(images):
        if not isinstance(image, Mapping):
            continue
        if image.get("alt_text") is not None or image.get("alt") is not None or image.get("aria_label") is not None:
            continue
        meaningful = image.get("image_has_meaningful_text")
        if not (
            meaningful is True
            or image.get("requires_alt_text") is True
            or image.get("decorative") is False
        ):
            # Presence of measurable colour metadata alone does not establish that
            # an image conveys information needing alternative text.
            continue
        marker = str(image.get("filename", image.get("id", f"image {index + 1}")))
        span = _text_span(text, marker) if text else Span(0, len(marker), marker)
        findings.append(
            _make_finding(
                span=span,
                category="accessibility_issue",
                verdict=FindingVerdict.NEEDS_HUMAN,
                severity=FindingSeverity.MEDIUM,
                content_version_id=content_version_id,
                reason=f"Image metadata for {marker!r} is present but no alternative text was supplied; add a meaningful description or mark the image decorative after review.",
                metadata={"image_index": index, "not_assessed_without_metadata": False},
            )
        )
    return findings


def _rgb_to_lab(rgb: tuple[int, int, int]) -> tuple[float, float, float]:
    channels = []
    for channel in rgb:
        value = channel / 255
        channels.append(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
    x = (channels[0] * 0.4124 + channels[1] * 0.3576 + channels[2] * 0.1805) / 0.95047
    y = (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 1.00000
    z = (channels[0] * 0.0193 + channels[1] * 0.1192 + channels[2] * 0.9505) / 1.08883
    def f(value: float) -> float:
        return value ** (1 / 3) if value > 0.008856 else 7.787 * value + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def colour_distance(first: Any, second: Any) -> float | None:
    left, right = _parse_rgb(first), _parse_rgb(second)
    if left is None or right is None:
        return None
    l1, l2 = _rgb_to_lab(left), _rgb_to_lab(right)
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(l1, l2)))


def _approved_palette(palette: Any) -> list[tuple[Any, Evidence | None]]:
    if isinstance(palette, Mapping):
        raw = palette.get("colors", palette.get("palette", palette.get("values", ())))
        default_evidence = _term_evidence(palette, quote="approved brand palette")
    else:
        raw, default_evidence = palette, None
    if isinstance(raw, str):
        raw = [raw]
    result: list[tuple[Any, Evidence | None]] = []
    for item in raw if isinstance(raw, Iterable) else ():
        if isinstance(item, Mapping):
            color = item.get("color", item.get("hex", item.get("value")))
            evidence = _term_evidence(item, quote=f"approved palette colour: {color}") or default_evidence
        else:
            color, evidence = item, default_evidence
        if color is not None:
            result.append((color, evidence))
    return result


def check_palette_colours(
    observed: Iterable[Any],
    approved_palette: Any,
    *,
    threshold: float = 12.0,
    content_version_id: str = "",
    text: str = "",
) -> list[Finding]:
    """Flag observed colours that are farther than the configured Lab distance."""

    approved = _approved_palette(approved_palette)
    if not approved:
        return []
    findings: list[Finding] = []
    for color in observed:
        parsed = _parse_rgb(color)
        if parsed is None:
            continue
        distances = [(distance, candidate, evidence) for candidate, evidence in approved if (distance := colour_distance(color, candidate)) is not None]
        if not distances:
            continue
        distance, nearest, evidence = min(distances, key=lambda item: item[0])
        if distance <= threshold:
            continue
        marker = str(color)
        span = _text_span(text, marker) if text else Span(0, len(marker), marker)
        refs = (evidence,) if evidence else ()
        findings.append(
            _make_finding(
                span=span,
                category="visual_mismatch",
                verdict=FindingVerdict.CONTRADICTED if evidence else FindingVerdict.NEEDS_HUMAN,
                severity=FindingSeverity.MEDIUM,
                evidence=evidence,
                evidence_refs=refs,
                content_version_id=content_version_id,
                reason=f"Observed colour {color!r} is ΔE76 {distance:.1f} from the nearest approved palette colour {nearest!r}, above threshold {threshold:.1f}.",
                metadata={"observed": color, "nearest_approved": nearest, "distance": distance, "threshold": threshold},
            )
        )
    return findings


def check_hashtag_readability(
    text: str,
    *,
    content_version_id: str = "",
    max_length: int = 30,
) -> list[Finding]:
    """Flag hashtags that are unusually long, opaque, or impossible to read."""

    findings: list[Finding] = []
    for match in re.finditer(r"(?<!\w)#[\w]+", text, re.UNICODE):
        hashtag = match.group(0)
        body = hashtag[1:]
        reasons: list[str] = []
        if len(body) > max_length:
            reasons.append(f"{len(body)} characters exceeds the {max_length}-character readability threshold")
        if body and body.isdigit():
            reasons.append("contains no readable alphabetic words")
        if len(body) >= 20 and body.casefold() == body and "_" not in body and not any(character.isdigit() for character in body):
            reasons.append("is a long unsegmented lowercase string")
        if not reasons:
            continue
        findings.append(
            _make_finding(
                span=Span(match.start(), match.end(), hashtag),
                category="accessibility_issue",
                verdict=FindingVerdict.NEEDS_HUMAN,
                severity=FindingSeverity.LOW,
                content_version_id=content_version_id,
                reason=f"Hashtag {hashtag!r} may be difficult to read: {'; '.join(reasons)}.",
                metadata={"length": len(body), "max_length": max_length},
            )
        )
    return findings


def detect_prompt_injection(
    text: str,
    *,
    content_version_id: str = "",
) -> list[Finding]:
    """Create a critical security candidate for instruction-like submitted text."""

    findings: list[Finding] = []
    for candidate in extract_security_candidates(text):
        findings.append(
            _make_finding(
                span=candidate.span,
                category="security",
                verdict=FindingVerdict.NEEDS_HUMAN,
                severity=FindingSeverity.CRITICAL,
                content_version_id=content_version_id,
                confidence=0.95,
                reason="Instruction-like text was found inside submitted content. Treat content as data, do not execute it, and route the item for human review.",
                metadata={"security_candidate": True, "detector": "instruction_like_text"},
            )
        )
    return findings


def _dedupe_findings(findings: Iterable[Finding]) -> list[Finding]:
    seen: set[tuple[str, int, int, str]] = set()
    result: list[Finding] = []
    for finding in sorted(findings, key=lambda item: (item.span.start, item.span.end, item.category, str(item.verdict))):
        key = (finding.category, finding.span.start, finding.span.end, str(finding.verdict))
        if key in seen:
            continue
        seen.add(key)
        result.append(finding)
    return result


def run_deterministic_rules(
    text: str,
    *,
    claims: Sequence[Claim] = (),
    approved_records: Iterable[Any] = (),
    claim_links: Sequence[ClaimFactLink] = (),
    term_policy: Any = None,
    disclaimer_requirements: Any = None,
    image_metadata: Mapping[str, Any] | Sequence[Mapping[str, Any]] | None = None,
    contrast_pairs: Iterable[Mapping[str, Any] | Sequence[Any]] = (),
    observed_colours: Iterable[Any] = (),
    approved_palette: Any = None,
    options: RuleOptions | None = None,
) -> list[Finding]:
    """Run every configured deterministic rule and return stable, deduped findings."""

    options = options or RuleOptions()
    claims = list(claims) or []
    records = list(approved_records)
    findings: list[Finding] = []
    required_disclaimer = None
    for record in records:
        adapted = record if isinstance(record, RecordView) else None
        value = adapted.value if adapted is not None else (
            record.get("value", {}) if isinstance(record, Mapping) else getattr(record, "value", {})
        )
        resource = str(
            adapted.resource if adapted is not None else (
                record.get("resource", "") if isinstance(record, Mapping) else getattr(record, "resource", "")
            )
        ).casefold()
        if resource not in {"disclaimers", "disclaimer", "guidelines", "guideline"} or not isinstance(value, Mapping):
            continue
        candidate = value.get("required_text") or value.get("required_disclaimer")
        if isinstance(candidate, str) and candidate.strip():
            required_disclaimer = candidate.strip()
            break
    findings.extend(
        check_numeric_mismatches(
            text,
            claims,
            records,
            content_version_id=options.content_version_id,
            today=options.today,
            scope=options.scope,
            disclaimer_text=required_disclaimer,
        )
    )
    findings.extend(
        check_offer_validity(
            text,
            claims,
            records,
            content_version_id=options.content_version_id,
            today=options.today,
            scope=options.scope,
        )
    )
    if term_policy is not None:
        findings.extend(check_terms(text, term_policy, content_version_id=options.content_version_id, fuzzy=options.fuzzy_terms))
    if disclaimer_requirements is not None:
        findings.extend(check_required_disclaimers(text, disclaimer_requirements, content_version_id=options.content_version_id))
    findings.extend(check_comparative_claims(text, claims, claim_links, content_version_id=options.content_version_id))
    findings.extend(detect_prompt_injection(text, content_version_id=options.content_version_id))
    if image_metadata is not None:
        findings.extend(check_missing_alt_text(image_metadata, text=text, content_version_id=options.content_version_id))
    for pair in contrast_pairs:
        if isinstance(pair, Mapping):
            findings.extend(check_contrast(pair.get("foreground", pair.get("fg")), pair.get("background", pair.get("bg")), text=pair.get("text"), large_text=bool(pair.get("large_text", False)), content_version_id=options.content_version_id))
        else:
            values = list(pair)
            if len(values) >= 2:
                findings.extend(check_contrast(values[0], values[1], large_text=bool(values[2]) if len(values) > 2 else False, content_version_id=options.content_version_id))
    if approved_palette is not None:
        findings.extend(check_palette_colours(observed_colours, approved_palette, content_version_id=options.content_version_id, text=text))
    findings.extend(check_hashtag_readability(text, content_version_id=options.content_version_id))
    return _dedupe_findings(findings)
