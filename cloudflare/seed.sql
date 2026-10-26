-- Fictional VoltEdge D1 seed. Load only into a dedicated demo database.
INSERT OR IGNORE INTO organisations (id, slug, name, settings_json, created_at, updated_at)
VALUES ('org-voltedge', 'voltedge', 'VoltEdge', '{"fictional":true,"market":"US","language":"en-US"}', '2026-10-26T00:00:00Z', '2026-10-26T00:00:00Z');

INSERT OR IGNORE INTO memberships (id, organisation_id, external_subject, email, role, status, created_at, updated_at)
VALUES ('membership-voltedge-owner', 'org-voltedge', 'cloudflare-access-subject-voltedge-owner', 'owner@example.invalid', 'brand_owner', 'active', '2026-10-26T00:00:00Z', '2026-10-26T00:00:00Z');

INSERT OR IGNORE INTO sources (id, organisation_id, title, source_type, version_label, content_hash, metadata_json, created_by_membership_id, created_at)
VALUES ('source-voltedge-novabook', 'org-voltedge', 'VoltEdge NovaBook S1 approved product specification', 'manual', '2026.10', 'fictional-voltedge-novabook-v2026-10', '{"fictional":true,"market":"US"}', 'membership-voltedge-owner', '2026-10-26T00:00:00Z');

INSERT OR IGNORE INTO registry_records (id, organisation_id, resource, record_key, version_number, value_json, scope_json, status, source_id, effective_from, created_by_membership_id, approved_by_membership_id, created_at)
VALUES ('fact-voltedge-battery-v1', 'org-voltedge', 'facts', 'novabook_s1_battery_life', 1, '{"product":"VoltEdge NovaBook S1","attribute":"battery_life","value":10,"unit":"hours","qualifier":"up_to"}', '{"market":"US","language":"en-US"}', 'approved', 'source-voltedge-novabook', '2026-10-01T00:00:00Z', 'membership-voltedge-owner', 'membership-voltedge-owner', '2026-10-26T00:00:00Z');
