from __future__ import annotations

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


def test_supabase_jwt_claims_are_verified_and_mapped_to_a_principal() -> None:
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


def test_organisation_scope_isolation_is_enforced_by_the_store() -> None:
    owner_client = make_client(organisation_id="org-one")
    record = owner_client.post(
        "/v1/terms",
        json={"value": {"term": "cheap", "status": "banned"}},
    ).json()["item"]

    other_client = make_client(organisation_id="org-two")
    assert other_client.get(f"/v1/terms/{record['id']}").status_code == 404
