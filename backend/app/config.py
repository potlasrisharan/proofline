from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Runtime configuration with safe, disabled-by-default integrations.

    The ``supabase_*`` fields remain accepted only for old local tests. They are not
    part of the Cloudflare deployment target.
    """

    environment: str = "development"
    dev_auth_enabled: bool = False
    jwt_secret: str | None = None
    cloudflare_access_team_domain: str | None = None
    cloudflare_access_audience: str | None = None
    allowed_origins: tuple[str, ...] = ("http://localhost:3000", "http://127.0.0.1:3000")
    # Deprecated compatibility fields for existing local callers.
    supabase_url: str | None = None
    supabase_jwt_secret: str | None = None

    @property
    def effective_jwt_secret(self) -> str | None:
        return self.jwt_secret or self.supabase_jwt_secret

    @property
    def has_jwt_verifier(self) -> bool:
        return bool(self.effective_jwt_secret)

    @property
    def cloudflare_access_configured(self) -> bool:
        return bool(self.cloudflare_access_team_domain and self.cloudflare_access_audience)

    @property
    def has_supabase_jwt_verifier(self) -> bool:
        """Deprecated compatibility alias; use ``has_jwt_verifier``."""

        return self.has_jwt_verifier

    @property
    def has_supabase_url(self) -> bool:
        """Deprecated compatibility alias retained for old local callers."""

        return False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        environment=os.getenv("PROOFLINE_ENV", "development"),
        dev_auth_enabled=_as_bool(os.getenv("PROOFLINE_DEV_AUTH")),
        jwt_secret=os.getenv("PROOFLINE_JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET") or None,
        cloudflare_access_team_domain=os.getenv("PROOFLINE_ACCESS_TEAM_DOMAIN") or None,
        cloudflare_access_audience=os.getenv("PROOFLINE_ACCESS_AUDIENCE") or None,
        allowed_origins=tuple(
            origin.strip()
            for origin in os.getenv(
                "PROOFLINE_ALLOWED_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ),
    )
