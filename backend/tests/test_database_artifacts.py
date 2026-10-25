from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).parents[2]
MIGRATION = (ROOT / "supabase" / "migrations" / "20261025000100_proofline_phase1_foundation.sql").read_text()
SEED = (ROOT / "supabase" / "seed.sql").read_text()


def test_migration_contains_the_tenant_aware_phase_one_tables_and_audit_hash_chain() -> None:
    for table in (
        "organisations",
        "memberships",
        "facts",
        "fact_versions",
        "terms",
        "guidelines",
        "disclaimers",
        "assets",
        "contents",
        "content_versions",
        "claims",
        "findings",
        "comments",
        "approvals",
        "audit_events",
    ):
        assert f"create table public.{table}" in MIGRATION

    assert "create type public.membership_role as enum" in MIGRATION
    assert "'brand_owner'" in MIGRATION
    assert "prev_hash text" in MIGRATION
    assert "hash text not null" in MIGRATION
    assert "enable row level security" in MIGRATION
    assert "create policy fact_versions_owner_update" in MIGRATION
    assert "status <> 'approved'" in MIGRATION


def test_seed_is_fictional_voltedge_data_with_required_registry_examples() -> None:
    assert '"fictional":true' in SEED
    assert "Battery life: up to 10 hours of video playback." in SEED
    assert "20% off NovaBook S1" in SEED
    assert "'expired'" in SEED
    assert "'cheap'" in SEED
    assert "'preferred_alt'" in SEED
    assert "Terms apply." in SEED
    assert "VoltEdge wordmark" in SEED
    assert "VoltEdge primary palette" in SEED
