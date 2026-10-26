"""Authenticated HTTP boundary for the isolated, in-memory impact adapter."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from .auth import require_roles
from .impact import (
    FactValidityEndRequest,
    FactVersionCreateRequest,
    ImpactContentCreateRequest,
    ImpactContentResponse,
    ImpactEventsResponse,
    ImpactFactVersionResponse,
    ImpactFactVersionsResponse,
    ImpactListResponse,
    ImpactNotFoundError,
    ImpactRadarStore,
    ImpactRechecksResponse,
    ImpactStateError,
    ImpactValidationError,
    RecheckAllRequest,
    RecheckAllResponse,
)
from .models import Principal, Role


router = APIRouter(prefix="/v1/impact", tags=["Local Fact-Change Impact Radar"])
Reader = Annotated[
    Principal,
    Depends(require_roles(Role.BRAND_OWNER, Role.MANAGER, Role.LEGAL_REVIEWER)),
]
Writer = Annotated[Principal, Depends(require_roles(Role.BRAND_OWNER, Role.MANAGER))]
Owner = Annotated[Principal, Depends(require_roles(Role.BRAND_OWNER))]


def _store(request: Request) -> ImpactRadarStore:
    return request.app.state.impact_store


def _error(exc: Exception) -> HTTPException:
    if isinstance(exc, ImpactNotFoundError):
        return HTTPException(status.HTTP_404_NOT_FOUND, "impact record not found")
    if isinstance(exc, PermissionError):
        return HTTPException(status.HTTP_403_FORBIDDEN, str(exc))
    if isinstance(exc, ImpactValidationError):
        return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))
    return HTTPException(status.HTTP_409_CONFLICT, str(exc))


@router.post("/fact-versions", response_model=ImpactFactVersionResponse, status_code=201)
def create_fact_version(payload: FactVersionCreateRequest, principal: Writer, request: Request):
    try:
        fact = _store(request).create_fact_version(principal.organisation_id, payload, principal)
    except (ImpactStateError, ImpactValidationError, PermissionError) as exc:
        raise _error(exc) from exc
    return ImpactFactVersionResponse(
        item=fact,
        impact=_store(request).list_affected(principal.organisation_id, fact_id=fact.fact_id),
    )


@router.get("/facts/{fact_id}/versions", response_model=ImpactFactVersionsResponse)
def list_fact_versions(fact_id: str, principal: Reader, request: Request):
    try:
        return ImpactFactVersionsResponse(
            items=_store(request).list_fact_versions(principal.organisation_id, fact_id)
        )
    except ImpactNotFoundError as exc:
        raise _error(exc) from exc


@router.post("/facts/{fact_id}/versions/{fact_version}/approve", response_model=ImpactFactVersionResponse)
def approve_fact_version(fact_id: str, fact_version: int, principal: Owner, request: Request):
    try:
        fact = _store(request).approve_fact_version(principal.organisation_id, fact_id, fact_version, principal)
    except (ImpactNotFoundError, ImpactStateError, PermissionError) as exc:
        raise _error(exc) from exc
    return ImpactFactVersionResponse(
        item=fact,
        impact=_store(request).list_affected(principal.organisation_id, fact_id=fact_id),
    )


@router.post("/facts/{fact_id}/end-validity", response_model=ImpactFactVersionResponse)
def end_validity(fact_id: str, payload: FactValidityEndRequest, principal: Owner, request: Request):
    try:
        fact = _store(request).end_fact_validity(principal.organisation_id, fact_id, payload, principal)
    except (ImpactNotFoundError, ImpactStateError, ImpactValidationError, PermissionError) as exc:
        raise _error(exc) from exc
    return ImpactFactVersionResponse(
        item=fact,
        impact=_store(request).list_affected(principal.organisation_id, fact_id=fact_id),
    )


@router.post("/content", response_model=ImpactContentResponse, status_code=201)
def register_content(payload: ImpactContentCreateRequest, principal: Writer, request: Request):
    try:
        content, claims = _store(request).register_content(principal.organisation_id, payload, principal)
    except (ImpactNotFoundError, ImpactValidationError, PermissionError) as exc:
        raise _error(exc) from exc
    return ImpactContentResponse(content=content, claims=claims)


@router.get("/content/{content_id}", response_model=ImpactContentResponse)
def get_content(content_id: str, principal: Reader, request: Request):
    try:
        return ImpactContentResponse(
            content=_store(request).get_content(principal.organisation_id, content_id),
            claims=_store(request).list_content_claims(principal.organisation_id, content_id),
        )
    except ImpactNotFoundError as exc:
        raise _error(exc) from exc


@router.get("/revalidation", response_model=ImpactListResponse)
@router.get("/affected", response_model=ImpactListResponse)
def list_affected(principal: Reader, request: Request, fact_id: str | None = None):
    return _store(request).list_affected(principal.organisation_id, fact_id=fact_id)


@router.post("/recheck-all", response_model=RecheckAllResponse)
def recheck_all(payload: RecheckAllRequest, principal: Writer, request: Request):
    return _store(request).recheck_all_affected(
        principal.organisation_id,
        principal,
        fact_id=payload.fact_id,
        note=payload.note,
    )


@router.get("/events", response_model=ImpactEventsResponse)
def list_events(principal: Reader, request: Request):
    return ImpactEventsResponse(
        organisation_id=principal.organisation_id,
        items=_store(request).list_events(principal.organisation_id),
    )


@router.get("/rechecks", response_model=ImpactRechecksResponse)
def list_rechecks(principal: Reader, request: Request):
    return ImpactRechecksResponse(items=_store(request).list_rechecks(principal.organisation_id))
