"""Tests for Groq AI provider integration (offline tests & optional live verification)."""

import os
from unittest.mock import MagicMock, patch

import pytest

from backend.app.llm.groq import GroqConfig, GroqProvider
from backend.app.llm.provider import ConfidentialContentError, ProviderUnavailableError
from backend.app.llm.types import ProviderAvailability


def test_groq_config_offline_when_no_key():
    config = GroqConfig(api_key=None)
    assert not config.configured
    provider = GroqProvider(config=config)
    assert provider.status.availability == ProviderAvailability.OFFLINE
    assert not provider.status.live


def test_groq_confidential_blocked():
    provider = GroqProvider(config=GroqConfig(api_key="gsk_test_mock_key"))
    with pytest.raises(ConfidentialContentError):
        provider.generate(prompt="Test claim", confidential=True)


def test_groq_generate_mocked():
    provider = GroqProvider(config=GroqConfig(api_key="gsk_test_mock_key"))
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_error = False
    mock_resp.json.return_value = {
        "id": "chatcmpl-test",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": '{"findings":[{"claim":"20 hours battery","verdict":"contradicted"}]}',
                },
                "finish_reason": "stop",
            }
        ],
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        output = provider.generate(prompt="Analyze creator copy for factual claims")
        assert "20 hours battery" in output
        assert provider.status.availability == ProviderAvailability.AVAILABLE


def test_groq_startup_probe_mocked():
    provider = GroqProvider(config=GroqConfig(api_key="gsk_test_mock_key"))
    mock_resp = MagicMock()
    mock_resp.is_success = True
    with patch("httpx.Client.get", return_value=mock_resp):
        status = provider.startup()
        assert status.availability == ProviderAvailability.AVAILABLE
        assert status.live
