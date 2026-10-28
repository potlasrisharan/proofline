# Proofline

> **Evidence-first brand review, before publish.**

Proofline is a brand-governance workspace that helps content teams compare drafts with
approved facts, terminology, guidelines, and policy records before publication. Findings
keep their evidence trail, suggested corrections preserve creator intent where possible, and
an authorised human remains responsible for the final decision.

> [!IMPORTANT]
> This repository is a **verified local/demo implementation**, not a production service. It
> uses fictional VoltEdge data. The browser demo and local API are suitable for evaluation
> and development only; do not submit customer material, credentials, or confidential brand
> files.

## What is working now

| Surface | Status | Verified behavior |
|---|---|---|
| Next.js workspace under `app/` | **IMPLEMENTED · local demo** | Seeded VoltEdge review queue, role preview, findings, comments, corrections, re-scan, revision history, approval states, registry cards, insights, audit display, and guided tour. |
| FastAPI foundation under `backend/` | **IMPLEMENTED · local** | Health, organisation-scoped vault CRUD/version/approval, bounded content ingestion and deterministic audit, review workflow, impact, insights, dashboard, export, and hash-linked event routes. |
| Evidence-or-abstain checks | **IMPLEMENTED · local** | Deterministic source/version/span validation, explicit unsupported/conflict/review-required states, risk metadata, and generated VoltEdge evaluation fixtures. |
| Browser → API connection | **IMPLEMENTED · opt-in local mode** | `/submit` and `/findings` can call the local API with explicit development headers. The default UI remains seeded browser-local state. |
| Cloudflare Pages/Workers foundation | **READY · NOT DEPLOYED** | Static export, Python Worker entrypoint, Wrangler bindings, D1 migration/seed, and deployment notes exist. No hosted smoke test has been verified. |
| D1, R2, Queues, Access, external AI/OCR | **STUB / PLANNED / MISSING** | No live durable adapter, production identity boundary, hosted OCR, or external model call is verified. |

The repository uses these labels deliberately:

- **IMPLEMENTED** — observed in a runnable local path and covered by checks where stated.
- **STUB** — a scaffold or boundary exists, but the real dependency is not connected.
- **PLANNED** — an intended next capability, not an available feature.
- **MISSING** — not present or not verified in this checkout.

## Try the demo in five minutes

### Prerequisites

- Node.js **20.9+** and npm for the frontend.
- Python **3.11+** for the local FastAPI test foundation.
- Chromium installed for browser tests: `npx playwright install chromium`.

### Start the UI

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The UI needs no account, API key, database, or external
service.

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
