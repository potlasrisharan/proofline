# Proofline

Proofline is an evidence-led brand governance workspace for reviewing content before it is published. The current MVP is a seeded Northstar Labs workspace that demonstrates the core product loop from the PRD: approved truth registry → evidence-linked audit → correction → re-scan → human approval.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

To run the local foundation alongside the UI, install the Python dependencies once and
use the combined launcher:

```bash
python3 -m pip install -r backend/requirements.txt
./scripts/dev.sh
```

The FastAPI health route is at `http://127.0.0.1:8000/health`. Its vault adapter is
explicitly in-memory for Phase 1 (`persistence: "in_memory_demo"`); it is not a live
Supabase connection.

## MVP flow

- **Overview** shows review signals, recent activity, and the three-step Proofline method.
- **Review queue** contains a seeded Model X launch email with factual, unsupported-claim, and tone findings.
- **Findings** link each issue to a registry source or explicit evidence gap and offer minimal corrections.
- **Re-scan** creates a new revision state and unlocks the approval action only after findings are resolved.
- **Truth registry** shows versioned facts, terminology, promotion rules, claim policy, and accessibility guidance.
- **Insights** surfaces recurring issue patterns while keeping guideline changes under authorised human control.

The legacy `index.html`, `app.js`, and `styles.css` files are retained as prior static prototype assets; the runnable product entry point is the Next.js app under `app/`.

## Architecture note

The current runnable product is the existing Next.js 16 + React 19 + TypeScript app;
the npm scripts above are the source of truth for local development and checks. The
FastAPI service now has a local, non-persistent Phase 1 foundation; the durable
Supabase-backed service described in the PRD is still planned and is not claimed as
connected. See
[`docs/CONTRACT.md`](docs/CONTRACT.md) for the typed Finding schema and explicit
planned/stub route statuses, and [`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md) for
the AI and external-processing disclosure boundary. Documentation examples use
fictional VoltEdge data.

The typed browser-side API boundary is in `app/lib/proofline-api.ts`; it is deliberately
not invoked by the seeded demo screen until authentication and durable persistence are
connected.

The local API image definition is `backend/Dockerfile`, and the frontend/backend checks
run independently in `.github/workflows/ci.yml`. Neither workflow connects to a live
Supabase project.
