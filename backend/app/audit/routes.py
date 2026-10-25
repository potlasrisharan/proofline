"""Authenticated Phase 2 content intake, recheck, and human finding actions."""

from __future__ import annotations

import base64
import binascii
from copy import deepcopy
from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from ..auth import get_current_principal
from ..content_store import ContentStore
from ..ingestion import ingest_document
from ..models import (
    AuditRun,
    AuditStatus,
    Claim,
    ClaimFactLink,
    ContentAuditResponse,
    ContentCreateRequest,
    ContentType,
    ContentVersion,
    ContentVersionCreateRequest,
    Finding,
    FindingAction,
    FindingActionRequest,
    Principal,
    VaultResource,
)
from ..workflow import WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError
from .engine import AuditEngine, AuditOptions, AuditResult


router = APIRouter(tags=["content-audit"])
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_TEXT_CHARACTERS = 200_000


def _content_store(request: Request) -> ContentStore:
    return request.app.state.content_store


def _engine(request: Request) -> AuditEngine:
    return request.app.state.audit_engine


def _error(exc: Exception) -> HTTPException:
    if isinstance(exc, WorkflowNotFoundError):
        return HTTPException(status_code=404, detail={"code": "not_found", "message": "content or finding not found"})
    if isinstance(exc, WorkflowPermissionError):
        return HTTPException(status_code=403, detail={"code": "forbidden", "message": str(exc)})
    return HTTPException(status_code=409, detail={"code": "invalid_state", "message": str(exc)})


def _input_error(message: str, field: str = "text", *, code: int = 422) -> HTTPException:
    return HTTPException(status_code=code, detail={"code": "invalid_content", "field": field, "message": message})


def _prepare(
    payload: ContentCreateRequest | ContentVersionCreateRequest,
    *,
    previous: ContentVersion | None = None,
    previous_raw: str | bytes | None = None,
) -> tuple[dict[str, Any], dict[str, Any], str | None, str | bytes]:
    metadata = {**(previous.metadata if previous else {}), **deepcopy(payload.metadata)}
    inherited_confidential = bool(previous and previous.metadata.get("confidential"))
    tags = [*metadata.get("tags", []), *payload.tags] if isinstance(metadata.get("tags", []), list) else list(payload.tags)
    confidential = bool(
        inherited_confidential
        or payload.confidential
        or metadata.get("confidential")
        or any(str(tag).casefold() == "confidential" for tag in tags)
    )
    exposure = payload.exposure if payload.exposure is not None else metadata.get("exposure", 1)
    if isinstance(exposure, bool) or not isinstance(exposure, int) or not 1 <= exposure <= 3:
        raise _input_error("exposure must be an integer between 1 and 3", "exposure")
    regulated = bool(payload.regulated if payload.regulated is not None else metadata.get("regulated", False))
    regulatory_context = payload.regulatory_context or metadata.get("regulatory_context")
    if regulatory_context and str(regulatory_context).casefold() not in {"none", "ordinary", "unregulated", "false"}:
        regulated = True

    text = payload.effective_text
    encoded = payload.file_base64 or payload.base64_data
    previous_bytes: bytes | None = None
    filename, mime_type = payload.filename, payload.mime_type
    if payload.file is not None:
        encoded = encoded or payload.file.data_base64 or payload.file.base64
        filename = filename or payload.file.filename
        mime_type = mime_type or payload.file.mime_type
    if text is not None and encoded is not None:
        raise _input_error("supply text or a base64 file, not both", "file_base64")
    if text is None and encoded is None and previous is not None:
        if previous_raw is not None:
            if isinstance(previous_raw, str):
                text = previous_raw
            else:
                original_file = previous.metadata.get("original_file")
                filename = original_file.get("filename") if isinstance(original_file, dict) else filename
                mime_type = original_file.get("mime_type") if isinstance(original_file, dict) else mime_type
                previous_bytes = previous_raw
                encoded = "__previous_raw_bytes__"
        else:
            text = previous.source_text
    if text is None and encoded is None:
        raise _input_error("supply non-empty text or a supported base64-encoded file")
    original_file = None
    raw_input: str | bytes
    if encoded is not None:
        if previous_bytes is not None:
            data = previous_bytes
        elif not isinstance(encoded, str) or len(encoded) > 4 * ((MAX_FILE_BYTES + 2) // 3) + 256:
            raise _input_error("file exceeds the 10 MiB local upload limit", "file_base64", code=413)
        else:
            # A data URL is accepted for practical JSON clients, but its declared MIME
            # is still checked against bytes by the ingestion package.
            if encoded.startswith("data:") and ";base64," in encoded:
                header, encoded = encoded.split(";base64,", 1)
                mime_type = mime_type or header[5:]
            try:
                data = base64.b64decode(encoded, validate=True)
            except (ValueError, binascii.Error) as exc:
                raise _input_error("file_base64 must contain valid base64", "file_base64") from exc
        if len(data) > MAX_FILE_BYTES:
            raise _input_error("file exceeds the 10 MiB local upload limit", "file_base64", code=413)
        document = ingest_document(data, filename=filename, mime_type=mime_type, confidential=confidential)
        original_file = {
            "filename": document.get("original_filename"),
            "mime_type": document.get("mime_type"),
            "size_bytes": len(data),
        }
        source_text = None
        raw_input = data
    else:
        if text is None or not text.strip():
            raise _input_error("text must not be empty")
        if len(text) > MAX_TEXT_CHARACTERS:
            raise _input_error("text exceeds the 200,000-character local limit", code=413)
        document = ingest_document(text, confidential=confidential)
        source_text = text
        raw_input = text
    image_metadata = metadata.get("image_metadata")
    if isinstance(image_metadata, list):
        document["image_metadata"] = [*document.get("image_metadata", []), *deepcopy(image_metadata)]
    if "alt_text" in metadata and document.get("source_type") == "image":
        for image in document.get("image_metadata", []):
            image["alt_text"] = metadata["alt_text"]
    metadata.update(
        confidential=confidential,
        exposure=exposure,
        regulated=regulated,
        regulatory_context=regulatory_context,
        tags=tags,
        original_file=original_file,
        normalized_document=deepcopy(document),
    )
    for name in ("product", "market", "channel", "language"):
        if getattr(payload, name) is not None:
            metadata[name] = getattr(payload, name)
    return dict(document), metadata, source_text, raw_input


def _response(store: ContentStore, principal: Principal, content_version_id: str) -> ContentAuditResponse:
    bundle = store.get_version_bundle(principal, content_version_id)
    content = bundle["content"]
    version = bundle["content_version"]
    audit = bundle["audit"]
    versions = store.list_versions(principal, content.id)
    audits = [store.get_audit(principal, item.latest_audit_id)[0] for item in versions if item.latest_audit_id]
    return ContentAuditResponse(
        content_id=content.id,
        content_version_id=version.id,
        audit_id=audit.id if audit else None,
        findings=bundle["findings"],
        claims=bundle["claims"],
        claim_links=bundle["claim_links"],
        risk=audit.risk if audit else {},
        status=audit.status.value if audit else "pending",
        workflow_status=version.workflow_status,
        persistence="in_memory_demo",
        content=content,
        content_version=version,
        audit=audit,
        service_metadata=audit.service_metadata if audit else {},
        actions=bundle["actions"],
        versions=versions,
        audits=audits,
        error=audit.error if audit else None,
    )


def _persist_audit(
    request: Request,
    principal: Principal,
    version: ContentVersion,
    document: dict[str, Any],
    metadata: dict[str, Any],
    *,
    previous_audit_id: str | None = None,
) -> ContentAuditResponse:
    records = [
        row
        for resource in VaultResource
        for row in request.app.state.vault_store.list(principal.organisation_id, resource)
    ]
    options = AuditOptions(
        exposure=metadata["exposure"],
        regulated=metadata["regulated"],
        confidential=metadata["confidential"],
        product=metadata.get("product"),
        market=metadata.get("market"),
        channel=metadata.get("channel"),
        language=metadata.get("language"),
        metadata=metadata,
    )
    result = _engine(request).audit(
        organisation_id=principal.organisation_id,
        content_version_id=version.id,
        document=document,
        approved_records=records,
        options=options,
    )
    audit_id = str(uuid4())
    now = datetime.now(timezone.utc)
    scope = {
        "organisation_id": principal.organisation_id,
        "content_id": version.content_id,
        "content_version_id": version.id,
        "audit_run_id": audit_id,
    }
    claims: list[Claim] = []
    claim_ids: dict[str, str] = {}
    validation_errors: list[str] = []
    for row in result.claims:
        claim_id = str(uuid4())
        try:
            claim = Claim.model_validate({**row, **scope, "id": claim_id})
            if document["text"][claim.start : claim.end] != claim.text or claim.end <= claim.start:
                raise ValueError("claim span mismatch")
            claim_ids[str(row.get("id"))] = claim_id
            claims.append(claim)
        except (ValueError, TypeError):
            validation_errors.append("a claim could not be validated against this content version")
    links: list[ClaimFactLink] = []
    record_keys = {(row.id, str(row.version)) for row in records if row.status.value in {"approved", "expired", "superseded"}}
    for row in result.claim_links:
        claim_id = claim_ids.get(str(row.get("claim_id")))
        if claim_id is None:
            validation_errors.append("a claim link referred to an unknown claim")
            continue
        fact_id = row.get("fact_id")
        fact_version = str(row["fact_version"]) if row.get("fact_version") is not None else None
        if fact_id is not None and (fact_id, fact_version) not in record_keys:
            validation_errors.append("a claim link referred to an unverified fact/version")
            row = {**row, "fact_id": None, "fact_version": None, "link_status": "unmatched", "evidence_quote": None}
            fact_version = None
        try:
            links.append(ClaimFactLink.model_validate({**row, **scope, "id": str(uuid4()), "claim_id": claim_id, "fact_version": fact_version}))
        except (ValueError, TypeError):
            validation_errors.append("a claim link failed schema validation")
    findings: list[Finding] = []
    for row in result.findings:
        try:
            findings.append(Finding.model_validate({**row, **scope, "created_at": now}))
        except ValueError:
            validation_errors.append("a finding failed schema validation")
    if validation_errors:
        result.status = "review_required"
        result.error = "; ".join(sorted(set(validation_errors)))
        result.service_metadata["persistence_validation"] = {"status": "review_required", "errors": sorted(set(validation_errors))}
    llm = result.service_metadata.get("llm", {})
    provider = llm.get("provider_status") if isinstance(llm.get("provider_status"), dict) else {}
    audit = AuditRun(
        id=audit_id,
        organisation_id=principal.organisation_id,
        content_id=version.content_id,
        content_version_id=version.id,
        requested_by=principal.user_id,
        status=AuditStatus(result.status),
        ruleset_version=result.ruleset_version,
        model_provider=provider.get("provider") if provider.get("live") else None,
        model_name=provider.get("model") if provider.get("live") else None,
        previous_audit_id=previous_audit_id,
        claims=claims,
        claim_links=links,
        risk=result.risk,
        service_metadata=result.service_metadata,
        error=result.error,
        created_at=now,
        completed_at=now,
    )
    store = _content_store(request)
    store.save_engine_audit(principal=principal, audit=audit, findings=findings, claims=claims, claim_links=links, extracted_text=document["text"], metadata=metadata)
    return _response(store, principal, version.id)


@router.post("/contents", response_model=ContentAuditResponse, status_code=status.HTTP_201_CREATED)
def create_audited_content(
    payload: ContentCreateRequest,
    principal: Annotated[Principal, Depends(get_current_principal)],
    request: Request,
):
    document, metadata, source_text, raw_input = _prepare(payload)
    stored_payload = payload.model_copy(
        update={"source_text": source_text or document["text"], "text": None, "content_type": ContentType(document["source_type"]), "metadata": metadata}
    )
    store = _content_store(request)
    try:
        _, version = store.create_content(principal, stored_payload)
        store.save_raw_input(version.id, raw_input)
        response = _persist_audit(request, principal, version, document, metadata)
    except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
        raise _error(exc) from exc
    if response.status == "failed":
        return JSONResponse(status_code=422, content=response.model_dump(mode="json"))
    return response


@router.get("/contents/{content_id}", response_model=ContentAuditResponse)
def get_audited_content(
    content_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    request: Request,
):
    store = _content_store(request)
    try:
        content = store.get_content(principal, content_id)
        return _response(store, principal, content.current_version_id)
    except WorkflowNotFoundError as exc:
        raise _error(exc) from exc


@router.post("/contents/{content_id}/recheck", response_model=ContentAuditResponse, status_code=status.HTTP_201_CREATED)
def recheck_audited_content(
    content_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    request: Request,
    payload: ContentVersionCreateRequest | None = None,
):
    store = _content_store(request)
    try:
        content = store.get_content(principal, content_id)
        previous = store.get_version(principal, content.current_version_id)
        payload = payload or ContentVersionCreateRequest()
        previous_raw = store.get_raw_input(principal, previous.id)
        document, metadata, source_text, raw_input = _prepare(payload, previous=previous, previous_raw=previous_raw)
        version = store.create_revision(principal, content_id, payload.model_copy(update={"source_text": source_text or document["text"], "text": None, "metadata": metadata}))
        store.save_raw_input(version.id, raw_input)
        response = _persist_audit(request, principal, version, document, metadata, previous_audit_id=previous.latest_audit_id)
    except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
        raise _error(exc) from exc
    if response.status == "failed":
        return JSONResponse(status_code=422, content=response.model_dump(mode="json"))
    return response


@router.post("/findings/{finding_id}/action", response_model=ContentAuditResponse)
def act_on_audit_finding(
    finding_id: str,
    payload: FindingActionRequest,
    principal: Annotated[Principal, Depends(get_current_principal)],
    request: Request,
):
    if payload.action not in {FindingAction.ACCEPT, FindingAction.EDIT, FindingAction.DISMISS}:
        raise _input_error("Phase 2 finding actions are accept, edit, or dismiss", "action")
    store = _content_store(request)
    try:
        finding = store.act_on_finding(principal, finding_id, payload)
        response = _response(store, principal, finding.content_version_id)
        response.finding = finding
        response.action = next((action for action in reversed(response.actions) if action.finding_id == finding_id), None)
        return response
    except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
        raise _error(exc) from exc
