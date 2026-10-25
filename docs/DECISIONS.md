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

## 2026-10-25 — Separate local demo behavior from Supabase persistence

No Supabase project, URL, JWT secret, or service key was verified in the workspace. The
foundation may provide a clearly labeled in-memory adapter for local API tests and a
real Supabase migration/seed/RLS design, but it must expose its non-persistent status
and must not present demo state as production data.

## 2026-10-25 — Use VoltEdge for new foundation examples

All new fixtures, seeds, schema examples, and documentation examples use the fictional
VoltEdge laptop brand. Existing Northstar Labs strings in the pre-existing UI are
preserved as historical seeded demo content rather than silently rewritten.
