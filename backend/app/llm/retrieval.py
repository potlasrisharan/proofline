"""Provider-neutral retrieval boundaries.

The pgvector and Postgres full-text classes intentionally do not import a database
driver or claim a live connection.  They become live only when an application injects
an executor and a successful query is observed.
"""

from __future__ import annotations

from collections import defaultdict
import json
from typing import Any, Callable, Iterable, Protocol, Sequence

from pydantic import BaseModel, ConfigDict, Field

from .evidence import eligible_records, normalise_records, record_scope, record_text
from .types import ApprovedFact


class RetrievalStatus(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    backend: str
    configured: bool = False
    live: bool = False
    reason: str | None = None


class RetrievalResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    records: list[ApprovedFact] = Field(default_factory=list)
    status: str = "ok"
    backend: str = "unknown"
    live: bool = False
    reason: str | None = None
    conflict_ids: list[str] = Field(default_factory=list)

    @property
    def needs_human(self) -> bool:
        return self.status in {"conflict", "needs_human", "unavailable"}


class Retriever(Protocol):
    @property
    def status(self) -> RetrievalStatus:
        ...

    def search(
        self,
        query: str,
        *,
        organisation_id: str | None = None,
        limit: int = 20,
    ) -> RetrievalResult:
        ...


def _normalise_records(values: Iterable[ApprovedFact | dict[str, Any]]) -> list[ApprovedFact]:
    return [record for record in normalise_records(values) if record.is_approved]


def detect_record_conflicts(records: Sequence[ApprovedFact]) -> list[str]:
    """Return IDs involved in same-key, different-value conflicts."""

    groups: dict[str, list[ApprovedFact]] = defaultdict(list)
    for record in records:
        key = json.dumps(
            [record.organisation_id, record.record_type, record.record_key or record.id, record_scope(record)],
            sort_keys=True,
        )
        groups[key].append(record)
    conflicting_ids: list[str] = []
    for grouped in groups.values():
        values = {record_text(item) for item in grouped}
        if len(values) > 1:
            conflicting_ids.extend(item.id for item in grouped)
    return sorted(set(conflicting_ids))


class InMemoryRetriever:
    """Explicitly non-live retrieval adapter for deterministic local checks."""

    def __init__(self, records: Iterable[ApprovedFact | dict[str, Any]] = ()) -> None:
        self.records = _normalise_records(records)
        self._status = RetrievalStatus(
            backend="in_memory_demo",
            configured=True,
            live=False,
            reason="in-memory records only; no database connection is claimed",
        )

    @property
    def status(self) -> RetrievalStatus:
        return self._status

    def search(self, query: str, *, organisation_id: str | None = None, limit: int = 20) -> RetrievalResult:
        del query
        scoped = eligible_records(self.records, organisation_id=organisation_id)
        conflict_ids = detect_record_conflicts(scoped)
        return RetrievalResult(
            records=scoped[: max(0, min(limit, 100))],
            status="conflict" if conflict_ids else "ok",
            backend=self._status.backend,
            live=False,
            reason="conflicting approved records require human review" if conflict_ids else self._status.reason,
            conflict_ids=conflict_ids,
        )


class _DatabaseBoundary:
    backend_name = "database"

    def __init__(self, *, executor: Callable[..., Iterable[Any]] | None = None) -> None:
        self._executor = executor
        self._live = False
        self._reason = (
            "database adapter boundary is not configured"
            if executor is None
            else "database adapter is configured but has not completed a query"
        )

    @property
    def status(self) -> RetrievalStatus:
        return RetrievalStatus(
            backend=self.backend_name,
            configured=self._executor is not None,
            live=self._live,
            reason=self._reason,
        )

    def _search_with_executor(
        self,
        query: str,
        *,
        organisation_id: str | None,
        limit: int,
        mode: str,
    ) -> RetrievalResult:
        if self._executor is None:
            return RetrievalResult(
                status="unavailable",
                backend=self.backend_name,
                live=False,
                reason=self._reason,
            )
        try:
            values = self._executor(
                query=query,
                organisation_id=organisation_id,
                limit=limit,
                mode=mode,
            )
            records = eligible_records(_normalise_records(values), organisation_id=organisation_id)
            self._live = True
            self._reason = None
            conflict_ids = detect_record_conflicts(records)
            return RetrievalResult(
                records=records[: max(0, limit)],
                status="conflict" if conflict_ids else "ok",
                backend=self.backend_name,
                live=True,
                reason="conflicting approved records require human review" if conflict_ids else None,
                conflict_ids=conflict_ids,
            )
        except Exception:
            self._live = False
            self._reason = "database retrieval failed; no records were asserted"
            return RetrievalResult(
                status="unavailable",
                backend=self.backend_name,
                live=False,
                reason=self._reason,
            )


class PgVectorRetriever(_DatabaseBoundary):
    """pgvector-capable adapter boundary; no live database is assumed."""

    backend_name = "pgvector"

    def search(self, query: str, *, organisation_id: str | None = None, limit: int = 20) -> RetrievalResult:
        return self._search_with_executor(query, organisation_id=organisation_id, limit=limit, mode="vector")


class PostgresFullTextRetriever(_DatabaseBoundary):
    """Postgres full-text fallback adapter boundary; no live database is assumed."""

    backend_name = "postgres_full_text"

    def search(self, query: str, *, organisation_id: str | None = None, limit: int = 20) -> RetrievalResult:
        return self._search_with_executor(query, organisation_id=organisation_id, limit=limit, mode="full_text")


class RetrievalRouter:
    """Prefer pgvector and fall back to Postgres full text without fabricating data."""

    def __init__(
        self,
        *,
        vector: Retriever | None = None,
        full_text: Retriever | None = None,
        offline: Retriever | None = None,
    ) -> None:
        self.vector = vector
        self.full_text = full_text
        self.offline = offline

    def search(self, query: str, *, organisation_id: str | None = None, limit: int = 20) -> RetrievalResult:
        attempted: list[str] = []
        if self.vector is not None:
            try:
                result = self.vector.search(query, organisation_id=organisation_id, limit=limit)
                attempted.append(result.backend)
                if result.status in {"ok", "conflict"}:
                    return result
            except Exception:
                attempted.append("pgvector_error")
        if self.full_text is not None:
            try:
                result = self.full_text.search(query, organisation_id=organisation_id, limit=limit)
                attempted.append(result.backend)
                if result.status in {"ok", "conflict"}:
                    return result
            except Exception:
                attempted.append("postgres_full_text_error")
        if self.offline is not None:
            return self.offline.search(query, organisation_id=organisation_id, limit=limit)
        return RetrievalResult(
            status="unavailable",
            backend=", ".join(attempted) or "none",
            live=False,
            reason="no retrieval backend is configured; no evidence was asserted",
        )
