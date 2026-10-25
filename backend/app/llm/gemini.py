"""Fail-soft Gemini adapter with environment-only configuration.

No Gemini SDK is imported at module import time.  The adapter therefore remains
usable in offline tests and local deterministic audits when optional dependencies or
credentials are absent.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from itertools import islice
from typing import Any

from .backoff import RateLimitError, _is_rate_limit_error
from .pii import mask_pii
from .provider import (
    SYSTEM_INSTRUCTION,
    ConfidentialContentError,
    ProviderMalformedResponseError,
    ProviderUnavailableError,
)
from .types import ProviderAvailability, ProviderStatus


@dataclass(frozen=True)
class GeminiConfig:
    """Only these two environment variables select Gemini credentials/model."""

    api_key: str | None = field(default=None, repr=False)
    model: str | None = None

    @classmethod
    def from_env(cls) -> "GeminiConfig":
        return cls(
            api_key=os.environ.get("GEMINI_API_KEY") or None,
            model=os.environ.get("GEMINI_MODEL") or None,
        )

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.model)


def _safe_model_name(value: Any) -> str | None:
    name = getattr(value, "name", None)
    if name is None and isinstance(value, dict):
        name = value.get("name") or value.get("model")
    if name is None:
        return None
    text = str(name)
    return text.removeprefix("models/") or None


def _extract_text(response: Any) -> str:
    if isinstance(response, str):
        return response
    if isinstance(response, bytes):
        return response.decode("utf-8", errors="replace")
    text = getattr(response, "text", None)
    if isinstance(text, str):
        return text
    if isinstance(response, dict):
        for key in ("text", "output", "content"):
            value = response.get(key)
            if isinstance(value, str):
                return value
    raise ProviderMalformedResponseError("Gemini returned no readable text")


class GeminiProvider:
    """Optional google-genai adapter; its model is never selected in source code."""

    provider_name = "gemini"

    def __init__(
        self,
        *,
        client: Any | None = None,
        discover: bool = True,
        timeout_seconds: float = 10.0,
    ) -> None:
        if not 0 < timeout_seconds <= 30:
            raise ValueError("provider timeout must be greater than 0 and at most 30 seconds")
        self.config = GeminiConfig.from_env()
        self._client = client
        self.timeout_seconds = timeout_seconds
        self._discovered_models: list[str] = []
        self._status = self._initial_status()
        if discover and self.config.api_key:
            self.startup()

    def _initial_status(self) -> ProviderStatus:
        if not self.config.api_key:
            return ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.OFFLINE,
                configured=False,
                configured_model=self.config.model,
                reason="GEMINI_API_KEY is not configured; offline mode is active",
                live=False,
            )
        if not self.config.model:
            return ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.UNAVAILABLE,
                configured=False,
                model=None,
                reason="GEMINI_MODEL is not configured",
                live=False,
            )
        return ProviderStatus(
            provider=self.provider_name,
            availability=ProviderAvailability.DEGRADED,
            configured=True,
            configured_model=self.config.model,
            reason="Gemini is configured but has not been exercised",
            live=False,
        )

    @property
    def status(self) -> ProviderStatus:
        return self._status

    @property
    def model_name(self) -> str | None:
        return self.config.model

    @property
    def discovered_models(self) -> tuple[str, ...]:
        return tuple(self._discovered_models)

    def _load_client_fail_soft(self) -> Any | None:
        if self._client is not None:
            return self._client
        if not self.config.api_key:
            return None
        try:
            # Lazy import is intentional: offline tests need no provider package.
            from google import genai  # type: ignore[import-not-found]

            self._client = genai.Client(
                api_key=self.config.api_key,
                http_options={
                    "timeout": int(self.timeout_seconds * 1000),
                    "retry_options": {"attempts": 1},
                },
            )
            return self._client
        except ImportError:
            return None
        except Exception:
            return None

    def startup(self) -> ProviderStatus:
        """Best-effort model discovery, callable from an API startup hook.

        A no-key process performs no import and no request. A discovery failure never
        raises, chooses a replacement model, or stops deterministic checks.
        """

        if not self.config.api_key:
            return self._status
        self._discover_models_fail_soft()
        return self._status

    discover_models = startup

    def _discover_models_fail_soft(self) -> None:
        client = self._load_client_fail_soft()
        if client is None:
            self._status = self._status.model_copy(
                update={
                    "availability": ProviderAvailability.UNAVAILABLE,
                    "reason": "Gemini SDK is unavailable or model discovery failed",
                }
            )
            return

        try:
            models = client.models.list()
            self._discovered_models = [
                name for name in (_safe_model_name(item) for item in islice(models, 100)) if name is not None
            ]
            configured_model = self.config.model
            observed = configured_model.removeprefix("models/") in self._discovered_models if configured_model else False
            reason = None if observed else "Configured model was not observed during fail-soft discovery"
            availability = ProviderAvailability.AVAILABLE if observed else ProviderAvailability.DEGRADED
            if not configured_model:
                availability = ProviderAvailability.UNAVAILABLE
                reason = "GEMINI_MODEL is not configured; discovery does not select one"
            self._status = ProviderStatus(
                provider=self.provider_name,
                availability=availability,
                configured=self.config.configured,
                configured_model=configured_model,
                model=configured_model if observed else None,
                discovered_models=self._discovered_models,
                reason=reason,
                live=False,
            )
        except Exception as error:
            availability = ProviderAvailability.DEGRADED if self.config.model else ProviderAvailability.UNAVAILABLE
            reason = "Gemini model discovery failed; generation remains fail-soft"
            if _is_rate_limit_error(error):
                reason = "Gemini model discovery was rate limited; generation remains fail-soft"
            self._status = self._status.model_copy(
                update={
                    "availability": availability,
                    "reason": reason,
                }
            )

    def _generate_with_client(self, prompt: str, response_schema: dict[str, Any]) -> Any:
        client = self._load_client_fail_soft()
        if client is None:
            raise ProviderUnavailableError("Gemini SDK is unavailable")
        model = self.config.model
        if not model:
            raise ProviderUnavailableError("GEMINI_MODEL is not configured")
        try:
            return client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "system_instruction": SYSTEM_INSTRUCTION,
                    "response_mime_type": "application/json",
                    "response_json_schema": response_schema,
                    "temperature": 0,
                    "max_output_tokens": 8192,
                },
            )
        except Exception as error:
            if _is_rate_limit_error(error):
                self._status = self._status.model_copy(
                    update={"availability": ProviderAvailability.RATE_LIMITED, "reason": "Gemini request was rate limited"}
                )
                raise RateLimitError("Gemini request was rate limited") from None
            self._status = self._status.model_copy(
                update={"availability": ProviderAvailability.DEGRADED, "reason": "Gemini request failed"}
            )
            raise ProviderUnavailableError("Gemini request failed") from None

    def generate(
        self,
        *,
        prompt: str,
        confidential: bool = False,
        operation: str = "audit",
        response_schema: dict[str, Any] | None = None,
    ) -> str:
        """Generate text without ever sending confidential or unmasked content."""

        if confidential:
            raise ConfidentialContentError("confidential content cannot be sent to an external model")
        if not self.config.api_key:
            raise ProviderUnavailableError("Gemini is offline because GEMINI_API_KEY is not configured")
        if not self.config.model:
            raise ProviderUnavailableError("Gemini is unavailable because GEMINI_MODEL is not configured")
        if response_schema is None:
            from .schemas import candidate_json_schema, verifier_json_schema

            response_schema = verifier_json_schema() if operation == "high_severity_verifier" else candidate_json_schema()
        safe_prompt = mask_pii(prompt)
        response = self._generate_with_client(safe_prompt, response_schema)
        try:
            text = _extract_text(response)
        except Exception:
            raise ProviderMalformedResponseError("Gemini returned no readable text") from None
        if not text.strip():
            raise ProviderMalformedResponseError("Gemini returned an empty response")
        self._status = self._status.model_copy(
            update={
                "availability": ProviderAvailability.AVAILABLE,
                "model": self.config.model,
                "reason": None,
                "live": True,
            }
        )
        return text
