# Proofline Phase 1 plan — audit, plan, foundation

**Date:** 2026-10-25
**Source of truth:** `Proofline_Consolidated_PRD.md`
**Scope rule:** preserve the existing Next.js demonstration UI; add the FastAPI/Supabase
foundation without presenting it as a connected production backend.

## Work order

1. **Audit (completed before this plan):** inspect repository history/tree, read the
   README, PRD and rules, install JavaScript dependencies, run the current frontend
   checks, and confirm that no Python test suite or live backend was present.
2. **Shared contract and guardrails (completed):** maintain `AGENTS.md`,
   `docs/CONTRACT.md`, and `docs/AI_DISCLOSURE.md`; keep route and integration status
   explicit.
3. **Database foundation (partially completed):** retain and review the tenant-aware
   Supabase migration, fictional VoltEdge seed, RLS policies, and 12 golden fixtures.
4. **Backend foundation (remaining):** add a small FastAPI service with explicit health
   semantics, optional Supabase JWT verification, role dependencies, a local
   non-persistent demo vault adapter, versioned draft/approval behavior, and pytest
   coverage. Supabase persistence remains a separate integration boundary.
5. **Frontend boundary (remaining verification):** keep the existing Next.js UI as the
   implemented demo shell. Do not create a parallel Vite app or claim auth/API
   integration that is not wired to the UI. Add only honest setup/testing notes.
6. **QA and handoff (remaining):** add one-command scripts, validate fixtures and SQL
   shape as far as local tooling allows, run backend and frontend checks, update
   `STATE.md`, append `docs/HANDOFF.md`, record decisions, commit only intended files,
   and remove `.agent-lock`.

## Directory ownership

| Area | Owner | Interface boundary |
|---|---|---|
| Root rules and docs | Architecture | `AGENTS.md`, `docs/CONTRACT.md`, `docs/AI_DISCLOSURE.md` |
| `supabase/` and golden fixtures | Database | SQL schema and fixture IDs referenced by the contract |
| `backend/` | Backend | FastAPI/Pydantic models and role-aware vault routes |
| `app/` and root frontend assets | Frontend | Existing Next.js UI; no backend claims without a verified call path |
| `scripts/`, `STATE.md`, `docs/HANDOFF.md` | QA/handoff | Executable checks and verified status only |

## Shared interfaces

- Finding wire shape and status semantics are defined in `docs/CONTRACT.md`.
- Vault records use stable IDs, organisation scope, source/version metadata, and
  `draft` → `approved` transitions. Only `brand_owner` may approve.
- The local FastAPI adapter returns `persistence: "in_memory_demo"` so callers cannot
  mistake it for Supabase durability.
- No route may fabricate evidence, model metadata, or cross-organisation access.

## Risks and mitigations

- **Existing stack differs from the PRD stack:** retain Next.js because it is the
  runnable repository application; document the planned FastAPI/Supabase boundary.
- **No Supabase project or credentials:** make the migration/seed/RLS foundation
  explicit and keep runtime persistence disabled unless configuration is present.
- **Python toolchain is not configured:** use a documented `python3`/virtualenv path;
  report missing optional dependencies rather than hiding failures.
- **Demo data could be mistaken for customer data:** use fictional VoltEdge data in all
  new fixtures and disclose that the existing Northstar screen is seeded UI state.
- **Approval could bypass role checks:** centralise role dependencies and test creator,
  manager, legal reviewer, agency, and brand owner behavior.
