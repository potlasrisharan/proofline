"""Zernio multi-platform publishing client with explicit sandbox mock mode.

Follows the Proofline principle: Gated Dispatch. Content can only be dispatched
after compliance audit passes and human approval is recorded.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Sequence

import httpx

ZERNIO_API_URL = "https://zernio.com/api/v1"


@dataclass(frozen=True)
class ZernioConfig:
    api_key: str | None = field(default=None, repr=False)
    sandbox_mode: bool = True

    @classmethod
    def from_env(cls) -> "ZernioConfig":
        key = os.environ.get("ZERNIO_API_KEY") or None
        return cls(api_key=key, sandbox_mode=not bool(key))


@dataclass(frozen=True)
class PublishReceipt:
    dispatch_id: str
    channel: str
    platform_post_id: str
    status: str
    is_mock: bool
    dispatched_at: str


class ZernioPublisher:
    """Multi-platform social & CMS publisher gated by Proofline approval."""

    def __init__(self, config: ZernioConfig | None = None) -> None:
        self.config = config or ZernioConfig.from_env()

    def dispatch(
        self,
        *,
        content: str,
        channels: Sequence[str],
        media_urls: Sequence[str] | None = None,
        verified_clean: bool = False,
    ) -> list[PublishReceipt]:
        """Dispatch approved content to selected social/CMS channels.

        Raises ValueError if content has not passed compliance verification.
        """
        if not verified_clean:
            raise ValueError("Gated dispatch violation: Unverified content cannot be published.")

        receipts: list[PublishReceipt] = []
        dispatch_id = f"disp_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        if self.config.sandbox_mode or not self.config.api_key:
            # Simulated sandbox dispatch for testing and hackathon demo
            for ch in channels:
                fake_post_id = f"{ch.lower()}_{uuid.uuid4().hex[:10]}"
                receipts.append(
                    PublishReceipt(
                        dispatch_id=dispatch_id,
                        channel=ch,
                        platform_post_id=fake_post_id,
                        status="published_simulated",
                        is_mock=True,
                        dispatched_at=now,
                    )
                )
            return receipts

        # Live Zernio API call when key is provided
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=15.0) as client:
            for ch in channels:
                payload = {
                    "platform": ch.lower(),
                    "content": content,
                    "media": list(media_urls or []),
                }
                resp = client.post(f"{ZERNIO_API_URL}/posts", headers=headers, json=payload)
                if resp.is_error:
                    receipts.append(
                        PublishReceipt(
                            dispatch_id=dispatch_id,
                            channel=ch,
                            platform_post_id="error",
                            status=f"error_{resp.status_code}",
                            is_mock=False,
                            dispatched_at=now,
                        )
                    )
                else:
                    data = resp.json()
                    receipts.append(
                        PublishReceipt(
                            dispatch_id=dispatch_id,
                            channel=ch,
                            platform_post_id=data.get("id", uuid.uuid4().hex[:10]),
                            status="published",
                            is_mock=False,
                            dispatched_at=now,
                        )
                    )

        return receipts
