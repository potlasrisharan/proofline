-- Proofline D1 foundation.
-- This is the Cloudflare SQLite/D1 replacement for the legacy PostgreSQL/Supabase
-- foundation. It is a deployment-ready schema artifact, not evidence of a connected D1
-- database. Organisation checks remain mandatory in every Worker query.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  external_subject TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('creator', 'manager', 'legal_reviewer', 'brand_owner', 'agency')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (organisation_id, external_subject)
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('document', 'url', 'manual', 'system')),
  uri TEXT,
  storage_key TEXT,
  version_label TEXT NOT NULL DEFAULT '1',
  content_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_membership_id TEXT REFERENCES memberships(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registry_records (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  resource TEXT NOT NULL CHECK (resource IN ('facts', 'terms', 'guidelines', 'disclaimers', 'assets')),
  record_key TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  value_json TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'superseded', 'expired', 'retired')),
  source_id TEXT REFERENCES sources(id),
  effective_from TEXT,
  effective_to TEXT,
  created_by_membership_id TEXT REFERENCES memberships(id),
  approved_by_membership_id TEXT REFERENCES memberships(id),
  created_at TEXT NOT NULL,
  UNIQUE (organisation_id, resource, record_key, version_number)
);

CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  owner_membership_id TEXT NOT NULL REFERENCES memberships(id),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'pdf', 'docx', 'image', 'other')),
  workflow_status TEXT NOT NULL DEFAULT 'draft',
  confidential INTEGER NOT NULL DEFAULT 0 CHECK (confidential IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  source_text TEXT NOT NULL,
  source_storage_key TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'not_applicable',
  extraction_metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_membership_id TEXT NOT NULL REFERENCES memberships(id),
  created_at TEXT NOT NULL,
  UNIQUE (organisation_id, content_id, version_number)
);

CREATE TABLE IF NOT EXISTS audit_runs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  content_version_id TEXT NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  service_metadata_json TEXT NOT NULL DEFAULT '{}',
  risk_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  audit_run_id TEXT NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  content_version_id TEXT NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  verdict TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  excerpt TEXT NOT NULL,
  evidence_json TEXT,
  suggestion_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_decisions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  content_version_id TEXT NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  actor_membership_id TEXT NOT NULL REFERENCES memberships(id),
  action TEXT NOT NULL,
  reason TEXT,
  comment TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  content_id TEXT,
  actor_membership_id TEXT REFERENCES memberships(id),
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  prev_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_subject ON memberships (external_subject);
CREATE INDEX IF NOT EXISTS idx_registry_scope ON registry_records (organisation_id, resource, status);
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions (organisation_id, content_id, version_number);
CREATE INDEX IF NOT EXISTS idx_audits_version ON audit_runs (organisation_id, content_version_id, created_at);
CREATE INDEX IF NOT EXISTS idx_findings_audit ON findings (organisation_id, audit_run_id, status);
CREATE INDEX IF NOT EXISTS idx_review_decisions_version ON review_decisions (organisation_id, content_version_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events (organisation_id, created_at);
