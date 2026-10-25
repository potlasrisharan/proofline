from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.auth import get_current_principal
from backend.app.main import create_app
from backend.app.models import Principal, Role


ORG = "org-voltedge-us"


def make_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_principal] = lambda: Principal(
        user_id="user-voltedge-owner",
        organisation_id=ORG,
        role=Role.BRAND_OWNER,
        auth_source="test_override",
    )
    return TestClient(app)


def approve(client: TestClient, resource: str, value: dict[str, object], **extra: object) -> dict[str, object]:
    created = client.post(f"/v1/{resource}", json={"value": value, **extra})
    assert created.status_code == 201, created.text
    item = created.json()["item"]
    approved = client.post(f"/v1/{resource}/{item['id']}/approve")
    assert approved.status_code == 200, approved.text
    return approved.json()["item"]


def test_numeric_mismatch_is_critical_evidence_linked_and_intent_preserving() -> None:
    client = make_client()
    fact = approve(
        client,
        "facts",
        {
            "product": "VoltEdge NovaBook S1",
            "attribute": "battery_life",
            "value": 10,
            "unit": "hours",
            "qualifier": "up_to",
        },
        source_id="spec-voltedge-novabook",
        source_version="3",
    )
    approve(
        client,
        "disclaimers",
        {"required_text": "Terms apply.", "when": "promotion"},
        source_id="legal-voltedge-us",
        source_version="5",
    )

    response = client.post(
        "/contents",
        json={
            "title": "VoltEdge battery copy",
            "source_text": "Our VoltEdge NovaBook S1 laptop gives you up to 20 hours of battery life!",
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    finding = next(item for item in body["findings"] if item["category"] == "factual")
    assert finding["category"] == "factual"
    assert finding["severity"] == "critical"
    assert finding["evidence"]["source_id"] == "spec-voltedge-novabook"
    assert finding["evidence"]["version"] == "3"
    assert finding["suggestion"]["text"] == "Up to 10 hours of battery life* Terms apply."
    link = next(item for item in body["claim_links"] if item["fact_id"] == fact["id"])
    assert link["link_status"] == "contradicted"
    assert link["fact_version"] == "1"
    assert body["risk"]["label"] == "high"


def test_expired_offer_is_outdated_and_retains_the_offer_version() -> None:
    client = make_client()
    offer = approve(
        client,
        "disclaimers",
        {"offer": "Spring savings", "discount_percent": 15, "qualifier": "terms apply"},
        source_id="offer-voltedge-spring",
        source_version="1",
        effective_to="2026-04-30T00:00:00Z",
    )

    response = client.post(
        "/contents",
        json={"title": "VoltEdge spring offer", "source_text": "Save 15% with VoltEdge Spring savings."},
    )

    assert response.status_code == 201, response.text
    body = response.json()
    finding = next(item for item in body["findings"] if item["verdict"] == "outdated")
    assert finding["category"] == "offer_date"
    assert finding["evidence"]["source_id"] == "offer-voltedge-spring"
    assert finding["evidence"]["version"] == "1"
    link = next(item for item in body["claim_links"] if item["fact_id"] == offer["id"])
    assert link["link_status"] == "outdated"


def test_configured_terms_disclaimers_and_measured_contrast_are_deterministic() -> None:
    client = make_client()
    approve(
        client,
        "terms",
        {"preferred": "NovaBook", "banned": ["laptop thing"]},
        source_id="brand-language-voltedge",
        source_version="2",
    )
    approve(
        client,
        "disclaimers",
        {"required_text": "Terms apply.", "when": "promotion"},
        source_id="legal-voltedge-us",
        source_version="5",
    )

    response = client.post(
        "/contents",
        json={
            "title": "VoltEdge poster",
            "source_text": "This laptop thing is available for VoltEdge.",
            "metadata": {
                "foreground": "#777777",
                "background": "#FFFFFF",
                "font_size_px": 14,
            },
        },
    )

    assert response.status_code == 201, response.text
    categories = {item["category"] for item in response.json()["findings"]}
    assert {"terminology", "accessibility"}.issubset(categories)
