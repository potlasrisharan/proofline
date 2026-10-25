"""Small in-process cache for non-confidential, already-redacted responses."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class _CacheEntry:
    value: str
    expires_at: float


class ResponseCache:
    """Bounded TTL/LRU cache.

    The cache stores only values explicitly supplied by the caller.  ``LLMService``
    never writes confidential requests here and cache keys are hashes rather than raw
    prompt text.
    """

    def __init__(self, *, max_entries: int = 128, ttl_seconds: float = 300.0) -> None:
        if max_entries < 1:
            raise ValueError("max_entries must be at least 1")
        if ttl_seconds < 0:
            raise ValueError("ttl_seconds cannot be negative")
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self._items: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._lock = threading.RLock()

    @staticmethod
    def make_key(payload: Any) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def get(self, key: str) -> str | None:
        now = time.monotonic()
        with self._lock:
            entry = self._items.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                self._items.pop(key, None)
                return None
            self._items.move_to_end(key)
            return entry.value

    def set(self, key: str, value: str) -> None:
        if len(value) > 131072:
            return
        with self._lock:
            self._items[key] = _CacheEntry(value=value, expires_at=time.monotonic() + self.ttl_seconds)
            self._items.move_to_end(key)
            while len(self._items) > self.max_entries:
                self._items.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()

    def discard(self, key: str) -> None:
        with self._lock:
            self._items.pop(key, None)

    def __len__(self) -> int:
        with self._lock:
            return len(self._items)
