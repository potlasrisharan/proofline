# Proofline AI and external-processing disclosure

**Document status:** Policy and disclosure template for Phase 1; it records known
boundaries and planned behavior, not an assertion that every integration is live.
**Last reviewed:** 2026-10-25
**Example tenant:** VoltEdge (fictional)

Proofline is designed as an evidence-backed review assistant. It is not a generic
content generator, a guarantee of real-world truth, legal advice, or an automatic
publisher. AI may help identify candidate claims, assess contextual tone or messaging,
and propose intent-preserving wording, but an authorised person remains accountable for
the final decision.

## Current implementation disclosure

- The repository contains a runnable Next.js demonstration UI and a local FastAPI
  foundation. The FastAPI vault adapter is explicitly non-persistent (`in_memory_demo`)
  and optional JWT verification is configuration-gated. A Supabase project, external
  model provider, OCR provider, and durable tenant storage must not be presented as
  connected unless verified in the running deployment.
- This document does **not** name a live AI provider or model because the provider,
  model version, data-retention terms, and deployment wiring have not been established
  by the Phase 1 contract.
- The existing README identifies the seeded UI workspace as Northstar Labs. New
  contract and documentation examples use fictional VoltEdge data so examples are not
  mistaken for customer information.
- If a route is only a scaffold, it must be labeled **STUB** and return a truthful
  not-implemented or dependency-unavailable state. A screen or type definition alone
  is not evidence of an AI integration.
- The local vault route is labelled **IMPLEMENTED (local)** only for its in-memory
  create/list/version/approval behavior. It is not a persistence guarantee and should
  not be used with confidential production records.

## What AI may do when enabled

The planned audit pipeline separates deterministic checks from model-assisted checks:

1. **Prepare:** validate the input, preserve the original, extract text where
   supported, and report extraction quality or failure.
2. **Retrieve:** select the minimum applicable VoltEdge-style registry records, rules,
   and source versions for the workspace, product, market, channel, and validity
   window.
3. **Check deterministically:** compare known terms, dates, units, numeric values, and
   configured qualifiers where structured rules are sufficient.
4. **Assist with context:** optionally ask a configured model to identify candidate
   claims, contextual tone/messaging mismatches, or possible conflicts using only the
   retrieved context.
5. **Validate:** require structured output, verify every cited evidence ID and version,
   reject malformed or cross-tenant references, and distinguish contradiction from
   missing evidence.
6. **Review:** show findings, evidence, uncertainty, and suggested corrections to a
   person. Store the creator action and reviewer decision; never silently activate a
   rule based on model output.

## Evidence-or-abstain rules

- A model must not invent a fact, citation, source, rule, product specification, or
  policy text.
- `supported_mismatch` requires an applicable source/rule reference and a recorded
  comparison. If evidence is absent, use `unsupported_unverified` or
  `review_required`.
- If active sources conflict, use `source_conflict` and route the finding to human
  review. Do not silently choose the newest-looking or highest-confidence answer.
- A model confidence value is not proof. If a risk score is shown, it is a transparent
  triage aid and must not be described as a probability that the content is true or
  false.
- If extraction, retrieval, model validation, or a dependency fails, report the
  failure/review-required state rather than a successful audit.

## External services and data handling

Before any external AI/OCR provider is connected, the implementation owner must fill
the provider record below with verified facts. Until then, the values remain
**Unknown / not configured**.

| Field | Current Phase 1 disclosure |
|---|---|
| AI provider and model | Unknown / not configured; do not infer from a package name or UI label. |
| OCR/PDF extraction provider | Unknown / not configured. A local parser and a hosted service have different disclosure requirements. |
| Data sent | At most the minimum relevant content excerpt and approved evidence needed for the configured check; exact payload must be documented after integration. |
| Sensitive data policy | Do not use real customer or confidential brand data in demo fixtures. Uploaded material is private by default. |
| Retention and deletion | Unknown until provider and storage policy are selected; document both application and provider retention. |
| Processing region | Unknown until deployment/provider terms are verified. |
| Training/use by provider | Unknown until the provider's current terms and account settings are verified; do not promise that submitted content is never used for training. |
| Secrets | Provider keys belong in server-side secrets management, never in browser code, source control, or logs. |
| Failure handling | Timeouts, quota errors, malformed output, and unavailable providers must produce explicit failed/review-required states. |

### Required provider record before a live demo

Replace each `TBD` only with facts verified from the actual deployment and provider
configuration:

```text
Provider: TBD
Model and version: TBD
Feature(s) using it: TBD
Request data and redaction: TBD
Response data stored: TBD
Retention/deletion: TBD
Processing region: TBD
Provider training/use setting: TBD
Timeout/retry/fallback behavior: TBD
Owner and verification date: TBD
```

## Human control and user-facing notice

The UI and API should make these points clear before a user submits content to a
configured external service:

- Automated output is advisory and may be wrong, incomplete, stale, or biased.
- Findings are checked against the organisation's approved records, not guaranteed
  truth in the outside world.
- Missing or conflicting evidence is surfaced for review.
- Suggested corrections are proposals that a creator can accept, edit, or reject.
- An authorised human decides whether content is approved or sent back for changes.
- Proofline does not replace legal, regulatory, accessibility, or specialist review.

## Fictional VoltEdge example

For a fictional VoltEdge NovaBook S1 launch email, the approved registry may say
“battery life: up to 12 hours.” If draft text says “up to 20 hours,” a validated
deterministic finding may show the two values and link the approved registry version.
If no approved battery record exists, the system must show **unsupported/unverified** or
**review required**, not manufacture a battery-life value or cite a nonexistent source.

## Development-assistance disclosure

The final project submission should separately record significant AI assistance used to
plan, write, refactor, test, or design the product, according to the event rules. The
entry below records this Phase 1 continuation from the runtime context available to the
coding assistant; the team should add any other contributors or tools from their actual
activity rather than guessing.

```text
Development tool/provider: Coding assistant in this app
Model/version: gpt-6.1-sol
Dates and contributors: 2026-10-25; project owner and coding assistant
Work assisted (planning/code/docs/design/tests): Phase 1 audit, contracts, FastAPI foundation, tests, SQL seed review, and handoff docs
Human review performed: Repository rules, PRD, diffs, test output, and local API/SQL smoke results reviewed in this session
Generated material retained or discarded: Retained only as reviewed repository changes; no private prompts, credentials, or customer data added
```

## Libraries and templates used in this foundation

- Existing Next.js 16, React 19, TypeScript, ESLint, and the repository's pre-existing
  UI assets.
- FastAPI, Starlette, Pydantic, PyJWT, Uvicorn, HTTPX, and pytest from
  `backend/requirements.txt`.
- Supabase/PostgreSQL SQL syntax and RLS patterns are represented in the migration;
  no live Supabase project or generated client code is claimed.

This repository document is a transparency aid. It is not a substitute for checking
the actual provider terms, configured data controls, deployment environment, or event
submission requirements.
