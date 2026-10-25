from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status

from .auth import get_current_principal, require_roles
from .config import Settings, get_settings
from .models import (
    Principal,
    Role,
    VaultCreateRequest,
    VaultListResponse,
    VaultRecordResponse,
    VaultResource,
)
from .store import InMemoryVaultStore, VaultNotFoundError, VaultStateError


REGISTRY_WRITERS = (Role.BRAND_OWNER, Role.MANAGER)
DISCLAIMER_WRITERS = (Role.BRAND_OWNER, Role.MANAGER, Role.LEGAL_REVIEWER)


def _store(request: Request) -> InMemoryVaultStore:
    return request.app.state.vault_store


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="vault record not found")


def create_app(
    *,
    store: InMemoryVaultStore | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    app = FastAPI(
        title="Proofline API foundation",
        version="0.1.0-foundation",
        description=(
            "Local Phase 1 API foundation. The default vault is in-memory and is not a "
            "replacement for configured Supabase persistence."
        ),
    )
    app.state.vault_store = store or InMemoryVaultStore()
    app.state.settings = settings or get_settings()
    app.dependency_overrides[get_settings] = lambda: app.state.settings

    @app.get("/health")
    async def health(request: Request) -> dict[str, object]:
        runtime = _settings(request)
        return {
            "status": "ok",
            "service": "proofline-api",
            "environment": runtime.environment,
            "persistence": "in_memory_demo",
            "supabase_url_configured": runtime.has_supabase_url,
            "supabase_jwt_verifier_configured": runtime.has_supabase_jwt_verifier,
            "ai_provider": "not_configured",
        }

    @app.get("/v1/{resource}", response_model=VaultListResponse)
    async def list_vault_records(
        resource: VaultResource,
        principal: Annotated[Principal, Depends(get_current_principal)],
        request: Request,
    ) -> VaultListResponse:
        return VaultListResponse(
            resource=resource,
            organisation_id=principal.organisation_id,
            persistence="in_memory_demo",
            items=_store(request).list(principal.organisation_id, resource),
        )

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
        return VaultRecordResponse(persistence="in_memory_demo", item=record)

    return app


app = create_app()
