from __future__ import annotations

import base64
import binascii
import csv
import io
import json
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import get_current_principal, require_roles
from .audit import AuditEngine
from .audit.routes import router as audit_router
from .config import Settings, get_settings
from .content_store import ContentStore
from .ingestion import ingest_document
from .impact import ImpactRadarStore
from .impact_routes import router as impact_router
from .models import (
    Principal,
    Role,
    AuditChainVerification,
    AuditEventsResponse,
    AuditRequest,
    AuditResponse,
    CommentCreateRequest,
    CommentsResponse,
    ContentCreateRequest,
    ContentListResponse,
    ContentResponse,
    ContentVersionCreateRequest,
    ContentVersionsResponse,
    DashboardSummaryResponse,
    FindingActionRequest,
    FindingResponse,
    ReviewRequest,
    ReviewDecisionResponse,
    ReviewDecisionsResponse,
    VaultCreateRequest,
    VaultImportRequest,
    VaultImportFileRequest,
    VaultImportResponse,
    VaultListResponse,
    VaultRecordResponse,
    VaultResource,
)
from .store import InMemoryVaultStore, VaultNotFoundError, VaultStateError
from .workflow import (
    InMemoryWorkflowStore,
    WorkflowNotFoundError,
    WorkflowPermissionError,
    WorkflowStateError,
)


REGISTRY_WRITERS = (Role.BRAND_OWNER, Role.MANAGER)
DISCLAIMER_WRITERS = (Role.BRAND_OWNER, Role.MANAGER, Role.LEGAL_REVIEWER)


def _store(request: Request) -> InMemoryVaultStore:
    return request.app.state.vault_store


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _workflow(request: Request) -> InMemoryWorkflowStore:
    return request.app.state.workflow_store


def _record_registry_event(
    request: Request,
    principal: Principal,
    *,
    event_type: str,
    object_id: str | None,
    metadata: dict[str, object],
) -> None:
    request.app.state.workflow_store.record_event(
        principal,
        event_type=event_type,
        object_type="vault_record",
        object_id=object_id,
        metadata=metadata,
    )


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="vault record not found")


def create_app(
    *,
    store: InMemoryVaultStore | None = None,
    workflow_store: InMemoryWorkflowStore | None = None,
    content_store: ContentStore | None = None,
    audit_engine: AuditEngine | None = None,
    impact_store: ImpactRadarStore | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    app = FastAPI(
        title="Proofline local API",
        version="0.3.0-local",
        description=(
            "Local vault and content workflow. Default storage is in-memory and is not a "
            "replacement for configured Cloudflare D1 persistence."
        ),
    )
    app.state.vault_store = store or InMemoryVaultStore()
    app.state.content_store = content_store or ContentStore(vault_store=app.state.vault_store)
    app.state.workflow_store = workflow_store or app.state.content_store
    app.state.audit_engine = audit_engine or AuditEngine()
    app.state.impact_store = impact_store or ImpactRadarStore()
    app.state.settings = settings or get_settings()
    app.dependency_overrides[get_settings] = lambda: app.state.settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(app.state.settings.allowed_origins),
        # Cloudflare Access authenticates browser requests with its cookie/header
        # boundary. Origins remain explicit; credentials are never allowed for `*`.
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Register before generic vault paths such as /v1/{resource}/{record_id}.
    app.include_router(impact_router)
    app.include_router(audit_router)

    @app.get("/health")
    async def health(request: Request) -> dict[str, object]:
        runtime = _settings(request)
        has_d1 = getattr(request.app.state, "d1", None) is not None
        return {
            "status": "ok",
            "service": "proofline-api",
            "environment": runtime.environment,
            "persistence": "d1_backed" if has_d1 else "in_memory_demo",
            "cloudflare_access_configured": runtime.cloudflare_access_configured,
            "jwt_verifier_configured": runtime.has_jwt_verifier,
            "d1_persistence": "connected" if has_d1 else "not_configured",
            "r2_storage": "d1_file_artifacts",
            "audit_queue": "not_configured",
            "ai_provider": "not_configured",
        }

    def workflow_error(exc: Exception) -> HTTPException:
        if isinstance(exc, WorkflowNotFoundError):
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workflow record not found")
        if isinstance(exc, WorkflowPermissionError):
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        if isinstance(exc, WorkflowStateError):
            return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @app.get("/v1/content", response_model=ContentListResponse)
    async def list_content(
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ContentListResponse:
        return ContentListResponse(
            persistence="in_memory_demo",
            items=_workflow(request).list_contents(principal),
        )

    @app.post("/v1/content", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
    async def create_content(
        payload: ContentCreateRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ContentResponse:
        try:
            content, _ = _workflow(request).create_content(principal, payload)
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
            raise workflow_error(exc) from exc
        return ContentResponse(persistence="in_memory_demo", item=content)

    @app.get("/v1/content/{content_id}", response_model=ContentResponse)
    async def get_content(
        content_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ContentResponse:
        try:
            content = _workflow(request).get_content(principal, content_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return ContentResponse(persistence="in_memory_demo", item=content)

    @app.get("/v1/content/{content_id}/versions", response_model=ContentVersionsResponse)
    async def list_content_versions(
        content_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ContentVersionsResponse:
        try:
            versions = _workflow(request).list_versions(principal, content_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return ContentVersionsResponse(persistence="in_memory_demo", items=versions)

    @app.post("/v1/content/{content_id}/versions", response_model=ContentVersionsResponse, status_code=status.HTTP_201_CREATED)
    async def create_content_version(
        content_id: str,
        payload: ContentVersionCreateRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ContentVersionsResponse:
        try:
            version = _workflow(request).create_revision(principal, content_id, payload)
            if payload.auto_recheck:
                _workflow(request).auto_recheck_revision(principal, version.id)
            versions = _workflow(request).list_versions(principal, content_id)
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
            raise workflow_error(exc) from exc
        return ContentVersionsResponse(persistence="in_memory_demo", items=versions)

    @app.post("/v1/content-versions/{content_version_id}/audit", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
    async def audit_content_version(
        content_version_id: str,
        payload: AuditRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> AuditResponse:
        try:
            if payload.findings or payload.model_provider or payload.model_name or payload.model_version:
                raise WorkflowStateError("audit findings and model metadata must be produced by the server-side verification pipeline")
            audit, findings = _workflow(request).run_audit(principal, content_version_id)
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
            raise workflow_error(exc) from exc
        return AuditResponse(persistence="in_memory_demo", audit=audit, findings=findings)

    @app.get("/v1/audits/{audit_id}", response_model=AuditResponse)
    async def get_audit(
        audit_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> AuditResponse:
        try:
            audit, findings = _workflow(request).get_audit(principal, audit_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return AuditResponse(persistence="in_memory_demo", audit=audit, findings=findings)

    @app.get("/v1/findings/{finding_id}", response_model=FindingResponse)
    async def get_finding(
        finding_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> FindingResponse:
        try:
            finding = _workflow(request).get_finding(principal, finding_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return FindingResponse(persistence="in_memory_demo", finding=finding)

    @app.post("/v1/findings/{finding_id}/action", response_model=FindingResponse)
    async def act_on_finding(
        finding_id: str,
        payload: FindingActionRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> FindingResponse:
        try:
            finding = _workflow(request).act_on_finding(principal, finding_id, payload)
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
            raise workflow_error(exc) from exc
        return FindingResponse(persistence="in_memory_demo", finding=finding)

    @app.post("/v1/content-versions/{content_version_id}/review", response_model=ReviewDecisionResponse)
    async def review_content_version(
        content_version_id: str,
        payload: ReviewRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ReviewDecisionResponse:
        try:
            version, decision = _workflow(request).review(principal, content_version_id, payload)
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
            raise workflow_error(exc) from exc
        return ReviewDecisionResponse(
            persistence="in_memory_demo",
            content_version=version,
            decision=decision,
        )

    @app.get("/v1/content-versions/{content_version_id}/review-decisions", response_model=ReviewDecisionsResponse)
    async def list_review_decisions(
        content_version_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> ReviewDecisionsResponse:
        try:
            decisions = _workflow(request).list_decisions(principal, content_version_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return ReviewDecisionsResponse(
            persistence="in_memory_demo",
            content_version_id=content_version_id,
            items=decisions,
        )

    @app.post("/v1/content-versions/{content_version_id}/comments", response_model=CommentsResponse, status_code=status.HTTP_201_CREATED)
    async def create_comment(
        content_version_id: str,
        payload: CommentCreateRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> CommentsResponse:
        try:
            _workflow(request).create_comment(principal, content_version_id, payload)
            comments = _workflow(request).list_comments(principal, content_version_id)
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowStateError) as exc:
            raise workflow_error(exc) from exc
        return CommentsResponse(persistence="in_memory_demo", items=comments)

    @app.get("/v1/content-versions/{content_version_id}/comments", response_model=CommentsResponse)
    async def list_comments(
        content_version_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> CommentsResponse:
        try:
            comments = _workflow(request).list_comments(principal, content_version_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return CommentsResponse(persistence="in_memory_demo", items=comments)

    @app.get("/v1/audit-events", response_model=AuditEventsResponse)
    async def list_audit_events(
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> AuditEventsResponse:
        return AuditEventsResponse(
            persistence="in_memory_demo",
            items=_workflow(request).list_events(principal),
        )

    @app.get("/v1/audit-events/verify-chain", response_model=AuditChainVerification)
    async def verify_audit_chain(
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> AuditChainVerification:
        return AuditChainVerification(**_workflow(request).verify_chain(principal))

    @app.get("/v1/content/{content_id}/export")
    async def export_content(
        content_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> JSONResponse:
        try:
            export = _workflow(request).export_content(principal, content_id)
        except WorkflowNotFoundError as exc:
            raise workflow_error(exc) from exc
        return JSONResponse(content=export)

    @app.get("/v1/dashboard/summary", response_model=DashboardSummaryResponse)
    async def dashboard_summary(
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
        window_days: int | None = Query(default=None, ge=1, le=3660),
    ) -> DashboardSummaryResponse:
        try:
            summary = _workflow(request).dashboard_summary(principal, window_days=window_days)
        except WorkflowStateError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
        return DashboardSummaryResponse(**summary)

    @app.get("/v1/{resource}", response_model=VaultListResponse)
    async def list_vault_records(
        resource: VaultResource,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
        q: str | None = Query(default=None, min_length=1, max_length=200),
        record_status: str | None = Query(default=None, alias="status"),
    ) -> VaultListResponse:
        items = _store(request).list(principal.organisation_id, resource)
        if q:
            needle = q.casefold()
            items = [
                item for item in items
                if needle in str(item.value).casefold()
                or needle in (item.source_id or "").casefold()
                or needle in item.id.casefold()
            ]
        if record_status:
            try:
                desired_status = record_status.casefold()
                items = [item for item in items if item.status.value == desired_status]
            except AttributeError:
                items = []
        return VaultListResponse(
            resource=resource,
            organisation_id=principal.organisation_id,
            persistence="in_memory_demo",
            items=items,
        )

    @app.post("/v1/{resource}/import", response_model=VaultImportResponse, status_code=status.HTTP_201_CREATED)
    async def import_vault_records(
        resource: VaultResource,
        payload: VaultImportRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> VaultImportResponse:
        if principal.role not in (
            DISCLAIMER_WRITERS if resource is VaultResource.DISCLAIMERS else REGISTRY_WRITERS
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"role {principal.role.value} cannot import {resource.value} records")
        imported: list = []
        for row in payload.records:
            record = _store(request).create(
                principal.organisation_id,
                resource,
                row.model_copy(update={
                    "metadata": {
                        **row.metadata,
                        "import": {
                            "filename": payload.source_filename,
                            "source_type": payload.source_type,
                            "extraction_status": payload.extraction_status,
                        },
                    },
                }),
                principal,
            )
            imported.append(record)
        _record_registry_event(
            request,
            principal,
            event_type="registry_imported",
            object_id=None,
            metadata={"resource": resource.value, "count": len(imported), "source_filename": payload.source_filename},
        )
        return VaultImportResponse(
            persistence="in_memory_demo",
            resource=resource,
            imported_count=len(imported),
            items=imported,
        )

    @app.post("/v1/{resource}/import-file", response_model=VaultImportResponse, status_code=status.HTTP_201_CREATED)
    async def import_vault_file(
        resource: VaultResource,
        payload: VaultImportFileRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> VaultImportResponse:
        if principal.role not in (
            DISCLAIMER_WRITERS if resource is VaultResource.DISCLAIMERS else REGISTRY_WRITERS
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"role {principal.role.value} cannot import {resource.value} records")
        try:
            data = base64.b64decode(payload.file_base64, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise HTTPException(status_code=422, detail={"code": "invalid_file", "message": "file_base64 must contain valid base64"}) from exc
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail={"code": "file_too_large", "message": "registry import files are limited to 10 MiB"})
        filename = payload.filename.replace("\\", "/").rsplit("/", 1)[-1].strip()
        if not filename:
            raise HTTPException(status_code=422, detail={"code": "invalid_file", "message": "filename must contain a file name"})
        mime = payload.mime_type or ""
        extension = filename.rsplit(".", 1)[-1].casefold() if "." in filename else ""
        if extension == "csv" or mime.casefold() in {"text/csv", "application/csv"}:
            try:
                rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
            except (UnicodeDecodeError, csv.Error) as exc:
                raise HTTPException(status_code=422, detail={"code": "invalid_file", "message": "CSV import must be valid UTF-8 with a header row"}) from exc
            if not rows:
                raise HTTPException(status_code=422, detail={"code": "empty_file", "message": "CSV import contains no records"})
            inputs: list[dict[str, object]] = []
            for row in rows[:1000]:
                cleaned = {str(key).strip(): value.strip() for key, value in row.items() if key and value and value.strip()}
                raw_value = cleaned.pop("value", None)
                if raw_value:
                    try:
                        parsed = json.loads(raw_value)
                        value = parsed if isinstance(parsed, dict) else {"value": parsed}
                    except json.JSONDecodeError:
                        value = {"value": raw_value}
                    value.update(cleaned)
                else:
                    value = cleaned
                inputs.append({
                    "value": value,
                    "source_id": value.pop("source_id", None),
                    "source_version": value.pop("source_version", None),
                })
            import_request = VaultImportRequest(records=inputs, source_filename=filename, source_type="csv")
        else:
            document = ingest_document(data, filename=filename, mime_type=mime or None)
            extraction_status = document["extraction_status"]
            if extraction_status in {"failed", "unsupported"} or not document["text"].strip():
                raise HTTPException(status_code=422, detail={"code": "extraction_failed", "message": document.get("extraction_message") or "no importable text was extracted"})
            rows = []
            for line in document["text"].splitlines():
                if ":" not in line:
                    continue
                key, value = (part.strip() for part in line.split(":", 1))
                if key and value:
                    rows.append({"value": {"key": key, "value": value}})
            if not rows:
                raise HTTPException(status_code=422, detail={"code": "no_records", "message": "extracted text must contain records in key: value form"})
            import_request = VaultImportRequest(
                records=rows[:1000],
                source_filename=filename,
                source_type="pdf" if document["source_type"] == "pdf" else "docx" if document["source_type"] == "docx" else "text",
                extraction_status="complete" if extraction_status == "complete" else "partial",
            )
        return await import_vault_records(resource, import_request, principal, request)

    @app.post("/v1/{resource}", response_model=VaultRecordResponse, status_code=status.HTTP_201_CREATED)
    async def create_vault_record(
        resource: VaultResource,
        payload: VaultCreateRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> VaultRecordResponse:
        if principal.role not in (
            DISCLAIMER_WRITERS if resource is VaultResource.DISCLAIMERS else REGISTRY_WRITERS
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"role {principal.role.value} cannot create {resource.value} records",
            )
        record = _store(request).create(principal.organisation_id, resource, payload, principal)
        _record_registry_event(request, principal, event_type="registry_record_created", object_id=record.id, metadata={"resource": resource.value, "version": record.version})
        return VaultRecordResponse(persistence="in_memory_demo", item=record)

    @app.get("/v1/{resource}/{record_id}", response_model=VaultRecordResponse)
    async def get_vault_record(
        resource: VaultResource,
        record_id: str,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> VaultRecordResponse:
        try:
            record = _store(request).get(principal.organisation_id, resource, record_id)
        except VaultNotFoundError as exc:
            raise _not_found() from exc
        return VaultRecordResponse(persistence="in_memory_demo", item=record)

    @app.post("/v1/{resource}/{record_id}/versions", response_model=VaultRecordResponse, status_code=status.HTTP_201_CREATED)
    async def create_vault_version(
        resource: VaultResource,
        record_id: str,
        payload: VaultCreateRequest,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> VaultRecordResponse:
        if principal.role not in (
            DISCLAIMER_WRITERS if resource is VaultResource.DISCLAIMERS else REGISTRY_WRITERS
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"role {principal.role.value} cannot version {resource.value} records",
            )
        try:
            record = _store(request).create_version(
                principal.organisation_id, resource, record_id, payload, principal
            )
        except VaultNotFoundError as exc:
            raise _not_found() from exc
        _record_registry_event(request, principal, event_type="registry_record_versioned", object_id=record.id, metadata={"resource": resource.value, "version": record.version})
        return VaultRecordResponse(persistence="in_memory_demo", item=record)

    @app.post("/v1/{resource}/{record_id}/approve", response_model=VaultRecordResponse)
    async def approve_vault_record(
        resource: VaultResource,
        record_id: str,
        principal: Annotated[Principal, Depends(require_roles(Role.BRAND_OWNER))],
        request: Request,
    ) -> VaultRecordResponse:
        try:
            record = _store(request).approve(principal.organisation_id, resource, record_id, principal)
        except VaultNotFoundError as exc:
            raise _not_found() from exc
        except VaultStateError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
        _record_registry_event(request, principal, event_type="registry_record_approved", object_id=record.id, metadata={"resource": resource.value, "version": record.version})
        return VaultRecordResponse(persistence="in_memory_demo", item=record)

    @app.post("/v1/{resource}/{record_id}/retire", response_model=VaultRecordResponse)
    async def retire_vault_record(
        resource: VaultResource,
        record_id: str,
        principal: Annotated[Principal, Depends(require_roles(Role.BRAND_OWNER))],
        request: Request,
    ) -> VaultRecordResponse:
        try:
            record = _store(request).retire(principal.organisation_id, resource, record_id, principal)
        except VaultNotFoundError as exc:
            raise _not_found() from exc
        _record_registry_event(request, principal, event_type="registry_record_retired", object_id=record.id, metadata={"resource": resource.value, "version": record.version})
        return VaultRecordResponse(persistence="in_memory_demo", item=record)

    return app


app = create_app()
