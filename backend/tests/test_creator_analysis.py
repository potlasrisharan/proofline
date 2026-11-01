"""Tests for creator multi-platform pre-publication audit endpoint (/v1/ai/creator-analysis)."""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_creator_analysis_linkedin():
    resp = client.post(
        "/v1/ai/creator-analysis",
        json={
            "platform": "linkedin",
            "text": "Meet the VoltEdge NovaBook S1. Delivers up to 20 hours of battery life. Our most reliable laptop yet.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "linkedin"
    assert not data["exceeds_limit"]
    assert len(data["superlative_findings"]) >= 1
    assert any("most reliable" in f["flagged_text"] for f in data["superlative_findings"])
    assert len(data["spec_findings"]) >= 1
    assert "20 hours" in data["spec_findings"][0]["flagged_text"]
    assert data["ai_metadata"]["fail_soft_fallback_active"] is not None


def test_creator_analysis_instagram_requires_ftc_disclosure():
    # Without #ad or sponsored
    resp = client.post(
        "/v1/ai/creator-analysis",
        json={
            "platform": "instagram",
            "text": "Unboxing the sleekest laptop of 2026: VoltEdge NovaBook S1! Use code VOLT20 for 20% off.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ftc_finding"] is not None
    assert "FTC 16 CFR § 255" in data["ftc_finding"]["rule"]

    # With #ad
    resp2 = client.post(
        "/v1/ai/creator-analysis",
        json={
            "platform": "instagram",
            "text": "#ad · Unboxing the sleekest laptop of 2026: VoltEdge NovaBook S1! Use code VOLT20 for 20% off.",
        },
    )
    assert resp2.status_code == 200
    assert resp2.json()["ftc_finding"] is None


def test_creator_analysis_twitter_character_limit():
    long_tweet = "A" * 300
    resp = client.post(
        "/v1/ai/creator-analysis",
        json={"platform": "twitter", "text": long_tweet},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["exceeds_limit"] is True
    assert data["char_count"] == 300
    assert data["max_limit"] == 280
