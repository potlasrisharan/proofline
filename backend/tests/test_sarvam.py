"""Tests for Sarvam AI provider integration (offline tests & optional live verification)."""

import os
from unittest.mock import MagicMock, patch

import pytest

from backend.app.llm.provider import ConfidentialContentError, ProviderUnavailableError
from backend.app.llm.sarvam import SarvamConfig, SarvamProvider
from backend.app.llm.types import ProviderAvailability


def test_sarvam_config_offline_when_no_key():
    config = SarvamConfig(api_key=None)
    assert not config.configured
    provider = SarvamProvider(config=config)
    assert provider.status.availability == ProviderAvailability.OFFLINE
    assert not provider.status.live


def test_sarvam_confidential_blocked():
    provider = SarvamProvider(config=SarvamConfig(api_key="test-key"))
    with pytest.raises(ConfidentialContentError):
        provider.generate(prompt="Test claim", confidential=True)

    with pytest.raises(ConfidentialContentError):
        provider.translate("Test text", confidential=True)


def test_sarvam_translate_mocked():
    provider = SarvamProvider(config=SarvamConfig(api_key="test-key"))
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_error = False
    mock_resp.json.return_value = {
        "request_id": "test-req",
        "translated_text": "వోల్ట్‌ఎడ్జ్ నోవాబుక్ ఎస్1",
        "source_language_code": "en-IN",
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        res = provider.translate(
            "VoltEdge NovaBook S1",
            source_language_code="en-IN",
            target_language_code="te-IN",
        )
        assert res == "వోల్ట్‌ఎడ్జ్ నోవాబుక్ ఎస్1"


def test_sarvam_generate_mocked():
    provider = SarvamProvider(config=SarvamConfig(api_key="test-key"))
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_error = False
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {"content": "20 hours battery backup"},
                "finish_reason": "stop",
            }
        ]
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        output = provider.generate(prompt="Extract claims from text")
        assert "20 hours" in output
        assert provider.status.availability == ProviderAvailability.AVAILABLE


@pytest.mark.skipif(not os.getenv("SARVAM_API_KEY"), reason="SARVAM_API_KEY not set in environment")
def test_sarvam_live_translate():
    provider = SarvamProvider()
    res = provider.translate(
        "Meet the VoltEdge NovaBook S1.",
        source_language_code="en-IN",
        target_language_code="te-IN",
    )
    assert len(res) > 0
    assert "నోవాబుక్" in res or "వోల్ట్" in res
