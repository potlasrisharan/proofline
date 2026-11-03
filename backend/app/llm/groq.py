"""Fail-soft Groq AI provider for high-speed LLM inference (Llama-3.3-70B, Llama-3.1-8B).

Credentials are read strictly from the environment (GROQ_API_KEY) and are never
committed to version control or hardcoded in source.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

import httpx

from .backoff import RateLimitError
from .pii import mask_pii
from .provider import (
    SYSTEM_INSTRUCTION,
    ConfidentialContentError,
    ProviderMalformedResponseError,
    ProviderRateLimitError,
    ProviderUnavailableError,
)
from .types import ProviderAvailability, ProviderStatus

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b"


@dataclass(frozen=True)
class GroqConfig:
    """Environment-only configuration for Groq AI."""

    api_key: str | None = field(default=None, repr=False)
    model: str = DEFAULT_GROQ_MODEL
    base_url: str = GROQ_BASE_URL

    @classmethod
    def from_env(cls) -> "GroqConfig":
        return cls(
            api_key=os.environ.get("GROQ_API_KEY") or None,
            model=os.environ.get("GROQ_MODEL") or DEFAULT_GROQ_MODEL,
            base_url=os.environ.get("GROQ_BASE_URL") or GROQ_BASE_URL,
        )

    @property
    def configured(self) -> bool:
        return bool(self.api_key)


class GroqProvider:
    """Groq Llama-3 adapter for ultra-low latency claim verification and audit analysis."""

    provider_name = "groq"

    def __init__(
        self,
        *,
        config: GroqConfig | None = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        self.config = config or GroqConfig.from_env()
        self.timeout_seconds = timeout_seconds
        self._status = self._initial_status()

    def _initial_status(self) -> ProviderStatus:
        if not self.config.configured:
            return ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.OFFLINE,
                configured=False,
                configured_model=self.config.model,
                reason="GROQ_API_KEY is not configured; fallback engine active",
                live=False,
            )
        return ProviderStatus(
            provider=self.provider_name,
            availability=ProviderAvailability.AVAILABLE,
            configured=True,
            configured_model=self.config.model,
            reason="Groq Llama-3.3-70B API configured",
            live=True,
        )

    @property
    def status(self) -> ProviderStatus:
        return self._status

    def startup(self) -> ProviderStatus:
        """Lightweight live healthcheck probe."""
        if not self.config.configured:
            return self._status

        try:
            headers = {
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
            }
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.get(
                    f"{self.config.base_url}/models",
                    headers=headers,
                )
                if resp.is_success:
                    self._status = ProviderStatus(
                        provider=self.provider_name,
                        availability=ProviderAvailability.AVAILABLE,
                        configured=True,
                        configured_model=self.config.model,
                        reason="Groq API verified and live",
                        live=True,
                    )
                else:
                    self._status = ProviderStatus(
                        provider=self.provider_name,
                        availability=ProviderAvailability.DEGRADED,
                        configured=True,
                        configured_model=self.config.model,
                        reason=f"Groq API returned HTTP {resp.status_code}",
                        live=False,
                    )
        except Exception as exc:
            self._status = ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.DEGRADED,
                configured=True,
                configured_model=self.config.model,
                reason=f"Groq healthcheck failed: {exc}",
                live=False,
            )
        return self._status

    def generate(
        self,
        *,
        prompt: str,
        confidential: bool = False,
        operation: str = "audit",
        response_schema: dict[str, Any] | None = None,
    ) -> str:
        """Call Groq chat completions API with Llama-3 and fail-soft guarantees."""
        if confidential:
            raise ConfidentialContentError("Groq AI calls are blocked for confidential drafts.")

        if not self.config.configured or not self.config.api_key:
            raise ProviderUnavailableError("GROQ_API_KEY is not configured.")

        masked_prompt = mask_pii(prompt)

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": self.config.model,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": masked_prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(
                    f"{self.config.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if resp.status_code == 429:
                    raise ProviderRateLimitError("Groq API rate limit exceeded.")

                if resp.is_error:
                    raise ProviderMalformedResponseError(
                        f"Groq API error ({resp.status_code}): {resp.text}"
                    )

                data = resp.json()
                choices = data.get("choices")
                if not choices or not isinstance(choices, list):
                    raise ProviderMalformedResponseError("Groq response contained no choices.")

                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    raise ProviderMalformedResponseError("Groq message content was empty.")

                self._status = ProviderStatus(
                    provider=self.provider_name,
                    availability=ProviderAvailability.AVAILABLE,
                    configured=True,
                    configured_model=self.config.model,
                    reason="Groq API call completed successfully",
                    live=True,
                )
                return str(content)

        except httpx.TimeoutException as exc:
            raise ProviderUnavailableError("Groq API request timed out.") from exc
        except (httpx.RequestError, ProviderRateLimitError, ConfidentialContentError, ProviderUnavailableError):
            raise
        except Exception as exc:
            raise ProviderMalformedResponseError(f"Failed to parse Groq response: {exc}") from exc
