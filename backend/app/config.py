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
    """Runtime configuration with safe, disabled-by-default integrations."""

    environment: str = "development"
    dev_auth_enabled: bool = False
    supabase_url: str | None = None
    supabase_jwt_secret: str | None = None

    @property
    def has_supabase_jwt_verifier(self) -> bool:
        return bool(self.supabase_jwt_secret)

    @property
    def has_supabase_url(self) -> bool:
        return bool(self.supabase_url)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        environment=os.getenv("PROOFLINE_ENV", "development"),
        dev_auth_enabled=_as_bool(os.getenv("PROOFLINE_DEV_AUTH")),
        supabase_url=os.getenv("SUPABASE_URL") or None,
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET") or None,
    )
