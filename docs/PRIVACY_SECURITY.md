# Proofline privacy and security boundary

**Document status:** Local implementation boundary and future-control checklist; not a
security certification or legal opinion.
**Last reviewed:** October 26, 2026.
**Example tenant:** VoltEdge (fictional).

This document describes the controls that can be evidenced in the current repository and
the controls that remain **STUB**, **PLANNED**, or **MISSING**. It does not claim
compliance, production readiness, or protection of real customer data.

## Current data-handling summary

| Data path | Status | Verified behavior and limitation |
|---|---|---|
| Seeded browser demo | **IMPLEMENTED (local demo)** | Uses fictional seeded VoltEdge UI state in the browser. It is not a tenant-isolated production workspace. |
| Local vault and workflow API | **IMPLEMENTED (local)** | Stores organisation-scoped vault records plus text/metadata content versions, caller-supplied findings, comments, decisions, exports, and audit events in process memory. Data disappears when the process stops. |
| External AI/OCR transfer | **STUB / not observed** | Local deterministic and ingestion paths can run without a network provider. Optional Gemini/OCR seams are disabled or dependency-gated; no external provider call was verified. |
| Durable database/storage | **STUB / PLANNED** | Cloudflare D1 migration/seed plus R2 binding artifacts exist; no live D1 database, R2 bucket, or durable adapter is connected. |
| Content file intake | **IMPLEMENTED (local API and opt-in UI, dependency-gated)** | The local `/contents` API and explicit browser API mode accept bounded text or base64 files and report extraction states; default browser-only mode remains text-only and no hosted file storage exists. |
| Hosted deployment | **READY / NOT DEPLOYED** | Pages export, Python Worker entrypoint, and Wrangler bindings exist; no deployed environment has been verified. |

The local API is suitable for contract/RBAC tests with fictional data, not confidential
production records.

## User-facing local disclosure

The `/privacy` route is **IMPLEMENTED (local demo)** and mirrors this boundary for demo
users: no verified runtime model/provider receives frontend drafts, the local API is
process-memory only, and `/submit`/`/findings` use browser session storage when
available. The page labels the external AI/OCR/database/deployment paths as
**STUB**, **PLANNED**, or **MISSING** where they are not verified. `/submit` also offers
an **IMPLEMENTED (local bounded)** confidential-material marker that remains in the
browser-tab review record; it does not provide consent, server-side deletion, or a
production confidentiality guarantee, so the safe local-use rule is fictional VoltEdge
material only.

## Privacy principles

- **Synthetic by default:** New fixtures and documentation examples use fictional
  VoltEdge records. Do not add real customer content, credentials, or confidential brand
  material to the repository.
- **Minimum context:** A future external provider must receive only the minimum relevant
  excerpt and approved evidence required for the check, after documented redaction.
- **Human control:** Suggested corrections and model findings are advisory. An authorised
  reviewer must decide whether a version is approved or sent back.
- **Evidence and uncertainty:** A missing source is not proof that a claim is false.
  Conflicts and failed dependencies must be visible as review-required states.
- **Traceability:** Future durable records must retain content version, audit, finding,
  source/rule version, actor, and decision timestamps without overwriting history.

## Access and tenancy

### Local behavior — **IMPLEMENTED (local)**

- Protected vault routes require a resolved principal.
- Authentication can use explicit development headers only when
  `PROOFLINE_DEV_AUTH=true`, or an HS256 bearer token when `PROOFLINE_JWT_SECRET` is set.
- The in-memory store keys records by organisation ID and does not return another
  organisation's record through the tested route path.
- Role checks restrict registry writes and `brand_owner` approval in the local service.
- Local workflow routes keep content, findings, comments, decisions, and audit events
  under the resolved organisation scope; event hashes are an in-memory integrity aid,
  not durable tamper evidence.

### Production boundary — **PLANNED / MISSING**

The repository does not verify Cloudflare Access JWT validation, D1 membership lookup,
session lifecycle, organisation provisioning, invitation flow, administrator policies, or
production audit logging. A client-supplied organisation ID must never be treated as
authorization when a durable service is implemented.

## Secrets and configuration

- `.env.example` contains redacted values and non-secret local defaults only.
- Local secret values belong in ignored `.env`/`.env.local` files or a server-side secret
  manager. Never put provider keys, JWT secrets, service-role keys, or tokens in browser
  code, fixtures, screenshots, logs, or documentation examples.
- Cloudflare API tokens and binding IDs are intentionally not configured in browser code.
- The current `PROOFLINE_JWT_SECRET` setting only enables local HS256 verification; it does
  not connect the Worker to Cloudflare Access or D1.

## Files and external processing

The local API implements byte/type/size checks, safe filename handling, parser limits,
extraction-quality states, and explicit failure responses. Malware scanning, retention,
deletion, and secure durable object storage are **MISSING**. The UI's document intake
remains a **STUB** and should not be interpreted as a hosted upload workflow.

If a model, OCR service, or hosted parser is added, the implementation must document:

1. Provider, model/library, version, and processing region.
2. Exact request data, redaction, confidentiality bypass behavior, and user notice.
3. Response fields stored, evidence validation, and whether prompts/results are logged.
4. Provider training/use settings, retention, deletion, and contractual controls.
5. Timeout, quota, malformed-output, and provider-outage behavior.

Until those facts are verified, the external-service entries remain **Unknown / not
configured** in [`docs/AI_DISCLOSURE.md`](AI_DISCLOSURE.md).

## Threats and current mitigations

| Threat | Current mitigation | Status / remaining gap |
|---|---|---|
| Cross-organisation reads | Store key includes organisation; route tests cover isolation. | **IMPLEMENTED locally**; durable RLS and membership checks remain **PLANNED**. |
| Unauthorized registry approval | Approval route requires `brand_owner`. | **IMPLEMENTED locally**; production identity/policy integration is **PLANNED**. |
| Secret exposure in frontend | API client accepts a bearer token but no provider key; `.env.example` is redacted. | **IMPLEMENTED boundary**; hosted secret management is **PLANNED**. |
| Model invents evidence | Local audit validation requires evidence/version/span checks and abstention; external model is unconfigured. | **IMPLEMENTED local guard**; live provider validation remains **STUB / PLANNED**. |
| Sensitive content sent externally | Confidential content is blocked at the optional model seam; no external call was observed. | **IMPLEMENTED local guard**; provider/account policy and live verification remain **PLANNED**. |
| Data loss on restart | Explicit `in_memory_demo` status. | Known local limitation; durable persistence is **PLANNED**. |
| Untrusted uploaded files | Local API validates bounded file bytes and parser/extraction states; no hosted object storage. | **IMPLEMENTED local guard**; malware scanning, retention, and durable storage are **MISSING**. |
| Production observability | Local tests, health route, and an in-memory hash-linked event list. | **MISSING**; secure durable logs, alerts, and incident response are not verified. |

## Safe local-use checklist

- Use fictional VoltEdge data for manual API calls and documentation examples.
- Keep `PROOFLINE_DEV_AUTH=true` limited to a private local shell.
- Do not expose the development server or its headers to an untrusted network.
- Do not use real customer, employee, credential, or confidential brand data.
- Confirm the API response still reports `persistence: "in_memory_demo"` and
  `ai_provider: "not_configured"` before treating the environment as local-only.
- Run the repository checks after changes; passing local checks does not establish a
  compliance certification or production security review.

## Review checklist before external processing

This is a blank gate for a future implementation; it records no completed approval:

- [ ] Provider/model/library and version verified from the running deployment.
- [ ] Data fields and redaction documented.
- [ ] Confidential-content behavior tested.
- [ ] Retention/deletion and processing region verified.
- [ ] Tenant isolation and authorization tested against the durable backend.
- [ ] Failure and abstention states tested.
- [ ] User-facing notice and AI disclosure updated.
- [ ] Human reviewer and owner sign-off recorded with date.
