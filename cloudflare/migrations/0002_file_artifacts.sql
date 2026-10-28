-- Migration 0002: File Artifacts Table for D1
-- Replaces Cloudflare R2 object storage for environments without active R2 entitlement.
-- Stores document metadata, SHA-256 hash, extracted text, and base64 payload up to D1 row limit.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS file_artifacts (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256_hash TEXT NOT NULL,
  extracted_text TEXT,
  file_base64 TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_membership_id TEXT REFERENCES memberships(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_artifacts_org ON file_artifacts (organisation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_file_artifacts_hash ON file_artifacts (organisation_id, sha256_hash);
