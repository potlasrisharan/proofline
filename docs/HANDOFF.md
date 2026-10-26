# Proofline handoff log

## 2026-10-25 — Phase 1 continuation started

- **Completed before interruption:** repository audit, JavaScript dependency install,
  frontend lint/typecheck/build, architecture rules, `docs/CONTRACT.md`,
  `docs/AI_DISCLOSURE.md`, Supabase migration/seed, and 12 VoltEdge golden fixtures.
- **Known baseline gap:** there was no Python test dependency, no FastAPI runtime, no
  live Supabase configuration, and no npm test script at the audit point.
- **Current work:** finish the local FastAPI foundation, add one-command checks, and
  verify the database/fixture artifacts without claiming live persistence.
- **Next chat must know:** the existing Next.js UI is intentionally preserved; do not
  replace it with a parallel Vite app or claim that the seeded UI is authenticated.

## 2026-10-25 20:32 IST — Phase 1 foundation completed

- **Implemented and verified:** `backend/app/` FastAPI health route, opt-in development
  headers, Supabase-compatible HS256 JWT verification boundary, role dependencies, and
  non-persistent organisation-scoped vault CRUD/version/brand-owner approval behavior.
- **Added:** typed browser API boundary at `app/lib/proofline-api.ts`, root `.env.example`,
  `scripts/dev.sh`, `scripts/test.sh`, backend requirements/tests, Dockerfile, and GitHub
  Actions checks.
- **Database verification:** the migration and `supabase/seed.sql` applied successfully
  to a temporary local PostgreSQL database; VoltEdge rows and the audit hash columns were
  inspected. No live Supabase project was used.
- **Checks:** `npm test` passed; backend pytest reported 11 passed with one upstream
  Starlette/httpx deprecation warning. `npm run lint`, `npm run typecheck`, and
  `npm run build` passed. Docker image build and container `/health` smoke call passed.
- **Broken/not implemented:** persistent Supabase adapter, Supabase Auth membership
  lookup, Storage, Gemini/OCR/document extraction, content audit engine, saved findings,
  content review route, dashboard aggregation/export, and full runtime AI disclosure UI.
- **Next phase:** connect a real Supabase project only after credentials/policies are
  available; implement persistence and content audit behind the documented contract,
  then wire the Next.js UI through the typed client without removing human approval.

## 2026-10-26 00:16 IST — Phase 4 continuation after interrupted swarm

- **Completed locally:** preserved the interrupted swarm work; added and tested the
  in-memory Fact-Change Impact Radar, deterministic Governance Insights/Guideline-Gap
  Detector, 194-case Evidence-or-Abstain dataset/evaluator, CI/container configuration,
  and the Phase 4 documentation set. Added standalone synthetic `/impact` and `/insights`
  pages that expose the reusable local UI components and explicit human-review actions.
- **Verified:** `python3 -m pytest -q` reported 137 passed with 3 warnings;
  `python3 scripts/generate_golden.py --check` matched 194 cases;
  `python3 scripts/eval.py --report docs/EVAL_REPORT.md` regenerated the measured report;
  and the review-activity simulation emitted 10 events, 5 proposals, and no individual
  rankings.
- **Not verified / broken:** ESLint could not load the installed
  `node-exports-info` dependency because Node `v25.9.0` raised `ETIMEDOUT`; Next.js build
  reported another build process already running; `npm test` timed out before completing;
  Playwright results are therefore not claimed. The final standalone page wiring was added
  after the last successful typecheck, so it needs a fresh frontend check.
- **Deployment:** no hosted URL was created. Supabase, external AI/OCR, durable storage,
  and hosting credentials were unavailable; do not claim CI green or a deployed link.
- **Next chat must know:** first resolve the local Node/dependency/build-process issue,
  then run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and the E2E
  checks. Review the final diff before any deployment. If deploying, obtain project-
  dedicated hosting credentials and environment values through the owner; never commit or
  paste secrets.

## 2026-10-26 — Phase 3 continuation after interrupted swarm

- **Completed locally:** preserved the existing Phase 2 workflow implementation, added the
  Phase 3 plan/contract status, fixed local queue role scoping for agency previews, added a
  brand-owner registry approval control for the seeded fact, improved highlighted-span
  accessible naming, corrected the audit-log filter label, and repaired the first-revision
  diff empty state. Backend finding diffs now include span offsets, and same-version
  resubmission is rejected rather than bypassing immutable revision/recheck expectations.
- **Verified at that checkpoint:** `python3 -m pytest -q backend/tests` — 130 passed; browser smoke — 2 passed;
  collaboration — 5 passed; API workflow — 4 passed; `npm run typecheck` and `npm run build`
  passed. `python3 -m app.eval` ran and reported 27 honest legacy evaluator failures.
- **Broken/not verified at that checkpoint:** `npm run lint` and the `npm test` wrapper stop before project
  checks because ESLint 9.39.5 cannot load the installed `resolve/lib/async.js` path under
  Node v25.9.0, reporting `ETIMEDOUT`. No lint pass is claimed. The browser flow remains
  local seeded state and the API remains in-memory.
- **Superseded by the 01:53 IST entry below:** the toolchain and 52-case evaluator issues
  were rechecked and resolved locally without claiming any external service is live.

## 2026-10-26 01:53 IST — Phase 2 verification continuation completed

- **Completed:** resumed the existing Phase 2 implementation without replacing the later
  Phase 3/4 commits. Fixed the audit-to-verification option adapter, derived approved term
  and disclaimer policies, expanded conservative fact matching for attributes/offers/claims,
  added multi-currency parsing, preserved deterministic rule evidence, tightened alt-text
  applicability, and made missing dismissal reasons return an explicit validation error.
- **Acceptance path:** applicable VoltEdge battery mismatches now produce a critical,
  contradicted factual finding with source/version evidence, a Claim–Fact Ledger link, and
  an approved-value suggestion. Expired offers produce outdated offer findings. Unknown or
  conflicting evidence remains unsupported or needs human review.
- **Checks:** `python3 -m pytest -q` — **140 passed**, 3 deprecation warnings; `cd backend &&
  python3 -m app.eval` — **52 cases, 0 honest failures**; `python3 scripts/generate_golden.py
  --check` — **194 cases matched**; `npm test` — **passed** with 7 browser tests and 133
  backend tests; API Playwright — **4 passed**. `docs/EVAL_REPORT.md` contains the measured
  tables and offline caveats.
- **Known gaps:** all runtime behavior remains local/in-memory. No live Gemini request,
  Cloudflare Access/D1/R2/Queues/Vectorize connection, hosted OCR/vision service, or deployment was
  exercised. The separate 194-case reliability report remains a synthetic deterministic
  measurement, not model accuracy.
- **Next chat must know:** preserve the explicit `in_memory_demo` and offline-provider
  labels. If deployment or live provider work is requested, obtain project-dedicated access
  and update `docs/AI_DISCLOSURE.md` only from verified runtime/provider facts.

## 2026-10-26 12:37 IST — Local MVP completion pass

- **Completed locally:** added review-decision listing, saved-record dashboard aggregation,
  and evidence-aware JSON audit export to the FastAPI workflow. Expanded `/privacy` into a
  runtime transparency inventory, added a browser-local confidential marker and visible
  badge to `/submit`/`/findings`, and changed the reliability evaluator so the test wrapper
  checks `docs/EVAL_REPORT.md` without rewriting it. Explicit `--report` regeneration
  preserves the hand-maintained Phase 2 section and refuses secret-like destinations.
- **Hardening:** removed the unused `commentsForSelectedSpan` frontend variable and replaced
  deprecated HTTP 422 constants. Added regression coverage for dashboard/export/review
  decisions, report safety, the privacy surface, and the confidential marker.
- **Verified:** `npm run typecheck`, `npm run lint`, and `npm test` passed; the wrapper ran
  9 browser tests and 139 backend/report-safety tests. Standalone `python3 -m pytest -q`
  passed 146 tests, `npm run test:e2e:api` passed 4 API workflow tests, and the correctly
  scoped `cd backend && python3 -m app.eval` run reported 0 honest failures. The working
  tree must remain honest about local/in-memory behavior.
- **Still open:** the seeded browser workflow is not connected to FastAPI; Cloudflare
  Access, D1, R2, Queues, Vectorize, external AI/OCR, durable persistence, and deployment
  require project-dedicated configuration and runtime verification.

## 2026-10-26 13:02 IST — Cloudflare deployment foundation verified

- **Completed locally:** added Cloudflare Pages static-export configuration, the Python
  Worker ASGI entrypoint, Wrangler D1/R2/Queue bindings, a fictional VoltEdge D1
  migration/seed, `pyproject.toml`/`uv.lock`, and Cloudflare-first architecture and
  disclosure updates. Legacy Supabase artifacts remain historical reference only.
- **Verified:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:pages`,
  `npx wrangler --version`, and `uv lock --check` passed. No Cloudflare account/resource,
  Access policy, durable adapter, hosted URL, or deployment smoke test was exercised.
- **Still open:** the Pages/Worker foundation is **READY / NOT DEPLOYED**. D1, R2,
  Queues, Access membership lookup, external AI/OCR, durable persistence, and the seeded
  browser-to-API wiring require project-dedicated configuration and runtime verification.

## 2026-10-26 16:48 IST — Interrupted self-check continuation

- **Completed:** inspected the current staged Cloudflare foundation and preserved the
  unstaged browser API pairing/CORS additions already present in the workspace. No code
  rollback or duplicate side effect was needed.
- **Verified:** `npm test` passed with lint, typecheck, build, 9 browser tests, 139
  backend/report-safety tests, fixture validation, and the read-only evaluation-report
  check. `cd backend && python3 -m app.eval` reported 52 cases with 0 honest failures;
  `npm run build:pages`, `uv lock --check`, and `npx wrangler --version` passed.
- **Still open:** no Cloudflare account/resource, Access policy, hosted URL, durable
  adapter, external AI/OCR service, or production deployment was exercised. Keep all
  Cloudflare and browser API configuration labels truthful and do not add credentials.

## 2026-10-26 16:51 IST — Final verification after auth-mode fix

- **Completed:** committed the browser API pairing change so `cloudflare_access` uses
  credentialed requests while `local_headers` retains development-header authentication.
- **Verified:** `npm test` passed after that change: 9 browser tests, 139 backend/report-
  safety tests, lint, typecheck, build, fixture validation, and read-only evaluation-report
  checking. The remaining deprecation warning is from Starlette/httpx.
- **Next chat must know:** the working tree is intended to be clean and the Cloudflare
  foundation remains local/ready but not deployed; no external credentials or live service
  claims were added.

## 2026-10-26 17:09 IST — Opt-in browser API path verified

- **Completed locally:** the typed browser client now supports vault/content/recheck/
  finding-action requests, and `/submit`/`/findings` use it only with
  `NEXT_PUBLIC_PROOFLINE_LOCAL_API=true` plus local `development_headers`. API failures are
  visible; the default seeded browser demo remains sessionStorage/local-rule based.
- **Verified:** optional API-mode frontend run passed **10 Playwright tests** against a
  local FastAPI process with development headers. Default `npm test` passed **9 browser
  tests** (the opt-in test skipped), 139 backend/report-safety tests, and the read-only
  report check. Standalone pytest passed 146 tests, API E2E passed 4 tests, and the
  correctly scoped 52-case evaluator reported 0 honest failures.
- **Still open:** Cloudflare Access, D1/R2/Queues, external AI/OCR, hosted deployment,
  durable persistence, and production authentication remain unverified. Do not claim the
  optional local API mode is production authentication or durable storage.
