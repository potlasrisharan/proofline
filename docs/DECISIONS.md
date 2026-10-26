# Proofline decisions

## 2026-10-25 — Preserve the existing Next.js application

The repository already contains a working Next.js 16 + React 19 + TypeScript UI and
passing frontend checks. Phase 1 keeps that app as the runnable frontend instead of
creating a parallel Vite app. This avoids discarding working behavior and follows the
repository architecture rule. The PRD's Vite/Tailwind/shadcn stack remains a planned
direction unless a later phase explicitly migrates it.

## 2026-10-26 — Keep Phase 4 improvements local until durable services exist

The impact radar, governance analytics, guideline-gap proposals, and evidence-or-abstain
evaluation are implemented as deterministic local/in-memory paths with synthetic VoltEdge
fixtures. Standalone pages make the improvement flows demonstrable, but their labels and
the contract continue to distinguish local behavior from durable persistence, scheduled
workers, external providers, and hosted deployment. A live deployment was not attempted
without project-dedicated credentials and a selected host.

## 2026-10-25 — Separate local demo behavior from external persistence

No hosted database, Access policy, JWT secret, or service key was verified in the workspace.
The foundation may provide a clearly labelled in-memory adapter for local API tests and
Cloudflare D1/R2/Queue deployment artifacts, but it must expose its non-persistent status
and must not present demo state as production data.

## 2026-10-26 — Move the hosted target to Cloudflare

Cloudflare Pages is the target for the static Next.js export and Cloudflare Python Workers
is the target for the FastAPI API. D1, R2, and Queues are the planned durable/async
bindings, with Cloudflare Access plus D1 membership lookup as the identity boundary. The
legacy `supabase/` PostgreSQL/RLS artifacts remain for historical reference only. No
Cloudflare resource, deployment, Access policy, or durable adapter is claimed until it is
created and smoke-tested.

## 2026-10-25 — Use VoltEdge for new foundation examples

All new fixtures, seeds, schema examples, and documentation examples use the fictional
VoltEdge laptop brand. Existing Northstar Labs strings in the pre-existing UI are
preserved as historical seeded demo content rather than silently rewritten.

## 2026-10-26 — Keep Phase 3 review state local but explicit

The Phase 3 browser workflow remains a seeded local demo, so role preview, queue filtering,
registry approval affordances, comments, revisions, and audit-chain display are explicit
client state rather than claims of authenticated persistence. The local FastAPI workflow
continues to enforce the stronger server-side boundaries for API tests. We corrected only
verified UI and workflow issues needed for the real-user demo and documented the remaining
Node/ESLint and legacy evaluator blockers instead of weakening checks.

## 2026-10-26 — Adapt the verification package at the audit boundary

The Phase 2 audit pipeline now constructs the verification package's own typed options from
the API audit options and approved vault rows. This keeps the pure rules layer independent
from FastAPI while ensuring configured terms, disclaimers, image measurements, scope, and
injectable dates reach the deterministic checks. Matching remains conservative: product or
market scope that cannot be established is not silently treated as applicable evidence.

## 2026-10-26 — Treat deterministic rule citations as first-class evidence

Built-in checks such as WCAG contrast cite a named rule/version rather than a vault record.
The local verifier accepts those rule citations when they contain an ID, version, and quote;
brand-record evidence still must resolve to the authenticated organisation's approved row.
This preserves evidence-or-abstain semantics without marking measured local rules as invented
because they are not stored in the demo vault.

## 2026-10-26 — Critical findings remain high-risk in the Phase 3 workflow

The Phase 2 contract requires direct factual mismatches and expired offers to be marked
`critical`, while the existing Phase 3 API journey only required a high-risk open finding.
The E2E assertion now accepts either `high` or `critical` while continuing to verify the
approval denial, evidence linkage, correction, revision history, and audit-chain behavior.
This is a compatibility clarification, not an auto-approval or severity downgrade.
