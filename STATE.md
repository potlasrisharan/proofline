# Proofline verified state

**Last verified:** 2026-10-26
**Phase:** 4 — improvements, hardening, deploy, docs
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

## Phase 4 starting baseline

- **Baseline checked:** 2026-10-25. `npm test` passed; it ran ESLint, TypeScript,
  Next.js build, and 11 backend pytest tests. A Starlette/httpx deprecation warning
  remains; it does not currently fail the suite.
- **Phase 4 status:** IN PROGRESS. Impact radar, governance insights, evidence-or-abstain
  reliability, deployment, and documentation updates are being developed from this
  baseline. No deployment or external service connection is verified yet.

## Phase 3 workflow and review verification

- **Verified:** 2026-10-26 IST. The local workflow API and seeded browser review experience
  now cover content states, role-scoped queue visibility, high-risk approval boundaries,
  revision history, span comments, evidence-linked findings, correction actions, audit-chain
  display/verification, and synthetic VoltEdge trust disclosures.
- **Backend checks:** `python3 -m pytest -q backend/tests` passed with **130 passed** and
  three Starlette deprecation warnings. The focused workflow suite passed **18 tests**.
- **Browser checks:** smoke **2 passed**, collaboration **5 passed**, and API workflow
  **4 passed** using the local Playwright configurations. These are local/in-memory demo
  checks, not production authentication or durable persistence tests.
- **Frontend checks:** `npm run typecheck` passed and `npm run build` passed. `npm run lint`
  and `npm test` remain blocked by the installed ESLint dependency load failure under Node
  `v25.9.0` (`ETIMEDOUT` while loading `node_modules/resolve/lib/async.js`); no lint
  diagnostics were produced. This is an environment/toolchain blocker, not reported as a
  passing check.
- **Evaluation:** `python3 -m app.eval` ran the 52-case legacy evaluator and reported 27
  honest failures. The output identifies missing Phase 2 API/evidence-ledger coverage; it
  is not a passing accuracy claim and remains open for the next verification-engine pass.
- **Remaining gaps:** the browser demo is not wired to the FastAPI API; durable Supabase,
  live Auth, external AI/OCR, hosted deployment, and production persistence remain
  **STUB**, **PLANNED**, or **MISSING** as documented.

## Phase 4 verified local work

- **Fact-Change Impact Radar: IMPLEMENTED (local).** The in-memory adapter versions
  approved facts, ends validity, follows exact `fact_id` plus version claim links across
  draft/in-review/approved content, marks affected records `re_review_required`, creates
  auditable tasks, and exposes deterministic re-check receipts. `backend/tests/test_impact.py`
  includes the 10 → 12 hour battery change and expired-offer cases; the seeded affected
  content assertions cover all six records in each scenario.
- **Governance Insights and Guideline-Gap Detector: IMPLEMENTED (local analytics).** The
  deterministic engine computes category/rule counts, team/agency aggregates, UTC trends,
  expiry signals, ambiguity signals, explicit guideline conflicts, and owner-only
  unapplied rule-update proposals. The simulation is synthetic VoltEdge data only.
- **Evidence-or-Abstain reliability: IMPLEMENTED (local deterministic measurement).** The
  generated set contains 194 cases and covers unit conversions, approximation wording,
  currency formats, and prompt-injection text. The report records exact case-level
  measurements: factual precision 154/154 (1.000000), factual recall 154/158 (0.974684),
  and 1.000000 precision/recall for legal, offer_date, promotional, security, and
  terminology categories. These are synthetic local measurements, not model accuracy.
- **Frontend improvement surfaces: ADDED, latest wiring unverified.** Reusable Impact
  Radar/Governance Insights components and standalone `/impact` and `/insights` pages are
  present with synthetic local callbacks. Because the final page wiring was added after
  the last successful TypeScript run, it is not claimed as passing frontend-verified.
- **CI/container foundation: ADDED locally.** GitHub Actions, the frontend/backend
  Dockerfiles, and local `docker-compose.yml` are present. GitHub has not run the workflow
  in this workspace, so CI is not claimed green.

## Phase 4 checks actually run

- `python3 -m pytest -q`: **WORKING** — 137 passed, 3 deprecation warnings.
- `python3 scripts/generate_golden.py --check`: **WORKING** — 194 generated VoltEdge
  cases matched the committed deterministic bundle.
- `python3 scripts/eval.py --report docs/EVAL_REPORT.md`: **WORKING** — regenerated the
  report with no per-case exceptions; exact results are in `docs/EVAL_REPORT.md`.
- `python3 scripts/simulate_review_activity.py --compact`: **WORKING** — emitted a
  deterministic sample of 10 events, 5 suggested rule updates, and
  `individual_rankings_included: false`.
- `npm run typecheck`: **WORKING before the final standalone page wiring** — the final
  page additions were not re-run through TypeScript because the local frontend toolchain
  became unavailable during the subsequent check attempts.
- `npm run lint`: **NOT VERIFIED** — ESLint failed while loading the installed
  `node_modules/node-exports-info` dependency with `ETIMEDOUT` under Node `v25.9.0`.
- `npm run build`: **NOT VERIFIED** — Next.js reported that another build process was
  already running. No deployed build was established.
- `npm test`: **NOT COMPLETED** — the combined command exceeded its 120-second shell
  timeout during the frontend lint step; it did not reach a full final-suite result.
- Playwright frontend/E2E checks: **NOT VERIFIED** in this continuation because the
  combined frontend checks did not complete.

## Deployment and external-service status

- Hosted frontend URL: **MISSING / not deployed**.
- Hosted backend URL: **MISSING / not deployed**.
- Supabase project, Auth membership lookup, Storage, external AI/OCR provider, and durable
  runtime persistence: **STUB / PLANNED**; no credentials or live project were available
  for verification.
- A real deployment requires the project owner to provide access to a project-dedicated
  Vercel/Cloudflare account and a Docker-capable backend host, plus the selected project
  identifiers and server-side environment variables. Do not put those values in this
  repository or chat.
