"""Bounded, local Evidence-or-Abstain checks; no provider or network dependency.

This is an IMPLEMENTED local library, not an API route or a model-accuracy claim.
The supported subset is deliberately small: numeric quantities/prices, configured
terms/disclaimers/offers, exact approved promotional wording, and instruction-like
text. Callers retain the original content and own authentication/human approval.
"""

from __future__ import annotations

from collections import OrderedDict
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, localcontext
import hashlib
import json
import math
from queue import Empty, Queue
import re
from threading import BoundedSemaphore, RLock, Thread
import time
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator


RULESET_VERSION = "local-evidence-or-abstain-v1"
Category = Literal["factual", "offer_date", "terminology", "promotional", "legal", "security"]
Verdict = Literal["supported", "contradicted", "outdated", "unsupported", "needs_human"]
Qualifier = Literal["exact", "up_to", "at_least", "approximate"]


class _Schema(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, validate_default=True)


class EvidenceRecord(_Schema):
    """Explicitly scoped, versioned approved-source input, not a retrieved assertion.

    ``quote`` must be text actually supplied by the approved record. Numeric values
    use decimal strings; there is no fuzzy retrieval or inferred exchange rate.
    A vault adapter must supply this shape rather than guessing missing metadata.
    """

    id: str = Field(min_length=1, max_length=200, strict=True)
    version: str = Field(min_length=1, max_length=100, strict=True)
    organisation_id: str = Field(min_length=1, max_length=200, strict=True)
    kind: Literal["numeric", "term", "required_text", "promotion", "claim"]
    attribute: str = Field(min_length=1, max_length=100, strict=True)
    quote: str = Field(min_length=1, max_length=4000, strict=True)
    product: str | None = Field(default=None, max_length=200)
    market: str | None = Field(default=None, max_length=50)
    language: str | None = Field(default=None, max_length=50)
    channel: str | None = Field(default=None, max_length=100)
    status: Literal["draft", "approved", "superseded", "expired", "retired"] = "approved"
    value: str | None = Field(default=None, max_length=200, strict=True)
    unit: str | None = Field(default=None, max_length=50)
    currency: str | None = Field(default=None, max_length=10)
    qualifier: Qualifier = "exact"
    replacement: str | None = Field(default=None, max_length=200)
    effective_from: datetime | None = None
    effective_to: datetime | None = None

    @model_validator(mode="after")
    def validate_record(self) -> "EvidenceRecord":
        if not self.quote.strip():
            raise ValueError("an authoritative quote is required")
        for timestamp in (self.effective_from, self.effective_to):
            if timestamp is not None and timestamp.utcoffset() is None:
                raise ValueError("source validity timestamps must include a timezone")
        if self.effective_from and self.effective_to and self.effective_to <= self.effective_from:
            raise ValueError("source validity window must be ordered")
        if self.kind == "numeric":
            if not self.product or not self.market or not (self.unit or self.currency):
                raise ValueError("numeric sources require product, market, and unit/currency scope")
            if self.value is None or _plain_decimal(self.value) is None:
                raise ValueError("numeric sources require a finite decimal string")
        elif not self.value or not self.value.strip():
            raise ValueError("configured rules require their literal value")
        return self


class ReliabilityRequest(_Schema):
    organisation_id: str = Field(min_length=1, max_length=200, strict=True)
    content_version_id: str = Field(min_length=1, max_length=200, strict=True)
    content: str = Field(max_length=50_000, strict=True)
    product: str = Field(min_length=1, max_length=200, strict=True)
    market: str = Field(min_length=1, max_length=50, strict=True)
    language: str = Field(default="en-US", min_length=1, max_length=50)
    channel: str = Field(default="email", min_length=1, max_length=100)
    as_of: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    records: tuple[EvidenceRecord, ...] = Field(default=(), max_length=256)
    extraction_status: Literal["complete", "partial", "failed", "unsupported"] = "complete"
    confidential: bool = False

    @model_validator(mode="after")
    def validate_context(self) -> "ReliabilityRequest":
        if self.as_of.utcoffset() is None:
            raise ValueError("as_of must include a timezone")
        keys = [(record.id, record.version) for record in self.records]
        if len(keys) != len(set(keys)):
            raise ValueError("source ID/version pairs must be unique")
        return self


class FindingSpan(_Schema):
    start: int = Field(ge=0, strict=True)
    end: int = Field(ge=0, strict=True)
    text: str = Field(max_length=50_000, strict=True)

    @model_validator(mode="after")
    def validate_span(self) -> "FindingSpan":
        if self.end - self.start != len(self.text):
            raise ValueError("span length must match its exact character offsets")
        return self


class Evidence(_Schema):
    source_type: Literal["brand_record"] = "brand_record"
    source_id: str = Field(min_length=1, max_length=200, strict=True)
    version: str = Field(min_length=1, max_length=100, strict=True)
    quote: str = Field(min_length=1, max_length=4000, strict=True)


class ReliabilityFinding(_Schema):
    id: str = Field(min_length=1, max_length=200, strict=True)
    content_version_id: str = Field(min_length=1, max_length=200, strict=True)
    span: FindingSpan
    category: Category
    verdict: Verdict
    severity: Literal["critical", "high", "medium", "low"]
    confidence: float = Field(ge=0, le=1, strict=True)
    method: Literal["rule"] = "rule"
    evidence: Evidence | None = None
    evidence_refs: list[Evidence] = Field(default_factory=list, max_length=256)
    reason: str = Field(min_length=1, max_length=4000, strict=True)
    reason_code: str = Field(min_length=1, max_length=100, strict=True)
    attribute: str | None = Field(default=None, max_length=100)
    suggestion: None = None
    status: Literal["open"] = "open"
    dismiss_reason: None = None

    @model_validator(mode="after")
    def require_evidence(self) -> "ReliabilityFinding":
        if self.verdict in {"supported", "contradicted", "outdated"} and self.evidence is None:
            raise ValueError("hard verdicts require evidence")
        if self.evidence is not None and self.evidence not in self.evidence_refs:
            raise ValueError("primary evidence must also appear in evidence_refs")
        return self


class CandidateBatch(_Schema):
    findings: list[ReliabilityFinding] = Field(max_length=128)


class ReliabilityResult(_Schema):
    status: Literal["completed", "review_required"]
    findings: list[ReliabilityFinding]
    ruleset_version: Literal["local-evidence-or-abstain-v1"] = RULESET_VERSION
    mode: Literal["local_only"] = "local_only"
    external_calls: Literal[0] = 0
    persistence: Literal["in_memory_demo"] = "in_memory_demo"
    degraded: bool = False
    reason_code: str | None = None
    attempts: int = Field(ge=0, le=3)
    cache_hit: bool = False


@dataclass(frozen=True)
class ReliabilityPolicy:
    """Policy gates, not calibrated probabilities or performance targets."""

    minimum_confidence: float = 0.85
    hard_verdict_confidence: float = 0.95
    per_attempt_timeout_seconds: float = 0.25
    total_timeout_seconds: float = 1.0
    max_attempts: int = 2
    retry_delay_seconds: float = 0.01
    max_workers: int = 2
    cache_max_entries: int = 128
    cache_ttl_seconds: float = 60.0

    def __post_init__(self) -> None:
        numbers = (
            self.minimum_confidence, self.hard_verdict_confidence,
            self.per_attempt_timeout_seconds, self.total_timeout_seconds,
            self.retry_delay_seconds, self.cache_ttl_seconds,
        )
        if not all(math.isfinite(value) for value in numbers):
            raise ValueError("reliability policy values must be finite")
        if not 0 <= self.minimum_confidence <= self.hard_verdict_confidence <= 1:
            raise ValueError("confidence gates must be ordered within [0, 1]")
        if not 0 < self.per_attempt_timeout_seconds <= self.total_timeout_seconds <= 30:
            raise ValueError("timeouts must be positive, ordered, and at most 30 seconds")
        if not 1 <= self.max_attempts <= 3 or not 1 <= self.max_workers <= 4:
            raise ValueError("attempts must be 1–3 and workers 1–4")
        if not 0 <= self.retry_delay_seconds <= 1:
            raise ValueError("retry delay must be 0–1 seconds")
        if not 0 <= self.cache_max_entries <= 1024 or not 0 <= self.cache_ttl_seconds <= 3600:
            raise ValueError("cache bounds exceeded")


class TransientReliabilityError(RuntimeError):
    """A local adapter may explicitly request the remaining bounded retry budget."""


class _WorkFailure(RuntimeError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class _BoundedWork:
    """Bound caller waiting and in-flight synchronous work without an unbounded queue.

    Python cannot forcibly stop a synchronous callback. A timed-out daemon retains
    its worker slot until it exits, is never retried, and cannot populate the cache.
    Keep one engine instance per service; repeated construction defeats that bound.
    """

    def __init__(self, max_workers: int) -> None:
        self._slots = BoundedSemaphore(max_workers)

    def call(self, operation: Callable[[], Any], timeout: float) -> Any:
        if timeout <= 0:
            raise _WorkFailure("deadline_exceeded")
        if not self._slots.acquire(blocking=False):
            raise _WorkFailure("worker_capacity_exhausted")
        outcome: Queue[tuple[bool, Any]] = Queue(maxsize=1)

        def work() -> None:
            try:
                outcome.put((True, operation()))
            except BaseException as error:
                # Do not log or expose exception text (it may contain content).
                outcome.put((False, error))
            finally:
                self._slots.release()

        Thread(target=work, name="proofline-local-check", daemon=True).start()
        try:
            succeeded, value = outcome.get(timeout=timeout)
        except Empty:
            raise _WorkFailure("check_timeout") from None
        if not succeeded:
            if isinstance(value, TransientReliabilityError):
                raise value
            raise _WorkFailure("check_failed") from None
        return value


def _plain_decimal(value: str) -> Decimal | None:
    if not re.fullmatch(r"[+-]?\d{1,18}(?:\.\d{1,12})?", value):
        return None
    try:
        number = Decimal(value)
        return number if number.is_finite() and number >= 0 else None
    except InvalidOperation:
        return None


def _number(value: str, *, currency: str | None, language: str) -> Decimal | None:
    """Accept a complete known format; never remove arbitrary punctuation."""

    if len(value) > 40:
        return None
    if language in {"de-DE", "fr-FR"} and currency == "EUR":
        grouped = r"\d{1,3}(?:\.\d{3})+" if language == "de-DE" else r"\d{1,3}(?:[ \u00a0\u202f]\d{3})+"
        if not re.fullmatch(rf"(?:\d+|{grouped})(?:,\d{{1,2}})?", value):
            return None
        value = value.replace(".", "").replace(" ", "").replace("\u00a0", "").replace("\u202f", "").replace(",", ".")
    elif "," in value:
        western = r"\d{1,3}(?:,\d{3})+(?:\.\d{1,12})?"
        indian = r"\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d{1,2})?"
        if not re.fullmatch(western, value) and not (currency == "INR" and re.fullmatch(indian, value)):
            return None
        value = value.replace(",", "")
    return _plain_decimal(value)


_UNITS: dict[str, tuple[str, Decimal]] = {}
for _dimension, _canonical, _aliases, _factor in (
    ("time", "seconds", ("h", "hr", "hrs", "hour", "hours"), "3600"),
    ("time", "seconds", ("min", "mins", "minute", "minutes"), "60"),
    ("time", "seconds", ("s", "sec", "secs", "second", "seconds"), "1"),
    ("time", "seconds", ("day", "days"), "86400"),
    ("mass", "grams", ("kg", "kilogram", "kilograms"), "1000"),
    ("mass", "grams", ("g", "gram", "grams"), "1"),
    ("storage", "bytes", ("tb",), "1000000000000"),
    ("storage", "bytes", ("gb",), "1000000000"),
    ("storage", "bytes", ("mb",), "1000000"),
    ("storage", "bytes", ("gib",), "1073741824"),
    ("storage", "bytes", ("mib",), "1048576"),
    ("energy", "wh", ("wh",), "1"),
    ("energy", "wh", ("kwh",), "1000"),
    ("power", "watts", ("w", "watt", "watts"), "1"),
    ("voltage", "volts", ("v", "volt", "volts"), "1"),
):
    for _alias in _aliases:
        _UNITS[_alias] = (_dimension, Decimal(_factor))

_NUM = r"[+-]?\d(?:[\d.,_\u00a0\u202f]*\d)?"
_CURRENCIES = r"US\$|CA\$|AU\$|USD|CAD|AUD|EUR|GBP|INR|JPY|CHF|\$|€|£|₹"
_MONEY_PREFIX = re.compile(rf"(?<![\w.,])(?P<currency>{_CURRENCIES})\s*(?P<number>{_NUM})(?:\s*(?P<suffix>USD|CAD|AUD|EUR|GBP|INR|JPY|CHF))?(?![\w,]|\.\d)", re.I)
_MONEY_SUFFIX = re.compile(rf"(?<![\w.,])(?P<number>{_NUM})\s*(?P<currency>USD|CAD|AUD|EUR|GBP|INR|JPY|CHF)(?![\w])", re.I)
_QUANTITY = re.compile(rf"(?<![\w.,])(?P<number>{_NUM})\s*(?P<unit>kilograms?|grams?|hours?|minutes?|seconds?|days?|watts?|volts?|hrs?|mins?|secs?|kwh|gib|mib|kg|gb|mb|tb|wh|lbs?|oz|ms|g|h|s|w|v)\b", re.I)
_QUALIFIER = re.compile(r"(?P<value>up\s+to|at\s+least|approximately|about|around|roughly|[~≈])\s*$", re.I)
_INJECTION = (
    re.compile(r"\bignore\s+(?:(?:all|the|previous|prior|brand|safety|system)\s+)*(?:instructions?|rules?|sources?)\b", re.I),
    re.compile(r"(?:^|\n|[\[<])\s*(?:system|assistant|developer)\s*(?::|\]|>)", re.I),
    re.compile(r"\b(?:reveal|leak|print)\b.{0,60}\b(?:api\s*key|system\s*prompt|credentials?)\b", re.I),
    re.compile(r"\b(?:mark|return|set)\s+(?:all\s+)?(?:findings?|claims?|verdict)\s+(?:as\s+|to\s+)?(?:supported|approved|clean)\b", re.I),
)
_PROMOTIONAL = re.compile(r"\b(?:the best|the cheapest|the fastest|better than every|guaranteed results|guarantees results)\b[^.!?]*", re.I)
_PROMOTION = re.compile(r"\b(?:save|discount)\s+(?P<percent>\d+(?:\.\d+)?)\s*%", re.I)


@dataclass(frozen=True)
class _NumericClaim:
    span: FindingSpan
    attribute: str
    amount: Decimal | None
    dimension: str | None
    currency: str | None
    qualifier: Qualifier


def _currency(value: str, market: str) -> str | None:
    value = value.upper()
    if value == "$":
        return "USD" if market == "US" else None
    return {"US$": "USD", "CA$": "CAD", "AU$": "AUD", "€": "EUR", "£": "GBP", "₹": "INR"}.get(value, value)


def _numeric_claims(request: ReliabilityRequest) -> list[_NumericClaim]:
    claims: list[_NumericClaim] = []
    occupied: list[tuple[int, int]] = []
    text = request.content
    for pattern in (_MONEY_PREFIX, _MONEY_SUFFIX, _QUANTITY):
        for match in pattern.finditer(text):
            if any(match.start() < end and match.end() > start for start, end in occupied):
                continue
            start = match.start()
            prefix = _QUALIFIER.search(text[max(0, start - 30):start])
            qualifier: Qualifier = "exact"
            if prefix:
                start = max(0, start - 30) + prefix.start()
                word = " ".join(prefix.group("value").casefold().split())
                qualifier = "up_to" if word == "up to" else "at_least" if word == "at least" else "approximate"
            currency = None
            if "currency" in match.groupdict():
                currency = _currency(match.group("currency"), request.market)
                suffix = match.groupdict().get("suffix")
                if suffix:
                    explicit = _currency(suffix, request.market)
                    # A contradictory prefix/suffix is not a currency conversion.
                    currency = explicit if explicit == currency else None
                attribute, dimension, factor = "price", "money", Decimal(1)
            else:
                unit = match.group("unit").casefold()
                dimension, factor = _UNITS.get(unit, (None, Decimal(1)))
                attribute = {"time": "battery_life", "mass": "weight", "storage": "storage"}.get(dimension or "", "battery_life" if "battery" in text.casefold() else "weight")
            amount = _number(match.group("number"), currency=currency, language=request.language)
            with localcontext() as context:
                context.prec = 50
                amount = amount * factor if amount is not None else None
            claims.append(_NumericClaim(
                span=FindingSpan(start=start, end=match.end(), text=text[start:match.end()]),
                attribute=attribute, amount=amount, dimension=dimension,
                currency=currency, qualifier=qualifier,
            ))
            occupied.append((start, match.end()))
    return sorted(claims, key=lambda claim: claim.span.start)


def _scope_matches(record: EvidenceRecord, request: ReliabilityRequest) -> bool:
    return record.organisation_id == request.organisation_id and all(
        actual is None or actual == expected
        for actual, expected in (
            (record.product, request.product), (record.market, request.market),
            (record.language, request.language), (record.channel, request.channel),
        )
    )


def _active(record: EvidenceRecord, request: ReliabilityRequest) -> bool:
    return (
        record.status == "approved" and _scope_matches(record, request)
        and (record.effective_from is None or record.effective_from <= request.as_of)
        and (record.effective_to is None or request.as_of < record.effective_to)
    )


def _evidence(record: EvidenceRecord) -> Evidence:
    return Evidence(source_id=record.id, version=record.version, quote=record.quote)


def _finding(
    request: ReliabilityRequest, span: FindingSpan, category: Category, verdict: Verdict,
    code: str, reason: str, *, records: tuple[EvidenceRecord, ...] = (),
    confidence: float = 1.0, attribute: str | None = None,
) -> ReliabilityFinding:
    digest = hashlib.sha256(f"{request.content_version_id}:{category}:{span.start}:{span.end}:{code}".encode()).hexdigest()[:24]
    refs = [_evidence(record) for record in records]
    return ReliabilityFinding(
        id=f"local_{digest}", content_version_id=request.content_version_id,
        span=span, category=category, verdict=verdict,
        severity="high" if verdict in {"contradicted", "outdated"} else "medium" if verdict in {"needs_human", "unsupported"} else "low",
        confidence=confidence, evidence=refs[0] if refs else None,
        evidence_refs=refs, reason=reason, reason_code=code, attribute=attribute,
    )


def _record_quantity(record: EvidenceRecord) -> tuple[Decimal | None, str | None, str | None, str]:
    if record.currency:
        return _plain_decimal(record.value or ""), "money", record.currency.upper(), record.qualifier
    dimension, factor = _UNITS.get((record.unit or "").casefold(), (None, Decimal(1)))
    value = _plain_decimal(record.value or "")
    with localcontext() as context:
        context.prec = 50
        return value * factor if value is not None else None, dimension, None, record.qualifier


def _check_numeric(request: ReliabilityRequest, claim: _NumericClaim) -> ReliabilityFinding:
    records = tuple(sorted((
        record for record in request.records
        if record.kind == "numeric" and record.attribute == claim.attribute and _active(record, request)
    ), key=lambda record: (record.id, record.version)))

    def result(verdict: Verdict, code: str, reason: str, confidence: float = 1.0) -> ReliabilityFinding:
        return _finding(request, claim.span, "factual", verdict, code, reason, records=records, confidence=confidence, attribute=claim.attribute)

    if not records:
        return result("unsupported", "evidence_not_found", "No applicable current approved source was found in the supplied registry; this is not proof the claim is false.")
    values = {_record_quantity(record) for record in records}
    if len(values) > 1:
        return result("needs_human", "source_conflict", "Applicable approved records disagree; an authorised owner must resolve the conflict.", 0.0)
    approved, dimension, currency, qualifier = next(iter(values))
    if claim.amount is None or claim.dimension is None or dimension is None:
        return result("needs_human", "ambiguous_quantity_format", "The entire numeric/unit format could not be interpreted conservatively.", 0.0)
    if claim.dimension != dimension or claim.currency != currency:
        return result("needs_human", "incompatible_unit_or_currency", "Units or currencies are incompatible; no exchange rate or dimensional conversion was inferred.", 0.0)
    if claim.qualifier == "approximate" or qualifier == "approximate":
        return result("needs_human", "approximation_without_tolerance", "Approximate wording has no approved tolerance; equality or a mismatch cannot be asserted.", 0.5)
    if claim.qualifier != qualifier:
        return result("needs_human", "qualifier_mismatch", "The claim and approved source use different qualifiers; the approved qualification must be reviewed.", 0.5)
    if approved == claim.amount:
        return result("supported", "exact_supported", "The parsed quantity, unit/currency, qualifier, and approved source scope match.")
    if qualifier == "exact" or (qualifier == "up_to" and approved is not None and claim.amount > approved) or (qualifier == "at_least" and approved is not None and claim.amount < approved):
        return result("contradicted", "numeric_mismatch", "The exact value or stated bound conflicts with the applicable approved source.")
    return result("needs_human", "weaker_bound_requires_review", "A different weaker bound is not automatically approved wording.", 0.5)


def _local_checks(request: ReliabilityRequest) -> CandidateBatch:
    findings = [_check_numeric(request, claim) for claim in _numeric_claims(request)]
    text = request.content
    all_span = FindingSpan(start=0, end=len(text), text=text)
    active = tuple(record for record in request.records if _active(record, request))
    for record in active:
        if record.kind == "term":
            for match in re.finditer(rf"(?<!\w){re.escape(record.value or '')}(?!\w)", text, re.I):
                findings.append(_finding(request, FindingSpan(start=match.start(), end=match.end(), text=match.group()), "terminology", "contradicted", "configured_term", "A literal configured banned term appears in the content.", records=(record,)))
        elif record.kind == "required_text" and _PROMOTION.search(text) and (record.value or "").casefold() not in text.casefold():
            findings.append(_finding(request, all_span, "legal", "contradicted", "missing_required_text", "The promotion omits the applicable configured literal qualifier.", records=(record,)))
    for match in _PROMOTIONAL.finditer(text):
        span = FindingSpan(start=match.start(), end=match.end(), text=match.group())
        records = tuple(record for record in active if record.kind == "claim" and (record.value or "").casefold() == match.group().casefold())
        findings.append(_finding(request, span, "promotional", "supported" if records else "unsupported", "approved_claim_wording" if records else "evidence_not_found", "Exact promotional wording has an applicable approved source." if records else "No applicable approved substantiation was found for this promotional wording; it is unverified, not proven false.", records=records))
    for match in _PROMOTION.finditer(text):
        records = tuple(record for record in request.records if record.kind == "promotion" and record.status == "approved" and _scope_matches(record, request) and record.value == match.group("percent"))
        span = FindingSpan(start=match.start(), end=match.end(), text=match.group())
        if not records:
            continue
        # Conflicting time windows are a source conflict, not a chosen active offer.
        if len({(record.effective_from, record.effective_to) for record in records}) > 1:
            findings.append(_finding(request, span, "offer_date", "needs_human", "source_conflict", "Approved matching offers have conflicting validity windows.", records=records, confidence=0.0))
        elif any(record.effective_to is not None and request.as_of >= record.effective_to for record in records):
            findings.append(_finding(request, span, "offer_date", "outdated", "expired_offer", "The configured offer ended before or at the specified publication time.", records=records))
        elif any(record.effective_from is not None and request.as_of < record.effective_from for record in records):
            findings.append(_finding(request, span, "offer_date", "needs_human", "offer_not_yet_active", "The configured offer is not yet active at the publication time.", records=records, confidence=0.0))
        else:
            findings.append(_finding(request, span, "offer_date", "supported", "active_offer", "The matching configured offer is active at the specified publication time.", records=records))
    signals = [match for pattern in _INJECTION if (match := pattern.search(text)) is not None]
    if signals:
        match = min(signals, key=lambda item: item.start())
        findings.append(_finding(request, FindingSpan(start=match.start(), end=match.end(), text=match.group()), "security", "needs_human", "instruction_like_content", "Instruction-like content is untrusted data. It was not executed or used to change rules, sources, or approval.", confidence=1.0))
    return CandidateBatch(findings=findings)


def _identity(finding: ReliabilityFinding) -> tuple[str, int, int, str | None]:
    return finding.category, finding.span.start, finding.span.end, finding.attribute


class LocalReliabilityEngine:
    """Reuse this instance for bounded local checks and a tenant-scoped TTL/LRU cache.

    ``checker`` is a local adapter/test seam. It must be side-effect free. No external
    provider is constructed, discovered, imported, or called by this module.
    """

    def __init__(
        self, *, policy: ReliabilityPolicy | None = None,
        checker: Callable[[ReliabilityRequest], Any] | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.policy = policy or ReliabilityPolicy()
        self._checker = checker if checker is not None else _local_checks
        self._clock = clock
        self._sleep = sleep
        self._work = _BoundedWork(self.policy.max_workers)
        self._cache: OrderedDict[str, tuple[float, ReliabilityResult]] = OrderedDict()
        self._lock = RLock()

    @property
    def cache_size(self) -> int:
        with self._lock:
            self._expire()
            return len(self._cache)

    def clear_cache(self) -> None:
        with self._lock:
            self._cache.clear()

    def _expire(self) -> None:
        for key, (expiry, _) in list(self._cache.items()):
            if expiry <= self._clock():
                self._cache.pop(key, None)

    def _key(self, request: ReliabilityRequest) -> str:
        payload = {"request": request.model_dump(mode="json"), "ruleset": RULESET_VERSION, "policy": vars(self.policy)}
        return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()

    def _degraded(self, request: ReliabilityRequest, code: str, attempts: int) -> ReliabilityResult:
        text = request.content[:200]
        finding = _finding(request, FindingSpan(start=0, end=len(text), text=text), "factual", "needs_human", code, "The local audit was incomplete or unavailable. Human review is required; no successful full audit is claimed.", confidence=0.0)
        return ReliabilityResult(status="review_required", findings=[finding], degraded=True, reason_code=code, attempts=attempts)

    @staticmethod
    def _abstain(finding: ReliabilityFinding, code: str, reason: str) -> ReliabilityFinding:
        return finding.model_copy(update={"verdict": "needs_human", "confidence": 0.0, "severity": "medium", "reason_code": code, "reason": reason, "suggestion": None})

    def validate_candidates(self, request: ReliabilityRequest, raw: Any) -> list[ReliabilityFinding]:
        """Validate shape, exact spans, tenant/source scope, policy gates, and rules.

        An opaque callback cannot turn a high confidence number into evidence. Hard
        verdicts must agree with the local deterministic check over that exact span.
        Omitted checks are surfaced rather than becoming a successful empty audit.
        """

        if isinstance(raw, bytes):
            if len(raw) > 1_000_000:
                raise ValueError("candidate output exceeds the local size bound")
            raw = raw.decode("utf-8", errors="strict")
        if isinstance(raw, str):
            if len(raw) > 1_000_000:
                raise ValueError("candidate output exceeds the local size bound")
            raw = json.loads(raw)
        if isinstance(raw, CandidateBatch):
            raw = raw.model_dump()
        batch = CandidateBatch.model_validate(raw)
        baseline = {_identity(finding): finding for finding in _local_checks(request).findings}
        approved = {(record.id, record.version): record for record in request.records if _active(record, request)}
        # Expired offer evidence is applicable to an outdated verdict, not a current
        # numeric assertion. Its exact configured time window remains authoritative.
        approved.update({(record.id, record.version): record for record in request.records if record.kind == "promotion" and record.status == "approved" and _scope_matches(record, request)})
        validated: list[ReliabilityFinding] = []
        seen: set[tuple[str, int, int, str | None]] = set()
        for finding in batch.findings:
            if finding.content_version_id != request.content_version_id or request.content[finding.span.start:finding.span.end] != finding.span.text or finding.span.end > len(request.content):
                raise ValueError("candidate span or content-version binding is invalid")
            identity = _identity(finding)
            if identity in seen:
                raise ValueError("duplicate candidate checks are invalid")
            seen.add(identity)
            original = baseline.get(identity)
            refs_valid = all(
                (record := approved.get((ref.source_id, ref.version))) is not None
                and ref.quote == record.quote
                and (finding.attribute is None or finding.attribute == record.attribute)
                for ref in finding.evidence_refs
            )
            if not refs_valid:
                finding = self._abstain(finding, "unverified_evidence", "Evidence was missing, stale, outside the current workspace/scope, or quoted incorrectly.").model_copy(update={"evidence": None, "evidence_refs": []})
            elif original is None or (finding.verdict in {"supported", "contradicted", "outdated"} and finding.verdict != original.verdict):
                finding = self._abstain(finding, "deterministic_verifier_disagreed", "The local deterministic verifier did not establish the proposed verdict for this exact span.")
            elif finding.verdict != "needs_human" and (finding.confidence < self.policy.minimum_confidence or (finding.verdict in {"supported", "contradicted", "outdated"} and finding.confidence < self.policy.hard_verdict_confidence)):
                finding = self._abstain(finding, "below_confidence_gate", "The check did not meet the explicit local policy gate; confidence is not evidence or a calibrated truth probability.")
            validated.append(finding)
        for identity, finding in baseline.items():
            if identity not in seen:
                validated.append(self._abstain(finding, "incomplete_candidate_output", "The local adapter omitted a check; human review is required instead of a clean audit."))
        return validated

    def audit(self, request: ReliabilityRequest | Mapping[str, Any]) -> ReliabilityResult:
        """Run a bounded local audit. Invalid request shapes raise ValidationError."""

        request = ReliabilityRequest.model_validate(request)
        if request.extraction_status != "complete" or not request.content.strip():
            return self._degraded(request, "extraction_incomplete", 0)
        # Confidential content remains local but is never retained in the result cache.
        cache_allowed = not request.confidential and self.policy.cache_max_entries > 0 and self.policy.cache_ttl_seconds > 0
        key = self._key(request)
        if cache_allowed:
            with self._lock:
                self._expire()
                cached = self._cache.get(key)
                if cached is not None:
                    self._cache.move_to_end(key)
                    return cached[1].model_copy(deep=True, update={"cache_hit": True, "attempts": 0})
        deadline = self._clock() + self.policy.total_timeout_seconds
        attempts = 0
        while attempts < self.policy.max_attempts:
            remaining = deadline - self._clock()
            if remaining <= 0:
                return self._degraded(request, "deadline_exceeded", attempts)
            attempts += 1
            try:
                raw = self._work.call(lambda: self._checker(request.model_copy(deep=True)), min(remaining, self.policy.per_attempt_timeout_seconds))
                findings = self.validate_candidates(request, raw)
                if self._clock() >= deadline:
                    return self._degraded(request, "deadline_exceeded", attempts)
                result = ReliabilityResult(status="review_required" if any(finding.verdict in {"needs_human", "unsupported"} for finding in findings) else "completed", findings=findings, attempts=attempts)
                # Cache only complete schema/evidence/rule-validated results, never
                # transient failures, omissions, or rejected candidate data.
                rejected = {"unverified_evidence", "deterministic_verifier_disagreed", "incomplete_candidate_output"}
                if cache_allowed and not any(finding.reason_code in rejected for finding in findings):
                    with self._lock:
                        self._expire()
                        self._cache[key] = (self._clock() + self.policy.cache_ttl_seconds, result.model_copy(deep=True))
                        self._cache.move_to_end(key)
                        while len(self._cache) > self.policy.cache_max_entries:
                            self._cache.popitem(last=False)
                return result
            except TransientReliabilityError:
                if attempts >= self.policy.max_attempts:
                    return self._degraded(request, "retry_exhausted", attempts)
                delay = self.policy.retry_delay_seconds * (2 ** (attempts - 1))
                if delay >= deadline - self._clock():
                    return self._degraded(request, "deadline_exceeded", attempts)
                self._sleep(delay)
            except _WorkFailure as error:
                return self._degraded(request, error.code, attempts)
            except (ValidationError, ValueError, TypeError, UnicodeError):
                return self._degraded(request, "invalid_candidate_schema", attempts)
        return self._degraded(request, "retry_exhausted", attempts)
