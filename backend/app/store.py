from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

from .models import Principal, RegistryStatus, VaultCreateRequest, VaultRecord, VaultResource


class VaultNotFoundError(LookupError):
    """Raised when a vault record is not visible in the requested organisation."""


class VaultStateError(ValueError):
    """Raised when a version or approval transition is invalid."""


class InMemoryVaultStore:
    """A deliberately non-persistent adapter for local development and tests.

    This adapter is not a substitute for Supabase. It exists so the API contract,
    role checks, and version transitions can be exercised without credentials.
    """

    def __init__(self) -> None:
        self._records: dict[str, dict[VaultResource, list[VaultRecord]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._lock = RLock()

    def list(self, organisation_id: str, resource: VaultResource) -> list[VaultRecord]:
        with self._lock:
            return list(self._records[organisation_id][resource])

    def get(self, organisation_id: str, resource: VaultResource, record_id: str) -> VaultRecord:
        with self._lock:
            for record in self._records[organisation_id][resource]:
                if record.id == record_id:
                    return record
        raise VaultNotFoundError(record_id)

    def create(
        self,
        organisation_id: str,
        resource: VaultResource,
        request: VaultCreateRequest,
        principal: Principal,
    ) -> VaultRecord:
        with self._lock:
            versions = self._records[organisation_id][resource]
            record = VaultRecord(
                id=str(uuid4()),
                organisation_id=organisation_id,
                resource=resource,
                version=self._next_version(versions, request.value),
                status=RegistryStatus.DRAFT,
                value=request.value,
                source_id=request.source_id,
                source_version=request.source_version,
                effective_from=request.effective_from,
                effective_to=request.effective_to,
                metadata=request.metadata,
                created_by=principal.user_id,
                created_at=datetime.now(timezone.utc),
            )
            versions.append(record)
            return record

    def create_version(
        self,
        organisation_id: str,
        resource: VaultResource,
        record_id: str,
        request: VaultCreateRequest,
        principal: Principal,
    ) -> VaultRecord:
        with self._lock:
            previous = self.get(organisation_id, resource, record_id)
            versions = self._records[organisation_id][resource]
            next_version = max(
                record.version for record in versions if self._same_logical_record(record, previous)
            ) + 1
            record = VaultRecord(
                id=str(uuid4()),
                organisation_id=organisation_id,
                resource=resource,
                version=next_version,
                status=RegistryStatus.DRAFT,
                value=request.value,
                source_id=request.source_id,
                source_version=request.source_version,
                effective_from=request.effective_from,
                effective_to=request.effective_to,
                metadata={**previous.metadata, **request.metadata},
                created_by=principal.user_id,
                created_at=datetime.now(timezone.utc),
            )
            versions.append(record)
            return record

    def approve(
        self,
        organisation_id: str,
        resource: VaultResource,
        record_id: str,
        principal: Principal,
    ) -> VaultRecord:
        with self._lock:
            current = self.get(organisation_id, resource, record_id)
            if current.status is not RegistryStatus.DRAFT:
                raise VaultStateError("only draft records can be approved")

            approved_at = datetime.now(timezone.utc)
            approved = current.model_copy(
                update={
                    "status": RegistryStatus.APPROVED,
                    "approved_by": principal.user_id,
                    "approved_at": approved_at,
                }
            )
            records = self._records[organisation_id][resource]
            records[records.index(current)] = approved
            return approved

    @staticmethod
    def _same_logical_record(left: VaultRecord, right: VaultRecord) -> bool:
        return (
            left.resource is right.resource
            and InMemoryVaultStore._logical_key(left.value) == InMemoryVaultStore._logical_key(right.value)
        )

    @staticmethod
    def _next_version(records: list[VaultRecord], value: dict[str, object]) -> int:
        key = InMemoryVaultStore._logical_key(value)
        matching = [
            record.version
            for record in records
            if InMemoryVaultStore._logical_key(record.value) == key
        ]
        return max(matching, default=0) + 1

    @staticmethod
    def _logical_key(value: dict[str, object]) -> object:
        return value.get("key") or value.get("term") or value.get("name") or "__record__"
