# Proofline team progress checklist

**Last reviewed:** 2026-10-26  
**Example tenant:** VoltEdge (fictional)  
**Purpose:** Shared handoff for collaborators. This checklist describes the current
repository state and remaining work; a checked item is not a claim of production readiness.

## Current implementation status

- [x] **IMPLEMENTED — Local Next.js review demo.** Seeded review queue, findings,
  corrections, re-scan, comments, role preview, approval transitions, history, impact,
  insights, and privacy/disclosure surfaces run with local state.
- [x] **IMPLEMENTED — Local FastAPI foundation.** Health, organisation-scoped vault,
  content/version/audit workflow, finding actions, comments, review decisions, exports,
  audit-chain verification, impact routes, and dashboard summary routes are available in
  the in-memory adapter.
- [x] **IMPLEMENTED — Deterministic verification boundary.** Bounded ingestion,
  lexical claims, evidence/span/schema validation, deterministic checks, risk metadata,
  explicit abstention, and failed/review-required states are covered by local tests.
- [x] **IMPLEMENTED — Local reliability and contract checks.** The synthetic VoltEdge
  fixture set contains 194 reliability cases; the HTTP workflow and generated-report
  checks run locally without an external model call.
- [x] **IMPLEMENTED — Honest disclosure.** AI, privacy, storage, deployment, and
  confidentiality limits are documented and exposed through the local `/privacy` page.

## Highest-priority next work

- [ ] **PLANNED — Durable persistence.** Connect the existing Supabase migration/RLS
  foundation to a real project, implement durable adapters, and verify organisation and
  membership isolation with smoke tests.
- [ ] **PLANNED — Production authentication.** Replace development headers and local JWT
  boundary tests with a verified Auth/session/membership flow, invitations, role changes,
  and server-side organisation authorization.
- [ ] **PLANNED — Wire the UI to the API.** Replace seeded browser-only transitions with
  authenticated API calls for content, findings, comments, review decisions, exports,
  dashboard summaries, impact, and insights while preserving loading, failed, and
  `review_required` states.
- [ ] **PLANNED — Durable content and audit history.** Persist immutable content versions,
  registry/source versions, claims, evidence references, findings, reviewer decisions,
  comments, and hash-linked audit events without overwriting history.
- [ ] **PLANNED — Secure file workflow.** Add private object storage, file malware
  scanning, retention/deletion controls, upload consent, a confidential-material flag,
  and verified PDF/DOCX/image processing limits.

## Verification and provider work

- [ ] **PLANNED — Verify an external AI provider.** Select the provider and model, record
  terms, region, retention, training-use settings, redaction, timeout/retry behavior, and
  owner approval in `docs/AI_DISCLOSURE.md` before a live request is enabled.
- [ ] **PLANNED — Complete provider-backed checks.** Keep deterministic checks first;
  validate structured model output, tenant/source scope, evidence IDs and versions, and
  route malformed, conflicting, unavailable, or uncertain results to human review.
- [ ] **PLANNED — Expand evaluation coverage.** Add more fictional VoltEdge fixtures for
  dates, currencies, terminology, qualifiers, market scope, accessibility metadata,
  extraction failures, provider failures, and adversarial inputs.
- [ ] **PLANNED — Production observability.** Add redacted structured logs, metrics,
  tracing, alerting, rate limits, backup/restore checks, and incident runbooks without
  logging confidential source content.

## Product surfaces and integrations

- [ ] **PLANNED — Durable impact radar.** Re-check saved content when an approved fact or
  offer changes or expires, with queued work, reviewer ownership, and no auto-edit or
  auto-approval.
- [ ] **PLANNED — Durable governance insights.** Derive aggregates from saved records,
  preserve reviewer decisions, and keep guideline-gap proposals owner-approved and
  auditable.
- [ ] **PLANNED — Configurable rules.** Add market/product/channel scope, disclaimers,
  terminology, accessibility, visual metadata, and source-conflict rules with versioned
  activation and review.
- [ ] **PLANNED — External integrations.** Add only explicitly scoped website, social,
  CMS, storage, or publication connectors after permissions, tenancy, rate limits, and
  failure behavior are verified.
- [ ] **MISSING — Hosted deployment.** Choose and verify the hosting/runtime setup,
  secrets management, domain, TLS, deployment checks, and rollback procedure.

## Definition of done for each item

Before changing an item to checked/`IMPLEMENTED`, the contributor should add:

1. The runtime path and contract update in `docs/CONTRACT.md`.
2. A meaningful test or fictional VoltEdge fixture.
3. Tenant, role, privacy, and failure-state coverage where applicable.
4. Any provider/data-handling update in `docs/AI_DISCLOSURE.md` and
   `docs/PRIVACY_SECURITY.md`.
5. Actual command or smoke-test evidence in the pull request description.

Proofline is not legal advice, a compliance certification, an accessibility certification,
or a guarantee of real-world truth. Nothing is auto-applied, auto-approved, or
auto-published.
