# Proofline Phase 1 plan — audit, plan, foundation

**Date:** 2026-10-25
**Source of truth:** `Proofline_Consolidated_PRD.md`
**Scope rule:** preserve the existing Next.js demonstration UI; add the FastAPI/Supabase
foundation without presenting it as a connected production backend.

## Work order

1. **Audit (completed before this plan):** inspect repository history/tree, read the
   README, PRD and rules, install JavaScript dependencies, run the current frontend
   checks, and confirm that no Python test suite or live backend was present.
2. **Shared contract and guardrails (completed):** maintain `AGENTS.md`,
   `docs/CONTRACT.md`, and `docs/AI_DISCLOSURE.md`; keep route and integration status
   explicit.
3. **Database foundation (partially completed):** retain and review the tenant-aware
   Supabase migration, fictional VoltEdge seed, RLS policies, and 12 golden fixtures.
4. **Backend foundation (remaining):** add a small FastAPI service with explicit health
   semantics, optional Supabase JWT verification, role dependencies, a local
   non-persistent demo vault adapter, versioned draft/approval behavior, and pytest
   coverage. Supabase persistence remains a separate integration boundary.
5. **Frontend boundary (remaining verification):** keep the existing Next.js UI as the
   implemented demo shell. Do not create a parallel Vite app or claim auth/API
   integration that is not wired to the UI. Add only honest setup/testing notes.
6. **QA and handoff (remaining):** add one-command scripts, validate fixtures and SQL
   shape as far as local tooling allows, run backend and frontend checks, update
   `STATE.md`, append `docs/HANDOFF.md`, record decisions, commit only intended files,
   and remove `.agent-lock`.

## Directory ownership

| Area | Owner | Interface boundary |
|---|---|---|
| Root rules and docs | Architecture | `AGENTS.md`, `docs/CONTRACT.md`, `docs/AI_DISCLOSURE.md` |
| `supabase/` and golden fixtures | Database | SQL schema and fixture IDs referenced by the contract |
| `backend/` | Backend | FastAPI/Pydantic models and role-aware vault routes |
| `app/` and root frontend assets | Frontend | Existing Next.js UI; no backend claims without a verified call path |
| `scripts/`, `STATE.md`, `docs/HANDOFF.md` | QA/handoff | Executable checks and verified status only |

## Shared interfaces

- Finding wire shape and status semantics are defined in `docs/CONTRACT.md`.
- Vault records use stable IDs, organisation scope, source/version metadata, and
  `draft` → `approved` transitions. Only `brand_owner` may approve.
- The local FastAPI adapter returns `persistence: "in_memory_demo"` so callers cannot
  mistake it for Supabase durability.
- No route may fabricate evidence, model metadata, or cross-organisation access.

## Risks and mitigations

- **Existing stack differs from the PRD stack:** retain Next.js because it is the
  runnable repository application; document the planned FastAPI/Supabase boundary.
- **No Supabase project or credentials:** make the migration/seed/RLS foundation
  explicit and keep runtime persistence disabled unless configuration is present.
- **Python toolchain is not configured:** use a documented `python3`/virtualenv path;
  report missing optional dependencies rather than hiding failures.
- **Demo data could be mistaken for customer data:** use fictional VoltEdge data in all
  new fixtures and disclose that the existing Northstar screen is seeded UI state.
- **Approval could bypass role checks:** centralise role dependencies and test creator,
  manager, legal reviewer, agency, and brand owner behavior.

## Phase 2 — verification engine

**Date:** 2026-10-25

**Objective:** Build and verify an offline-capable verification engine that ingests text and
supported documents/images, extracts claim spans, applies deterministic evidence-first
rules, optionally calls Gemini behind a fail-soft interface, persists claim-to-fact links
and findings, and exposes the content/recheck/review-action API without weakening tenant or
human-review boundaries.

**Scope honesty:** Phase 2 implementation is local/in-memory unless a configured service is
actually exercised. PDF/DOCX/OCR, Gemini, Postgres retrieval, and durable persistence must
be labelled **IMPLEMENTED**, **STUB**, **PLANNED**, or **MISSING** from observed runtime
evidence; a module or type alone is not proof of an active integration.

### Sub-agent ownership and tasks

| Agent | Owned area | Deliverables | Required boundary |
|---|---|---|---|
| A — Ingestion | `backend/app/ingestion/` | Text/PDF/DOCX/image normalisation, character spans, image metadata, extraction failure states, optional local OCR/vision adapters | Do not edit API routes, vault store, or QA tests. Consume/produce only the ingestion interfaces in `docs/CONTRACT.md`. |
| B — Claims and deterministic rules | `backend/app/verification/` | Claim extraction, normalisers, fuzzy fact matching, claim-fact links, deterministic findings for numeric/date/term/disclaimer/comparative/accessibility/palette/hashtag checks | No external model calls and no API route edits. Rules must abstain when applicable evidence is absent or conflicting. |
| C — LLM layer | `backend/app/llm/` | Gemini provider interface, env-only model/key handling, model discovery, retrieval abstraction, schema validation/retries/cache/backoff, offline `needs_human`, PII masking, high-severity verifier and bounded suggestions | Never hardcode a Gemini model, send confidential content, or invent evidence. No API route edits. |
| D — Pipeline and API | `backend/app/audit/`, `backend/app/content_store.py`, `backend/app/main.py`, related models | Orchestration, persistence, risk breakdown, dedupe, content endpoints and finding actions, auth/tenant/confidentiality enforcement | Integrate only through the contract interfaces; preserve Phase 1 vault behavior and explicit in-memory status. |
| E — Independent QA | `backend/tests/`, `backend/app/eval.py` | At least 40 PRD/contract-derived cases, offline golden evaluation, `python -m app.eval` precision/recall output | Read only `AGENTS.md`, PRD, `docs/CONTRACT.md`, and existing public fixtures before writing tests; do not inspect implementation to tune expectations. |

### Shared interfaces before implementation

- `NormalizedDocument` carries `text`, source metadata, an ordered span map with exact
  character offsets, image metadata, extraction status, and confidentiality metadata.
- `Claim` carries an immutable span, kind, normalised value/unit/qualifier, and optional
  `fact_id` plus `fact_version`; `ClaimFactLink` is retained with the audit.
- `Finding` remains evidence-first and compatible with the compact contract schema. Phase 2
  adds security/prompt-injection findings, critical severity, and a transparent risk
  breakdown without treating confidence as truth probability.
- `AuditEngine` accepts an organisation, content version, normalised document, visible
  approved vault records, and runtime options; it returns an audit record with findings,
  claim links, service status, and content risk.
- `POST /contents` accepts JSON text or base64-encoded supported file data; `GET
  /contents/{id}` returns the saved content, audit state, findings, links, and service
  metadata; `POST /contents/{id}/recheck` creates a new immutable version/audit; `POST
  /findings/{id}/action` records `accept`, `edit`, or `dismiss` plus a reason where needed.

### Phase 2 risks

- Optional parser/OCR packages may be absent. The engine must report unsupported or failed
  extraction rather than treating empty text as a successful audit.
- Gemini credentials, model availability, rate limits, and provider terms are not assumed.
  Offline deterministic checks must remain usable, while model-dependent checks become
  `needs_human` with a clear reason.
- Existing Phase 1 vault records are generic dictionaries. Matching must be conservative,
  preserve exact record/version IDs, and surface conflicts instead of silently selecting a
  value.
- The requested endpoints are new content workflow routes. They must not imply Supabase
  durability or bypass the existing organisation/role authentication boundary.
- Parallel agents must not edit one another's owned directories. Shared contract changes
  are made before integration and reconciled centrally after the swarm.

### Phase 2 checkpoints

1. Contract and board reviewed before delegation.
2. Each agent reports its owned files, checks, and explicit gaps.
3. Main integration verifies offline acceptance cases before any optional provider work.
4. Full lint/typecheck/build/pytest/evaluation run; failures remain visible in `STATE.md`.

### Phase 2 completion status

**Verified locally on 2026-10-26:** the five workstreams are integrated behind the shared
contract. Text/PDF/DOCX/image ingestion, claim extraction, deterministic rules, optional
LLM/offline boundaries, evidence validation, Claim–Fact Ledger links, risk scoring, content
recheck, and finding actions are implemented against the local in-memory adapter. The
52-case HTTP evaluator reports zero honest failures; the 194-case reliability report remains
a separate synthetic deterministic measurement. Live Gemini, OCR/vision fallback, pgvector,
Supabase/Auth/Storage, and durable persistence remain **STUB**, **PLANNED**, or **MISSING**.

## Phase 4 — improvements, hardening, deploy, and docs

**Date:** 2026-10-25

Phase 4 starts from the verified Phase 1 foundation. The goal is to implement the three
PRD improvements without overstating the existing demo shell or claiming a deployment
until it is actually reachable and smoke-tested.

### Workstreams

1. **Fact-Change Impact Radar:** versioned fact updates and validity endings identify
   affected stored claims/content, mark records `re_review_required`, create auditable
   re-review tasks, and expose an impact view/banner plus an explicit re-check action.
2. **Governance Insights and Guideline-Gap Detector:** derive team/agency aggregates,
   trends, expiry signals, and ambiguity indicators from review activity; generate
   clearly labelled suggested rule updates that require `brand_owner` approval.
3. **Evidence-or-Abstain reliability:** expand the VoltEdge golden set past 100 cases,
   cover adversarial inputs, make uncertainty resolve to `needs_human`, and add bounded
   timeout/retry/cache/degraded-state behavior with measured evaluation results.
4. **DevOps and deployment readiness:** add CI, local container orchestration, explicit
   environment-variable documentation, and deployment configuration only where the
   required credentials and infrastructure are available.
5. **Documentation and disclosure:** update the quickstart/demo script, architecture,
   AI disclosure, privacy/security, limitations/roadmap, and template-only testing and
   contribution documents.

### Phase 4 verification gates

- Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and the backend
  evaluation/test commands after integration.
- Report measured evaluation precision/recall and deployment status; do not invent either.
- Keep external services, authentication, storage, and deployment labelled **STUB** or
  **PLANNED** when credentials or verified runtime evidence are absent.

## Phase 3 — workflow and review experience

**Date:** 2026-10-25

**Objective:** Complete and verify the human workflow around the local evidence-first audit
demo: creator submission, findings and corrections, revision-aware review, role-scoped
approval, collaboration comments, audit-chain export/verification, and trust/accessibility
disclosure.

**Scope honesty:** The runnable product remains a local Next.js demo and local FastAPI
foundation unless a check proves otherwise. UI state, in-memory API records, and synthetic
VoltEdge fixtures must be labelled **IMPLEMENTED (local/demo)** rather than presented as
durable production persistence, live authentication, external AI/OCR, or deployment.

### Workstreams

1. **Workflow backend:** implement explicit content states, role-aware transition checks,
   threaded span comments, request-changes decisions, immutable revisions and recheck
   diffs, required reasons for overrides/dismissals, and hash-chained audit events with
   verification and JSON export.
2. **Submit and findings UI:** provide content intake metadata and evidence-first finding
   cards with highlighted spans, explicit verdict text/icons, severity, evidence/source
   versions, correction actions, method/confidence, AI disclosure, and risk breakdown.
3. **Review and collaboration UI:** provide risk-sorted/filterable queue, content detail,
   anchored comments, approve/request-changes controls, revision/diff history, audit-chain
   status, and role-aware action visibility.
4. **Trust and UX:** provide AI/service and privacy disclosure, synthetic-data notice,
   honest empty/loading/error states, keyboard navigation, responsive layout, and measured
   contrast/accessibility improvements where applicable.
5. **E2E QA:** exercise the full browser flow and negative role/tenant permissions with real
   Playwright results; do not weaken tests or claim unrun checks.

### Phase 3 verification gates

- Add focused backend and browser checks for every state transition and permission boundary.
- Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and `python -m app.eval`
  (or report the exact reason a command cannot run).
- Update `docs/CONTRACT.md`, `STATE.md`, `docs/HANDOFF.md`, and `docs/DECISIONS.md` only
  with behavior verified in this phase; keep unsupported integrations explicitly labelled.
