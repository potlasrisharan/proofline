# Proofline AI and external-processing disclosure

**Document status:** Current local implementation disclosure; external integrations
remain explicitly unverified. This document records what is present in the repository
on **October 26, 2026**, not what the PRD proposes.
**Example tenant:** VoltEdge (fictional)

Proofline is designed as an evidence-backed review assistant. It is not a generic
content generator, a guarantee of real-world truth, legal advice, or an automatic
publisher. Any future model output would be a candidate for validation and human review.

## What is implemented locally

| Area | Status | Verified behavior |
|---|---|---|
| Next.js UI | **IMPLEMENTED (local demo)** | Seeded fictional VoltEdge screens use local React state for findings, corrections, re-scan, comments, role preview, approval transitions, and a synthetic audit log. No model call occurs in this UI path. |
| FastAPI health and vault API | **IMPLEMENTED (local)** | `/health` reports `persistence: "in_memory_demo"` and `ai_provider: "not_configured"`; vault records can be created, listed, read, versioned, and approved in an organisation-scoped in-memory store. |
| Content/review workflow API | **IMPLEMENTED (local contract workflow)** | Text/metadata content versions, caller-supplied structured findings, re-check diffing, finding actions, comments, review decisions, exports, and hash-linked events can be retained in a separate in-memory store. It does not extract claims or call a model. |
| Local content-audit API | **IMPLEMENTED (local, dependency-gated)** | `/contents` accepts bounded text/base64 files, runs local ingestion and deterministic checks, validates findings/claim links, and stores audit results in memory. Missing providers or incomplete extraction become `review_required`/`failed` states. |
| Authentication boundary | **IMPLEMENTED (local boundary)** | Opt-in development headers and HS256 JWT verification are available when configured; there is no live Supabase Auth membership lookup. |
| Browser API client | **IMPLEMENTED (unused boundary)** | `app/lib/proofline-api.ts` defines typed vault calls, but the seeded UI does not invoke it. |
| Browser-local deterministic checker | **IMPLEMENTED (local demo)** | `/submit` and `/findings` retain synthetic VoltEdge content in the browser tab, run bounded deterministic checks, show evidence gaps, and keep explicit correction/dismissal actions in local session state. No model call occurs. |
| Local ingestion, deterministic audit, and validation | **IMPLEMENTED (local, dependency-gated)** | Bounded text/PDF/DOCX/image ingestion, lexical claim extraction, deterministic evidence-or-abstain rules, schema/span/evidence validation, risk metadata, and explicit failed/review-required states exist in `backend/app/`. Optional parser/OCR packages are discovered lazily. |
| External AI/OCR provider | **STUB / MISSING externally** | The Gemini adapter is fail-soft and disabled unless `GEMINI_API_KEY` and `GEMINI_MODEL` are configured; no external model call was observed. Hosted OCR is not configured. |
| Durable storage | **STUB / PLANNED** | Supabase migration/RLS/seed artifacts exist; no live Supabase project or durable adapter is connected. |

A screen, type definition, SQL migration, package dependency, or Dockerfile is not by
itself evidence that an external service is active. If a route is only a scaffold, its
status must remain **STUB**, **PLANNED**, or **MISSING** and its response must not imply
successful unavailable work.

The local vault adapter is useful for contract and RBAC tests only. It is non-persistent,
clears on process restart, and must not be used with confidential production records.

## Current local verification behavior

The local backend contains a dependency-tolerant pipeline: bounded ingestion, lexical
claim extraction, deterministic checks, optional model candidates, schema/span/evidence
validation, and `review_required`/`failed` handling. It keeps `persistence:
"in_memory_demo"`; the API routes do not claim durable storage. The local deterministic
reliability engine reports `external_calls: 0`, and the optional model service abstains
when no configured provider is available. This is implementation behavior, not a model
accuracy or production-performance result.

## Phase 4 local improvement disclosure

| Improvement | Status | Actual local behavior | Not implied |
|---|---|---|---|
| Fact-Change Impact Radar | **IMPLEMENTED (local)** | The in-memory impact adapter versions fictional VoltEdge facts, links registered claims by exact fact ID/version, marks eligible content `re_review_required`, creates re-review tasks, records impact events, and returns deterministic re-check receipts. | No durable persistence, scheduled worker, external website/social scan, automatic edit, or approval. |
| Governance Insights and Guideline-Gap Detector | **IMPLEMENTED (local analytics)** | `backend/app/insights.py` aggregates supplied review activity by category, rule, team, agency, trend, expiry, and ambiguity signal. Suggested wording is labelled `AI-generated`; approval returns a separate owner decision and keeps `applied: false`. | No individual ranking, automatic rule activation, durable analytics store, or claim that synthetic numbers are user research or production metrics. |
| Evidence-or-Abstain reliability | **IMPLEMENTED (local deterministic measurement)** | The local library validates source scope/version, exact spans, units/currencies, validity, candidate schemas, timeouts, bounded retries, cache behavior, and prompt-injection text. Doubtful cases become `needs_human`; 194 synthetic VoltEdge cases are measured in `docs/EVAL_REPORT.md`. | No external model accuracy claim, exchange-rate inference, universal numeric-language coverage, or production reliability guarantee. |

The standalone `/impact` and `/insights` pages render explicitly synthetic VoltEdge
fixtures through reusable client components. Their actions are local demo callbacks and
do not prove that the browser is connected to the FastAPI service or a durable database.

## Planned or optional external behavior

The following provider/deployment choices remain **PLANNED**, **STUB**, or unverified:

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

No external AI/OCR/database/hosting service is verified as connected in the current
repository. The following table is deliberately explicit about what remains unknown:

| Service or decision | Current status | Disclosure boundary |
|---|---|---|
| AI provider/model/version | **STUB / not configured** | A Gemini adapter exists behind environment-only configuration, but no provider/model call was observed. The UI/API health path reports `ai_provider: "not_configured"`. |
| PDF/DOCX/local OCR extraction | **IMPLEMENTED (local, optional dependencies)** | The ingestion module validates bytes/limits, extracts text where installed `PyMuPDF`/`pdfplumber`, `python-docx`, `Pillow`, and `pytesseract` adapters are available, and reports `complete`, `partial`, `failed`, or `unsupported`. Hosted OCR is not configured. |
| Hosted OCR extraction provider | **MISSING / not configured** | No external OCR service is connected; the UI document path remains explicitly unavailable. |
| Supabase database/storage | **STUB / PLANNED** | SQL migration, RLS design, and VoltEdge seed are present; no live project, Storage bucket, or durable adapter is connected. |
| Supabase Auth/membership lookup | **PLANNED** | Local JWT verification is configuration-gated; it does not prove a live Auth integration. |
| Hosting/deployment | **MISSING / unverified** | A local Dockerfile exists, but no hosted deployment or runtime environment has been smoke-tested. |
| Data sent to external providers | **None observed in this workspace** | Local deterministic/ingestion paths do not require a network provider. The optional Gemini seam masks email/phone data and blocks confidential content, but no live request was verified. |
| Retention/deletion | **Unknown for future providers** | Application-process memory currently ends with the local API process; provider and durable-storage retention are not selected. |
| Processing region | **Unknown** | Do not promise a region until the actual provider and deployment are verified. |
| Provider training/use settings | **Unknown** | Do not promise that content is excluded from provider training until current terms and account settings are checked. |
| Secrets | **Local boundary implemented** | Keep values in ignored local environment files or server-side secret storage; never place keys in browser code, source control, fixtures, or logs. |
| Failure handling | **Contract rule / future implementation** | Timeouts, quota errors, malformed output, and unavailable dependencies must become failed or `review_required` states. |

### Required provider record before a live demo

Replace each `TBD` only with facts verified from the actual deployment and provider
configuration. Until that happens, this record remains incomplete:

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
entry below records the coding-assistant activity visible in this workspace. Add other
people or tools only from the team's actual records; do not infer contributions.

```text
Development tool/provider: Coding assistant in this app
Model/version: gpt-6.1-sol
Dates and contributors: 2026-10-25 to 2026-10-26; coding-assistant Phase 3 continuation and verification
Work assisted (planning/code/docs/design/tests): Repository documentation and disclosure update; the project record also contains earlier Phase 1 audit, contract, FastAPI foundation, test, SQL seed review, and handoff work
Human review performed: Not recorded for this documentation update; project-owner review pending
Agent checks performed: Repository rules, PRD, implementation files, documentation diffs, local checks, and command output inspected
Generated material retained or discarded: Retained as workspace documentation changes pending owner review; no credentials or customer data added
```

## Libraries and templates used in this foundation

- Existing Next.js 16, React 19, TypeScript, ESLint, and the repository's pre-existing
  UI assets.
- Playwright test tooling for local/CI browser smoke tests; it is not a runtime model or
  content-processing provider.
- FastAPI, Starlette, Pydantic, PyJWT, Uvicorn, HTTPX, and pytest from
  `backend/requirements.txt`.
- Supabase/PostgreSQL SQL syntax and RLS patterns are represented in the migration;
  no live Supabase project or generated client code is claimed.

The `GEMINI_API_KEY` and `GEMINI_MODEL` names in `.env.example` are **PLANNED**
configuration placeholders. They do not prove that a Gemini model is selected,
configured, or called by the local runtime.

This repository document is a transparency aid. It is not a substitute for checking
the actual provider terms, configured data controls, deployment environment, or event
submission requirements.
