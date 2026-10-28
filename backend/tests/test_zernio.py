"""Tests for Zernio multi-platform publishing and gated dispatch."""

import pytest

from backend.app.publishing.zernio import ZernioConfig, ZernioPublisher


def test_zernio_blocks_unverified_content():
    publisher = ZernioPublisher(ZernioConfig(sandbox_mode=True))
    with pytest.raises(ValueError, match="Gated dispatch violation"):
        publisher.dispatch(
            content="Unverified text",
            channels=["LinkedIn", "Instagram"],
            verified_clean=False,
        )


def test_zernio_sandbox_mock_dispatch():
    publisher = ZernioPublisher(ZernioConfig(api_key=None, sandbox_mode=True))
    receipts = publisher.dispatch(
        content="Approved VoltEdge NovaBook S1 launch copy",
        channels=["LinkedIn", "Instagram", "X"],
        verified_clean=True,
    )
    assert len(receipts) == 3
    assert all(r.is_mock for r in receipts)
    assert all(r.status == "published_simulated" for r in receipts)
    assert {r.channel for r in receipts} == {"LinkedIn", "Instagram", "X"}
