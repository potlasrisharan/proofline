# Proofline Phase 1 foundation contract

**Contract status:** Proposed shared contract with a verified local FastAPI foundation;
Supabase persistence is not verified as connected in the current repository.
**Contract date:** 2026-10-25
**Product source:** `Proofline_Consolidated_PRD.md` (especially sections 7–10)
**Example tenant:** VoltEdge (fictional)

This document is the shared boundary between the existing Next.js demonstration UI and
the API/data foundation. It defines the shape and semantics that the FastAPI/Pydantic
service and a future Supabase/PostgreSQL persistence layer should implement. The local
API uses an explicitly labelled in-memory adapter; it does not claim durable Supabase
storage.

## Status vocabulary

| Status | Meaning |
|---|---|
| **IMPLEMENTED** | Verified in the running repository and backed by a real persistence or service path. |
| **STUB** | A route or adapter may be scaffolded for connectivity, but it must return an explicit not-implemented/error state and must not fabricate domain data. |
| **PLANNED** | The intended Phase 1 contract; no current implementation is implied. |
| **MISSING** | Deliberately outside the current foundation or not yet specified. |

The local FastAPI process implements the health route and vault routes against a
non-persistent in-memory adapter. It returns `persistence: "in_memory_demo"` so this
local behavior cannot be mistaken for Supabase durability. The current runnable
frontend remains the Next.js UI described in the root `README.md`.

## Contract principles

1. **Evidence before assertion.** Findings cite an applicable approved source/rule or
   explicitly report that evidence was not found.
2. **Human accountability.** AI output is a candidate; an authorised reviewer makes
   the final approval or request-change decision.
3. **Version everything important.** Content, registry records, source versions, audit
   runs, findings, and review decisions remain traceable.
4. **Tenant isolation.** Every organisation-scoped read/write is authorised from the
   authenticated membership, not from a client-supplied ID alone.
5. **Visible failure.** Extraction errors, source conflicts, malformed model output,
   and missing evidence become explicit states rather than successful-looking data.
6. **No automatic publication or policy activation.** The foundation supports review;
   it does not publish content or silently turn suggestions into approved rules.

## Common API conventions (planned)

- Base path: `/v1` for domain endpoints. A future deployment may add a versioned host
  prefix without changing the resource names.
- Media type: `application/json` for JSON requests and responses. Multipart upload is
  allowed for supported content files, but extraction limits and accepted MIME types
  must be configured and documented by the implementation.
- Authentication: the local service supports a verified Supabase-compatible HS256 JWT
  when `SUPABASE_JWT_SECRET` is configured, and opt-in development headers when
  `PROOFLINE_DEV_AUTH=true`. Every protected route resolves the organisation and role
  server-side. No live Supabase Auth connection is claimed.
- IDs: opaque strings, preferably UUIDs; clients must not infer meaning from IDs.
- Timestamps: RFC 3339/ISO 8601 UTC strings, for example
  `2026-10-25T14:30:00Z`.
- Pagination: collection routes should support bounded `limit` and an opaque `cursor`
  when implemented. The server owns maximum page sizes.
- Errors: use an explicit machine-readable error code and human-readable message;
  validation failures must identify the field where possible. Do not return a `200`
  response containing a fabricated success object for an unavailable dependency.
- Async audits: a future implementation may return `202 Accepted` with an audit in
  `pending` state. Callers must poll the audit resource and handle `failed` and
  `review_required` states.

## MVP Finding schema

The following compact shape is the required Phase 1 `Finding` interface. It is the
review-facing contract: a backend may store additional audit metadata, but it must be
able to produce these fields without inventing evidence.

```ts
type Finding = {
  id: string;
  content_version_id: string;
  span: { start: number; end: number; text: string };
  category:
    | "factual"
    | "offer_date"
    | "terminology"
    | "tone"
    | "promotional"
    | "legal"
    | "visual"
    | "accessibility"
    | "translation";
  verdict: "supported" | "contradicted" | "outdated" | "unsupported" | "needs_human";
  severity: "critical" | "high" | "medium" | "low";
  confidence: number; // 0 <= confidence <= 1; not a truth probability
  method: "rule" | "llm" | "hybrid";
  evidence: {
    source_type: string;
    source_id: string;
    version: string;
    quote: string;
  } | null;
  reason: string;
  suggestion: { text: string; intent_note: string } | null;
  status: "open" | "accepted" | "edited" | "dismissed";
  dismiss_reason: string | null;
};
```

Rules for this shape:

- `confidence` describes the strength of the check result, not the probability that a
  claim is true in the outside world.
- A `contradicted` or `outdated` verdict requires non-null `evidence` with source ID,
  version, and quote. Without defensible evidence, use `unsupported` or `needs_human`.
- `suggestion` is a proposal and never silently changes content. A dismissed finding
  must retain the human-provided `dismiss_reason`.

## Extended persistence finding record (planned mapping)

The following JSON Schema is an extended persistence/audit shape. A FastAPI
implementation may map its stored fields to the compact `Finding` above. It remains
evidence-aware: `evidence_status` is not a model confidence score and absence of
evidence is not a contradiction.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://proofline.example/contracts/extended-finding-record.schema.json",
  "title": "ExtendedFindingRecord",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id",
    "audit_run_id",
    "content_id",
    "content_version_id",
    "excerpt",
    "category",
    "severity",
    "explanation",
    "evidence_status",
    "evidence_refs",
    "creator_action",
    "reviewer_outcome",
    "created_at",
    "verification"
  ],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "audit_run_id": { "type": "string", "minLength": 1 },
    "content_id": { "type": "string", "minLength": 1 },
    "content_version_id": { "type": "string", "minLength": 1 },
    "excerpt": { "type": "string", "minLength": 1 },
    "location": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "start_char": { "type": "integer", "minimum": 0 },
        "end_char": { "type": "integer", "minimum": 0 },
        "page": { "type": "integer", "minimum": 1 },
        "section": { "type": "string" }
      }
    },
    "category": {
      "type": "string",
      "enum": [
        "fact_mismatch",
        "outdated_fact_or_offer",
        "unsupported_claim",
        "terminology_violation",
        "tone_messaging_mismatch",
        "visual_mismatch",
        "accessibility_issue",
        "configured_policy_disclaimer",
        "source_conflict",
        "guideline_ambiguity"
      ]
    },
    "severity": {
      "type": "string",
      "enum": ["high", "medium", "low", "review_required"]
    },
    "explanation": { "type": "string", "minLength": 1 },
    "evidence_status": {
      "type": "string",
      "enum": [
        "supported_mismatch",
        "unsupported_unverified",
        "source_conflict",
        "style_suggestion",
        "review_required"
      ]
    },
    "evidence_refs": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["kind", "id", "version"],
        "properties": {
          "kind": { "type": "string", "enum": ["brand_record", "source", "rule", "asset"] },
          "id": { "type": "string", "minLength": 1 },
          "version": { "type": "string", "minLength": 1 },
          "excerpt": { "type": "string" },
          "applicability": { "type": "string" }
        }
      }
    },
    "suggested_correction": {
      "type": "object",
      "additionalProperties": false,
      "required": ["text", "rationale"],
      "properties": {
        "text": { "type": "string", "minLength": 1 },
        "rationale": { "type": "string", "minLength": 1 },
        "preserves_intent": { "type": "boolean" }
      }
    },
    "creator_action": {
      "type": "string",
      "enum": ["pending", "accepted", "edited", "rejected", "not_applicable"]
    },
    "reviewer_outcome": {
      "type": "string",
      "enum": ["pending", "confirmed", "overridden", "resolved", "needs_review"]
    },
    "verification": {
      "type": "object",
      "additionalProperties": false,
      "required": ["method", "ruleset_version"],
      "properties": {
        "method": {
          "type": "string",
          "enum": ["deterministic_rule", "model_assisted", "human_review", "mixed"]
        },
        "ruleset_version": { "type": "string", "minLength": 1 },
        "model_provider": { "type": "string" },
        "model_name": { "type": "string" },
        "model_version": { "type": "string" },
        "validated_at": { "type": "string", "format": "date-time" }
      }
    },
    "risk_score": {
      "type": "object",
      "additionalProperties": false,
      "required": ["value", "basis"],
      "properties": {
        "value": { "type": "integer", "minimum": 0, "maximum": 100 },
        "basis": { "type": "string", "minLength": 1 },
        "is_probability": { "const": false }
      }
    },
    "created_at": { "type": "string", "format": "date-time" }
  }
}
```

### Finding semantics

- `category` describes the issue family. `severity` describes triage priority, not
  truth probability.
- `evidence_refs` must be empty when no applicable evidence was found. The service
  must then use `unsupported_unverified` or `review_required`, not
  `supported_mismatch`.
- A source conflict must name the conflicting records in `evidence_refs` where
  possible and use `source_conflict` plus `review_required` severity.
- `suggested_correction` is optional and is a proposal. It is not an approved fact or
  automatic edit. `preserves_intent` may be omitted when it has not been assessed.
- `risk_score`, when present, is a transparent triage aid based on documented policy
  inputs. `is_probability` is always false; the score must never be presented as the
  probability that a claim is true or false.
- `verification` records the rule/model context needed to explain the result. Empty or
  unknown model fields are preferable to invented provider metadata.

### VoltEdge example Finding

The following is fictional demo data only. It shows a deterministic mismatch between
the submitted claim and the approved VoltEdge registry record.

```json
{
  "id": "finding_voltedge_001",
  "audit_run_id": "audit_voltedge_014",
  "content_id": "content_voltedge_launch_email",
  "content_version_id": "content_version_voltedge_003",
  "excerpt": "VoltEdge NovaBook S1 delivers up to 20 hours of battery life.",
  "location": { "start_char": 88, "end_char": 153, "section": "hero_copy" },
  "category": "fact_mismatch",
  "severity": "high",
  "explanation": "The submitted claim says up to 20 hours, while the applicable approved VoltEdge registry record says up to 12 hours.",
  "evidence_status": "supported_mismatch",
  "evidence_refs": [
    {
      "kind": "brand_record",
      "id": "brand_record_voltedge_novabook_battery",
      "version": "3",
      "excerpt": "Battery life: up to 12 hours",
      "applicability": "VoltEdge NovaBook S1; US launch email; current version"
    }
  ],
  "suggested_correction": {
    "text": "VoltEdge NovaBook S1 delivers up to 12 hours of battery life.",
    "rationale": "Replaces the conflicting number with the current approved registry value while preserving the product claim.",
    "preserves_intent": true
  },
  "creator_action": "pending",
  "reviewer_outcome": "pending",
  "verification": {
    "method": "deterministic_rule",
    "ruleset_version": "ruleset-2026-10-25",
    "validated_at": "2026-10-25T14:30:00Z"
  },
  "created_at": "2026-10-25T14:30:00Z"
}
```

## Phase 1 endpoint surface

The local rows below are verified against the FastAPI app and are intentionally scoped
to the non-persistent demo adapter. They are not a claim that Supabase persistence or
production authentication is connected. The remaining rows are planned and do not
exist merely because they appear in this document.

| Method and path | Status | Intended responsibility | Required boundary |
|---|---|---|---|
| `GET /health` | **IMPLEMENTED (local)** | Process/liveness response for deployment checks. It reports in-memory persistence and unconfigured AI rather than implying readiness. | Public; no domain data. |
| `GET /v1/{resource}` for facts, terms, guidelines, disclaimers, assets | **IMPLEMENTED (local)** | List vault records for the authenticated organisation. | Requires authenticated principal; records are in-memory only. |
| `POST /v1/{resource}` for facts, terms, guidelines, disclaimers, assets | **IMPLEMENTED (local)** | Create a version-1 draft vault record. | Managers/brand owners may write registry records; legal reviewers may write disclaimers. |
| `GET /v1/{resource}/{record_id}` | **IMPLEMENTED (local)** | Retrieve one organisation-scoped vault record. | Never reads another organisation's in-memory records. |
| `POST /v1/{resource}/{record_id}/versions` | **IMPLEMENTED (local)** | Create a new draft version while retaining the prior record. | Organisation-scoped; write roles only. |
| `POST /v1/{resource}/{record_id}/approve` | **IMPLEMENTED (local)** | Approve a draft vault record. | `brand_owner` only; approval actor and timestamp are retained. |
| `GET /v1/brand-records` | **PLANNED** | List applicable approved facts, terminology, rules, and their current versions. | Filter by authenticated organisation and optional product/market/channel/language scope. |
| `POST /v1/brand-records` | **PLANNED** | Create an approved-record draft or versioned record. | Must record source, owner, applicability, and approval state in durable storage. |
| `PATCH /v1/brand-records/{brand_record_id}` | **PLANNED** | Supersede or amend a registry record by creating a new version. | Must preserve old versions and enforce owner/admin permissions. |
| `GET /v1/organisations` | **PLANNED** | List organisations/workspaces for the authenticated user. | Membership-filtered; never enumerate another tenant. |
| `POST /v1/organisations` | **PLANNED** | Create a workspace if the configured auth policy permits it. | Creates the first membership/owner atomically. |
| `GET /v1/content` | **IMPLEMENTED (local)** | List content items visible to the caller. | Organisation isolation and role-aware filtering; in-memory only. |
| `POST /v1/content` | **IMPLEMENTED (local)** | Create a logical content item and its first text version. | Text workflow adapter validates non-empty input and preserves the original. |
| `GET /v1/content/{content_id}/versions` | **IMPLEMENTED (local)** | List immutable versions and workflow states for one content item. | Organisation membership and creator/agency scope required. |
| `POST /v1/content/{content_id}/versions` | **IMPLEMENTED (local)** | Add a revised content version after correction or creator edits, with optional automatic recheck. | Never overwrites an existing version; failed/review-required rechecks remain blocked. |
| `POST /v1/content-versions/{content_version_id}/audit` | **IMPLEMENTED (local)** | Run the configured local audit boundary or return an explicit review-required state. | Caller cannot forge findings/model metadata; results remain in memory. |
| `GET /v1/audits/{audit_id}` | **IMPLEMENTED (local)** | Retrieve audit status, findings, diff, and service metadata. | Organisation and content scope enforced. |
| `POST /v1/content-versions/{content_version_id}/review` | **IMPLEMENTED (local)** | Record an authorised submit, request-changes, approval, release, or re-review decision. | Enforces role policy, separation of duties, high-risk sign-off, reason/comment, actor, timestamp, and version. |
| `GET /v1/dashboard/summary` | **PLANNED** | Return counts and permitted aggregates derived from stored audit/review records. | No fabricated metrics; include sample/time-window metadata where relevant. |
| `GET /v1/impact/revalidation` | **IMPLEMENTED (local)** | List registered content potentially affected by changed or expired fact versions. | Only scans records registered with the local in-memory impact adapter; does not imply external web/social crawling or durable persistence. |

### Phase 3 workflow endpoints (verified local)

The following routes are implemented against the organisation-scoped in-memory workflow
adapter. They are **IMPLEMENTED (local)**, not claims of durable persistence or production
authentication:

| Method and path | Status | Intended responsibility | Required boundary |
|---|---|---|---|
| `POST /v1/content-versions/{content_version_id}/comments` | **IMPLEMENTED (local)** | Add a comment anchored to an exact content span or finding, optionally replying in a thread. | Anchor must match the immutable version text; replies stay on the parent version. |
| `GET /v1/content-versions/{content_version_id}/comments` | **IMPLEMENTED (local)** | List version-scoped span comments. | Organisation and content visibility enforced. |
| `GET /v1/findings/{finding_id}` | **IMPLEMENTED (local)** | Retrieve one evidence-first finding. | Organisation/content visibility enforced. |
| `POST /v1/findings/{finding_id}/action` | **IMPLEMENTED (local)** | Record accept, edit, dismiss, override, or reopen. | Current-version only; dismiss/override requires a written reason; high-risk manager overrides are denied. |
| `GET /v1/audit-events` | **IMPLEMENTED (local)** | List visible hash-chained workflow events. | Review roles see organisation events; creator/agency visibility is content-scoped. |
| `GET /v1/audit-events/verify-chain` | **IMPLEMENTED (local)** | Verify the SHA-256 event chain and detect local tampering. | Verification is process-local and not a durable integrity guarantee. |
| `GET /v1/content/{content_id}/export` | **IMPLEMENTED (local)** | Export retained versions, audits, findings, comments, decisions, actions, and audit events as JSON. | Content and organisation scope enforced; export includes explicit `in_memory_demo` status. |

### Endpoint behavior that must not be implied

- These routes do not promise automatic publication, social/CMS integrations, legal
  advice, universal truth, or complete accessibility certification.
- An audit response must not claim an external model, OCR library, Supabase table, or
  authentication provider is active until the deployment actually uses it and the
  disclosure is updated.
- A `suggested_correction` never changes the content or registry without an explicit
  user/reviewer action.

## Minimal resource relationships

The foundation should preserve these relationships even if early migrations combine
tables:

```text
organisation
  ├─ memberships/users
  ├─ brand_record ── brand_record_version ── source
  ├─ content_item ── content_version ── audit_run ── finding ── evidence_ref
  └─ review_decision / audit_event
```

An audit links each finding to exactly one `content_version_id`. A finding may have
zero evidence references only when its evidence status explicitly communicates
unsupported/unverified or review-required handling. Registry and source versions are
append-only from the perspective of audit history.

## Contract change process

When implementation diverges from this document:

1. Update the contract and status label in the same change as the API/data change.
2. Add or update a representative VoltEdge fixture and a meaningful check.
3. Record compatibility impact for existing UI consumers.
4. Update `docs/AI_DISCLOSURE.md` when provider, model, OCR, storage, data handling, or
   external processing changes.

## Phase 2 verification-engine contract

**Phase 2 status:** The interfaces below are the shared target for the verification engine.
Individual integrations remain **STUB**, **PLANNED**, or **MISSING** until a running check
proves them. The default local implementation must be offline-capable and explicitly
labelled `in_memory_demo` when it is not connected to Supabase/Postgres.

### Normalised ingestion

```python
class DocumentSpan(TypedDict):
    start: int
    end: int
    text: str
    page: int | None
    source: Literal["text", "pdf", "docx", "ocr"]
    bbox: tuple[float, float, float, float] | None

class NormalizedDocument(TypedDict):
    text: str
    spans: list[DocumentSpan]
    source_type: Literal["text", "pdf", "docx", "image"]
    extraction_status: Literal["complete", "partial", "failed", "unsupported"]
    extraction_message: str | None
    image_metadata: list[dict[str, object]]
    original_filename: str | None
    mime_type: str | None
    confidential: bool
```

Text offsets are offsets into the final normalised `text` string. PDF/DOCX extraction must
retain page/paragraph provenance where available. OCR spans may include bounding boxes.
An empty or incomplete extraction is never a successful audit.

### Claims and ledger links

```python
class Claim(TypedDict):
    id: str
    text: str
    start: int
    end: int
    kind: str
    normalized_value: object | None
    unit: str | None
    qualifier: str | None
    comparator: str | None
    regulated: bool

class ClaimFactLink(TypedDict):
    claim_id: str
    fact_id: str | None
    fact_version: str | None
    link_status: Literal["supported", "contradicted", "outdated", "unsupported", "conflict", "unmatched"]
    evidence_quote: str | None
```

Every link is persisted with the content version/audit that produced it. A missing link is
not evidence of a false claim.

### Phase 2 findings and risk

The compact `Finding` above remains the review-facing shape. Its category vocabulary also
allows `security` for instruction-like text detected inside submitted content; its severity
allows `critical` in addition to the existing labels. The extended persistence schema adds
the following fields when a finding has been scored:

```json
{
  "risk_score": {
    "value": 24,
    "basis": "severity=5 x confidence=0.8 x exposure=2 x regulatory_weight=1.5",
    "is_probability": false,
    "breakdown": {
      "severity_points": 5,
      "confidence": 0.8,
      "exposure": 2,
      "regulatory_weight": 1.5,
      "raw_score": 12.0
    }
  }
}
```

The raw formula is `severity_points (1–5) × confidence (0–1) × exposure (1–3) ×
regulatory_weight (1.0 or 1.5)`. A critical finding forces the content risk label to
`high`; the score is a triage aid, not a calibrated truth probability.

### Audit engine interface

```python
class AuditEngine(Protocol):
    def audit(
        self,
        *,
        organisation_id: str,
        content_version_id: str,
        document: NormalizedDocument,
        approved_records: Sequence[VaultRecord],
        options: AuditOptions,
    ) -> AuditResult: ...
```

`AuditResult` must include the claims, `ClaimFactLink` records, findings, audit status,
content risk, deterministic/LLM service metadata, and an explicit error or
`review_required` state when extraction, retrieval, validation, or a provider call fails.
High-severity findings always pass through a verifier step. Suggestions are proposals only
and may use values present in approved records, never invented values.

### Phase 2 content endpoints

These routes are implemented first against the local in-memory adapter and must be labelled
accordingly until durable persistence is verified:

| Method and path | Intended behavior | Required response boundary |
|---|---|---|
| `POST /contents` | Create an immutable content version from text or base64-encoded PDF/DOCX/JPG/PNG, run the audit, and persist the result | Authenticated organisation; reject unsupported/empty extraction; confidential input is never sent to external LLMs |
| `GET /contents/{id}` | Return the content, current version, audit status/findings, claim links, risk breakdown, and provider/service metadata | Organisation-scoped; no fabricated success or cross-tenant read |
| `POST /contents/{id}/recheck` | Create a new version from supplied text/file or the prior content and run a fresh audit | Never overwrites history; uses current approved fact/rule versions |
| `POST /findings/{id}/action` | Record `accept`, `edit`, or `dismiss` with actor/time and a required reason for dismissals | Organisation-scoped; action is auditable and does not auto-publish or mutate approved facts |

The request/response models may add fields, but must preserve the stable names `content_id`,
`content_version_id`, `audit_id`, `findings`, `claim_links`, `risk`, `status`, and
`persistence`. The API must accept `exposure` (1–3), `regulated`/regulatory context, and a
`confidential` tag. Submitted content is data, not instructions; instruction-like text is
flagged for human review.

### LLM and retrieval boundary

- The provider reads `GEMINI_API_KEY` and `GEMINI_MODEL` only from server environment.
  No model name is hardcoded. If no key is configured, deterministic checks still run and
  model-dependent checks return `needs_human` with an explicit offline message.
- Provider metadata records the actual provider/model only when observed. Model discovery
  may list available Gemini models at startup when a key exists; discovery failure is
  fail-soft and visible.
- Retrieval exposes a pgvector-compatible interface and a Postgres full-text fallback, but
  neither is claimed live without a configured connection and a running check.
- Before any external model call, mask email addresses and phone numbers. Confidential-tagged
  content must bypass every external model call; this is a hard invariant tested locally.
- Structured model output is schema-validated, evidence IDs/versions are checked against
  the current organisation records, retries are bounded, and rate-limit backoff is bounded.

## Phase 4 improvement surfaces

The following surfaces are verified locally and remain explicitly non-persistent. They
are documented here so reusable UI components and local API routes do not appear to be
production integrations merely because their types exist.

### Fact-Change Impact Radar — **IMPLEMENTED (local)**

| Method and path | Status | Responsibility | Boundary |
|---|---|---|---|
| `POST /v1/impact/fact-versions` | **IMPLEMENTED (local)** | Create a draft or owner-approved fact version and compare it with the prior approved version. | In-memory, organisation-scoped; only `brand_owner` may create an already-approved version. |
| `POST /v1/impact/facts/{fact_id}/versions/{fact_version}/approve` | **IMPLEMENTED (local)** | Approve a draft fact version and mark linked older claims for re-review. | `brand_owner` only; history is retained only for the process lifetime. |
| `POST /v1/impact/facts/{fact_id}/end-validity` | **IMPLEMENTED (local)** | End validity for an approved fact and create expiry tasks for linked content. | `brand_owner` only; future validity endings are rejected by the local adapter. |
| `POST /v1/impact/content` | **IMPLEMENTED (local)** | Register content and claims with an exact `fact_id` plus fact version link. | Local registration path; claims must reference a known fact version. |
| `GET /v1/impact/revalidation` and `GET /v1/impact/affected` | **IMPLEMENTED (local)** | List affected draft, in-review, approved, and already-flagged content with old/new values. | Local registered records only; no external crawler or durable store. |
| `POST /v1/impact/recheck-all` | **IMPLEMENTED (local)** | Re-check every open affected task using deterministic version/validity comparison. | Returns `outdated` or `needs_human`; never edits content or approves it. |
| `GET /v1/impact/events` and `GET /v1/impact/rechecks` | **IMPLEMENTED (local)** | Read impact audit events and re-check receipts. | Reviewer/manager/owner access is local role-gated and process-scoped. |

The standalone `/impact` page renders a synthetic VoltEdge fixture through the reusable
`ImpactRadar` and `ImpactRadarBanner` components. Its button is an explicit local demo
callback; it is not a claim that the browser is connected to the FastAPI service.

### Governance Insights and Guideline-Gap Detector — **IMPLEMENTED (local analytics)**

`backend/app/insights.py` computes deterministic, organisation-scoped aggregates from
caller-supplied saved-review records: categories and rules, team and agency aggregates,
UTC trend buckets, facts expiring soon, dismissal/override/needs-human signals, and
explicit guideline conflicts. It excludes individual rankings. The simulation command
is:

```bash
python3 scripts/simulate_review_activity.py --compact
```

Suggested clearer wording is labelled `AI-generated` in the UI even though the current
local generator is a deterministic template. A proposal remains `proposed` until an
explicit `brand_owner` approval is recorded, and `applied` remains false. There is no
durable analytics endpoint or background scheduler in this repository; the standalone
`/insights` page renders a synthetic VoltEdge input through the reusable component.

### Evidence-or-Abstain reliability — **IMPLEMENTED (local deterministic measurement)**

`backend/app/reliability.py` validates evidence records, exact spans, source scope,
units/currencies, validity windows, instruction-like content, and candidate output. It
uses bounded local timeout/retry/cache behavior and routes ambiguous or unverified cases
to `needs_human`. The generated VoltEdge set contains 194 cases, including unit
conversions, approximation wording, currency formats, and prompt-injection text. Exact
precision/recall results are recorded in `docs/EVAL_REPORT.md`; they are synthetic local
measurements, not production or model-accuracy claims.
