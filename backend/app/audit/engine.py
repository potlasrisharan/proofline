"""Thin ingestion/verification/LLM integration with evidence-or-abstain boundaries.

The deterministic and optional provider packages remain replaceable. All candidate
findings pass local scope, version, span and evidence validation before persistence.
"""

from __future__ import annotations

import importlib
import inspect
import json
import re
from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from ..models import FindingInput
from .risk import calculate_risk, finding_risk


RULESET_VERSION = "phase2-deterministic-v1"
_EMAIL = re.compile(r"(?<![\w.+-])[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+(?![\w.-])")
_PHONE = re.compile(r"(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\w)")
_INSTRUCTIONS = re.compile(
    r"\b(?:ignore\s+(?:all\s+)?(?:previous|system)\s+(?:instructions?|prompts?|messages?)"
    r"|you\s+are\s+now|act\s+as|(?:reveal|print|show|leak)\b.{0,80}\b(?:prompt|secret|api\s+key))"
    r"|(?:^|\n)\s*(?:system|assistant|developer)\s*:",
    re.I,
)
_QUANTITY = re.compile(
    r"(?P<qualifier>up\s+to|at\s+least|at\s+most|more\s+than|less\s+than|over|under|starting\s+at)?\s*"
    r"(?P<number>\d+(?:\.\d+)?)\s*(?P<unit>%|hours?|hrs?|h|minutes?|mins?|days?|weeks?|months?|years?|gb|tb|mb|kg|g)\b",
    re.I,
)
_DATE = re.compile(
    r"\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|"
    r"Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?)\b",
    re.I,
)
_COMPARATIVE = re.compile(
    r"\b(?:best|fastest|cheapest|number\s+one|no\.?\s*1|guaranteed?|guarantee|free)\b", re.I
)
_CATEGORY_ALIASES = {
    "fact_mismatch": "factual",
    "outdated_fact_or_offer": "offer_date",
    "unsupported_claim": "promotional",
    "terminology_violation": "terminology",
    "tone_messaging_mismatch": "tone",
    "visual_mismatch": "visual",
    "accessibility_issue": "accessibility",
    "configured_policy_disclaimer": "legal",
    "prompt_injection": "security",
}


@dataclass(frozen=True)
class AuditOptions:
    exposure: int = 1
    regulated: bool = False
    confidential: bool = False
    product: str | None = None
    market: str | None = None
    channel: str | None = None
    language: str | None = None
    today: date | None = None
    use_llm: bool = True
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not 1 <= self.exposure <= 3:
            raise ValueError("exposure must be between 1 and 3")


@dataclass
class AuditResult:
    claims: list[dict[str, Any]] = field(default_factory=list)
    claim_links: list[dict[str, Any]] = field(default_factory=list)
    findings: list[dict[str, Any]] = field(default_factory=list)
    status: str = "review_required"
    risk: dict[str, Any] = field(default_factory=dict)
    service_metadata: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    ruleset_version: str = RULESET_VERSION

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _plain(value: Any) -> Any:
    if hasattr(value, "to_dict"):
        return _plain(value.to_dict())
    if hasattr(value, "model_dump"):
        return _plain(value.model_dump(mode="json"))
    if is_dataclass(value) and not isinstance(value, type):
        return _plain(asdict(value))
    if isinstance(value, Mapping):
        return {str(key): _plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, Mapping):
        return [text for item in value.values() for text in _strings(item)]
    if isinstance(value, (tuple, list)):
        return [text for item in value for text in _strings(item)]
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return [str(value)]
    return []


def _mask(text: str) -> str:
    """Length-preserving PII redaction keeps provider span offsets meaningful."""

    text = _EMAIL.sub(lambda match: "x" * len(match.group()), text)
    return _PHONE.sub(lambda match: "x" * len(match.group()), text)


def _mask_value(value: Any) -> Any:
    if isinstance(value, str):
        return _mask(value)
    if isinstance(value, Mapping):
        return {key: _mask_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_mask_value(item) for item in value]
    return value


def _span(text: str) -> dict[str, Any]:
    end = min(len(text), 512)
    return {"start": 0, "end": end, "text": text[:end]}


def _review_finding(text: str, reason: str, *, category: str = "tone", method: str = "rule") -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "span": _span(text),
        "category": category,
        "verdict": "needs_human",
        "severity": "review_required",
        "confidence": 0.0,
        "method": method,
        "evidence": None,
        "reason": reason,
        "suggestion": None,
        "status": "open",
        "dismiss_reason": None,
    }


def _approved_rows(records: Sequence[Any], organisation_id: str) -> list[dict[str, Any]]:
    return [
        row
        for item in records
        if isinstance((row := _plain(item)), dict)
        and row.get("organisation_id") == organisation_id
        and str(row.get("status", "")) in {"approved", "expired", "superseded"}
    ]


def _applicable(row: Mapping[str, Any], options: AuditOptions) -> bool:
    raw_value, raw_metadata = row.get("value"), row.get("metadata")
    value: Mapping[str, Any] = raw_value if isinstance(raw_value, Mapping) else {}
    metadata: Mapping[str, Any] = raw_metadata if isinstance(raw_metadata, Mapping) else {}
    raw_scope = metadata.get("scope")
    scope: Mapping[str, Any] = raw_scope if isinstance(raw_scope, Mapping) else {}
    for name in ("product", "market", "channel", "language"):
        actual = getattr(options, name)
        expected = value.get(name) or value.get(f"{name}_scope") or metadata.get(name) or metadata.get(f"{name}_scope") or scope.get(name)
        if not actual or not expected:
            continue
        acceptable = expected if isinstance(expected, (list, tuple)) else str(expected).split(",")
        if actual.casefold() not in {str(item).strip().casefold() for item in acceptable}:
            return False
    return True


def _evidence_record(evidence: Mapping[str, Any], records: Sequence[Mapping[str, Any]]) -> Mapping[str, Any] | None:
    source_id = evidence.get("source_id") or evidence.get("id")
    record_id = evidence.get("record_id")
    version = str(evidence.get("version", ""))
    for record in records:
        record_identifiers = {record.get("id"), record.get("source_id")}
        record_versions = {str(record.get("version"))}
        if record.get("source_version") is not None:
            record_versions.add(str(record.get("source_version")))
        if (source_id in record_identifiers or record_id in record_identifiers) and version in record_versions:
            return record
    return None


def _quote_is_real(quote: str, record: Mapping[str, Any]) -> bool:
    normalized = " ".join(quote.split()).casefold()
    values = record.get("value")
    candidates = [*_strings(values), json.dumps(values, sort_keys=True, ensure_ascii=False)]
    # A rule may quote a configured name and value together (for example
    # "battery_life: up to 10 hours"). Both components must come from the record.
    candidates.append(" ".join(_strings(values)))
    return bool(normalized) and any(normalized in " ".join(candidate.split()).casefold() for candidate in candidates)


def _fallback_deterministic(
    *,
    organisation_id: str,
    content_version_id: str,
    document: Mapping[str, Any],
    approved_records: Sequence[Mapping[str, Any]],
    options: AuditOptions,
) -> dict[str, Any]:
    """Small safety-net while the optional verification package is unavailable.

    It is intentionally conservative: a hard verdict is emitted only when the
    approved vault row supplies a source/version and an actual value quote.
    """

    text = str(document.get("text", ""))
    claims: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []
    findings: list[dict[str, Any]] = []
    now = options.today or date.today()

    def add_claim(
        start: int,
        end: int,
        kind: str,
        value: Any = None,
        unit: str | None = None,
        qualifier: str | None = None,
        comparator: str | None = None,
    ) -> dict[str, Any]:
        claim = {
            "id": str(uuid4()),
            "text": text[start:end],
            "start": start,
            "end": end,
            "kind": kind,
            "normalized_value": value,
            "unit": unit,
            "qualifier": qualifier,
            "comparator": comparator,
            "regulated": options.regulated,
        }
        claims.append(claim)
        return claim

    for match in _QUANTITY.finditer(text):
        qualifier = (match.group("qualifier") or "").strip() or None
        number = float(match.group("number"))
        claim = add_claim(match.start(), match.end(), "quantity", number, match.group("unit").lower(), qualifier)
        # A sentence/context match is enough for deterministic local data; the
        # optional verifier provides more nuanced scope checks when available.
        context = text[max(0, match.start() - 120) : min(len(text), match.end() + 120)].casefold()
        candidates: list[Mapping[str, Any]] = []
        for record in approved_records:
            raw_record_value = record.get("value")
            value: Mapping[str, Any] = raw_record_value if isinstance(raw_record_value, Mapping) else {}
            key = str(value.get("key") or value.get("fact_key") or value.get("name") or value.get("term") or "").replace("_", " ").casefold()
            tokens = [token for token in re.findall(r"[a-z0-9]+", key) if len(token) > 2]
            if tokens and sum(token in context for token in tokens) >= max(1, len(tokens) - 1):
                candidates.append(record)
        if candidates:
            record = candidates[0]
            raw_record_value = record.get("value")
            raw_value: Mapping[str, Any] = raw_record_value if isinstance(raw_record_value, Mapping) else {}
            approved_text = " ".join(_strings(raw_value))
            approved_match = _QUANTITY.search(approved_text)
            preferred_quote = raw_value.get("quote") or raw_value.get("evidence_quote") or raw_value.get("approved_text") or raw_value.get("text") or raw_value.get("value")
            evidence_quote = str(preferred_quote).strip() if isinstance(preferred_quote, str) and preferred_quote.strip() else next((item for item in _strings(raw_value) if item.strip()), approved_text)
            evidence = {
                "source_type": "brand_record",
                "source_id": str(record.get("source_id") or record["id"]),
                "version": str(record.get("source_version") or record["version"]),
                "quote": evidence_quote or json.dumps(raw_value, sort_keys=True),
                "record_id": str(record["id"]),
            }
            valid_status = str(record.get("status"))
            approved_number = float(approved_match.group("number")) if approved_match else None
            approved_unit = approved_match.group("unit") if approved_match is not None else None
            comparable = approved_number is not None and approved_unit is not None and match.group("unit").casefold().startswith(approved_unit.casefold()[:2])
            if valid_status in {"expired", "superseded"}:
                link_status = "outdated"
                verdict, category, severity = "outdated", "offer_date", "high"
                reason = "The submitted offer or fact references an approved registry value whose validity has ended."
            elif comparable and number != approved_number:
                link_status = "contradicted"
                verdict, category, severity = "contradicted", "factual", "high"
                reason = f"The submitted claim says {match.group(0).strip()}, while the approved record says {approved_text}."
            elif comparable:
                link_status = "supported"
                verdict, category, severity = "supported", "factual", "low"
                reason = "The submitted numeric claim matches the approved registry value."
            else:
                link_status = "unsupported"
                verdict, category, severity = "unsupported", "promotional", "medium"
                reason = "An applicable record was found, but the values or units could not be compared deterministically."
            links.append({"claim_id": claim["id"], "fact_id": str(record["id"]), "fact_version": str(record["version"]), "link_status": link_status, "evidence_quote": evidence_quote or None})
            suggestion = None
            if verdict == "contradicted" and approved_match:
                suggestion = {"text": approved_match.group(0).strip(), "intent_note": "Uses the approved registry value while preserving the claim's original intent."}
            findings.append({
                "span": {"start": match.start(), "end": match.end(), "text": match.group(0)},
                "category": category,
                "verdict": verdict,
                "severity": severity,
                "confidence": 0.98 if verdict in {"contradicted", "outdated"} else 0.9,
                "method": "rule",
                "evidence": evidence if verdict in {"contradicted", "outdated"} else None,
                "reason": reason,
                "suggestion": suggestion,
            })
        else:
            links.append({"claim_id": claim["id"], "fact_id": None, "fact_version": None, "link_status": "unmatched", "evidence_quote": None})
            findings.append({
                "span": {"start": match.start(), "end": match.end(), "text": match.group(0)},
                "category": "promotional",
                "verdict": "unsupported",
                "severity": "medium",
                "confidence": 0.55,
                "method": "rule",
                "evidence": None,
                "reason": "No sufficiently applicable approved fact was found for this numeric claim; evidence was not found.",
                "suggestion": None,
            })

    for match in _DATE.finditer(text):
        claim = add_claim(match.start(), match.end(), "date", match.group(0))
        links.append({"claim_id": claim["id"], "fact_id": None, "fact_version": None, "link_status": "unmatched", "evidence_quote": None})

    for match in _COMPARATIVE.finditer(text):
        claim = add_claim(match.start(), match.end(), "comparative", match.group(0).casefold(), comparator=match.group(0).casefold())
        links.append({"claim_id": claim["id"], "fact_id": None, "fact_version": None, "link_status": "unmatched", "evidence_quote": None})
        findings.append({
            "span": {"start": match.start(), "end": match.end(), "text": match.group(0)},
            "category": "promotional",
            "verdict": "unsupported",
            "severity": "medium",
            "confidence": 0.9,
            "method": "rule",
            "evidence": None,
            "reason": "This comparative or guarantee-style claim needs approved substantiation; evidence was not found.",
            "suggestion": None,
        })

    return {"claims": claims, "claim_links": links, "findings": findings, "ruleset_version": "phase2-fallback-v1"}


class AuditEngine:
    """Orchestrate the Phase 2 audit without trusting a client tenant or model result."""

    def __init__(self, *, llm_service: Any | None = None) -> None:
        self._llm_service = llm_service

    def _deterministic(
        self,
        *,
        organisation_id: str,
        content_version_id: str,
        document: Mapping[str, Any],
        approved_records: Sequence[Mapping[str, Any]],
        options: AuditOptions,
    ) -> tuple[dict[str, Any], str | None]:
        try:
            package = importlib.import_module("..verification", package=__package__)
            runner = getattr(package, "run_verification", None) or getattr(package, "coordinate_verification")
            kwargs: dict[str, Any] = {
                "organisation_id": organisation_id,
                "content_version_id": content_version_id,
                "document": document,
                "approved_records": approved_records,
                "records": approved_records,
                "text": document["text"],
                "options": options,
            }
            signature = inspect.signature(runner)
            accepted = {key: value for key, value in kwargs.items() if key in signature.parameters}
            result = _plain(runner(**accepted))
            if not isinstance(result, dict):
                raise ValueError("invalid deterministic result")
            return result, None
        except Exception as error:
            # The verifier package is optional at the API boundary. Keep the local
            # deterministic path useful when its provider-specific modules have not
            # been installed or are still being assembled by the workspace.
            return _fallback_deterministic(
                organisation_id=organisation_id,
                content_version_id=content_version_id,
                document=document,
                approved_records=approved_records,
                options=options,
            ), None

    def _llm(
        self,
        *,
        text: str,
        organisation_id: str,
        content_version_id: str,
        records: Sequence[Mapping[str, Any]],
        options: AuditOptions,
        instruction_like: bool,
    ) -> dict[str, Any]:
        # Do not even construct a provider for confidential content: provider
        # construction may perform discovery calls when credentials are present.
        if options.confidential:
            return {
                "status": "needs_human",
                "reason": "Confidential content bypassed all external LLM/provider calls; contextual checks need human review.",
                "provider_status": {"availability": "confidential_blocked", "configured": False, "live": False},
                "findings": [],
                "verifier_passed": False,
            }
        if not options.use_llm:
            return {
                "status": "needs_human",
                "reason": "External model checks are disabled; contextual checks need human review.",
                "provider_status": {"availability": "offline", "configured": False, "live": False},
                "findings": [],
                "verifier_passed": False,
            }
        try:
            if self._llm_service is None:
                from ..llm import LLMService

                self._llm_service = LLMService()
            safe_records = []
            for row in records:
                if str(row.get("status")) != "approved":
                    continue
                value = _mask_value(row.get("value", {}))
                safe_records.append(
                    {
                        "id": row["id"],
                        "version": str(row["version"]),
                        "organisation_id": organisation_id,
                        "value": value,
                        "text": " ".join(_strings(value)),
                        "record_type": row.get("resource"),
                        "record_key": (value.get("key") or value.get("term") or value.get("name")) if isinstance(value, Mapping) else None,
                        "status": "approved",
                    }
                )
            return _plain(
                self._llm_service.analyze(
                    _mask(text),
                    approved_records=safe_records,
                    organisation_id=organisation_id,
                    content_version_id=content_version_id,
                    confidential=False,
                    instruction_like_detected=instruction_like,
                )
            )
        except Exception as error:
            return {
                "status": "needs_human",
                "reason": f"Optional model checks failed ({type(error).__name__}); deterministic results remain available offline.",
                "provider_status": {"availability": "unavailable", "configured": False, "live": False},
                "findings": [],
                "verifier_passed": False,
            }

    def _validate_finding(
        self,
        candidate: Mapping[str, Any],
        *,
        text: str,
        records: Sequence[Mapping[str, Any]],
        from_llm: bool,
        llm_verified: bool,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        finding = dict(candidate)
        finding["id"] = str(uuid4())
        finding["category"] = _CATEGORY_ALIASES.get(str(finding.get("category")), finding.get("category", "tone"))
        finding["method"] = "llm" if from_llm else finding.get("method", "rule")
        span = finding.get("span", {})
        if not isinstance(span, Mapping):
            span = {}
        start, end = span.get("start"), span.get("end")
        if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end <= start or end > len(text):
            return _review_finding(text, "A candidate had an invalid content span and requires human review."), {"verified": False, "reason": "invalid span"}
        actual = text[start:end]
        # Providers see a length-preserving masked copy. Reattach the original
        # exact span only after checking it against that masked input.
        if span.get("text") not in {actual, _mask(actual)}:
            return _review_finding(text, "A candidate excerpt did not match this content version and requires human review."), {"verified": False, "reason": "span text mismatch"}
        finding["span"] = {"start": start, "end": end, "text": actual}

        evidence = finding.get("evidence")
        if not evidence and isinstance(finding.get("evidence_refs"), list) and finding["evidence_refs"]:
            ref = finding["evidence_refs"][0]
            evidence = {"source_type": ref.get("kind", "brand_record"), "source_id": ref.get("id"), "version": str(ref.get("version", "")), "quote": ref.get("quote") or ""}
        verified = True
        explanation = "local span/schema/evidence validation passed"
        record = _evidence_record(evidence, records) if isinstance(evidence, Mapping) else None
        if isinstance(evidence, Mapping):
            if record is None or not _quote_is_real(str(evidence.get("quote", "")), record):
                verified = False
                explanation = "evidence ID/version/quote could not be verified in the approved organisation records"
                evidence = None
        hard_verdict = str(finding.get("verdict")) in {"contradicted", "outdated"}
        high_severity = str(finding.get("severity")) in {"critical", "high"}
        if hard_verdict and evidence is None:
            verified = False
            explanation = "hard verdict requires verified approved evidence"
        if high_severity and from_llm and not llm_verified:
            verified = False
            explanation = "high-severity model candidate did not pass its separate verifier"
        finding["evidence"] = evidence
        if not verified:
            finding.update(
                verdict="needs_human",
                severity="review_required",
                confidence=0.0,
                reason=f"{explanation}; human review is required.",
                evidence=None,
                suggestion=None,
            )
        suggestion = finding.get("suggestion")
        if isinstance(suggestion, Mapping):
            old_numbers = set(re.findall(r"\d+(?:\.\d+)?", actual))
            new_numbers = set(re.findall(r"\d+(?:\.\d+)?", str(suggestion.get("text", ""))))
            approved_numbers = set(re.findall(r"\d+(?:\.\d+)?", " ".join(_strings(record.get("value"))))) if record else set()
            if not new_numbers.issubset(old_numbers | approved_numbers):
                finding["suggestion"] = None
        try:
            validated = FindingInput.model_validate(finding).model_dump(mode="json")
            finding = {**finding, **validated}
        except Exception:
            finding = _review_finding(text, "A candidate could not be schema-validated; human review is required.")
            verified, explanation = False, "schema validation failed"
        finding["status"] = "open"
        finding["dismiss_reason"] = None
        return finding, {"finding_id": finding["id"], "verified": verified, "high_severity": high_severity, "method": "local_evidence_verifier", "reason": explanation}

    def audit(
        self,
        *,
        organisation_id: str,
        content_version_id: str,
        document: Mapping[str, Any],
        approved_records: Sequence[Any],
        options: AuditOptions | None = None,
    ) -> AuditResult:
        options = options or AuditOptions()
        text = str(document.get("text", ""))
        options = AuditOptions(**{**asdict(options), "confidential": bool(options.confidential or document.get("confidential"))})
        result = AuditResult()
        result.service_metadata["ingestion"] = {
            "status": document.get("extraction_status", "failed"),
            "message": document.get("extraction_message"),
            "source_type": document.get("source_type"),
        }
        if not text.strip() or document.get("extraction_status") in {"failed", "unsupported"}:
            result.status = "failed"
            result.error = str(document.get("extraction_message") or "No complete text extraction is available.")
            result.service_metadata["deterministic"] = {"status": "not_run", "reason": "extraction failed"}
            result.service_metadata["llm"] = {"status": "not_run", "reason": "extraction failed"}
            result.risk = calculate_risk([], exposure=options.exposure, regulated=options.regulated)
            return result

        records = [row for row in _approved_rows(approved_records, organisation_id) if _applicable(row, options)]
        deterministic, error = self._deterministic(
            organisation_id=organisation_id,
            content_version_id=content_version_id,
            document=document,
            approved_records=records,
            options=options,
        )
        result.claims = [_plain(claim) for claim in deterministic.get("claims", [])]
        result.claim_links = [_plain(link) for link in deterministic.get("claim_links", deterministic.get("links", []))]
        result.service_metadata["deterministic"] = {
            "status": "failed" if error else "completed",
            "ruleset_version": RULESET_VERSION,
            "approved_record_versions": [{"id": row["id"], "version": str(row["version"])} for row in records],
            "message": error,
        }
        if error:
            result.error = error
        candidates: list[tuple[dict[str, Any], bool]] = [(dict(_plain(item)), False) for item in deterministic.get("findings", [])]
        if error:
            candidates.append((_review_finding(text, error), False))

        instruction_match = _INSTRUCTIONS.search(text)
        if instruction_match and not any(str(item.get("category")) == "security" for item, _ in candidates):
            security = _review_finding(text, "Instruction-like text was treated as submitted data, not executed; review this content.", category="security")
            security["span"] = {"start": instruction_match.start(), "end": instruction_match.end(), "text": instruction_match.group()}
            security["confidence"] = 1.0
            security["severity"] = "medium"
            candidates.append((security, False))

        if document.get("extraction_status") == "partial":
            llm = {"status": "needs_human", "reason": "Extraction is partial; contextual review was not run on incomplete content.", "provider_status": {"availability": "unavailable", "live": False}, "findings": [], "verifier_passed": False}
        else:
            llm = self._llm(text=text, organisation_id=organisation_id, content_version_id=content_version_id, records=records, options=options, instruction_like=bool(instruction_match))
        result.service_metadata["llm"] = {key: value for key, value in llm.items() if key not in {"findings", "suggestions"}}
        for candidate in llm.get("findings", []):
            candidates.append((dict(_plain(candidate)), True))
        # Confidential content is deliberately excluded from provider calls.  The
        # service metadata and review-required audit status carry that limitation;
        # do not manufacture a synthetic span finding that could block approval after
        # every deterministic issue has been resolved.  Non-confidential offline or
        # failed model checks still receive an explicit human-review finding.
        if llm.get("status") != "completed" and not options.confidential:
            candidates.append((_review_finding(text, str(llm.get("reason") or "Offline model-dependent checks need human review."), method="llm"), True))

        verification = []
        unique: dict[tuple[Any, ...], dict[str, Any]] = {}
        for candidate, from_llm in candidates:
            finding, check = self._validate_finding(candidate, text=text, records=records, from_llm=from_llm, llm_verified=bool(llm.get("verifier_passed")))
            verification.append(check)
            evidence = finding.get("evidence") or {}
            span = finding["span"]
            key = (
                span["start"], span["end"], finding["category"], finding["verdict"],
                evidence.get("source_id"), evidence.get("version"),
                finding.get("reason") if not evidence else None,
            )
            # Deterministic checks precede model candidates, so a duplicate never
            # replaces a locally grounded result with model-only output.
            unique.setdefault(key, finding)
        result.findings = list(unique.values())
        for finding in result.findings:
            finding["risk_score"] = finding_risk(finding, exposure=options.exposure, regulated=options.regulated)
        result.risk = calculate_risk(result.findings, exposure=options.exposure, regulated=options.regulated)
        result.service_metadata["verifier"] = {"status": "completed", "checks": verification}
        result.service_metadata["privacy"] = {
            "confidential": options.confidential,
            "pii_masked_before_external_call": True,
            "submitted_content_is_data": True,
        }
        result.status = "review_required" if (
            error
            or llm.get("status") != "completed"
            or document.get("extraction_status") != "complete"
            or any(finding["verdict"] in {"needs_human", "unsupported"} for finding in result.findings)
        ) else "completed"
        return result
