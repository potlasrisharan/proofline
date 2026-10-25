# Proofline agent and architecture rules

These rules apply to the whole repository. They turn the Proofline product brief into
working agreements for contributors and coding agents. The repository may contain a
demonstration UI and planned foundation documents at the same time; do not describe a
planned capability as an implemented one.

## 1. Source of truth and scope honesty

- Read `README.md`, `Proofline_Consolidated_PRD.md`, and the relevant contract before
  changing behavior or documenting an API.
- Use the labels **IMPLEMENTED**, **STUB**, **PLANNED**, and **MISSING** when a status
  could be misunderstood. A mock, seeded UI, type definition, or design note is not
  proof that a backend, database, authentication flow, model integration, or
  persistence feature exists.
- Do not invent user research, performance measurements, model results, citations,
  integrations, security certifications, or production data. Mark hypotheses and
  proposed targets as such.
- New documentation examples must use fictional **VoltEdge** data. Never put real
  customer, credential, or confidential brand data in fixtures, screenshots, logs, or
  examples.

## 2. Architecture boundaries

- Preserve the existing Next.js + React + TypeScript application. The runnable UI is
  under `app/`; the legacy root `index.html`, `app.js`, and `styles.css` files are
  retained prototype assets.
- The PRD's FastAPI/Supabase stack is a planned foundation unless the repository
  contains and verifies the corresponding implementation. Keep the boundary and
  endpoint status documented in `docs/CONTRACT.md`.
- Keep provider, database, and authentication secrets server-side. Never commit
  `.env` files, API keys, access tokens, private keys, or copied production data.
- Prefer small interfaces around external services so a model, OCR provider, storage
  service, or database can be replaced without changing the product contract.

Additional credential rules for this project: keep secret values in local `.env` files
only, provide `.env.example` with redacted variable names, use project-dedicated
accounts, and never reuse credentials from another project.

## 3. Evidence-first review behavior

- A finding must point to an applicable approved source or rule, or explicitly say
  that evidence was not found. The system must never invent a source, citation,
  specification, policy, or confidence-based verdict.
- Distinguish a contradiction from missing evidence, a source conflict, a style
  suggestion, and a finding that requires human review. Missing evidence is not proof
  that a claim is false.
- Treat model output as a candidate until schema validation, workspace/source checks,
  and applicable deterministic checks have completed.
- Preserve the creator's intent in suggested corrections where possible. Keep the
  original content and every revised version available for comparison.
- AI assists; an authorised human owns the final approval, override, or request for
  changes. Do not auto-publish content or silently activate a suggested brand rule.
- Proofline is not legal advice, a guarantee of real-world truth, or a replacement
  for a qualified legal or compliance review.

Nothing is auto-applied, auto-approved, or auto-published. A creator or authorised
reviewer must explicitly choose the action, and the decision remains auditable.

## 4. Versioning, tenancy, and auditability

- Treat approved facts, rules, sources, content versions, audit runs, findings, and
  review decisions as traceable records. Do not overwrite history when a fact or rule
  changes.
- Every finding must remain tied to the audited content version and the exact source or
  rule version used, when one exists. See the canonical typed schema in
  `docs/CONTRACT.md`.
- Enforce organisation/workspace isolation at the API and persistence layers. A
  client-supplied organisation ID is never sufficient authorisation.
- Use least privilege for creators, reviewers, managers, and administrators. Record
  approval, override, source, and permission-sensitive changes with actor and time.
- If extraction, retrieval, validation, or a model call fails, expose a review-required
  or failed state. Do not report a successful audit from a partial or malformed result.

## 5. Privacy, security, and files

- Keep uploaded brand sources, assets, and content private by default. Send only the
  minimum relevant context to an external AI/OCR service, and disclose that transfer
  before it occurs.
- Validate file type, size, parsing, and extraction quality. Do not trust uploaded
  filenames or content, and do not place sensitive file contents in ordinary logs.
- Document actual model/provider, API, OCR/PDF library, hosting, retention, and
  deletion behavior in `docs/AI_DISCLOSURE.md` before presenting them as real.
- Do not claim compliance certifications or complete accessibility/legal compliance
  without evidence. Accessibility checks should be measurable where possible and
  should not rely on colour alone.

## 6. Contract and implementation discipline

- Keep endpoint names, request/response shapes, enum values, and status semantics in
  `docs/CONTRACT.md` aligned with verified implementation as the project evolves.
- A planned endpoint is not available merely because it appears in documentation. A
  stub must return an explicit not-implemented response rather than fake data.
- Prefer deterministic checks for exact terminology, dates, numbers, required
  qualifiers, and schema validation. Use AI for contextual checks only when its input,
  output, evidence, and uncertainty can be recorded.
- Before declaring a change complete, run the repository checks that apply to it:

  ```bash
  npm run lint
  npm run typecheck
  npm run build
  ```

  Report failures and unverified areas rather than masking them.

## 7. Contribution discipline

- Keep commits small and honest, use clear conventional messages, and keep one branch
  per sub-agent or workstream when parallel work is used. Never rewrite or backdate
  repository history.
- Maintain `docs/AI_DISCLOSURE.md` when AI tools, models, APIs, libraries, templates,
  or external processing choices change.
