# Proofline verified state

**Last verified:** 2026-10-25 20:38 IST
**Phase:** 1 — audit, plan, foundation
**Rule:** statuses below describe what was actually inspected or run, not what the PRD
proposes.

## Audit baseline

- `npm install`: **WORKING** — completed successfully; dependencies were already current.
- `npm run lint`: **WORKING** — passed after the Phase 1 changes.
- `npm run typecheck`: **WORKING** — passed after the Phase 1 changes.
- `npm run build`: **WORKING** — Next.js production build completed after the Phase 1
  changes.
- `npm test`: **WORKING** — the combined script passed frontend lint/typecheck/build and
  11 backend pytest tests; one Starlette/httpx deprecation warning remains.
- `python3 -m pip install -r backend/requirements.txt`: **WORKING** — FastAPI, Uvicorn,
  PyJWT, HTTPX, and pytest installed in the local environment.
- FastAPI local runtime: **WORKING (local only)** — `/health`, opt-in dev-header auth,
  HS256 JWT verification, organisation-scoped in-memory vault CRUD, versioning, and
  brand-owner approval were exercised with HTTP smoke calls.
- Supabase runtime: **STUB** — no project URL, Auth connection, or durable adapter was
  configured. The migration and seed were applied successfully to a temporary local
  PostgreSQL database with the required auth schema shim, then the database was dropped.
- Docker foundation: **WORKING (image smoke test)** — `backend/Dockerfile` built and the
  container `/health` endpoint returned 200 JSON.

## PRD MVP capability status

| PRD capability | Status | Verification / boundary |
|---|---|---|
| F-01 Brand workspace and role-based access | PARTIAL | Local FastAPI role checks and organisation-scoped store isolation are covered by pytest and HTTP smoke calls; JWT verification is optional/configuration-gated. Supabase Auth/RLS is not connected to a live project. |
| F-02 Brand Truth Registry | PARTIAL | Local API supports draft create, version, list, get, and brand-owner approval for facts/terms/guidelines/disclaimers/assets. SQL migration/RLS/VoltEdge seed applied in temporary PostgreSQL; durable Supabase CRUD is not connected. |
| F-03 Content intake and extraction | STUB | Existing UI offers a seeded intake modal only; no verified PDF/DOCX/OCR extraction pipeline. |
| F-04 Multi-layer content audit | PARTIAL | Existing UI demonstrates seeded findings and re-scan states; 12 VoltEdge golden fixtures cover expected categories, but no backend audit engine or live model/OCR integration exists. |
| F-05 Evidence-linked findings and risk categories | PARTIAL | The compact Finding schema and extended persistence mapping are documented, and fixtures require evidence for supported mismatches. No runtime finding persistence/validation route is implemented. |
| F-06 Intent-preserving corrections | PARTIAL | Existing UI lets a user apply/undo seeded suggestions into a new revision state. No backend revision persistence or re-check is verified. |
| F-07 Revision-aware audit history | PARTIAL | Local vault versioning retains prior records and the SQL schema contains content/audit/version relationships; live durable audit history is not connected. |
| F-08 Human review and approval | PARTIAL | Local API restricts vault approval to `brand_owner` and retains actor/time; content review/approval persistence is still planned. |
| F-09 Dashboard and audit export | STUB | Existing dashboard/insights values are seeded UI data; no saved-record aggregation or export path is verified. |
| F-10 Privacy and AI-transparency panel | PARTIAL | `docs/AI_DISCLOSURE.md`, `/health`, and the demo-state UI labels disclose unconfigured AI and local state. A full user-facing provider/data panel is not implemented. |
| F-11 Basic accessibility checks | STUB | Existing UI includes accessible labels and a seeded accessibility registry card, but no measured content contrast/alt-text/readability audit path is verified. |

## Foundation status after Phase 1 work

## Remaining gaps

- No real Supabase project, Auth membership lookup, Storage adapter, pgvector retrieval,
  Gemini integration, OCR/PDF/DOCX extraction, content audit route, or persistent review
  workflow was verified.
- The existing Next.js screen remains a seeded demonstration UI. It is not a logged-in
  production workspace, and its dashboard counts are not persisted backend metrics.
- The FastAPI in-memory adapter is useful for contract/RBAC tests only; it must not be
  used with confidential production records.
