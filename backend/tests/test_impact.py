"""PRD US-08 / Improvement 1 acceptance cases, using fictional VoltEdge data."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
import pytest

from backend.app.config import Settings
from backend.app.impact import (
    FactVersionCreateRequest,
    ImpactContentCreateRequest,
    ImpactRadarStore,
)
from backend.app.main import create_app


ORG = "org-voltedge"
BATTERY = "fact-voltedge-novabook-s1-battery"
OFFER = "fact-voltedge-october-offer"
STATES = ("draft", "in_review", "approved")


def headers(role: str = "brand_owner", organisation_id: str = ORG) -> dict[str, str]:
    return {
        "X-Proofline-User": f"user-voltedge-{role}",
        "X-Proofline-Organisation": organisation_id,
        "X-Proofline-Role": role,
    }


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(settings=Settings(dev_auth_enabled=True)))


def fact(client: TestClient, value: str = "Up to 10 hours", **overrides):
    payload = {
        "fact_id": BATTERY,
        "value": value,
        "unit": "hours",
        "status": "approved",
        "source_id": "source-voltedge-product-spec",
        "source_version": "1" if value == "Up to 10 hours" else "2",
        **overrides,
    }
    response = client.post("/v1/impact/fact-versions", headers=headers(), json=payload)
    assert response.status_code == 201, response.text
    return response.json()["item"]


def content(
    client: TestClient,
    *,
    label: str,
    state: str = "draft",
    fact_id: str = BATTERY,
    version: int = 1,
    claim_text: str = "VoltEdge NovaBook S1 delivers up to 10 hours of battery life.",
):
    payload = {
        "content_id": f"content-voltedge-{label}",
        "content_version_id": f"content-version-voltedge-{label}-v1",
        "title": f"VoltEdge {label}",
        "workflow_status": state,
        "claims": [
            {
                "claim_id": f"claim-voltedge-{label}",
                "claim_text": claim_text,
                "fact_id": fact_id,
                "fact_version": version,
            }
        ],
    }
    response = client.post("/v1/impact/content", headers=headers(), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def seed_all_states(client: TestClient, fact_id: str = BATTERY):
    return [
        content(client, label=f"{fact_id}-{state}-{index}", state=state, fact_id=fact_id)
        for state in STATES
        for index in range(2)
    ]


def affected(client: TestClient, **params):
    response = client.get("/v1/impact/revalidation", headers=headers(), params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_battery_10_to_12_lists_100_percent_of_seeded_content_in_every_state(client):
    first = fact(client)
    seeded = seed_all_states(client)
    assert affected(client)["affected_content_count"] == 0

    second = fact(client, "Up to 12 hours")
    result = affected(client, fact_id=BATTERY)

    expected_ids = {record["content"]["id"] for record in seeded}
    assert {item["content_id"] for item in result["items"]} == expected_ids
    assert result["affected_content_count"] == len(expected_ids) == 6
    assert result["affected_claim_count"] == result["task_count"] == 6
    assert {item["previous_workflow_status"] for item in result["items"]} == set(STATES)
    assert all(item["workflow_status"] == "re_review_required" for item in result["items"])
    assert all(item["re_review_required"] for item in result["items"])
    assert {(item["old_value"], item["new_value"]) for item in result["items"]} == {
        ("Up to 10 hours", "Up to 12 hours")
    }
    assert {(item["old_fact_version"], item["new_fact_version"]) for item in result["items"]} == {(1, 2)}
    assert all(item["old_source_version"] == "1" for item in result["items"])
    assert all(item["new_source_version"] == "2" for item in result["items"])
    assert all(item["reason"] == "fact_changed" for item in result["items"])
    versions = client.get(f"/v1/impact/facts/{BATTERY}/versions", headers=headers()).json()["items"]
    assert [item["value"] for item in versions] == ["Up to 10 hours", "Up to 12 hours"]
    assert [item["status"] for item in versions] == ["superseded", "approved"]
    assert first["id"] != second["id"]
    assert second["supersedes_version"] == 1
    for record in seeded:
        stored = client.get(f"/v1/impact/content/{record['content']['id']}", headers=headers()).json()
        assert stored["content"]["workflow_status"] == "re_review_required"
        assert stored["claims"][0]["claim_text"] == record["claims"][0]["claim_text"]
        assert stored["claims"][0]["fact_version"] == 1


def test_expired_offer_lists_100_percent_of_seeded_affected_content(client):
    now = datetime.now(timezone.utc)
    fact(
        client,
        "20% off VoltEdge NovaBook S1",
        fact_id=OFFER,
        unit="percent",
        effective_from=(now - timedelta(days=5)).isoformat(),
        effective_to=(now + timedelta(days=1)).isoformat(),
    )
    seeded = seed_all_states(client, fact_id=OFFER)
    response = client.post(
        f"/v1/impact/facts/{OFFER}/end-validity",
        headers=headers(),
        json={"fact_version": 1, "effective_to": (now - timedelta(seconds=1)).isoformat()},
    )
    assert response.status_code == 200
    assert response.json()["item"]["status"] == "expired"
    result = affected(client)
    assert {item["content_id"] for item in result["items"]} == {
        item["content"]["id"] for item in seeded
    }
    assert result["affected_content_count"] == 6
    assert all(item["reason"] == "fact_expired" for item in result["items"])
    assert all(item["new_value"] is None and item["new_fact_version"] is None for item in result["items"])
    # Expiry replay is idempotent, including the tasks and original fact value.
    replay = client.post(
        f"/v1/impact/facts/{OFFER}/end-validity",
        headers=headers(),
        json={"fact_version": 1, "effective_to": (now - timedelta(seconds=1)).isoformat()},
    )
    assert replay.status_code == 200
    assert replay.json()["item"]["value"] == "20% off VoltEdge NovaBook S1"
    assert affected(client)["task_count"] == 6


def test_natural_validity_ending_and_late_registered_links_are_detected(client):
    now = datetime.now(timezone.utc)
    record = fact(
        client,
        "20% off VoltEdge NovaBook S1",
        fact_id=OFFER,
        effective_from=(now - timedelta(days=30)).isoformat(),
        effective_to=(now - timedelta(days=10)).isoformat(),
    )
    assert record["status"] == "expired"
    seeded = seed_all_states(client, fact_id=OFFER)
    result = affected(client)
    assert {item["content_id"] for item in result["items"]} == {
        item["content"]["id"] for item in seeded
    }
    assert result["affected_content_count"] == 6


def test_fact_id_and_exact_version_are_both_required_for_impact(client):
    fact(client)
    changed = content(client, label="battery-uses-v1")
    fact(client, "Up to 12 hours")
    current = content(client, label="battery-uses-v2", version=2)
    fact(client, "$1,299", fact_id="fact-voltedge-price", unit="USD")
    unrelated = content(client, label="price", fact_id="fact-voltedge-price")

    result = affected(client)
    assert {item["content_id"] for item in result["items"]} == {changed["content"]["id"]}
    assert current["content"]["id"] not in {item["content_id"] for item in result["items"]}
    assert unrelated["content"]["id"] not in {item["content_id"] for item in result["items"]}


def test_draft_change_requires_explicit_owner_approval_before_flagging_content(client):
    fact(client)
    content(client, label="draft-fact-change")
    response = client.post(
        "/v1/impact/fact-versions",
        headers=headers("manager"),
        json={"fact_id": BATTERY, "value": "Up to 12 hours", "status": "draft"},
    )
    assert response.status_code == 201
    assert affected(client)["task_count"] == 0
    denied = client.post(f"/v1/impact/facts/{BATTERY}/versions/2/approve", headers=headers("manager"))
    assert denied.status_code == 403
    approved = client.post(f"/v1/impact/facts/{BATTERY}/versions/2/approve", headers=headers())
    assert approved.status_code == 200
    assert affected(client)["task_count"] == 1


def test_recheck_all_runs_bounded_version_checks_and_keeps_human_review_required(client):
    fact(client)
    seeded = seed_all_states(client)
    fact(client, "Up to 12 hours")
    response = client.post("/v1/impact/recheck-all", headers=headers(), json={"note": "VoltEdge fact update"})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "completed_review_required"
    assert result["checked_content_count"] == result["checked_claim_count"] == 6
    assert {item["content_id"] for item in result["results"]} == {
        item["content"]["id"] for item in seeded
    }
    assert all(item["verdict"] == "outdated" for item in result["results"])
    assert all(item["checked_fact_version"] == 2 for item in result["results"])
    assert all(item["evidence"]["quote"] == "Up to 12 hours" for item in result["results"])
    assert all(item["status"] == "rechecked" for item in result["tasks"])
    assert all(item["workflow_status"] == "re_review_required" for item in affected(client)["items"])
    saved = client.get("/v1/impact/rechecks", headers=headers()).json()["items"]
    assert saved == result["results"]
    events = client.get("/v1/impact/events", headers=headers()).json()["items"]
    recheck_events = [event for event in events if event["event_type"] == "impact_recheck_completed"]
    assert len(recheck_events) == 6
    assert all(event["actor_id"] == "user-voltedge-brand_owner" for event in recheck_events)
    assert all(event["created_at"] and event["metadata"]["old_value"] == "Up to 10 hours" for event in recheck_events)
    assert all(event["metadata"]["new_value"] == "Up to 12 hours" for event in recheck_events)


def test_recheck_without_source_abstains_instead_of_inventing_evidence(client):
    fact(client, source_id=None, source_version=None)
    content(client, label="source-missing")
    fact(client, "Up to 12 hours", source_id=None, source_version=None)
    result = client.post("/v1/impact/recheck-all", headers=headers(), json={}).json()
    assert result["results"][0]["verdict"] == "needs_human"
    assert result["results"][0]["evidence"] is None
    assert affected(client)["items"][0]["re_review_required"]


def test_recheck_empty_state_is_explicit_and_non_persistent(client):
    response = client.post("/v1/impact/recheck-all", headers=headers(), json={})
    assert response.status_code == 200
    assert response.json()["status"] == "no_affected_content"
    assert response.json()["results"] == []
    assert response.json()["persistence"] == "in_memory_demo"
    assert "stub_persistence" in response.json()["implementation_status"]


def test_old_and_new_fact_versions_and_task_history_survive_additional_changes(client):
    fact(client)
    content(client, label="older-battery")
    fact(client, "Up to 12 hours")
    before = affected(client)["items"][0]
    fact(client, "Up to 14 hours", source_version="3")
    result = affected(client)
    assert result["affected_content_count"] == result["affected_claim_count"] == 1
    assert result["task_count"] == 2
    assert before in result["items"]
    assert {(item["old_fact_version"], item["new_fact_version"]) for item in result["items"]} == {(1, 2), (1, 3)}


def test_stale_claim_registered_after_a_fact_change_is_immediately_flagged(client):
    fact(client)
    fact(client, "Up to 12 hours")
    record = content(client, label="late-older-battery")
    assert record["content"]["workflow_status"] == "re_review_required"
    assert affected(client)["affected_content_count"] == 1


def test_manager_cannot_create_an_already_approved_fact_version(client):
    response = client.post(
        "/v1/impact/fact-versions",
        headers=headers("manager"),
        json={"fact_id": BATTERY, "value": "Up to 12 hours", "status": "approved"},
    )
    assert response.status_code == 403
    assert affected(client)["task_count"] == 0


@pytest.mark.parametrize("role", ["creator", "agency"])
def test_scoped_roles_cannot_browse_organisation_wide_impact_or_mutate_facts(client, role):
    assert client.get("/v1/impact/affected", headers=headers(role)).status_code == 403
    assert client.get("/v1/impact/events", headers=headers(role)).status_code == 403
    assert client.post("/v1/impact/recheck-all", headers=headers(role), json={}).status_code == 403
    assert client.post("/v1/impact/fact-versions", headers=headers(role), json={"fact_id": BATTERY, "value": "12"}).status_code == 403


def test_organisation_scope_applies_to_shared_app_state_reads_and_writes(client):
    fact(client)
    registered = content(client, label="private-battery")
    fact(client, "Up to 12 hours")
    other = headers(organisation_id="org-voltedge-other")
    assert client.get("/v1/impact/affected", headers=other).json()["items"] == []
    assert client.get("/v1/impact/events", headers=other).json()["items"] == []
    assert client.get(f"/v1/impact/content/{registered['content']['id']}", headers=other).status_code == 404
    assert client.get(f"/v1/impact/facts/{BATTERY}/versions", headers=other).status_code == 404
    assert client.post(f"/v1/impact/facts/{BATTERY}/end-validity", headers=other, json={"effective_to": datetime.now(timezone.utc).isoformat()}).status_code == 404
    result = client.post("/v1/impact/recheck-all", headers=other, json={}).json()
    assert result["checked_content_count"] == 0
    assert affected(client)["items"][0]["task_status"] == "open"


def test_future_expiry_is_not_prematurely_marked_expired(client):
    now = datetime.now(timezone.utc)
    fact(client, effective_to=(now + timedelta(days=10)).isoformat())
    content(client, label="future-expiry")
    response = client.post(
        f"/v1/impact/facts/{BATTERY}/end-validity",
        headers=headers(),
        json={"effective_to": (now + timedelta(days=1)).isoformat()},
    )
    assert response.status_code == 422
    assert affected(client)["task_count"] == 0


@pytest.mark.parametrize(
    "overrides",
    [
        {"value": " "},
        {"source_id": "source-voltedge-spec", "source_version": None},
        {"effective_from": "2026-10-20T00:00:00Z", "effective_to": "2026-10-01T00:00:00Z"},
        {"effective_to": "2026-10-15T00:00:00"},
        {"organisation_id": "org-voltedge-other"},
    ],
)
def test_invalid_fact_inputs_do_not_create_successful_records(client, overrides):
    response = client.post(
        "/v1/impact/fact-versions",
        headers=headers(),
        json={"fact_id": BATTERY, "value": "Up to 10 hours", **overrides},
    )
    assert response.status_code == 422
    assert client.get(f"/v1/impact/facts/{BATTERY}/versions", headers=headers()).status_code == 404


def test_duplicate_claim_registration_is_atomic_and_does_not_overwrite_history(client):
    fact(client)
    stored = content(client, label="immutable")
    payload = {
        "content_id": stored["content"]["id"],
        "title": "VoltEdge must not overwrite this record",
        "claims": [
            {"claim_id": stored["claims"][0]["id"], "claim_text": "Different text", "fact_id": BATTERY, "fact_version": 1}
        ],
    }
    assert client.post("/v1/impact/content", headers=headers(), json=payload).status_code == 422
    result = client.get(f"/v1/impact/content/{stored['content']['id']}", headers=headers()).json()
    assert result == stored


def test_unknown_fact_version_cannot_be_registered_or_create_content(client):
    fact(client)
    response = client.post(
        "/v1/impact/content",
        headers=headers(),
        json={"content_id": "content-voltedge-invalid", "title": "VoltEdge invalid link", "claims": [{"claim_text": "Up to 99 hours", "fact_id": BATTERY, "fact_version": 99}]},
    )
    assert response.status_code == 404
    assert client.get("/v1/impact/content/content-voltedge-invalid", headers=headers()).status_code == 404


def test_new_store_does_not_claim_or_retain_durable_persistence(client):
    fact(client)
    store = ImpactRadarStore()
    other = TestClient(create_app(settings=Settings(dev_auth_enabled=True), impact_store=store))
    assert other.get(f"/v1/impact/facts/{BATTERY}/versions", headers=headers()).status_code == 404
    assert other.get("/v1/impact/affected", headers=headers()).json()["persistence"] == "in_memory_demo"


def test_store_returns_copies_so_callers_cannot_rewrite_fact_history():
    store = ImpactRadarStore()
    stored = store.create_fact_version(ORG, FactVersionCreateRequest(fact_id=BATTERY, value="Up to 10 hours"), "user-voltedge-owner")
    stored.value = "not the saved value"
    assert store.get_fact_version(ORG, BATTERY, 1).value == "Up to 10 hours"
