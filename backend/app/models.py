from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Role(StrEnum):
    CREATOR = "creator"
    MANAGER = "manager"
    LEGAL_REVIEWER = "legal_reviewer"
    BRAND_OWNER = "brand_owner"
    AGENCY = "agency"


class RegistryStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"
    RETIRED = "retired"


class VaultResource(StrEnum):
    FACTS = "facts"
    TERMS = "terms"
    GUIDELINES = "guidelines"
    DISCLAIMERS = "disclaimers"
    ASSETS = "assets"


class Principal(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: str = Field(min_length=1)
    organisation_id: str = Field(min_length=1)
    role: Role
    auth_source: Literal["supabase_jwt", "development_header", "test_override"]


class VaultCreateRequest(BaseModel):
    value: dict[str, Any] = Field(min_length=1)
    source_id: str | None = None
    source_version: str | None = None
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class VaultRecord(BaseModel):
    id: str
    organisation_id: str
    resource: VaultResource
    version: int = Field(ge=1)
    status: RegistryStatus
    value: dict[str, Any]
    source_id: str | None = None
    source_version: str | None = None
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    approved_by: str | None = None
    created_at: datetime
    approved_at: datetime | None = None


class VaultListResponse(BaseModel):
    resource: VaultResource
    organisation_id: str
    persistence: Literal["in_memory_demo"]
    items: list[VaultRecord]


class VaultRecordResponse(BaseModel):
    persistence: Literal["in_memory_demo"]
    item: VaultRecord
