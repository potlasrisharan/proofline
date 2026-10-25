# Proofline

Proofline is an evidence-led brand-governance workspace for reviewing content before it
is published. The repository currently contains a **seeded demonstration UI** and a
**local FastAPI foundation**. It does not claim a production workspace, live AI/OCR,
Supabase persistence, or deployment.

## Implementation status at a glance

| Area | Status | What is actually available |
|---|---|---|
| Next.js UI under `app/` | **IMPLEMENTED (local demo)** | A seeded fictional VoltEdge workspace with local React state for the review loop, comments, role preview, and synthetic audit-log display. |
| FastAPI health, vault, content-audit, impact, and workflow routes | **IMPLEMENTED (local)** | Health, organisation-scoped in-memory vault CRUD/version/approval, bounded local content ingestion/audit, impact routes, and review/comment/export transitions. |
| Browser API client | **IMPLEMENTED (boundary only)** | Typed client in `app/lib/proofline-api.ts`; the seeded UI does not call it. |
| Supabase migration and VoltEdge seed | **STUB / PLANNED** | Foundation SQL and fictional data; no live Supabase project or durable adapter is connected. |
| External AI/OCR and durable audit services | **STUB / PLANNED** | Local parsers/rules/validation exist; no external model/OCR call, durable storage, hosted service, or production completeness is verified. |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md), and
[`docs/CONTRACT.md`](docs/CONTRACT.md) for the detailed boundary.

## Quickstart

### UI only

Prerequisites: Node.js **20.9 or newer** and npm. The installed Next.js package declares
that Node.js minimum; the CI/container definitions use Node.js 20.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI is local and seeded; it does
not require an account, API key, database, or external service.

### UI plus local API foundation

The combined launcher requires Bash and Python **3.11 or newer**; the CI/container
definitions use Python 3.12. It starts the Next.js UI and the local FastAPI process.
Install the Python dependencies once before using it (an isolated Python environment is
recommended):

```bash
python3 -m pip install -r backend/requirements.txt
./scripts/dev.sh
```

The UI is at [http://127.0.0.1:3000](http://127.0.0.1:3000), and the API health route is
at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). A healthy response
explicitly reports `persistence: "in_memory_demo"` and `ai_provider: "not_configured"`.
The API process keeps records only in memory; restarting it removes them.

For local API smoke calls that need authentication, enable the development header path
in the shell that starts the API:

```bash
export PROOFLINE_DEV_AUTH=true
./scripts/dev.sh
```

Development headers are an opt-in local test mechanism, not a production authentication
flow. Example requests should use fictional VoltEdge data; do not send confidential
brand material to this local foundation. The local `/contents` API can ingest bounded
text or base64 files, run local deterministic checks, and retain validated audit results
in memory. It does not claim durable storage or a live external provider.

With the local launcher running, a second terminal can inspect an empty VoltEdge vault:

```bash
curl http://127.0.0.1:8000/v1/facts \
  -H 'X-Proofline-User: user-voltedge-demo' \
  -H 'X-Proofline-Organisation: org-voltedge' \
  -H 'X-Proofline-Role: brand_owner'
```

This returns `items: []` for a fresh process. The SQL seed and browser fixtures are not
automatically loaded into the API's in-memory store. API settings are read from the
process environment; copying `.env.example` alone does not enable development auth.

The local audit boundary is separate from the seeded UI. A direct `POST /contents` can
exercise text/file ingestion and deterministic review states, but the browser screen does
not call it. When no provider is configured, contextual/model-dependent checks remain
`review_required`; a local audit response still reports `persistence: "in_memory_demo"`.

## Truthful demo script

This script demonstrates the current UI behavior. The review, findings, re-scan, and
approval states are seeded/local React state; they are not persisted audit records and
the UI does not call the FastAPI service. The local API audit path is covered separately
by backend tests and is not represented by the seeded screen.

1. Start the UI with `npm run dev` and open `http://localhost:3000`.
2. On **Overview**, note the `Demo state only` indicator, the VoltEdge workspace label,
   and the default **Authorised reviewer** role preview.
3. Change **Role preview** to **Brand owner** so the demo exposes the edit, submit, and
   approval controls. This is a local UI preview, not an authenticated session.
4. Select **Review queue**, then open the selected **NovaBook S1 launch email**.
5. In **Findings**, inspect the three seeded findings: a factual mismatch, an unsupported
   claim, and a tone suggestion. Each finding shows either seeded registry evidence or
   an explicit evidence gap.
6. In **Submitted content**, select a highlighted span to inspect its seeded comments;
   add a note if desired. In **History**, inspect the local revision trail and synthetic
   audit events.
7. Apply each suggested correction. The screen creates a new local draft revision and
   preserves the original content in the demo view.
8. Run **Re-scan**. The UI moves through a local scanning state and then shows the
   revision as ready for human approval.
9. Select **Send for approval**, then **Approve revision**. The approval is a local UI
   transition and activity entry; it is not a durable review decision.
10. Open **Truth registry**, **Insights**, and **Audit log** to inspect the seeded cards,
    charts, and synthetic local event chain. These values are demonstration content, not
    live database aggregates. The source form saves only a local demo notice.
11. Return to **Overview**, open **Start a review**, and choose **Upload a document** to
    see the explicit
    `STUB`/review-required state. No PDF, DOCX, JPG, or PNG extraction occurs in this
    build.

### Phase 4 improvement demos

The standalone pages expose the three local improvement surfaces without pretending they
are connected to a production backend:

- Open `http://localhost:3000/impact` for the synthetic VoltEdge Fact-Change Impact
  Radar. Inspect the old/new battery fact and expired offer, then press **Re-check all
  affected**. The callback is local and leaves content in human-review state.
- Open `http://localhost:3000/insights` for aggregate governance charts, team/agency
  views, expiry signals, guideline conflicts, and owner-reviewed wording proposals. The
  numbers are a reproducible synthetic fixture, not measured customer activity.
- Run `python3 scripts/simulate_review_activity.py --compact` to reproduce the local
  governance input used by the analytics engine. Run `python3 scripts/eval.py --report
  docs/EVAL_REPORT.md` to regenerate the measured 194-case reliability report.

For a contract-level API check, use the local health route and the tests rather than
assuming the UI and API are integrated:

```bash
curl http://127.0.0.1:8000/health
npm test
```

## Checks

Run the repository checks before describing a change as verified:

```bash
npx playwright install chromium
npm run lint
npm run typecheck
npm run build
npm test
```

The first command installs the browser used by the local Playwright smoke tests; it is a
development/test dependency, separate from product AI/OCR processing. `npm test` runs
lint, typecheck, build, Playwright smoke tests, backend pytest, the generated-fixture
check, and the local evaluation report through [`scripts/test.sh`](scripts/test.sh). The
checks do not prove automatic extraction, external AI/OCR, Supabase, production
authentication, or deployment. The Playwright configuration starts a local production
server on port 3100 and requires that port to be free.

## Repository boundaries

- The runnable frontend is the Next.js app under `app/`. The legacy `index.html`,
  `app.js`, and `styles.css` files remain retained prototype assets.
- `backend/` contains the local FastAPI foundation. Its vault, content-audit, impact, and
  review stores are non-persistent and return `persistence: "in_memory_demo"`.
- `supabase/` contains a tenant-aware migration and fictional VoltEdge seed as a
  persistence foundation. It is not evidence of a connected Supabase project.
- `app/lib/proofline-api.ts` defines a typed boundary for future API wiring; the current
  seeded screen intentionally does not invoke it.
- `backend/Dockerfile` is a local image definition. No deployment or hosted runtime is
  claimed by this repository.

Further documentation:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — actual versus planned components and decisions
- [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) — local implementation and external-processing disclosure
- [`docs/PRIVACY_SECURITY.md`](docs/PRIVACY_SECURITY.md) — data, secret, tenancy, and security boundaries
- [`docs/LIMITATIONS_ROADMAP.md`](docs/LIMITATIONS_ROADMAP.md) — current limitations and proposed next work
- [`docs/USER_TESTING.md`](docs/USER_TESTING.md) — blank protocol/template for future research
- [`CONTRIBUTIONS.md`](CONTRIBUTIONS.md) — blank contribution-record template
