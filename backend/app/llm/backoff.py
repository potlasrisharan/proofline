"""Bounded rate-limit retry helpers with injectable sleeping for offline tests."""

from __future__ import annotations

import random
import time
import math
from dataclasses import dataclass
from typing import Callable, TypeVar


class RateLimitError(RuntimeError):
    """Provider call was rate limited or temporarily throttled."""


T = TypeVar("T")


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 2
    initial_delay_seconds: float = 0.2
    max_delay_seconds: float = 2.0
    jitter_seconds: float = 0.0

    def __post_init__(self) -> None:
        if not isinstance(self.max_attempts, int) or isinstance(self.max_attempts, bool) or not 1 <= self.max_attempts <= 5:
            raise ValueError("max_attempts must be an integer from 1 to 5")
        if not all(math.isfinite(value) for value in (self.initial_delay_seconds, self.max_delay_seconds, self.jitter_seconds)):
            raise ValueError("retry delays must be finite")
        if self.initial_delay_seconds < 0 or self.max_delay_seconds < 0 or self.jitter_seconds < 0:
            raise ValueError("retry delays cannot be negative")
        if self.max_delay_seconds < self.initial_delay_seconds:
            raise ValueError("max_delay_seconds must be >= initial_delay_seconds")
        if self.max_delay_seconds > 30:
            raise ValueError("retry delays cannot exceed 30 seconds")


def _is_rate_limit_error(error: BaseException) -> bool:
    if isinstance(error, RateLimitError):
        return True
    name = type(error).__name__.lower()
    if "ratelimit" in name or "resourceexhausted" in name or "too_many" in name:
        return True
    # Do not return the provider's message to callers; this is only classification.
    text = str(error).lower()
    return any(token in text for token in ("429", "rate limit", "too many requests", "resource exhausted"))


def call_with_backoff(
    operation: Callable[[], T],
    *,
    policy: RetryPolicy | None = None,
    sleep: Callable[[float], None] = time.sleep,
    random_fn: Callable[[], float] = random.random,
) -> T:
    """Run an operation with bounded retries for rate-limit-like failures only."""

    retry_policy = policy or RetryPolicy()
    last_error: BaseException | None = None
    for attempt in range(retry_policy.max_attempts):
        try:
            return operation()
        except Exception as error:  # preserve provider exception type for final mapping
            if not _is_rate_limit_error(error):
                raise
            last_error = error
            if attempt >= retry_policy.max_attempts - 1:
                break
            delay = min(
                retry_policy.max_delay_seconds,
                retry_policy.initial_delay_seconds * (2**attempt),
            )
            if retry_policy.jitter_seconds:
                delay = min(retry_policy.max_delay_seconds, delay + retry_policy.jitter_seconds * random_fn())
            sleep(delay)
    if last_error is not None:
        raise RateLimitError("model provider rate limit persisted after bounded retries") from None
    raise RuntimeError("retry operation did not execute")
