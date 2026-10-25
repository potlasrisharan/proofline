"""Local record, tenant, span, and evidence checks for untrusted candidates."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Iterable, Mapping, Sequence

from pydantic import BaseModel

from .pii import mask_pii
from .types import ApprovedFact, CandidateFinding, EvidenceRef


def normalise_records(values: Iterable[Any]) -> list[ApprovedFact]:
    """Accept the existing VaultRecord or its JSON shape without guessing approval."""

    records: list[ApprovedFact] = []
    for value in values:
        if isinstance(value, ApprovedFact):
            records.append(value)
            continue
        if isinstance(value, BaseModel):
            value = value.model_dump(mode="json")
        if not isinstance(value, Mapping):
            raise ValueError("approved evidence must be a registry record")
        row = dict(value)
        payload = row.get("value")
        metadata = row.get("metadata") or {}
        if not isinstance(metadata, dict):
            raise ValueError("approved evidence metadata was malformed")
        if isinstance(payload, dict):
            row.setdefault("record_key", payload.get("key") or payload.get("fact_key") or metadata.get("key"))
        row.setdefault("record_type", row.get("resource"))
        records.append(ApprovedFact.model_validate(row))
    return records


def record_text(record: ApprovedFact) -> str:
    """An exact, locally derived approved excerpt, never a model-authored quote."""

    if record.text:
        return record.text
    if isinstance(record.value, str):
        return record.value
    return json.dumps(record.value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def record_scope(record: ApprovedFact) -> dict[str, str]:
    scope: dict[str, str] = {}
    value = record.value if isinstance(record.value, dict) else {}
    for key in ("product", "product_id", "market", "region", "channel", "language"):
        candidate = record.metadata.get(key, value.get(key))
        if isinstance(candidate, str) and candidate:
            scope[key] = candidate
    return scope


def eligible_records(
    records: Sequence[ApprovedFact],
    *,
    organisation_id: str | None,
    scope: Mapping[str, str] | None = None,
    at: datetime | None = None,
) -> list[ApprovedFact]:
    """Keep only current, approved, tenant/scope-compatible records."""

    eligible: list[ApprovedFact] = []
    for record in records:
        if not record.is_current(at):
            continue
        if organisation_id is None and record.organisation_id is not None:
            # Never broaden a model context across tenant-scoped records when the
            # authenticated API layer failed to provide the workspace boundary.
            continue
        if organisation_id is not None and record.organisation_id != organisation_id:
            continue
        constraints = record_scope(record)
        if scope is not None and any(scope.get(key) != value for key, value in constraints.items()):
            # A caller that supplies scope asks for exact compatibility. When no scope
            # is supplied the API is expected to have pre-scoped the record set.
            continue
        eligible.append(record)
    return eligible


def find_evidence_record(ref: EvidenceRef, records: Sequence[ApprovedFact]) -> ApprovedFact | None:
    for record in records:
        if ref.kind == "source":
            if (record.source_id, record.source_version) == (ref.id, ref.version):
                return record
        elif (record.id, record.version) == (ref.id, ref.version):
            expected = "asset" if record.record_type == "assets" else None
            if ref.kind == "asset" and expected != "asset":
                continue
            if ref.kind == "rule" and record.record_type not in {"terms", "guidelines", "disclaimers"}:
                continue
            return record
    return None


def validate_findings(
    findings: Sequence[CandidateFinding],
    *,
    content: str,
    records: Sequence[ApprovedFact],
) -> list[CandidateFinding]:
    """Reject invented spans, sources, versions, and quotes as one failed result."""

    checked: list[CandidateFinding] = []
    for finding in findings:
        span = finding.span
        if span.end > len(content) or content[span.start:span.end] != span.text:
            raise ValueError("candidate excerpt did not match the audited content version")
        if finding.verdict in {"supported", "contradicted", "outdated"} and not finding.evidence_refs:
            raise ValueError("candidate has no verified evidence for a hard factual verdict")
        canonical_refs: list[EvidenceRef] = []
        for ref in finding.evidence_refs:
            record = find_evidence_record(ref, records)
            if record is None:
                raise ValueError("candidate cited missing, stale, or out-of-workspace evidence")
            excerpt = record_text(record)
            if ref.quote is not None and mask_pii(ref.quote) not in mask_pii(excerpt):
                raise ValueError("candidate invented an evidence quote")
            quote = excerpt
            # Always retain a real local quote and scope, rather than model-authored
            # applicability that might imply a different market/product.
            canonical_refs.append(
                ref.model_copy(
                    update={
                        "quote": quote,
                        "applicability": json.dumps(record_scope(record), sort_keys=True) or None,
                    }
                )
            )
        checked.append(finding.model_copy(update={"evidence_refs": canonical_refs, "suggestion": None}))
    return checked
