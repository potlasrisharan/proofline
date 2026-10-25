"""Conservative claim and security-candidate extraction.

Extraction is intentionally lexical.  It does not decide whether a statement is true;
it preserves the exact character span so later deterministic or model-assisted stages
can explain what was inspected.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import replace
from datetime import date
from typing import Any

from .normalization import (
    DATE_PATTERN,
    DATE_RANGE_PATTERN,
    NUMBER_PATTERN,
    normalize_date,
    normalize_quantity,
    parse_date_range,
)
from .types import Claim, Span, stable_id


DEFAULT_REGULATED_KEYWORDS: tuple[str, ...] = (
    "alcohol",
    "children",
    "clinical",
    "crypto",
    "cryptocurrency",
    "diagnosis",
    "financial",
    "gambling",
    "health",
    "healthcare",
    "insurance",
    "investment",
    "loan",
    "medical",
    "nicotine",
    "pharmaceutical",
    "prescription",
    "returns",
    "supplement",
    "therapy",
    "tobacco",
    "treatment",
    "weight loss",
)


_PRICE_RE = re.compile(
    rf"(?<!\w)(?P<currency>\$|€|£|₹|rs\.?|inr\.?|usd\.?|eur\.?|gbp\.?|rupees?|रु\.?)\s*(?P<number>{NUMBER_PATTERN})"
    r"(?:\s*(?P<scale>lakh(?:s)?|lac(?:s)?|crore(?:s)?|cr))?(?!\w)",
    re.IGNORECASE,
)
_SUFFIX_PRICE_RE = re.compile(
    rf"(?<!\w)(?P<number>{NUMBER_PATTERN})(?:(?:\s*(?P<scale>lakh(?:s)?|lac(?:s)?|crore(?:s)?|cr))(?:\s*(?:rupees?|inr|usd|eur|gbp|₹|\$|€|£))?|\s*(?:rupees?|inr|usd|eur|gbp|₹|\$|€|£))(?!\w)",
    re.IGNORECASE,
)
_PERCENT_RE = re.compile(
    rf"(?<!\w)(?P<number>{NUMBER_PATTERN})\s*(?P<unit>%|percent(?:age)?)(?!\w)",
    re.IGNORECASE,
)
_UNIT_RE = re.compile(
    r"(?P<qualifier>\b(?:up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|from|starting\s+at|as\s+low\s+as)\s+)?"
    rf"(?<!\w)(?P<number>{NUMBER_PATTERN})\s*"
    r"(?P<unit>hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s|days?|weeks?|months?|years?|gb|tb|mb|kg|g|grams?|metres?|meters?|km|mi|miles?|°c|celsius|°f|fahrenheit)\b",
    re.IGNORECASE,
)
_BARE_NUMBER_RE = re.compile(
    r"(?P<qualifier>\b(?:up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|from|starting\s+at|as\s+low\s+as)\s+)?"
    rf"(?<!\w)(?P<number>{NUMBER_PATTERN})(?!\w)"
)
_DATE_RANGE_RE = re.compile(rf"\b{DATE_RANGE_PATTERN}\b", re.IGNORECASE)
_DATE_RE = re.compile(rf"\b{DATE_PATTERN}\b", re.IGNORECASE)
_COMPARATIVE_RE = re.compile(
    r"\b(?:best|fastest|cheapest|most\s+\w+(?:\s+\w+)?|least\s+\w+(?:\s+\w+)?|"
    r"number\s+one|no\.?\s*1|no\.?\s*one|better\s+than|worse\s+than|faster\s+than|"
    r"slower\s+than|more\s+\w+\s+than|less\s+\w+\s+than|smarter\s+choice|guarantees?|"
    r"guarantee(?:d)?|free)\b",
    re.IGNORECASE,
)
_PROMPT_INJECTION_RE = re.compile(
    r"\b(?:ignore\s+(?:(?:all|the)\s+)?(?:previous|prior|above)\s+(?:instructions?|rules?)|forget\s+(?:all\s+)?previous\s+instructions?|"
    r"system\s+message|developer\s+message|assistant\s+message|follow\s+these\s+instructions?|"
    r"reveal\s+(?:the\s+)?(?:secret|system\s+prompt|hidden\s+instructions?)|"
    r"override\s+(?:the\s+)?(?:system|developer|safety|review)\s+(?:message|instructions?|rules?)|"
    r"jailbreak|prompt\s+injection|do\s+not\s+mention\s+(?:this|the\s+review)|"
    r"(?:return|output)\s+(?:only\s+)?(?:no\s+findings|an?\s+empty\s+(?:list|array)|all\s+claims\s+(?:are\s+)?supported)|"
    r"mark\s+(?:all\s+)?(?:claims|content|findings)\s+(?:as\s+)?(?:approved|supported|safe))\b|"
    r"<\/?(?:system|developer|assistant)>|\[INST\]",
    re.IGNORECASE,
)


def _word_pattern(term: str) -> re.Pattern[str]:
    escaped = re.escape(term.strip())
    return re.compile(rf"(?<!\w){escaped}(?!\w)", re.IGNORECASE)


def _qualifier_before(text: str, start: int) -> tuple[int, str | None]:
    prefix = text[:start]
    match = re.search(
        r"(?P<qualifier>up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|from|starting\s+at|as\s+low\s+as)\s*$",
        prefix,
        re.IGNORECASE,
    )
    if not match:
        return start, None
    return match.start("qualifier"), match.group("qualifier")


def _is_occupied(start: int, end: int, occupied: Sequence[tuple[int, int]]) -> bool:
    return any(start < other_end and end > other_start for other_start, other_end in occupied)


def _make_claim(
    text: str,
    start: int,
    end: int,
    *,
    kind: str,
    normalized_value: Any = None,
    unit: str | None = None,
    qualifier: str | None = None,
    comparator: str | None = None,
    regulated: bool = False,
    metadata: dict[str, Any] | None = None,
) -> Claim:
    span = Span(start=start, end=end, text=text[start:end])
    # Context is copied verbatim; offsets remain those of the smallest claim span.
    # Ignore full stops within decimal numbers and common abbreviations.
    left_bound = max(text.rfind("\n", 0, start), text.rfind(";", 0, start), text.rfind("!", 0, start), text.rfind("?", 0, start)) + 1
    right_bounds = [position for delimiter in ("\n", ";", "!", "?") if (position := text.find(delimiter, end)) >= 0]
    right_bound = min(right_bounds, default=len(text))
    context_start = max(left_bound, start - 160)
    context_end = min(right_bound, end + 160)
    claim_metadata = {
        "context": text[context_start:context_end],
        "context_start": context_start,
        "context_end": context_end,
        **(metadata or {}),
    }
    return Claim(
        id=stable_id("claim", kind, start, end, span.text),
        span=span,
        kind=kind,
        normalized_value=normalized_value,
        unit=unit,
        qualifier=qualifier,
        comparator=comparator,
        regulated=regulated,
        evidence_quote=span.text,
        metadata=claim_metadata,
    )


def _add_claim(claims: dict[tuple[int, int, str], Claim], claim: Claim) -> None:
    key = (claim.start, claim.end, claim.kind)
    current = claims.get(key)
    if current is None or len(claim.text) > len(current.text):
        claims[key] = claim


def _extract_date_claims(text: str, *, today: date | None = None) -> list[Claim]:
    claims: dict[tuple[int, int, str], Claim] = {}
    occupied: list[tuple[int, int]] = []
    for match in _DATE_RANGE_RE.finditer(text):
        candidate = match.group(0)
        date_range = parse_date_range(candidate, today=today)
        claim = _make_claim(
            text,
            match.start(),
            match.end(),
            kind="date_range",
            normalized_value=date_range,
            metadata={"parse_status": "parsed" if date_range else "ambiguous_or_invalid"},
        )
        _add_claim(claims, claim)
        occupied.append((match.start(), match.end()))
    for match in _DATE_RE.finditer(text):
        if _is_occupied(match.start(), match.end(), occupied):
            continue
        parsed = normalize_date(match.group(0), today=today)
        _add_claim(
            claims,
            _make_claim(
                text,
                match.start(),
                match.end(),
                kind="date",
                normalized_value=parsed,
                metadata={"parse_status": "parsed" if parsed else "ambiguous_or_invalid"},
            ),
        )
    return list(claims.values())


def _extract_quantitative_claims(text: str, *, occupied_spans: Sequence[tuple[int, int]] = ()) -> list[Claim]:
    claims: dict[tuple[int, int, str], Claim] = {}
    occupied: list[tuple[int, int]] = list(occupied_spans)

    def add_match(match: re.Match[str], kind: str, value: Any, unit: str | None, qualifier: str | None) -> None:
        start = match.start()
        qualifier_start, preceding_qualifier = _qualifier_before(text, start)
        if preceding_qualifier and not qualifier:
            qualifier = preceding_qualifier
            start = qualifier_start
        end = match.end()
        claim = _make_claim(
            text,
            start,
            end,
            kind=kind,
            normalized_value=value,
            unit=unit,
            qualifier=qualifier.strip() if qualifier else None,
        )
        _add_claim(claims, claim)
        occupied.append((match.start(), match.end()))

    for match in _PRICE_RE.finditer(text):
        if _is_occupied(match.start(), match.end(), occupied):
            continue
        quantity = normalize_quantity(match.group(0))
        if quantity is not None:
            add_match(match, "price", quantity, quantity.unit, quantity.qualifier)
    for match in _SUFFIX_PRICE_RE.finditer(text):
        if _is_occupied(match.start(), match.end(), occupied):
            continue
        quantity = normalize_quantity(match.group(0))
        if quantity is not None:
            add_match(match, "price", quantity, quantity.unit, quantity.qualifier)
    for match in _PERCENT_RE.finditer(text):
        if _is_occupied(match.start(), match.end(), occupied):
            continue
        quantity = normalize_quantity(match.group(0))
        if quantity is not None:
            add_match(match, "percentage", quantity, quantity.unit, quantity.qualifier)
    for match in _UNIT_RE.finditer(text):
        if _is_occupied(match.start(), match.end(), occupied):
            continue
        quantity = normalize_quantity(match.group(0))
        if quantity is not None:
            add_match(match, "quantity", quantity, quantity.unit, quantity.qualifier)
    for match in _BARE_NUMBER_RE.finditer(text):
        if _is_occupied(match.start(), match.end(), occupied):
            continue
        quantity = normalize_quantity(match.group("number"), qualifier=match.group("qualifier"))
        if quantity is not None:
            add_match(match, "number", quantity, quantity.unit, quantity.qualifier)
    return list(claims.values())


def extract_regulated_keywords(
    text: str,
    *,
    keywords: Iterable[str] = DEFAULT_REGULATED_KEYWORDS,
) -> list[Claim]:
    """Extract configured regulated-category terms with exact spans."""

    claims: dict[tuple[int, int, str], Claim] = {}
    for keyword in sorted({str(item).strip() for item in keywords if str(item).strip()}, key=len, reverse=True):
        for match in _word_pattern(keyword).finditer(text):
            _add_claim(
                claims,
                _make_claim(
                    text,
                    match.start(),
                    match.end(),
                    kind="regulated_category",
                    normalized_value=keyword.casefold(),
                    regulated=True,
                    metadata={"keyword": keyword},
                ),
            )
    return list(claims.values())


def extract_security_candidates(text: str) -> list[Claim]:
    """Extract instruction-like content for a security review finding.

    Submitted content is data, not instructions.  The detector is deliberately
    conservative and returns candidate spans for human review; it never executes or
    interprets the text.
    """

    claims: dict[tuple[int, int, str], Claim] = {}
    for match in _PROMPT_INJECTION_RE.finditer(text):
        _add_claim(
            claims,
            _make_claim(
                text,
                match.start(),
                match.end(),
                kind="instruction_like_text",
                normalized_value=match.group(0).casefold(),
                metadata={"security_candidate": True},
            ),
        )
    return list(claims.values())


def extract_claims(
    text: str,
    *,
    today: date | None = None,
    regulated_keywords: Iterable[str] = DEFAULT_REGULATED_KEYWORDS,
    include_security_candidates: bool = True,
) -> list[Claim]:
    """Extract deterministic claim candidates in document order.

    The returned spans refer directly to ``text``.  The function intentionally does
    not infer a product, market, or approved source; those are pipeline concerns.
    """

    if not text:
        return []
    claims: dict[tuple[int, int, str], Claim] = {}
    dates = _extract_date_claims(text, today=today)
    for claim in dates:
        _add_claim(claims, claim)
    for claim in _extract_quantitative_claims(text, occupied_spans=[(claim.start, claim.end) for claim in dates]):
        _add_claim(claims, claim)
    for match in _COMPARATIVE_RE.finditer(text):
        comparator = match.group(0).casefold()
        kind = "guarantee" if comparator.startswith("guarante") else "comparative"
        if comparator == "free":
            kind = "promotional"
        _add_claim(
            claims,
            _make_claim(
                text,
                match.start(),
                match.end(),
                kind=kind,
                normalized_value=comparator,
                comparator=comparator,
                metadata={"requires_substantiation": True},
            ),
        )
    for claim in extract_regulated_keywords(text, keywords=regulated_keywords):
        _add_claim(claims, claim)
    if include_security_candidates:
        for claim in extract_security_candidates(text):
            _add_claim(claims, claim)
    regulated_spans = [(claim.start, claim.end) for claim in claims.values() if claim.regulated]
    result = []
    for claim in claims.values():
        context_start = int(claim.metadata.get("context_start", claim.start))
        context_end = int(claim.metadata.get("context_end", claim.end))
        is_regulated = claim.regulated or _is_occupied(context_start, context_end, regulated_spans)
        result.append(replace(claim, regulated=is_regulated))
    return sorted(result, key=lambda claim: (claim.start, claim.end, claim.kind))
