# Cloudflare deployment target

Proofline's target hosted architecture is now Cloudflare-first:

| Surface | Cloudflare product | Repository status |
|---|---|---|
| Static Next.js frontend | Cloudflare Pages | **READY / NOT DEPLOYED** — `npm run build:pages` writes `out/`. |
| API runtime | Cloudflare Python Worker | **READY / NOT DEPLOYED** — `backend/worker.py` exposes the FastAPI ASGI app through `pywrangler`. |
| Durable relational data | D1 | **CONFIGURED BINDING / ADAPTER PLANNED** — replace the database ID in `wrangler.jsonc`, then implement the D1 adapter behind the current stores. |
| Private uploaded files | R2 | **CONFIGURED BINDING / ADAPTER PLANNED** — create the bucket and connect the storage interface. |
| Async audit/re-review work | Queues | **CONFIGURED PRODUCER / CONSUMER PLANNED** — create the queue and add an idempotent Worker consumer. |
| Identity boundary | Cloudflare Access + Worker-side membership lookup | **PLANNED** — verify Access JWTs and map claims to D1 organisation memberships. |
| Contextual model assistance | Workers AI or a separately verified provider | **PLANNED** — no provider call is enabled by this repository. |

## Bootstrap

1. Install Node.js 20.9+ and Python 3.12.
2. Authenticate Wrangler with a project-dedicated Cloudflare account outside this repo.
3. Create the Pages project, D1 database, R2 bucket, and audit queue.
4. Replace `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` and
   `REPLACE_WITH_PAGES_DOMAIN` in a private deployment config or environment-specific
   Wrangler config. Do not commit account IDs or API tokens as secrets.
5. Apply the D1 migration and fictional seed:

   ```bash
   npx wrangler d1 migrations apply proofline --remote
   npx wrangler d1 execute proofline --remote --file=cloudflare/seed.sql
   ```

6. Build and deploy the Pages frontend:

   ```bash
   npm ci
   npm run build:pages
   npx wrangler pages deploy out --project-name "$CLOUDFLARE_PAGES_PROJECT"
   ```

7. Run and deploy the Python Worker:

   ```bash
   uv sync
   npm run worker:dev
   npm run worker:deploy
   ```

8. Configure the Pages domain and Worker URL in the browser API boundary, then run the
   health and authenticated smoke checks. For the browser client, set
   `NEXT_PUBLIC_PROOFLINE_LOCAL_API=true`, `NEXT_PUBLIC_PROOFLINE_API_URL` to the Worker
   URL, and `NEXT_PUBLIC_PROOFLINE_API_AUTH=cloudflare_access`; this uses browser
   credentials for the Access boundary and does not expose a bearer token. Use
   `local_headers` only for local development. A deployment is not complete until the UI
   and Worker are actually paired and D1/R2/Queue runtime behavior is observed.

## Current boundary

The Worker entrypoint is a deployment adapter, not proof of a production deployment.
The current FastAPI stores are still process-memory implementations. D1, R2, Queues,
Cloudflare Access, and AI bindings must remain labelled **STUB**, **PLANNED**, or
**MISSING** until the resources are created, configured, smoke-tested, and documented.
