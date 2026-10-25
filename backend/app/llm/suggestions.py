"""Conservative local suggestions: approved-value substitutions, never new claims."""

from __future__ import annotations

import re
from typing import Any, Sequence

from .evidence import find_evidence_record
from .types import ApprovedFact, CandidateFinding, CandidateSuggestion


_QUANTITY = re.compile(
    r"(?<![\w.])(?:(?:up to|at least|at most|approximately|about)\s+)?"
    r"(?P<number>\d+(?:[.,]\d+)?)(?:\s*(?P<unit>%|hours?|hrs?|minutes?|mins?|days?|kg|gb|tb|mah|w|years?))?(?!\w)",
    re.I,
)
_UNIT_ALIASES = {"hr": "hour", "hrs": "hour", "min": "minute", "mins": "minute"}


def _unit(value: str | None) -> str:
    text = (value or "").casefold()
    return _UNIT_ALIASES.get(text, text.rstrip("s"))


def _approved_display(record: ApprovedFact) -> str | None:
    value = record.value
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, dict):
        for key in ("approved_value", "display", "value", "text", "preferred", "preferred_term"):
            candidate = value.get(key)
            if isinstance(candidate, (str, int, float)) and not isinstance(candidate, bool):
                text = str(candidate).strip()
                qualifier = value.get("qualifier")
                unit = value.get("unit")
                if key in {"value", "approved_value"}:
                    if isinstance(unit, str) and unit and not re.search(r"[A-Za-z%]", text):
                        text = f"{text} {unit}"
                    if isinstance(qualifier, str) and qualifier and not text.casefold().startswith(qualifier.casefold()):
                        text = f"{qualifier} {text}"
                return text or None
    return None


def _quantity_substitution(original: str, approved: str) -> str | None:
    approved_matches = list(_QUANTITY.finditer(approved))
    if len(approved_matches) != 1:
        return None
    approved_match = approved_matches[0]
    # A long sentence with one incidental number is not an approved replacement.
    if approved[:approved_match.start()].strip() or approved[approved_match.end():].strip():
        return None
    candidates = [match for match in _QUANTITY.finditer(original) if _unit(match.group("unit")) == _unit(approved_match.group("unit"))]
    if len(candidates) != 1:
        return None
    candidate = candidates[0]
    return original[:candidate.start()] + approved_match.group(0) + original[candidate.end():]


def _terminology_substitution(original: str, approved: str, value: Any) -> str | None:
    if not isinstance(value, dict):
        return None
    banned = value.get("banned_term") or value.get("banned") or value.get("incorrect_term")
    if isinstance(banned, list):
        banned = next((item for item in banned if isinstance(item, str) and item in original), None)
    if not isinstance(banned, str) or not banned:
        return None
    matches = list(re.finditer(r"(?<!\w)" + re.escape(banned) + r"(?!\w)", original, re.I))
    if len(matches) != 1:
        return None
    match = matches[0]
    return original[:match.start()] + approved + original[match.end():]


def generate_intent_preserving_suggestion(
    finding: CandidateFinding,
    records: Sequence[ApprovedFact],
) -> CandidateSuggestion | None:
    """Propose exactly one approved-value edit, otherwise abstain from rewriting."""

    if finding.verdict not in {"contradicted", "outdated"}:
        return None
    referenced: dict[tuple[str, str], ApprovedFact] = {}
    for ref in finding.evidence_refs:
        record = find_evidence_record(ref, records)
        if record is None or not record.is_current() or record.is_confidential:
            return None
        referenced[(record.id, record.version)] = record
    if len(referenced) != 1:
        return None
    record = next(iter(referenced.values()))
    approved = _approved_display(record)
    if not approved or len(approved) > 2000:
        return None
    original = finding.span.text
    replacement = _quantity_substitution(original, approved)
    if replacement is None and finding.category in {"terminology", "terminology_violation"}:
        replacement = _terminology_substitution(original, approved, record.value)
    if replacement is None or replacement == original:
        return None
    return CandidateSuggestion(
        text=replacement,
        intent_note="One approved-value substitution preserves the surrounding original wording; this proposal still requires human acceptance and re-checking.",
    )


class IntentPreservingSuggestionGenerator:
    def generate(self, finding: CandidateFinding, records: Sequence[ApprovedFact]) -> CandidateSuggestion | None:
        return generate_intent_preserving_suggestion(finding, records)
