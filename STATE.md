# Proofline verified state

**Last verified:** 2026-10-28 23:50 IST
**Phase:** 4 — Cloudflare full-stack deployment, D1 file artifacts, Pages live pairing
**Rule:** statuses below describe what was actually inspected or run, not what the PRD
proposes.

## Audit baseline

- `npm install`: **WORKING** — completed successfully; dependencies were already current.
- `npm run lint`: **WORKING** — passed after the Phase 1 changes.
- `npm run typecheck`: **WORKING** — passed after the Phase 1 changes.
- `npm run build`: **WORKING** — Next.js production build completed after the Phase 1
  changes.
- `npm test`: **WORKING** — the combined script passed frontend lint/typecheck/build, 9
  browser tests, 139 backend/report-safety tests, generated-fixture validation, and the
  read-only evaluation-report check. No lint errors or test failures remain.
- `python3 -m pip install -r backend/requirements.txt`: **WORKING** — FastAPI, Uvicorn,
  PyJWT, HTTPX, and pytest installed in the local environment.
- FastAPI local runtime: **WORKING (local only)** — `/health`, opt-in dev-header auth,
  HS256 JWT verification, organisation-scoped in-memory vault CRUD, versioning, and
  brand-owner approval were exercised with HTTP smoke calls.
- Legacy PostgreSQL runtime: **LEGACY / NOT TARGET** — no hosted Supabase project or
  durable adapter is configured. The old migration and seed were applied successfully to
  a temporary local PostgreSQL database with the required auth schema shim, then dropped.
- Cloudflare runtime: **DEPLOYED & VERIFIED** — Cloudflare Pages (`https://proofline-4cz.pages.dev`),
  Python Worker (`https://proofline-api.potlasrisharanchowdary.workers.dev`), and remote D1 database
  `proofline` (`507b5293-0765-4497-9739-510a25639f17`) are live and operational. D1 migrations
  `0001_proofline_foundation.sql` and `0002_file_artifacts.sql` are applied on remote D1. The D1
  `file_artifacts` table provides bounded document/hash storage replacing R2 object storage.
- Docker foundation: **WORKING (image smoke test)** — `backend/Dockerfile` built and the
  container `/health` endpoint returned 200 JSON.

## PRD MVP capability status

| PRD capability | Status | Verification / boundary |
|---|---|---|
| F-01 Brand workspace and role-based access | PARTIAL | Local FastAPI role checks and organisation-scoped store isolation are covered by pytest and HTTP smoke calls; JWT verification is optional/configuration-gated. Cloudflare Access/D1 membership is not connected. |
| F-02 Brand Truth Registry | PARTIAL | Local API supports draft create, version, list, get, and brand-owner approval for facts/terms/guidelines/disclaimers/assets. D1 migration/VoltEdge seed exists; durable D1 CRUD is not connected. |
| F-03 Content intake and extraction | IMPLEMENTED (local) | Text, bounded PDF/DOCX/image ingestion adapters preserve normalized offsets, provenance, metadata, and explicit failure states. Optional parser/OCR and external vision dependencies remain fail-soft and are not claimed as hosted services. |
| F-04 Multi-layer content audit | IMPLEMENTED (local) | The FastAPI content route runs deterministic claims/rules, evidence validation, optional provider checks, verification, dedupe, and transparent risk scoring. No-key model-dependent checks become `needs_human`; no live model/OCR integration is claimed. |
| F-05 Evidence-linked findings and risk categories | IMPLEMENTED (local) | Findings and Claim–Fact Ledger links are validated and retained in the in-memory content store with source/version evidence, risk breakdown, and explicit unsupported/conflict states. |
| F-06 Intent-preserving corrections | IMPLEMENTED (local) | Suggestions use values from approved records, finding actions are auditable, and recheck creates immutable content versions without silent mutation or publication. |
| F-07 Revision-aware audit history | IMPLEMENTED (local) | Content versions, audits, finding diffs, claims, links, actions, and workflow events are retained for the process lifetime; no durable database is connected. |
| F-08 Human review and approval | IMPLEMENTED (local) | Local API restricts review actions to authorised roles, records actor/time/reason/comment decisions, blocks unresolved high-risk manager approval, and preserves an in-memory decision history; durable persistence remains unverified. |
| F-09 Dashboard and audit export | PARTIAL | Local API now aggregates saved, visibility-scoped workflow records and exports content/version/audit/finding/evidence/review data; the seeded dashboard UI is not connected to the API and no durable export path is verified. |
| F-10 Privacy and AI-transparency panel | IMPLEMENTED (local bounded) | `/privacy` exposes the verified runtime inventory and retention boundary; `/submit` records a browser-local confidential marker. No external provider or production deletion/consent workflow is verified. |
| F-11 Basic accessibility checks | IMPLEMENTED (local bounded) | Deterministic contrast, missing-alt-text, palette-distance, and hashtag-readability checks run only when measurable metadata is supplied; they do not certify full accessibility. |

## Foundation status after Phase 1 work

## Remaining gaps

- No Cloudflare D1/R2/Queue resources, Access membership lookup, Vectorize retrieval,
  live Gemini/Workers AI request, hosted OCR/vision fallback, or durable persistence was verified.
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
- **Remaining gaps:** the default browser demo remains seeded/local; an explicit local
  development-header mode now exercises the FastAPI content/recheck/finding-action path.
  Durable Cloudflare D1/R2/Queues, live Access membership, external AI/OCR, hosted
  deployment, and production persistence remain **STUB**, **PLANNED**, or **MISSING**.

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
- `npm test`: **WORKING** — frontend lint/typecheck/build, 9 default browser
  smoke/collaboration tests, and 139 backend/report-safety tests completed; one Starlette
  deprecation warning remains.
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
- **Boundary:** all of this remains local/in-memory. No live Gemini request, Cloudflare
  persistence, hosted OCR/vision service, or production authentication was exercised.

## Deployment and external-service status

- Hosted frontend URL: **MISSING / not deployed**.
- Hosted backend URL: **MISSING / not deployed**.
- Cloudflare D1/R2/Queues, Access membership lookup, external AI/OCR provider, and durable
  runtime persistence: **STUB / PLANNED**; no credentials or live resources were available
  for verification.
- A real deployment requires project-dedicated Cloudflare access, Pages/Worker project
  identifiers, binding IDs, domains, and server-side environment variables. Do not put
  those values in this repository or chat.

## 2026-10-26 16:48 IST — Continuation verification

- **Verified:** `npm test` passed sequentially: lint, typecheck, production build, 9 browser
  tests, 139 backend/report-safety tests, generated-fixture validation, and the read-only
  evaluation-report check. One Starlette/httpx deprecation warning remains.
- **Verified:** `cd backend && python3 -m app.eval` completed with 52 cases and 0 honest
  failures; `npm run build:pages`, `uv lock --check`, and `npx wrangler --version` also
  passed.
- **Boundary unchanged:** Cloudflare resources, Access policy, D1/R2/Queues, hosted URLs,
  external AI/OCR, and durable persistence were not exercised. The deployment foundation
  remains **READY / NOT DEPLOYED**.

## 2026-10-26 16:51 IST — Final post-change verification

- **Verified after the browser API auth-mode change:** `npm test` passed with lint,
  typecheck, production build, 9 browser tests, 139 backend/report-safety tests, fixture
  validation, and the read-only evaluation-report check. One Starlette/httpx deprecation
  warning remains; no test failures or lint errors were reported.

## 2026-10-26 12:37 IST — Local MVP completion pass

- **Completed locally:** added saved-record review-decision listing, visibility-scoped
  dashboard aggregation, and evidence-aware JSON audit export to the FastAPI workflow;
  expanded the `/privacy` transparency inventory; added a browser-local confidential
  marker and visible confidentiality badge to `/submit`/`/findings`; removed the stale
  frontend variable and deprecated HTTP constants; and made the reliability report check
  read-only by default while preserving explicit report regeneration.
- **Checks:** `npm run typecheck`, `npm run lint`, and `npm test` passed. The full wrapper
  ran 9 browser tests and 139 backend/report-safety tests; standalone `python3 -m pytest
  -q` passed 146 tests; `npm run test:e2e:api` passed 4 API workflow tests. The evaluator
  matched the tracked report without rewriting it, and the correctly scoped `cd backend &&
  python3 -m app.eval` run had 0 honest failures.
- **Boundary:** the browser flow remains a seeded local/sessionStorage demo and is not
  wired to the FastAPI service. Cloudflare Access/D1/R2/Queues/Vectorize, external AI/OCR,
  durable persistence, and deployment remain **STUB**, **PLANNED**, or **MISSING**. The
  Pages/Worker foundation is **READY / NOT DEPLOYED**; `npm run build:pages` and `uv lock
  --check` pass locally.

## 2026-10-26 13:02 IST — Cloudflare deployment foundation verified

- **Added locally:** Cloudflare Pages static-export configuration, a Python Worker ASGI
  entrypoint, Wrangler D1/R2/Queue bindings, a fictional VoltEdge D1 migration/seed,
  `pyproject.toml`/`uv.lock`, and Cloudflare-first architecture/disclosure updates. Legacy
  Supabase artifacts remain historical reference only.
- **Verified:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:pages`,
  `npx wrangler --version`, and `uv lock --check` passed. No Cloudflare account, resource,
  Access policy, durable adapter, hosted URL, or deployment smoke test was exercised.
- **Boundary:** the Pages/Worker configuration is **READY / NOT DEPLOYED**. D1, R2,
  Queues, Access membership lookup, external AI/OCR, and durable persistence remain
  **STUB**, **PLANNED**, or **MISSING**.

## 2026-10-26 17:09 IST — Opt-in browser API path verified

- **Completed locally:** the typed browser client now supports vault/content/recheck/
  finding-action requests, and `/submit`/`/findings` can use it only when
  `NEXT_PUBLIC_PROOFLINE_LOCAL_API=true` with `development_headers`. API failures remain
  visible; the default seeded browser demo still uses sessionStorage/local rules.
- **Verified:** the optional API-mode frontend run passed **10 Playwright tests** against a
  local FastAPI process with development headers. The default `npm test` run passed **9
  Playwright tests** (the opt-in test skipped), 139 backend/report-safety tests, and the
  read-only report check. `python3 -m pytest -q` passed 146 tests, the API E2E suite passed
  4 tests, and the 52-case evaluator reported 0 honest failures.
- **Boundary:** this is still local/in-memory development authentication and persistence;
  Cloudflare Access, D1/R2/Queues, external AI/OCR, hosted deployment, and production
  authentication remain unverified.

## 2026-10-26 — Robustness verification pass

- **Completed locally:** approving a newer registry version now marks the earlier approved
  version `superseded` while retaining it for history; browser corrections require an exact
  audited span; and the seeded registry's Add source action now retains a visible, inactive
  source draft instead of only showing a toast.
- **Verified:** `npm test` passed with 11 browser tests, 1 opt-in skip, 140 backend/report-
  safety tests, lint, typecheck, build, fixture validation, and read-only report checking.
  Standalone `python3 -m pytest -q` passed 147 tests; API E2E passed 4 tests; `npm run
  build:pages`, `uv lock --check`, `npx wrangler --version`, and the reliability/evaluation
  checks passed.
- **Boundary:** this remains local/demo behavior. Durable Cloudflare persistence, production
  authentication, hosted OCR/AI, and deployment are still **STUB**, **PLANNED**, or
  **MISSING** as documented.

## 2026-10-27 — PRD coverage and local intake pass

- **Completed locally:** added the PRD implementation matrix; registry search, bounded CSV/
  text-extractable file import, source metadata retention, owner-only retirement, and
  active-version filtering; and wired the explicit local API browser path to bounded PDF,
  DOCX, PNG, and JPG submission with visible extraction-state handling. Default browser-only
  mode remains text-only and local.
- **Verified:** `npm test` passed with 11 browser tests, 1 opt-in skip, and 142 backend/
  report-safety tests. Standalone `python3 -m pytest -q` passed 149 tests; API E2E passed
  4 tests; Pages build, lockfile, Wrangler, golden-fixture, reliability, and evaluation
  checks passed.
- **PRD result:** P0/P1 local paths are documented in `docs/PRD_IMPLEMENTATION_MATRIX.md`.
  Durable Cloudflare services, production identity, live AI/OCR, video, external connectors,
  multilingual comparison, and enterprise retention remain explicitly **STUB**, **PLANNED**,
  or **MISSING** because no verified external resources are available.
