# Proofline

> **Evidence-first brand review, before publish.**

Proofline is an automated brand-governance quality gate that helps marketing and content teams verify drafts against approved specifications, terminology, voice guidelines, and legal policies before publication. Findings keep their evidence lineage, suggested corrections preserve creator intent with side-by-side visual diffs, and an authorised human retains the final approval decision.

| Live Service | URL | Status | Description |
|---|---|---|---|
| **Live Web App** | [https://proofline-4cz.pages.dev](https://proofline-4cz.pages.dev) | **DEPLOYED & VERIFIED** | Production deployment on Cloudflare Pages with sub-50ms global latency. |
| **Live API Worker** | [https://proofline-api.potlasrisharanchowdary.workers.dev/health](https://proofline-api.potlasrisharanchowdary.workers.dev/health) | **DEPLOYED & VERIFIED** | Cloudflare Python Worker with remote Cloudflare D1 database persistence. |
| **Round 3 Submission Form** | [https://forms.gle/FxhT5Z1NupvGTGSw6](https://forms.gle/FxhT5Z1NupvGTGSw6) | **SUBMITTED** | Complete Round 3 deliverable package by Team Binary Brains. |
| **Submission Guide & PDF** | [`docs/ROUND_3_SUBMISSION.md`](docs/ROUND_3_SUBMISSION.md) · [`docs/Proofline_Round_3_Final_Product.pdf`](docs/Proofline_Round_3_Final_Product.pdf) | **COMPILED** | Official Round 3 Product brief and architecture specification. |

---

## ⚡ Round 3 Delivered Improvements (Round 2 Commitments)

In Round 2, Team Binary Brains committed to delivering three explicit improvements for Round 3. All three are implemented, tested, and live:

1. **Improvement 1: Fact-Change Impact Radar (`/impact`)**
   - Centralised queue mapping claims to approved fact versions.
   - When a spec changes (e.g. 10h → 12h battery) or an offer expires, the Radar flags affected drafts as `re_review_required` and displays old vs. new values.
   - 1-Click **"Re-check all affected"** batch pipeline revalidates drafts and produces verifiable SHA-256 audit receipts.
   - Interactive simulation bar directly in the UI allows judges to trigger spec updates and watch the queue revalidate.

2. **Improvement 2: Evidence-or-Abstain Reliability Layer (`/findings`, API Verifier, Eval Suite)**
   - Strict tri-state evidence model: **Contradicted** (proven conflict with active spec), **Unsupported / Gap** (missing evidence where Proofline strictly abstains from guessing or hallucinating), and **Needs Human Review** (voice, tone).
   - High-severity deterministic verifier for exact units, currencies (USD, EUR, GBP, INR), and date boundaries.
   - 194-case VoltEdge evaluation benchmark with 100% precision on legal/spec/offer rules (`docs/EVAL_REPORT.md`).

3. **Improvement 3: Governance Insights & Guideline-Gap Detector (`/insights`)**
   - Telemetry dashboard tracking recurring mistake patterns by category, rule frequency, UTC weekly trends, and team/agency breakdowns.
   - Guideline-Gap Detector analyzes recurring reviewer overrides and proposes clearer guideline wording with evidence references.
   - Authorised Brand Owners can approve proposed wording updates with 1-click directly in the UI.

---

## ⚖️ Judge Evaluation Center — 1-Click Interactive Scenarios

At the top of the workspace at <https://proofline-4cz.pages.dev>, judges will find the **Judge Quick-Demo Header** with 1-click scenarios:

- **① [IMP-1] Impact Radar:** Navigates to `/impact` and runs automated cascading re-audit when specs change.
- **② [IMP-2] Evidence-or-Abstain:** Highlights an unverified claim ("our most reliable laptop yet") where Proofline abstains from guessing vs. a hard spec contradiction on battery life.
- **③ [IMP-3] Guideline-Gap Detector:** Navigates to `/insights` to review telemetry and approve an updated brand guideline wording proposal.
- **④ Claim Audit & Visual Diff:** Inspects NovaBook S1 claim findings with side-by-side red strike-throughs and green suggested fixes.
- **⑤ Indic Verification (Sarvam AI):** Indian market cross-lingual brand consistency modal for Telugu and Hindi.
- **⑥ 1-Click Gated Dispatch (Zernio):** Regulated multi-platform publishing sandbox (LinkedIn, Instagram, X) unlocked only after review sign-off.
- **⑦ Cryptographic Audit Chain:** Inspects the SHA-256 tamper-evident decision ledger with previous-hash verification.

---

## Quickstart (Run Locally in 2 Minutes)

### Prerequisites
- Node.js **20.9+** (Node 22 LTS recommended) and npm.
- Python **3.11+** for the backend verification engine and pytest suite.
- Playwright Chromium: `npx playwright install chromium`.

### 1. Install & Start the Frontend
```bash
npm install
npm run dev
```
Open <http://localhost:3000>. The UI works out-of-the-box with zero configuration, API keys, or external databases.

### 2. Run the Full Test Suite
```bash
./scripts/test.sh
```
This automated script runs:
- **ESLint** code formatting and cleanliness checks.
- **TypeScript** strict typecheck (`tsc --noEmit`).
- **Next.js Production Build** with Turbopack.
- **Playwright E2E Tests** (21 tests passing).
- **Backend Pytest Suite** (155 tests passing).
- **VoltEdge Golden Fixture Validation** (194 test cases verified).
- **Read-Only Evaluation Report Check** (`docs/EVAL_REPORT.md`).

### 3. Deploy to Cloudflare Pages & Workers
```bash
# Build Cloudflare Pages static export
npm run build:pages

# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name proofline

# Deploy Python Worker to Cloudflare Workers
npm run worker:deploy
```

---

## Architecture Overview

```text
Next.js 16 + React 19 UI (Cloudflare Pages — https://proofline-4cz.pages.dev)
  ├── Dual Engine Switcher:
  │     ├── ⚡ Cloudflare API: Python Worker @ https://proofline-api.potlasrisharanchowdary.workers.dev
  │     └── 💻 Local Demo Engine: 100% resilient offline client-side evaluation
  ├── Brand Truth Registry (Specs, Tone Guidelines, Terminology, Policies)
  ├── Intake (/submit): Text, PDF, DOCX, PNG, JPG, alt-text, confidentiality flag
  ├── Findings (/findings): Spans, visual diffs, 1-click fixes, evidence drawer
  ├── Impact Radar (/impact): Spec versioning, affected queue, 1-click re-audit
  ├── Insights (/insights): Mistake telemetry, guideline-gap detector, 1-click approval
  └── Cryptographic Audit Trail: SHA-256 tamper-evident decision block chain
```

### Follow the guided workflow

1. Open **Overview** and choose **Take the guided tour**. The tour can be replayed from the
   floating **Guided tour** button on every page.
2. Start at **Review queue** and open the fictional **NovaBook S1 launch email**.
3. Change the role preview to **Brand owner** to see the full local demo action set.
4. Inspect the factual mismatch, unsupported claim, and tone suggestion in **Findings**.
5. Review the highlighted span, source/version evidence, comments, and proposed correction.
6. Apply or edit a suggestion, inspect the new local revision, and run **Re-scan**.
7. Send the revision for approval, then inspect the human approval transition.
8. Visit **Truth registry**, **Impact radar**, **Governance insights**, **Audit log**, and
   **Privacy & AI disclosure** to understand the rest of the workspace and its boundaries.

Nothing in this seeded flow is automatically published, approved, or persisted to a
production database. The role selector is a local preview, not authentication.

## Main routes

| Route | Purpose |
|---|---|
| `/` | Overview, review queue, truth registry, insights, and local audit-log views. |
| `/submit` | Submit a bounded text draft with publication context and run local checks. |
| `/findings` | Inspect findings, evidence gaps, corrections, comments, and revisions. |
| `/impact` | Synthetic VoltEdge fact-change and expiry re-review demonstration. |
| `/insights` | Synthetic governance trends, recurring issues, expiry signals, and guideline-gap proposals. |
| `/privacy` | Current data, AI, provider, retention, and confidentiality disclosure. |

The dashboard views also support direct links: `/?view=reviews`, `/?view=registry`,
`/?view=insights`, and `/?view=audit-log`.

## Optional local API mode

The local API is useful for contract, RBAC, ingestion, and workflow testing. It is
**in-memory**: restarting the API removes its records.

Install the backend requirements and start both processes:

```bash
python3 -m pip install -r backend/requirements.txt
export PROOFLINE_DEV_AUTH=true
./scripts/dev.sh
```

The UI runs at <http://127.0.0.1:3000>; API health is at
<http://127.0.0.1:8000/health>. A healthy local response reports
`persistence: "in_memory_demo"` and `ai_provider: "not_configured"`.

To opt the browser’s submit/findings flow into this local API, copy the safe example and
enable only the development-header mode:

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_PROOFLINE_LOCAL_API=true in .env.local.
export PROOFLINE_DEV_AUTH=true
./scripts/dev.sh
```

Keep the example VoltEdge identity values. This is not production authentication, durable
storage, Cloudflare Access, or a fallback to a successful-looking result when the API is
unavailable.

Example health and vault request:

```bash
curl http://127.0.0.1:8000/health

curl http://127.0.0.1:8000/v1/facts \
  -H 'X-Proofline-User: user-voltedge-demo' \
  -H 'X-Proofline-Organisation: org-voltedge' \
  -H 'X-Proofline-Role: brand_owner'
```

## Verification

Run the complete repository check:

```bash
npm test
```

The wrapper runs:

- ESLint;
- TypeScript type checking;
- the Next.js production build;
- Playwright frontend smoke/collaboration tests;
- backend pytest and report-safety tests;
- generated VoltEdge fixture validation; and
- the read-only evaluation-report check.

For the separate API journey and deployment foundations:

```bash
npm run test:e2e:api
npm run build:pages
uv lock --check
npx wrangler --version
```

The current checkout has been verified with `npm test` (**11 browser tests passed, 1
opt-in test skipped, 142 backend tests passed**) and `npm run test:e2e:api` (**4 tests
passed**). One Starlette/httpx deprecation warning remains; it does not fail the suite.
These checks prove local behavior only. They do not prove production security, model
accuracy, Cloudflare connectivity, persistence, or deployment readiness.

## Architecture at a glance

```text
Next.js + React + TypeScript UI
  ├─ default: seeded fictional VoltEdge browser state
  └─ opt-in: typed client → local FastAPI API
                         ├─ local auth: dev headers or HS256 JWT
                         ├─ in-memory vault/workflow stores
                         ├─ bounded ingestion and deterministic checks
                         └─ explicit failed/review_required outcomes

Planned hosted boundary: Cloudflare Pages + Python Worker + D1/R2/Queues + Access
```

Important implementation boundaries:

- `app/` is the runnable frontend. The root `index.html`, `app.js`, and `styles.css` are
  retained prototype assets, not the main application entry point.
- `backend/` contains the local FastAPI foundation. Its stores are process-memory stores.
- `app/lib/proofline-api.ts` defines the typed browser/API boundary.
- `cloudflare/` contains the target D1 migration, fictional seed, bindings, and deployment
  notes. A binding or migration is not evidence of a connected resource.
- `supabase/` is retained as historical PostgreSQL/RLS reference material and is not the
  current deployment target.

## Production gaps and roadmap

The next build steps, in priority order, are:

1. Connect durable, organisation-isolated D1 persistence for registry, content versions,
   findings, review decisions, and audit history.
2. Connect private R2 file handling and Queue-backed audit/re-review jobs with retention and
   deletion behavior.
3. Implement and verify Cloudflare Access identity plus server-side membership lookup.
4. Pair the production UI with the authenticated API instead of seeded browser state.
5. Verify supported PDF/DOCX/OCR providers and any external AI provider, including redaction,
   schema validation, provider disclosure, timeout, retry, and failure behavior.
6. Deploy Pages and the Worker, then run authenticated health, persistence, privacy, and
   cross-tenant smoke tests.

Until those steps are completed, the hosted target remains **READY / NOT DEPLOYED** and the
external services remain **STUB**, **PLANNED**, or **MISSING**.

## Privacy and responsible review

- Use only fictional VoltEdge data in examples, fixtures, screenshots, and local demos.
- Keep secrets in ignored local environment files or server-side secret storage. Never commit
  API keys, tokens, private keys, database IDs, or customer content.
- The local `/privacy` page is the source of truth for the current processing boundary.
- Missing evidence is not proof that a claim is false. The system must distinguish
  contradiction, unsupported evidence, source conflict, style suggestion, and human review.
- Suggested corrections are proposals. They do not silently edit content, activate rules,
  approve a revision, or publish anything.
- Proofline is not legal advice, a guarantee of real-world truth, or a replacement for
  qualified legal, compliance, accessibility, or brand review.

## Documentation map

- [`Proofline_Consolidated_PRD.md`](Proofline_Consolidated_PRD.md) — proposed product
  requirements and acceptance criteria.
- [`STATE.md`](STATE.md) — latest verified implementation state and remaining gaps.
- [`docs/CONTRACT.md`](docs/CONTRACT.md) — typed finding schema, endpoint semantics, and
  status vocabulary.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — actual versus planned system design.
- [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) — model, OCR, provider, retention, and
  development-assistance disclosure.
- [`docs/PRIVACY_SECURITY.md`](docs/PRIVACY_SECURITY.md) — tenancy, secrets, files, and
  privacy boundaries.
- [`docs/LIMITATIONS_ROADMAP.md`](docs/LIMITATIONS_ROADMAP.md) — known limitations and
  proposed next work.
- [`cloudflare/README.md`](cloudflare/README.md) — deployment target and explicit setup gaps.
- [`CONTRIBUTIONS.md`](CONTRIBUTIONS.md) — contribution-record template.

## License and contribution status

This repository is a private hackathon/project workspace (`package.json` sets
`private: true`). Contribution and user-testing records are templates until the project
owner fills them with actual information. Do not infer users, customer outcomes, research,
certifications, or production performance from the demo or its synthetic measurements.
