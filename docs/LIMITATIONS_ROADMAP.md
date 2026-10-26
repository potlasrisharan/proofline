# Proofline limitations and roadmap

**Document status:** Honest scope record for the current workspace. Roadmap items are
proposals, not commitments or evidence of completed work.
**Last reviewed:** October 26, 2026.
**Example tenant:** VoltEdge (fictional).

## Current capability map

| Capability | Status | Boundary |
|---|---|---|
| Seeded review workflow in the Next.js UI | **IMPLEMENTED (local demo)** | Findings, corrections, re-scan, submit, and approve are local React state. |
| Seeded registry and insights views | **IMPLEMENTED (demo content)** | Cards/charts are not database-derived metrics; the source form does not persist a backend record. |
| FastAPI health endpoint | **IMPLEMENTED (local)** | Reports explicit in-memory and unconfigured-AI state. |
| Vault CRUD/version/approval | **IMPLEMENTED (local)** | In-memory, organisation-scoped, role-checked foundation. |
| Development auth headers / local HS256 verifier | **IMPLEMENTED (local boundary)** | Configuration-gated test paths; Cloudflare Access JWT and D1 membership integration remain unverified. |
| Typed browser API client | **IMPLEMENTED (opt-in local boundary)** | Defines vault/content/recheck/finding-action calls; the content review UI uses it only with the explicit local development-header configuration. |
| Local content/review workflow API | **IMPLEMENTED (local)** | Stores text/metadata versions, caller-supplied findings, finding actions, comments, review decisions, exports, and hash-linked events in memory. |
| Cloudflare D1/R2/Queue schema and bindings | **STUB / PLANNED** | D1 foundation SQL, fictional seed, R2/Queue bindings, and Worker config exist; no live resources or durable adapter. |
| Local content audit engine | **IMPLEMENTED (local, dependency-gated)** | Bounded ingestion, lexical claims, deterministic checks, evidence/span/schema validation, risk metadata, and explicit failure/review-required states run in memory. |
| PDF/DOCX/local OCR intake | **IMPLEMENTED (local, optional dependencies)** | The API accepts bounded base64 files and uses lazy parser/OCR adapters; missing/partial extraction remains visible. Hosted file storage/OCR is not configured. |
| AI-assisted checks | **STUB / unconfigured** | Gemini provider, PII masking, bounded retries/cache, retrieval, and verifier seams exist; no configured provider call or model result is verified. |
| Fact-change impact radar | **IMPLEMENTED (local)** | Version-aware in-memory claim links, re-review tasks, expiry handling, deterministic re-checks, and a standalone synthetic demo page exist; durable storage and background scheduling remain unverified. |
| Governance insights from saved records | **IMPLEMENTED (local analytics)** | Deterministic aggregate engine, simulation script, guideline-gap signals, owner-only proposal approval, and a standalone synthetic dashboard exist; durable saved-record ingestion remains unverified. |
| External website/social/CMS integrations | **PLANNED** | No crawler, connector, scheduler, or publication integration is verified. |
| Cloudflare Pages/Workers deployment | **READY / NOT DEPLOYED** | Static Pages export and Python Worker entrypoint are present; no account resources or hosted smoke test is verified. |

## Known limitations

1. **No durable workspace.** The local API loses vault records on restart, and the UI
   state is not shared across users or processes.
2. **No production identity system.** Local test authentication is not a substitute for
   Cloudflare Access JWT validation, D1 membership, session, invitation, or organisation administration.
3. **Local audit is bounded and not production-complete.** The API can ingest supported
   local inputs, extract lexical claims, run deterministic checks, validate evidence, and
   store findings in memory. It does not provide complete coverage of all PRD categories,
   durable records, or a production-grade audit service.
4. **No verified external AI/OCR service.** The repository contains optional Gemini/OCR
   adapters and local parser seams, but no external model call or hosted OCR request was
   observed. Provider terms, model results, and hosted processing remain unverified.
5. **No durable secure file workflow.** Local validation and extraction limits exist, but
   malware scanning, private object storage, retention, and deletion are not verified;
   the UI intake modal remains a stub.
6. **No production analytics/export.** Dashboard and insight values are seeded UI content,
   not measured product outcomes or saved-record aggregates.
7. **No deployment claim.** Cloudflare Pages/Workers configuration exists, but no account
   resources, deployment, uptime, performance, or security posture has been measured.
8. **No research or production-performance claim.** No team-specific interview, survey,
   or usability results are recorded by the documentation templates. Automated local
   fixture/QA results must not be presented as user research, a production benchmark,
   or general real-world accuracy.
9. **No compliance claim.** Proofline is not legal advice, a compliance certification,
   accessibility certification, or a guarantee of real-world truth.

## Proposed roadmap

### Next: connect the Cloudflare contract safely — **PLANNED**

- Create Cloudflare Pages, Worker, D1, R2, Queue, and Access resources with project-
  dedicated credentials and smoke-test the bindings.
- Implement durable organisation/membership persistence in D1 and replace local JWT-only
  auth with verified Cloudflare Access identity plus membership lookup.
- Wire the Next.js UI through the typed API client behind authenticated tenant checks.
- Integrate extraction and verification into the Worker content/version/audit/review
  routes with explicit `pending`, `failed`, and `review_required` states.
- Preserve immutable history for content, registry records, findings, and decisions.

### Then: broaden and harden verification — **PLANNED**

- Expand the existing bounded text/PDF/DOCX/image ingestion and extraction test matrix.
- Expand deterministic checks for terminology, dates, numbers, configured qualifiers,
  visual metadata, and other rules where evidence is structured.
- Keep the evidence-aware finding pipeline abstaining when sources are missing or in
  conflict, and add durable adapters behind the local boundary.
- Verify an external provider only after terms, credentials, payload redaction, and live
  smoke behavior are documented.
- Expand VoltEdge golden fixtures and report measured evaluation results only after the
  checks actually run.

### Optional provider integration — **PLANNED**

- Select and verify a model/OCR provider, version, terms, region, retention, and account
  settings before connecting it.
- Keep keys server-side, redact minimum context, bypass confidential content by policy,
  validate structured output, and expose provider failures to reviewers.
- Update [`docs/AI_DISCLOSURE.md`](AI_DISCLOSURE.md) in the same change as the integration.

### Later product improvements — **PLANNED**

- Durable fact-change impact/revalidation for Proofline-stored content using D1 and Queues.
- Governance insights derived from durable saved records and reviewer decisions.
- Configurable market/claim rules, bounded visual checks, and audit export.
- Integrations and hosted deployment only after Cloudflare scope, permissions, bindings,
  and operational checks are verified.

## Example boundary using VoltEdge

For a fictional VoltEdge NovaBook S1 draft, the current UI displays a seeded finding
that compares “up to 20 hours” with a seeded approved value of “up to 12 hours.” That is a
demonstration of the review presentation. It is not evidence that the system extracted
the claim, queried a live registry, called a model, or proved the outside-world truth of
either statement.

## Roadmap acceptance gates

Before marking a roadmap item **IMPLEMENTED**, record:

- the changed runtime path and status in [`docs/CONTRACT.md`](CONTRACT.md),
- a meaningful check or fixture using fictional VoltEdge data,
- tenant/auth and failure-state behavior,
- external-service and data-handling details in [`docs/AI_DISCLOSURE.md`](AI_DISCLOSURE.md),
- relevant privacy/security controls, and
- actual command output or smoke evidence. Do not substitute a type definition,
  screenshot, or planned endpoint for runtime verification.
