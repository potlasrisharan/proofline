# PRD implementation matrix

**Reviewed:** 2026-10-27 IST  
**Tenant used for checks:** fictional VoltEdge  
**Scope rule:** `IMPLEMENTED` means a local runtime path and meaningful test exist.
It does not mean production hosting, durable storage, legal compliance, or real-world
truth. `PARTIAL` means only the stated local boundary is implemented. `PLANNED` means
the PRD intentionally places it outside the verified build.

## P0 feature requirements

| PRD feature | Status | Verified path / remaining boundary |
|---|---|---|
| F-01 workspace and role access | PARTIAL | FastAPI organisation-scoped dev/JWT principals, role checks, agency scope, and isolation tests work locally. Workspace administration, invitations, Cloudflare Access, and D1 membership lookup are not connected. |
| F-02 Truth Registry | IMPLEMENTED (local) | Facts, terms, guidelines, disclaimers, and assets support draft create, versioning, search, import/import-file, approval, superseding, retirement, source metadata, validity, and conflict-safe audit retrieval. Durable D1 and source-object storage remain unverified. |
| F-03 intake and extraction | IMPLEMENTED (local) | Text, bounded PDF, DOCX, PNG/JPG ingestion and explicit complete/partial/failed/unsupported states are implemented in the API. Opt-in browser API mode now submits supported files and displays returned extracted text; default browser-only mode remains text-only. |
| F-04 multi-layer audit | IMPLEMENTED (local bounded) | Deterministic claim/rule checks, optional provider boundary, schema/evidence validation, dedupe, risk, and visible failure/review-required states work locally. No live model/provider is enabled. |
| F-05 evidence-linked findings and risk | IMPLEMENTED (local) | Exact spans, category/severity, evidence or evidence gaps, Claim–Fact Ledger links, source/version validation, conflict handling, and transparent risk breakdown are tested. |
| F-06 intent-preserving corrections | IMPLEMENTED (local) | Accept/edit/dismiss actions retain originals, create revisions, validate exact spans, and require recheck; suggestions cannot auto-approve or publish. |
| F-07 revision/audit history | IMPLEMENTED (local) | Immutable process-lifetime versions, audits, finding diffs, actions, comments, decisions, exports, and hash-linked events are retained in memory. |
| F-08 human review/approval | IMPLEMENTED (local) | Creator/agency/manager/legal/owner permissions, separation of duties, high-risk approval blocks/overrides, comments, reasons, and decisions are tested. |
| F-09 dashboard/export | IMPLEMENTED (local API) / PARTIAL (UI) | API dashboard and evidence-aware export derive from saved in-memory records and enforce visibility. Main seeded dashboard is not yet API-backed and no durable analytics exists. |
| F-10 privacy/AI transparency | IMPLEMENTED (local bounded) | `/privacy`, disclosure panel, confidential marker, provider status, server-side key boundary, and no-external-call disclosure are present. Production retention/deletion/consent is not implemented. |
| F-11 accessibility baseline | IMPLEMENTED (local bounded) | Missing-alt metadata, WCAG contrast, palette distance, hashtag readability, keyboard labels, focus handling, and colour-independent finding labels are implemented. This is not a full accessibility certification. |

## P1 feature requirements

| PRD feature | Status | Verified path / remaining boundary |
|---|---|---|
| F-12 static visual checks | IMPLEMENTED (local bounded) | Measurable contrast, observed-vs-approved palette distance, image metadata, and missing-alt checks work when metadata is supplied; logo/asset recognition and uncertain visual confirmation remain limited. |
| F-13 fact-change impact alerts | IMPLEMENTED (local) | Versioned fact changes/expiry follow Claim–Fact links, mark registered content for re-review, expose old/new evidence, create tasks, and support deterministic recheck receipts. Durable queue/storage is not connected. |
| F-14 configurable market/claim rules | IMPLEMENTED (local) | Scoped facts, terms, disclaimers, comparative claims, regulated keywords, validity windows, palette, contrast, and metadata-driven rule configuration are implemented. No maintained legal rule pack is claimed. |
| F-15 team insights/guideline gaps | IMPLEMENTED (local analytics) | Category/rule/action aggregates, windows/sample sizes, expiry and ambiguity signals, conflicts, and owner-only unapplied proposals are implemented with synthetic fixtures. Durable ingestion/UI API wiring is not complete. |

## P2 and infrastructure requirements

| PRD feature | Status | Boundary |
|---|---|---|
| Video frame/audio review | PLANNED | No video parser, frame sampler, transcription, or review contract exists; implementing a fake result would violate scope honesty. |
| Website/social/CMS scanning | PLANNED | No crawler, connector, scheduler, publication side effect, or external permission boundary is verified. |
| Google Docs/Slack/email/campaign integrations | PLANNED | No external integration is enabled. |
| Cross-language consistency/translation comparison | PLANNED | The contract carries language scope, but no validated multilingual comparison engine is implemented. |
| Enterprise SSO/advanced retention | PLANNED | Local JWT/dev headers only; Cloudflare Access, membership lifecycle, retention, and deletion are not connected. |
| Durable D1/R2/Queues persistence | STUB / PLANNED | Schema, bindings, and Worker foundation exist; no live resources or durable adapters were smoke-tested. |
| Live AI/OCR provider | STUB / MISSING externally | Optional provider seams exist; no live request, provider terms, model, region, or retention are verified. |
| Hosted deployment | READY / NOT DEPLOYED | Pages/Worker build artifacts and Wrangler config pass local checks; no hosted URL or deployment smoke test exists. |

## Exit criteria result

The local end-to-end judge flow is IMPLEMENTED: create/approve a VoltEdge fact, submit
text or a supported local file through the API, inspect an evidence-linked or abstaining
finding, apply/edit/dismiss and recheck, submit for human review, approve/request changes,
and export the retained decision history. Production-only items above remain explicitly
outside the verified implementation until their external resources and failure tests are
available.
