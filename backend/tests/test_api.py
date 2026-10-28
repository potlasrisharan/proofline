from __future__ import annotations

import base64
from fastapi.testclient import TestClient
import jwt

from backend.app.auth import get_current_principal
from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.models import Principal, Role


def make_client(role: Role = Role.BRAND_OWNER, organisation_id: str = "org-voltedge") -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_principal] = lambda: Principal(
        user_id=f"user-{role.value}",
        organisation_id=organisation_id,
        role=role,
        auth_source="test_override",
    )
    return TestClient(app)


def test_health_is_explicit_about_unconfigured_integrations() -> None:
    response = make_client().get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["persistence"] == "in_memory_demo"
    assert body["ai_provider"] == "not_configured"


def test_requests_require_authentication_when_no_override_is_present() -> None:
    client = TestClient(create_app())

    response = client.get("/v1/facts")

    assert response.status_code == 401


def test_development_header_auth_is_opt_in() -> None:
    app = create_app(settings=Settings(dev_auth_enabled=True))
    client = TestClient(app)

    response = client.get(
        "/v1/facts",
        headers={
            "X-Proofline-User": "user-local",
            "X-Proofline-Organisation": "org-voltedge",
            "X-Proofline-Role": "brand_owner",
        },
    )

    assert response.status_code == 200
    assert response.json()["organisation_id"] == "org-voltedge"


def test_local_jwt_claims_are_verified_and_mapped_to_a_principal() -> None:
    secret = "phase1-test-secret-0123456789abcdef"
    app = create_app(settings=Settings(supabase_jwt_secret=secret))
    client = TestClient(app)
    token = jwt.encode(
        {
            "sub": "user-jwt",
            "organisation_id": "org-voltedge",
            "proofline_role": "brand_owner",
        },
        secret,
        algorithm="HS256",
    )

    response = client.get("/v1/facts", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["organisation_id"] == "org-voltedge"


def test_brand_owner_can_create_and_approve_a_fact() -> None:
    client = make_client()
    created = client.post(
        "/v1/facts",
        json={
            "value": {"key": "novabook_s1_battery_life", "value": "up to 10 hours", "unit": "hours"},
            "source_id": "source-voltedge-spec-v1",
            "source_version": "1",
        },
    )

    assert created.status_code == 201
    draft = created.json()["item"]
    assert draft["status"] == "draft"
    assert draft["version"] == 1

    approved = client.post(f"/v1/facts/{draft['id']}/approve")

    assert approved.status_code == 200
    approved_record = approved.json()["item"]
    assert approved_record["status"] == "approved"
    assert approved_record["approved_by"] == "user-brand_owner"


def test_creator_cannot_create_or_approve_registry_records() -> None:
    creator_client = make_client(Role.CREATOR)
    create_response = creator_client.post(
        "/v1/facts",
        json={"value": {"key": "draft_fact", "value": "value"}},
    )

    assert create_response.status_code == 403

    owner_client = make_client()
    draft = owner_client.post(
        "/v1/facts",
        json={"value": {"key": "draft_fact", "value": "value"}},
    ).json()["item"]
    assert creator_client.post(f"/v1/facts/{draft['id']}/approve").status_code == 403


def test_new_version_preserves_the_previous_record() -> None:
    client = make_client()
    first = client.post(
        "/v1/facts",
        json={"value": {"key": "novabook_s1_price", "value": "$1,299"}},
    ).json()["item"]
    second = client.post(
        f"/v1/facts/{first['id']}/versions",
        json={"value": {"key": "novabook_s1_price", "value": "$1,249"}},
    ).json()["item"]

    assert second["version"] == 2
    records = client.get("/v1/facts").json()["items"]
    assert {record["id"] for record in records} == {first["id"], second["id"]}
    assert first["status"] == "draft"


def test_approving_new_version_supersedes_previous_approved_version() -> None:
    client = make_client()
    first = client.post(
        "/v1/facts",
        json={"value": {"key": "novabook_s1_battery_life", "value": 10, "unit": "hours"}},
    ).json()["item"]
    client.post(f"/v1/facts/{first['id']}/approve")
    second = client.post(
        f"/v1/facts/{first['id']}/versions",
        json={"value": {"key": "novabook_s1_battery_life", "value": 12, "unit": "hours"}},
    ).json()["item"]

    approved = client.post(f"/v1/facts/{second['id']}/approve")

    assert approved.status_code == 200
    records = {record["id"]: record for record in client.get("/v1/facts").json()["items"]}
    assert records[first["id"]]["status"] == "superseded"
    assert records[second["id"]]["status"] == "approved"


def test_organisation_scope_isolation_is_enforced_by_the_store() -> None:
    owner_client = make_client(organisation_id="org-one")
    record = owner_client.post(
        "/v1/terms",
        json={"value": {"term": "cheap", "status": "banned"}},
    ).json()["item"]

    other_client = make_client(organisation_id="org-two")
    assert other_client.get(f"/v1/terms/{record['id']}").status_code == 404


def test_registry_search_import_and_retire_are_explicit_and_owner_gated() -> None:
    owner = make_client()
    imported = owner.post(
        "/v1/terms/import",
        json={
            "source_filename": "voltedge-terms.csv",
            "source_type": "csv",
            "records": [
                {"value": {"term": "laptop thing", "banned": True}, "source_id": "language-v2", "source_version": "2"},
            ],
        },
    )
    assert imported.status_code == 201, imported.text
    item = imported.json()["items"][0]
    assert item["status"] == "draft"
    assert item["metadata"]["import"]["filename"] == "voltedge-terms.csv"
    assert owner.get("/v1/terms?q=laptop").json()["items"][0]["id"] == item["id"]
    assert owner.post(f"/v1/terms/{item['id']}/approve").status_code == 200
    assert owner.post(f"/v1/terms/{item['id']}/retire").json()["item"]["status"] == "retired"
    events = owner.get("/v1/audit-events").json()["items"]
    assert {event["event_type"] for event in events} >= {
        "registry_imported",
        "registry_record_approved",
        "registry_record_retired",
    }
    assert owner.get("/v1/audit-events/verify-chain").json()["valid"] is True
    creator = make_client(Role.CREATOR)
    assert creator.post(f"/v1/terms/{item['id']}/retire").status_code == 403


def test_registry_csv_file_import_keeps_rows_as_drafts_with_source_metadata() -> None:
    client = make_client()
    csv_data = "key,value,source_id,source_version\nnovabook_name,NovaBook S1,brand-language,2\n"
    response = client.post(
        "/v1/facts/import-file",
        json={
            "filename": "voltedge-facts.csv",
            "mime_type": "text/csv",
            "file_base64": base64.b64encode(csv_data.encode()).decode(),
        },
    )
    assert response.status_code == 201, response.text
    item = response.json()["items"][0]
    assert item["status"] == "draft"
    assert item["value"]["key"] == "novabook_name"
    assert item["source_id"] == "brand-language"
    assert item["metadata"]["import"]["extraction_status"] == "complete"


def test_content_file_intake_and_raw_artifact_retrieval() -> None:
    client = make_client(Role.CREATOR)
    raw_content = b"NovaBook S1 features a 99Wh battery and 140W fast charging."
    create_res = client.post(
        "/contents",
        json={
            "title": "Specs PDF",
            "content_type": "text",
            "file_base64": base64.b64encode(raw_content).decode(),
            "filename": "specs.txt",
            "mime_type": "text/plain",
        },
    )
    assert create_res.status_code == 201, create_res.text
    version_id = create_res.json()["content_version_id"]

    raw_res = client.get(f"/content-versions/{version_id}/raw")
    assert raw_res.status_code == 200, raw_res.text
    body = raw_res.json()
    assert body["type"] == "file"
    assert body["storage"] == "d1_file_artifacts"
    assert base64.b64decode(body["data_base64"]) == raw_content

