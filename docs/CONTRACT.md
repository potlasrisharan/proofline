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
| `GET /v1/content` | **PLANNED** | List content items visible to the caller. | Organisation isolation and role-aware filtering. |
| `POST /v1/content` | **PLANNED** | Create a logical content item and its first text/file version. | Validate supported input and preserve the original. |
| `GET /v1/content/{content_id}/versions` | **PLANNED** | List immutable versions and workflow states for one content item. | Organisation membership required. |
| `POST /v1/content/{content_id}/versions` | **PLANNED** | Add a revised content version after correction or creator edits. | Never overwrite an existing version. |
| `POST /v1/content-versions/{content_version_id}/audit` | **PLANNED** | Start an audit using applicable registry records, deterministic rules, and optional configured AI/OCR. | Return truthful pending/failed/review-required states; persist the audit context. |
| `GET /v1/audits/{audit_id}` | **PLANNED** | Retrieve audit status, findings, source links, and service metadata. | Do not expose findings across organisations. |
| `POST /v1/content-versions/{content_version_id}/review` | **PLANNED** | Record an authorised approval or request for changes, with reason/comment. | Enforce role policy and retain actor, timestamp, and version. |
| `GET /v1/dashboard/summary` | **PLANNED** | Return counts and permitted aggregates derived from stored audit/review records. | No fabricated metrics; include sample/time-window metadata where relevant. |
| `GET /v1/impact/revalidation` | **MISSING for the initial foundation; planned later** | List registered content potentially affected by changed or expired fact versions. | Only scans Proofline-stored content; does not imply external web/social crawling. |

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
