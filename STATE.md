# Proofline verified state

**Last verified:** 2026-10-26 01:53 IST
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
| F-03 Content intake and extraction | IMPLEMENTED (local) | Text, bounded PDF/DOCX/image ingestion adapters preserve normalized offsets, provenance, metadata, and explicit failure states. Optional parser/OCR and external vision dependencies remain fail-soft and are not claimed as hosted services. |
| F-04 Multi-layer content audit | IMPLEMENTED (local) | The FastAPI content route runs deterministic claims/rules, evidence validation, optional provider checks, verification, dedupe, and transparent risk scoring. No-key model-dependent checks become `needs_human`; no live model/OCR integration is claimed. |
| F-05 Evidence-linked findings and risk categories | IMPLEMENTED (local) | Findings and Claim–Fact Ledger links are validated and retained in the in-memory content store with source/version evidence, risk breakdown, and explicit unsupported/conflict states. |
| F-06 Intent-preserving corrections | IMPLEMENTED (local) | Suggestions use values from approved records, finding actions are auditable, and recheck creates immutable content versions without silent mutation or publication. |
| F-07 Revision-aware audit history | IMPLEMENTED (local) | Content versions, audits, finding diffs, claims, links, actions, and workflow events are retained for the process lifetime; no durable database is connected. |
| F-08 Human review and approval | PARTIAL | Local API restricts vault approval to `brand_owner` and retains actor/time; content review/approval persistence is still planned. |
| F-09 Dashboard and audit export | STUB | Existing dashboard/insights values are seeded UI data; no saved-record aggregation or export path is verified. |
| F-10 Privacy and AI-transparency panel | PARTIAL | `docs/AI_DISCLOSURE.md`, `/health`, and the demo-state UI labels disclose unconfigured AI and local state. A full user-facing provider/data panel is not implemented. |
| F-11 Basic accessibility checks | IMPLEMENTED (local bounded) | Deterministic contrast, missing-alt-text, palette-distance, and hashtag-readability checks run only when measurable metadata is supplied; they do not certify full accessibility. |

## Foundation status after Phase 1 work

## Remaining gaps

- No real Supabase project, Auth membership lookup, Storage adapter, pgvector retrieval,
  live Gemini request, hosted OCR/vision fallback, or durable persistence was verified.
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
- **Backend checks:** `python3 -m pytest -q backend/tests` passed with **133 passed** and
  three Starlette deprecation warnings. The focused workflow suite passed **18 tests**.
- **Browser checks:** smoke **2 passed**, collaboration **5 passed**, and API workflow
  **4 passed** using the local Playwright configurations. These are local/in-memory demo
  checks, not production authentication or durable persistence tests.
- **Frontend checks:** `npm run typecheck`, `npm run lint`, `npm run build`, and the full
  `npm test` wrapper now pass sequentially. ESLint reports one existing unused-variable
  warning in `app/page.tsx`; no lint errors were produced.
- **Evaluation:** `python3 -m app.eval` now runs the 52-case HTTP contract evaluator with
  **0 honest failures**. Its category projections are recorded in `docs/EVAL_REPORT.md`;
  they remain synthetic local measurements, not model accuracy.
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
- **Frontend improvement surfaces: IMPLEMENTED (local/demo).** Reusable Impact Radar and
  Governance Insights components and standalone `/impact` and `/insights` pages are
  present with synthetic local callbacks and now pass the sequential frontend checks.
- **CI/container foundation: ADDED locally.** GitHub Actions, the frontend/backend
  Dockerfiles, and local `docker-compose.yml` are present. GitHub has not run the workflow
  in this workspace, so CI is not claimed green.

## Phase 4 checks actually run

- `python3 -m pytest -q`: **WORKING** — 140 passed, 3 deprecation warnings.
- `python3 scripts/generate_golden.py --check`: **WORKING** — 194 generated VoltEdge
  cases matched the committed deterministic bundle.
- `python3 scripts/eval.py --report docs/EVAL_REPORT.md`: **WORKING** — regenerated the
  report with no per-case exceptions; exact results are in `docs/EVAL_REPORT.md`.
- `python3 scripts/simulate_review_activity.py --compact`: **WORKING** — emitted a
  deterministic sample of 10 events, 5 suggested rule updates, and
  `individual_rankings_included: false`.
- `npm run typecheck`: **WORKING** — passed sequentially after a clean Next.js build.
- `npm run lint`: **WORKING** — passed with one existing unused-variable warning in
  `app/page.tsx`; no lint errors.
- `npm run build`: **WORKING** — Next.js production build completed for all local pages.
- `npm test`: **WORKING** — frontend lint/typecheck/build, 7 browser smoke/collaboration
  tests, and 133 backend tests completed; 3 Starlette deprecation warnings remain.
- Playwright frontend/E2E checks: **WORKING** — 7 browser tests and 4 local API workflow
  tests passed.

## Phase 2 verification-engine continuation

- **Verified:** 2026-10-26 01:53 IST. The audit boundary now adapts the verification
  package's typed options instead of silently falling back, derives configured term and
  disclaimer policies from approved vault rows, matches attribute/offer/claim records,
  normalizes USD/EUR/GBP alongside INR formats, and preserves built-in rule evidence such
  as WCAG contrast citations.
- **Acceptance behavior:** an applicable battery mismatch is `factual` + `contradicted` +
  `critical`, retains the approved source/version and Claim–Fact Ledger link, and proposes
  an approved-value correction. Expired offers are `offer_date` + `outdated` with the old
  source/version retained. Missing evidence remains unsupported or `needs_human`.
- **Independent HTTP evaluation:** `python3 -m app.eval` reported 52 cases and **0 honest
  failures**. Category precision/recall and the offline tone/factual caveats are recorded
  in `docs/EVAL_REPORT.md`.
- **Regression checks:** `backend/tests/test_phase2_integration.py` adds three API-level
  checks for critical evidence-linked corrections, expired offers, and term/disclaimer/
  contrast rules. Full `python3 -m pytest -q` reports **140 passed**.
- **Boundary:** all of this remains local/in-memory. No live Gemini request, Supabase
  persistence, hosted OCR/vision service, or production authentication was exercised.

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
