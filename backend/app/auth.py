from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings
from .models import Principal, Role


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _principal_from_claims(claims: dict[str, object]) -> Principal:
    user_id = claims.get("sub")
    organisation_id = claims.get("organisation_id") or claims.get("org_id")
    role = claims.get("proofline_role") or claims.get("role_name")
    if not all(isinstance(value, str) and value for value in (user_id, organisation_id, role)):
        raise _unauthorized("JWT is missing Proofline subject, organisation, or role claims")
    try:
        parsed_role = Role(role)
    except ValueError as exc:
        raise _unauthorized("JWT contains an unsupported Proofline role") from exc
    return Principal(
        user_id=user_id,
        organisation_id=organisation_id,
        role=parsed_role,
        auth_source="supabase_jwt",
    )


async def get_current_principal(
    authorization: str | None = Header(default=None),
    x_proofline_user: str | None = Header(default=None),
    x_proofline_organisation: str | None = Header(default=None),
    x_proofline_role: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Principal:
    """Resolve a caller from a verified JWT or an explicitly enabled dev header.

    Development headers are disabled by default and are never accepted as a production
    authentication mechanism. Supabase JWT claims must be signed with the configured
    secret and carry an organisation and Proofline role claim.
    """

    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise _unauthorized("use a Bearer token")
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase JWT verification is not configured",
            )
        try:
            import jwt

            claims = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"])
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="JWT verification dependency is not installed",
            ) from exc
        except Exception as exc:  # PyJWT has several concrete decode exceptions.
            raise _unauthorized("invalid bearer token") from exc
        return _principal_from_claims(claims)

    if settings.dev_auth_enabled:
        if not all((x_proofline_user, x_proofline_organisation, x_proofline_role)):
            raise _unauthorized("development auth requires user, organisation, and role headers")
        try:
            role = Role(x_proofline_role)
        except ValueError as exc:
            raise _unauthorized("unsupported development role") from exc
        return Principal(
            user_id=x_proofline_user,
            organisation_id=x_proofline_organisation,
            role=role,
            auth_source="development_header",
        )

    raise _unauthorized("authentication is not configured")


def require_roles(*allowed_roles: Role) -> Callable[..., Awaitable[Principal]]:
    async def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.role not in allowed_roles:
            allowed = ", ".join(role.value for role in allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"role {principal.role.value} is not allowed; required one of: {allowed}",
            )
        return principal

    return dependency
