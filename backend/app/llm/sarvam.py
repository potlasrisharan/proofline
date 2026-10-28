"""Fail-soft Sarvam AI provider for Indic multilingual analysis, translation, and STT.

Credentials are read strictly from the environment (SARVAM_API_KEY) and are never
committed to version control or hardcoded in source.
"""

from __future__ import annotations

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

SARVAM_BASE_URL = "https://api.sarvam.ai"
DEFAULT_SARVAM_MODEL = "sarvam-105b"


@dataclass(frozen=True)
class SarvamConfig:
    """Environment-only configuration for Sarvam AI."""

    api_key: str | None = field(default=None, repr=False)
    model: str = DEFAULT_SARVAM_MODEL

    @classmethod
    def from_env(cls) -> "SarvamConfig":
        return cls(
            api_key=os.environ.get("SARVAM_API_KEY") or None,
            model=os.environ.get("SARVAM_MODEL") or DEFAULT_SARVAM_MODEL,
        )

    @property
    def configured(self) -> bool:
        return bool(self.api_key)


class SarvamProvider:
    """Sarvam AI adapter for Indic language claim verification and translation."""

    provider_name = "sarvam"

    def __init__(
        self,
        *,
        config: SarvamConfig | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.config = config or SarvamConfig.from_env()
        self.timeout_seconds = timeout_seconds
        self._status = self._initial_status()

    def _initial_status(self) -> ProviderStatus:
        if not self.config.configured:
            return ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.OFFLINE,
                configured=False,
                configured_model=self.config.model,
                reason="SARVAM_API_KEY is not configured; offline mode active",
                live=False,
            )
        return ProviderStatus(
            provider=self.provider_name,
            availability=ProviderAvailability.DEGRADED,
            configured=True,
            configured_model=self.config.model,
            reason="Sarvam is configured but has not yet been exercised",
            live=False,
        )

    @property
    def status(self) -> ProviderStatus:
        return self._status

    def startup(self) -> ProviderStatus:
        """Lightweight live healthcheck using translation endpoint."""
        if not self.config.configured:
            return self._status

        try:
            # Quick 1-word translation probe to verify API key validity
            _ = self.translate("Verify", source_language_code="en-IN", target_language_code="hi-IN")
            self._status = ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.AVAILABLE,
                configured=True,
                configured_model=self.config.model,
                reason="Sarvam API verified and live",
                live=True,
            )
        except Exception as exc:
            self._status = ProviderStatus(
                provider=self.provider_name,
                availability=ProviderAvailability.DEGRADED,
                configured=True,
                configured_model=self.config.model,
                reason=f"Sarvam healthcheck failed: {exc}",
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
        """Call Sarvam chat completions API (e.g. sarvam-105b) with fail-soft guarantees."""
        if confidential:
            raise ConfidentialContentError("Sarvam AI calls are blocked for confidential drafts.")

        if not self.config.configured or not self.config.api_key:
            raise ProviderUnavailableError("SARVAM_API_KEY is not configured.")

        masked_prompt = mask_pii(prompt)

        headers = {
            "api-subscription-key": self.config.api_key,
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": self.config.model,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": masked_prompt},
            ],
            "temperature": 0.1,
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(
                    f"{SARVAM_BASE_URL}/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if resp.status_code == 429:
                    raise ProviderRateLimitError("Sarvam API rate limit exceeded.")

                if resp.is_error:
                    raise ProviderMalformedResponseError(
                        f"Sarvam API error ({resp.status_code}): {resp.text}"
                    )

                data = resp.json()
                choices = data.get("choices")
                if not choices or not isinstance(choices, list):
                    raise ProviderMalformedResponseError("Sarvam response contained no choices.")

                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    raise ProviderMalformedResponseError("Sarvam message content was empty.")

                self._status = ProviderStatus(
                    provider=self.provider_name,
                    availability=ProviderAvailability.AVAILABLE,
                    configured=True,
                    configured_model=self.config.model,
                    reason="Sarvam API call completed successfully",
                    live=True,
                )
                return str(content)

        except httpx.TimeoutException as exc:
            raise ProviderUnavailableError("Sarvam API request timed out.") from exc
        except (httpx.RequestError, ProviderRateLimitError, ConfidentialContentError, ProviderUnavailableError):
            raise
        except Exception as exc:
            raise ProviderMalformedResponseError(f"Failed to parse Sarvam response: {exc}") from exc

    def translate(
        self,
        text: str,
        *,
        source_language_code: str = "en-IN",
        target_language_code: str = "hi-IN",
        mode: str = "formal",
        confidential: bool = False,
    ) -> str:
        """Translate text between English and Indian regional languages (te-IN, hi-IN, ta-IN, etc.)."""
        if confidential:
            raise ConfidentialContentError("Translation is blocked for confidential drafts.")

        if not self.config.configured or not self.config.api_key:
            raise ProviderUnavailableError("SARVAM_API_KEY is not configured.")

        masked_text = mask_pii(text)

        headers = {
            "api-subscription-key": self.config.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "input": masked_text,
            "source_language_code": source_language_code,
            "target_language_code": target_language_code,
            "mode": mode,
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(
                    f"{SARVAM_BASE_URL}/translate",
                    headers=headers,
                    json=payload,
                )

                if resp.status_code == 429:
                    raise ProviderRateLimitError("Sarvam Translate rate limit exceeded.")

                if resp.is_error:
                    raise ProviderMalformedResponseError(
                        f"Sarvam Translate error ({resp.status_code}): {resp.text}"
                    )

                data = resp.json()
                translated = data.get("translated_text")
                if not translated:
                    raise ProviderMalformedResponseError("No translated_text in Sarvam response.")

                return str(translated)

        except (httpx.RequestError, ProviderRateLimitError, ConfidentialContentError, ProviderUnavailableError):
            raise
        except Exception as exc:
            raise ProviderMalformedResponseError(f"Sarvam translation failed: {exc}") from exc

    def speech_to_text(
        self,
        audio_bytes: bytes,
        *,
        language_code: str | None = None,
        confidential: bool = False,
    ) -> str:
        """Transcribe audio (e.g. from reels/shorts) in 10+ Indic languages."""
        if confidential:
            raise ConfidentialContentError("Audio transcription blocked for confidential drafts.")

        if not self.config.configured or not self.config.api_key:
            raise ProviderUnavailableError("SARVAM_API_KEY is not configured.")

        headers = {
            "api-subscription-key": self.config.api_key,
        }

        files = {
            "file": ("audio.wav", audio_bytes, "audio/wav"),
        }
        data: dict[str, Any] = {
            "model": "saaras:v2",
        }
        if language_code:
            data["language_code"] = language_code

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(
                    f"{SARVAM_BASE_URL}/speech-to-text",
                    headers=headers,
                    files=files,
                    data=data,
                )

                if resp.is_error:
                    raise ProviderMalformedResponseError(
                        f"Sarvam STT error ({resp.status_code}): {resp.text}"
                    )

                result = resp.json()
                transcript = result.get("transcript")
                if not transcript:
                    raise ProviderMalformedResponseError("No transcript returned in Sarvam STT.")

                return str(transcript)

        except Exception as exc:
            raise ProviderMalformedResponseError(f"Sarvam STT request failed: {exc}") from exc
