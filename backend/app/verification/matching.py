"""Conservative claim-to-approved-record matching and versioned ledger links."""

from __future__ import annotations

import json
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

try:
    from rapidfuzz.distance import Levenshtein as _RapidLevenshtein  # type: ignore[import-not-found]
except ImportError:
    _RapidLevenshtein = None

from .normalization import DateRange, NormalizedQuantity, normalize_date, normalize_key, normalize_quantity
from .types import Claim, ClaimFactLink, Evidence


# Field synonyms only: these describe generic measurements, never customer facts.
# Customer-specific aliases come exclusively from the supplied approved records.
KEY_SYNONYMS: dict[str, tuple[str, ...]] = {
    "battery life": ("battery runtime", "battery duration", "battery backup", "battery"),
    "price": ("cost", "selling price", "retail price", "mrp", "available for"),
    "discount": ("discount percentage", "percent off", "percentage off", "off", "save"),
    "warranty": ("warranty period", "warranty duration"),
    "storage": ("storage capacity", "disk capacity"),
    "memory": ("ram", "memory capacity"),
    "weight": ("mass", "weighs"),
    "offer expiry": ("offer end date", "offer expires", "valid until", "ends", "expires"),
}


def get_value(record: Any, key: str, default: Any = None) -> Any:
    return record.get(key, default) if isinstance(record, Mapping) else getattr(record, key, default)


@dataclass(frozen=True, slots=True)
class RecordView:
    """Small adapter for generic dictionaries and the existing vault models."""

    id: str
    version: str
    value: Mapping[str, Any]
    status: str = "approved"
    source_id: str | None = None
    source_version: str | None = None
    effective_from: date | datetime | str | None = None
    effective_to: date | datetime | str | None = None
    resource: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)
    organisation_id: str | None = None

    @property
    def fact_id(self) -> str:
        return self.id

    @property
    def fact_version(self) -> str:
        return self.version

    @property
    def quote(self) -> str:
        for key in ("quote", "evidence_quote", "approved_text", "wording", "text", "label"):
            value = self.value.get(key)
            if isinstance(value, str) and value.strip():
                return value
        # Structured records have no prose quote. Preserve their actual supplied
        # fields as an excerpt instead of inventing an approved sentence.
        return json.dumps(dict(self.value), sort_keys=True, ensure_ascii=False, default=str)

    @property
    def evidence(self) -> Evidence:
        # Preserve the supplied source identity when one exists while retaining the
        # internal registry record ID for tenant/version validation.  The compact
        # contract exposes both concepts: source_id is what a reviewer can trace to,
        # and record_id is the local registry row used by the adapter.
        return Evidence(
            "brand_record",
            self.source_id or self.id,
            self.source_version or self.version,
            self.quote,
            record_id=self.id,
        )

    @property
    def logical_key(self) -> str:
        for key in (
            "key",
            "fact_key",
            "attribute",
            "term",
            "name",
            "title",
            "offer",
            "offer_name",
            "claim",
        ):
            if self.value.get(key):
                return normalize_key(self.value[key])
        return ""

    @property
    def aliases(self) -> tuple[str, ...]:
        aliases: list[str] = []
        for field_name in ("aliases", "synonyms", "keys"):
            raw = self.value.get(field_name, ())
            if isinstance(raw, str):
                raw = re.split(r"[,|;]", raw)
            if isinstance(raw, (tuple, list, set)):
                aliases.extend(normalize_key(item) for item in raw if item)
        return tuple(dict.fromkeys(item for item in aliases if item))


def normalise_record(record: Any) -> RecordView | None:
    """Adapt a supplied record without inventing its ID or version.

    Omitted approval status is accepted only because this function's caller supplies
    an explicitly approved-record collection. Explicit draft/retired statuses are
    still excluded by matching and rule checks.
    """

    if isinstance(record, RecordView):
        return record if record.id and record.version else None
    record_id = get_value(record, "id") or get_value(record, "fact_id")
    version = get_value(record, "version", get_value(record, "fact_version"))
    value = get_value(record, "value")
    if not record_id or version is None or str(version).strip() == "":
        return None
    if not isinstance(value, Mapping):
        # Also support a flat record {id, version, key, value: 12, unit: hours}.
        if not isinstance(record, Mapping):
            return None
        value = {key: item for key, item in record.items() if key not in {"id", "version", "status", "metadata", "organisation_id", "resource", "source_id", "source_version"}}
    metadata = get_value(record, "metadata", {})
    return RecordView(
        id=str(record_id),
        version=str(version),
        value=dict(value),
        status=str(get_value(record, "status", "approved")),
        source_id=str(get_value(record, "source_id")) if get_value(record, "source_id") else None,
        source_version=str(get_value(record, "source_version")) if get_value(record, "source_version") else None,
        effective_from=get_value(record, "effective_from", value.get("effective_from", value.get("valid_from"))),
        effective_to=get_value(record, "effective_to", value.get("effective_to", value.get("valid_to", value.get("expires_at", value.get("expiry"))))),
        resource=str(get_value(record, "resource", get_value(record, "record_type", "facts"))),
        metadata=dict(metadata) if isinstance(metadata, Mapping) else {},
        organisation_id=str(get_value(record, "organisation_id")) if get_value(record, "organisation_id") else None,
    )


@dataclass(frozen=True, slots=True)
class FactMatch:
    record: RecordView | None
    status: str
    score: float = 0.0
    candidates: tuple[RecordView, ...] = ()
    reason: str = ""
    exact_key: bool = False
    scope_complete: bool = True
    validity: str | None = None

    @property
    def fact_id(self) -> str | None:
        return self.record.id if self.record else None

    @property
    def fact_version(self) -> str | None:
        return self.record.version if self.record else None


def edit_distance(left: str, right: str) -> int:
    """Use RapidFuzz when installed, with the same edit metric offline."""

    if _RapidLevenshtein is not None:
        return int(_RapidLevenshtein.distance(left, right))
    previous = list(range(len(right) + 1))
    for index, character in enumerate(left, start=1):
        current = [index]
        for other_index, other in enumerate(right, start=1):
            current.append(min(current[-1] + 1, previous[other_index] + 1, previous[other_index - 1] + (character != other)))
        previous = current
    return previous[-1]


def phrase_pattern(phrase: str) -> re.Pattern[str]:
    parts = re.split(r"\s+", phrase.strip())
    return re.compile(r"(?<!\w)" + r"\s+".join(re.escape(part) for part in parts) + r"(?!\w)", re.IGNORECASE)


def phrase_matches(text: str, phrase: str, *, fuzzy: bool = False) -> list[tuple[int, int, bool]]:
    """Whole-word exact matches plus tightly bounded typo candidates."""

    if not phrase.strip():
        return []
    exact = [(match.start(), match.end(), False) for match in phrase_pattern(phrase).finditer(text)]
    if not fuzzy:
        return exact
    normal = normalize_key(phrase)
    if len(normal) < 5 or len(normal) > 96:
        return exact
    tokens = list(re.finditer(r"\w+", text, re.UNICODE))
    words = len(normal.split())
    max_edits = 1 if len(normal) < 10 else 2
    for index in range(len(tokens) - words + 1):
        start, end = tokens[index].start(), tokens[index + words - 1].end()
        if any(start < right and end > left for left, right, _ in exact):
            continue
        candidate = normalize_key(text[start:end])
        if abs(len(candidate) - len(normal)) <= max_edits and edit_distance(candidate, normal) <= max_edits:
            exact.append((start, end, True))
    return sorted(exact)


def _key_score(claim: Claim, record: RecordView) -> tuple[float, bool]:
    # Context is copied by the extractor, or explicitly supplied by an adapter.
    context = normalize_key(str(claim.metadata.get("context", claim.text)))
    explicit = normalize_key(claim.metadata.get("key", claim.metadata.get("fact_key", "")))
    key = record.logical_key
    if not key:
        return 0.0, False
    keys = (key, *record.aliases)
    for candidate_key in keys:
        if explicit == candidate_key or phrase_matches(context, candidate_key):
            return 1.0, True
        tokens = [token for token in candidate_key.split() if len(token) > 1]
        if len(tokens) >= 2 and all(phrase_matches(context, token) for token in tokens):
            return 0.96, True
    for canonical, synonyms in KEY_SYNONYMS.items():
        if key == canonical or key in synonyms:
            if any(phrase_matches(context, alias) for alias in (canonical, *synonyms)):
                return 0.97, True
    for candidate_key in keys:
        if any(is_fuzzy for _, _, is_fuzzy in phrase_matches(context, candidate_key, fuzzy=True)):
            return 0.86, False
    return 0.0, False


def record_scope(record: RecordView) -> Mapping[str, Any]:
    result: dict[str, Any] = {}
    for mapping in (record.metadata, record.value):
        nested = mapping.get("scope", mapping.get("applicability", {}))
        if isinstance(nested, Mapping):
            result.update(nested)
        for key in ("product", "product_id", "market", "region", "channel", "language"):
            if mapping.get(key) is not None:
                result[key] = mapping[key]
    return result


def scope_applicability(record: RecordView, *, scope: Mapping[str, Any] | None = None, context: str = "") -> tuple[bool, bool]:
    """Return (not contradicted by supplied scope, all required scope known)."""

    complete = True
    supplied = scope or {}
    for key, required in record_scope(record).items():
        if key not in {"product", "product_id", "market", "region", "channel", "language"} or not required:
            continue
        options = list(required) if isinstance(required, (list, tuple, set)) else [required]
        normalized = {normalize_key(option) for option in options}
        if normalized & {"all", "global", "any", "*"}:
            continue
        actual = supplied.get(key)
        if actual is not None:
            if normalize_key(actual) not in normalized:
                return False, False
        elif key == "product" and any(phrase_matches(normalize_key(context), option) for option in normalized):
            continue
        else:
            complete = False
    return True, complete


def record_validity(record: RecordView, *, today: date | None = None) -> str:
    reference = today or date.today()
    if record.status.casefold() in {"expired", "superseded", "retired"}:
        return record.status.casefold()
    start_raw = record.effective_from
    end_raw = record.effective_to
    start = normalize_date(start_raw, today=reference) if start_raw is not None else None
    end = normalize_date(end_raw, today=reference) if end_raw is not None else None
    if (start_raw is not None and start is None) or (end_raw is not None and end is None):
        return "invalid_validity"
    if start is not None and end is not None and end < start:
        return "invalid_validity"
    if end is not None and end < reference:
        return "expired"
    if start is not None and start > reference:
        return "not_yet_valid"
    return "current"


def record_quantity(record: RecordView) -> NormalizedQuantity | None:
    value = record.value
    raw = value.get("value", value.get("amount", value.get("number", value.get("approved_value"))))
    unit = value.get("unit", value.get("units"))
    currency = value.get("currency")
    if raw is None and value.get("discount_percent") is not None:
        raw = value.get("discount_percent")
        unit = "%"
    if raw is None:
        raw = value.get("approved_text", value.get("text"))
    if raw is None and value.get("price") is not None:
        raw = value.get("price")
        unit = value.get("currency", unit)
    if raw is None:
        return None
    if unit is None and currency is not None:
        unit = currency
    qualifier = normalize_key(value.get("qualifier"))
    if qualifier not in {"up to", "at least", "at most", "more than", "less than", "over", "under", "from", "starting at", "as low as"}:
        qualifier = None
    return normalize_quantity(raw, unit=unit, qualifier=qualifier)


def comparable_quantities(left: NormalizedQuantity | None, right: NormalizedQuantity | None) -> bool:
    return bool(left and right and left.dimension == right.dimension and left.unit == right.unit and left.currency == right.currency)


def compare_claim_value(claim: Claim, record: RecordView, *, today: date | None = None) -> bool | None:
    if claim.kind in {"quantity", "number", "price", "percentage"}:
        left = normalize_quantity(claim.normalized_value, unit=claim.unit)
        right = record_quantity(record)
        if not comparable_quantities(left, right) or left is None or right is None:
            return None
        if left.value != right.value:
            # Differing bounds may still overlap. An approved maximum only
            # disproves a claim exceeding that maximum; it does not prove all
            # lower values, or an unqualified constant promise, are true.
            bound = normalize_key(right.qualifier)
            if bound in {"up to", "at most"}:
                return False if left.value > right.value else None
            if bound in {"at least", "from", "starting at"}:
                return False if left.value < right.value else None
            return False
        approved_qualifier = normalize_key(right.qualifier)
        supplied_qualifier = normalize_key(claim.qualifier or left.qualifier)
        if approved_qualifier and supplied_qualifier != approved_qualifier:
            return None
        return True
    raw = record.value.get("value", record.value.get("approved_value", record.value.get("date")))
    if claim.kind == "date":
        approved = normalize_date(raw, today=today)
        return claim.normalized_value == approved if approved and isinstance(claim.normalized_value, date) else None
    if claim.kind == "date_range":
        from .normalization import parse_date_range

        approved_range = parse_date_range(str(raw or ""), today=today)
        if isinstance(claim.normalized_value, DateRange) and approved_range:
            return (claim.normalized_value.start, claim.normalized_value.end) == (approved_range.start, approved_range.end)
    if claim.kind in {"comparative", "guarantee", "promotional"}:
        approved_claim = record.value.get("claim") or record.value.get("approved_text") or record.value.get("wording")
        if isinstance(approved_claim, str) and phrase_matches(
            normalize_key(str(claim.metadata.get("context", claim.text))),
            normalize_key(approved_claim),
        ):
            return True
    # A generic claim word appearing in a fact is not substantiation. Comparative
    # rules require an explicit approved claim/substantiation field separately.
    return None


def _record_signature(record: RecordView) -> str:
    quantity = record_quantity(record)
    raw: Any = quantity.to_dict() if quantity else record.value.get("value", record.value)
    if isinstance(raw, dict):
        raw = {key: item for key, item in raw.items() if key not in {"original", "raw_value", "raw_unit"}}
    return json.dumps(raw, sort_keys=True, default=str, ensure_ascii=False)


def match_claim_to_fact(
    claim: Claim,
    records: Iterable[Any],
    *,
    today: date | None = None,
    minimum_score: float = 0.8,
    scope: Mapping[str, Any] | None = None,
) -> FactMatch:
    """Match by whole field keys/aliases; weak, ambiguous, or stale evidence abstains."""

    if claim.kind in {"instruction_like_text", "regulated_category"}:
        return FactMatch(None, "unmatched", reason="this candidate is not a factual assertion")
    context = str(claim.metadata.get("context", claim.text))
    scored: list[tuple[float, bool, bool, RecordView]] = []
    for raw_record in records:
        record = normalise_record(raw_record)
        if record is None or record.status.casefold() not in {"approved", "expired", "superseded"}:
            continue
        if record.resource not in {
            None,
            "facts",
            "fact",
            "brand_record",
            "product_fact",
            "offer",
            "promotion",
            "disclaimer",
            "disclaimers",
            "guideline",
            "guidelines",
        }:
            continue
        applicable, complete = scope_applicability(record, scope=scope, context=context)
        if not applicable:
            continue
        score, exact = _key_score(claim, record)
        if score >= minimum_score:
            scored.append((score, exact, complete, record))
    if not scored:
        return FactMatch(None, "unmatched", reason="no sufficiently applicable approved fact found")
    # Prefer known applicability and current versions, but never use a value to
    # select evidence: selecting whichever value matches would hide conflicts.
    known = [row for row in scored if row[2]]
    pool = known or scored
    current = [row for row in pool if record_validity(row[3], today=today) == "current"]
    pool = current or pool
    pool.sort(key=lambda row: (-row[0], row[3].id, row[3].version))
    top_score = pool[0][0]
    top = [row for row in pool if top_score - row[0] <= 0.04]
    candidates = tuple(row[3] for row in top)
    # Same values with different windows/scope can still be ambiguous. Keep all
    # candidate IDs so a reviewer can inspect every applicable source version.
    if len(top) > 1 and (len({_record_signature(record) for record in candidates}) > 1 or not all(row[2] for row in top)):
        return FactMatch(None, "conflict", top_score, candidates, "conflicting or ambiguously scoped approved facts", scope_complete=all(row[2] for row in top))
    score, exact, complete, record = top[0]
    validity = record_validity(record, today=today)
    compared = compare_claim_value(claim, record, today=today)
    if not complete or not exact or validity != "current":
        status = "outdated" if validity == "expired" and compared is True and complete and exact else "unsupported"
    else:
        status = "supported" if compared is True else "contradicted" if compared is False else "unsupported"
    return FactMatch(
        record=record,
        status=status,
        score=score,
        candidates=candidates,
        reason=f"key={'exact_or_synonym' if exact else 'fuzzy_candidate'}; scope={'known' if complete else 'incomplete'}; validity={validity}; compatible_value={'yes' if compared is not None else 'not_established'}",
        exact_key=exact,
        scope_complete=complete,
        validity=validity,
    )


def link_claims_to_facts(
    claims: Sequence[Claim],
    records: Iterable[Any],
    *,
    today: date | None = None,
    minimum_score: float = 0.8,
    scope: Mapping[str, Any] | None = None,
) -> list[ClaimFactLink]:
    records = list(records)
    links: list[ClaimFactLink] = []
    for claim in claims:
        match = match_claim_to_fact(claim, records, today=today, minimum_score=minimum_score, scope=scope)
        links.append(
            ClaimFactLink(
                claim_id=claim.id,
                fact_id=match.fact_id,
                fact_version=match.fact_version,
                link_status=match.status,
                evidence_quote=match.record.quote if match.record else None,
                evidence_quotes=tuple(record.quote for record in match.candidates),
                candidate_fact_ids=tuple(record.id for record in match.candidates),
                metadata={
                    "score": match.score,
                    "reason": match.reason,
                    "candidate_fact_versions": [{"fact_id": record.id, "fact_version": record.version} for record in match.candidates],
                },
            )
        )
    return links


# American-spelling alias for pipeline callers.
normalize_record = normalise_record
