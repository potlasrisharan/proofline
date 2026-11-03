# Proofline

> **Evidence-first brand review, before publish.**

Proofline is an evidence-backed brand-governance workspace for checking content against
approved facts, terminology, tone guidance, and configured policy rules before publication.
Findings retain evidence lineage, suggested corrections preserve creator intent, and an
authorised human remains responsible for the final review decision.

## Current repository status

The statuses below describe the repository and the public endpoints checked on **3 November
2026**. A hosted health response or configuration binding is not, by itself, proof that every
application workflow is durable or production-ready.

| Surface | Status | Details |
|---|---|---|
| [Hosted web app](https://proofline-4cz.pages.dev) | **IMPLEMENTED / LIVE** | Public Cloudflare Pages endpoint responds and serves the static Next.js application. |
| [Hosted API health](https://proofline-api.potlasrisharanchowdary.workers.dev/health) | **IMPLEMENTED / LIVE** | Public Worker health endpoint responds with `status: "ok"` and reports a connected D1 binding. |
| Hosted identity and access | **MISSING / NOT VERIFIED** | The health response reports Cloudflare Access and JWT verification as not configured. |
| Hosted AI providers | **STUB / NOT CONFIGURED** | The health response reports no active AI provider; local deterministic fallback remains available. |
| Hosted audit queue | **STUB / NOT CONFIGURED** | The queue binding is declared in configuration, but no queue consumer is verified. |
| Round 3 submission | **SUBMITTED** | See [`docs/ROUND_3_SUBMISSION.md`](docs/ROUND_3_SUBMISSION.md). |

The checked-in FastAPI application still defaults to process-memory vault, workflow, and audit
stores. The Worker adapter exposes the D1 binding and the live health endpoint reports D1
connectivity, but application-level durable CRUD and cross-tenant production smoke tests are
not verified by this repository. See [`STATE.md`](STATE.md),
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`cloudflare/README.md`](cloudflare/README.md)
for the detailed boundary.

## What is implemented

### Frontend — **IMPLEMENTED (local/demo & edge)**

- Seeded fictional VoltEdge workspace with review queue, findings, corrections, re-scan,
  comments, revision history, role preview, approval transitions, and audit-log views.
- **Enterprise 1-Click Role Login:** Clean "What We Provide" hero and instant role-switcher
  for Creator, Campaign Manager, Authorised Reviewer, Brand Owner, and Agency workspaces.
- **Multimodal Visual & Video Compliance Engine at `/multimodal`:** Canvas-based frame scrubber
  powered by Gemini 2.5 Flash, measuring FTC § 255 disclaimer font height ratios (flagging <2.5%),
  spec contradiction bounding-box overlays, and 1-click visual frame remediation.
- **Publishing & Post-Publish Drift Radar at `/drift`:** Automated 60-second heartbeat radar
  monitoring live posts on LinkedIn, Instagram, X, and Webflow; detects retroactive drift when
  promotional codes expire or engineering specs change, with 1-click clarification comment dispatch
  and emergency social takedowns.
- **Dynamic Brand Truth Sync at `/sync`:** Enterprise data sync connecting Notion team databases,
  Google Docs legal briefs, and Shopify real-time inventory to the Brand Truth Registry.
- Brand Source Vault with versioning, source drafts, approval controls, and role-scoped demo
  behavior.
- Fact-Change Impact Radar at `/impact`, including synthetic fact-change scenarios and local
  re-check receipts.
- Governance Insights and Guideline-Gap Detector at `/insights`, using synthetic review
  activity and explicit owner approval actions.
- Creator Multi-Platform Studio with deterministic compliance checks, optional Groq/Sarvam
  provider seams, and fail-soft local behavior.
- Privacy and AI disclosure at `/privacy`.

### Backend — **IMPLEMENTED (local foundation)**

- FastAPI health, organisation-scoped vault, content, audit, review, comment, finding-action,
  export, impact, and audit-event routes.
- Bounded text/PDF/DOCX/image ingestion when optional local dependencies are available.
- Deterministic claim, terminology, date, currency, unit, qualifier, accessibility, and
  evidence-or-abstain checks.
- Local HS256 JWT verification or explicitly opt-in development headers.
- Immutable-in-process content versions and SHA-256-linked workflow events.
- 194-case synthetic VoltEdge evaluation fixture and report-safety checks.

### External integrations — **STUB / PLANNED / SIMULATED**

- Groq, Sarvam, and Gemini adapters are optional and fail-soft; no live provider call is
  claimed by the default local test path.
- Zernio publishing is gated by compliance approval, but the default path is an explicit
  sandbox mock that returns simulated receipts. It is not automatic publication.
- Cloudflare D1 schema and Worker bindings are present. The checked-in local stores remain
  in-memory; R2, Queues, Access membership lookup, hosted OCR, and durable adapters require
  further verification.

## Judge/demo scenarios

The default browser experience is a seeded local demonstration using fictional VoltEdge data.
Nothing is automatically approved, edited, or published.

1. **Impact Radar:** open `/impact` and simulate a battery-spec or offer-date change.
2. **Evidence-or-Abstain:** compare a deterministic contradiction with an unsupported claim
   that is routed for human review rather than guessed.
3. **Guideline-Gap Detector:** open `/insights` and review a synthetic wording proposal.
4. **Claim audit and visual diff:** inspect the NovaBook S1 battery finding and proposed fix.
5. **Indic verification:** inspect the Telugu/Hindi Sarvam UI; provider execution is optional
   and unverified unless a project owner supplies and configures a key.
6. **Gated dispatch:** inspect the multi-platform dispatch modal; the default result is a
   simulated sandbox receipt.
7. **Audit chain:** inspect local hash-linked events and chain verification.

## Quickstart

### Prerequisites

- Node.js **20.9+** and npm.
- Python **3.12+** for the backend foundation and tests.
- Playwright Chromium: `npx playwright install chromium`.

### Start the frontend

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The seeded UI runs without API keys or an external database.

### Start the local API too

The local API is useful for contract, RBAC, ingestion, and workflow testing. It is explicitly
**in-memory**; restarting the process removes its records.

```bash
python3 -m pip install -r backend/requirements.txt
export PROOFLINE_DEV_AUTH=true
./scripts/dev.sh
```

The frontend runs at <http://127.0.0.1:3000> and API health is at
<http://127.0.0.1:8000/health>. Local health reports `persistence: "in_memory_demo"` and no
configured AI provider. To opt the browser submit/findings flow into this API, copy the safe
`.env.example` values to `.env.local` and set:

```dotenv
NEXT_PUBLIC_PROOFLINE_LOCAL_API=true
```

This development-header mode is not production authentication, Cloudflare Access, durable
storage, or a successful-looking fallback when the API is unavailable.

Example local requests:

```bash
curl http://127.0.0.1:8000/health

curl http://127.0.0.1:8000/v1/facts \
  -H 'X-Proofline-User: user-voltedge-demo' \
  -H 'X-Proofline-Organisation: org-voltedge' \
  -H 'X-Proofline-Role: brand_owner'
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Main seeded workspace, review queue, registry summary, insights, and audit log. |
| `/portal` | Main portal with role-oriented entry points and product modules. |
| `/login` | Demonstration login and role-selection surface; not production authentication. |
| `/dashboards` | Demonstration role dashboards. |
| `/submit` | Bounded content intake and local checks. |
| `/findings` | Evidence gaps, findings, corrections, comments, and revisions. |
| `/multimodal` | Visual & video frame compliance radar, FTC § 255 font gauge, and 1-click remediation. |
| `/drift` | Multi-platform publishing and 60s post-publish drift radar with emergency takedowns. |
| `/sync` | Dynamic Brand Truth Sync connecting Notion, Google Docs, and Shopify inventory. |
| `/impact` | Synthetic fact-change and expiry re-review demonstration. |
| `/insights` | Synthetic governance trends and guideline-gap proposals. |
| `/vault` | Brand Source Vault / Truth Registry surface. |
| `/privacy` | Current data, AI, provider, retention, and confidentiality disclosure. |

## Verification

Run the repository’s complete local check:

```bash
npm test
```

The latest checked run completed with:

- ESLint, TypeScript typecheck, and Next.js production build passing;
- **49 Playwright browser tests passed, 1 skipped** (50 tests total across 5 parallel workers);
- **159 backend/report-safety tests passed, 2 skipped** (161 tests total);
- **194** generated VoltEdge cases matching the committed fixture; and
- the evaluation report passing its read-only consistency check.

One Starlette/httpx deprecation warning remains; it does not fail the suite. These checks prove
local behavior only. They do not prove production security, model accuracy, durable persistence,
Cloudflare Access configuration, or deployment readiness.

Additional foundation checks:

```bash
npm run test:e2e:api
npm run build:pages
uv lock --check
npx wrangler --version
```

The latest run passed the API journey (**4 tests**), Pages build, and Wrangler version check.
`uv lock --check` currently reports that `uv.lock` needs updating; the lockfile was not changed
as part of this README-only update.

## Architecture at a glance

```text
Next.js 16 + React 19 + TypeScript UI
  ├─ default: seeded fictional VoltEdge browser state
  ├─ opt-in: typed browser client → local FastAPI API
  └─ local API
       ├─ development headers or HS256 JWT boundary
       ├─ in-memory vault/workflow/content stores
       ├─ bounded ingestion and deterministic checks
       └─ explicit failed/review_required outcomes

Hosted target and live adapter:
  Cloudflare Pages static export → Python Worker ASGI adapter → declared D1 binding
  D1 domain persistence, Access membership, R2, Queues, and external providers remain
  separately verified integration work.
```

Important implementation boundaries:

- `app/` is the runnable frontend. Root `index.html`, `app.js`, and `styles.css` are retained
  prototype assets, not the main application entry point.
- `backend/` contains the local FastAPI foundation and process-memory stores.
- `backend/worker.py` is the Cloudflare Python Worker entrypoint.
- `app/lib/proofline-api.ts` defines the typed browser/API boundary.
- `cloudflare/` contains migrations, fictional seed data, bindings, and deployment notes. A
  binding or migration is not evidence of a complete durable application path.
- `supabase/` is retained as historical PostgreSQL/RLS reference material and is not the current
  deployment target.

## Roadmap and current gaps

1. Connect durable organisation-isolated D1 repositories for registry, content versions,
   findings, review decisions, and audit history.
2. Verify Cloudflare Access identity and server-side membership lookup.
3. Add and verify Queue-backed audit/re-review jobs plus private file retention and deletion.
4. Pair the browser’s production workflow with the authenticated hosted API rather than seeded
   browser state.
5. Verify external AI/OCR providers, redaction, schema validation, timeout/retry behavior, and
   provider disclosure before accepting confidential content.
6. Verify any live publishing provider separately; keep Zernio in sandbox mode until then.

## Privacy and responsible review

- Use only fictional VoltEdge data in examples, fixtures, screenshots, and local demos.
- Keep secrets in ignored local environment files or server-side secret storage. Never commit
  API keys, tokens, private keys, database IDs, or customer content.
- Missing evidence is not proof that a claim is false. Proofline distinguishes contradiction,
  unsupported evidence, source conflict, style suggestion, and human review.
- Suggested corrections are proposals. They do not silently edit content, activate rules,
  approve a revision, or publish anything.
- Proofline is not legal advice, a guarantee of real-world truth, or a replacement for
  qualified legal, compliance, accessibility, or brand review.

## Documentation map

- [`STATE.md`](STATE.md) — latest verified implementation state and known gaps.
- [`Proofline_Consolidated_PRD.md`](Proofline_Consolidated_PRD.md) — proposed requirements.
- [`docs/CONTRACT.md`](docs/CONTRACT.md) — typed schemas, endpoint semantics, and statuses.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — actual versus planned system design.
- [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) — provider and external-processing boundary.
- [`docs/PRIVACY_SECURITY.md`](docs/PRIVACY_SECURITY.md) — tenancy, secrets, and privacy rules.
- [`docs/LIMITATIONS_ROADMAP.md`](docs/LIMITATIONS_ROADMAP.md) — known limitations and next work.
- [`cloudflare/README.md`](cloudflare/README.md) — deployment target and setup gaps.
- [`docs/ROUND_3_SUBMISSION.md`](docs/ROUND_3_SUBMISSION.md) — submission package.
- [`docs/Proofline_Round_3_Final_Product.pdf`](docs/Proofline_Round_3_Final_Product.pdf) — final compiled product PDF document.
- [`docs/Proofline_Round_3_Slide_by_Slide_Changes.pdf`](docs/Proofline_Round_3_Slide_by_Slide_Changes.pdf) — slide-by-slide PPT transformation guide.

## License and contribution status

This repository is a private hackathon/project workspace (`package.json` sets `private: true`).
Contribution and user-testing records are templates until the project owner fills them with
actual information. Do not infer user research, customer outcomes, certifications, or production
performance from the demo or its synthetic measurements.
