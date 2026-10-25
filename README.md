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
```

## MVP flow

- **Overview** shows review signals, recent activity, and the three-step Proofline method.
- **Review queue** contains a seeded Model X launch email with factual, unsupported-claim, and tone findings.
- **Findings** link each issue to a registry source or explicit evidence gap and offer minimal corrections.
- **Re-scan** creates a new revision state and unlocks the approval action only after findings are resolved.
- **Truth registry** shows versioned facts, terminology, promotion rules, claim policy, and accessibility guidance.
- **Insights** surfaces recurring issue patterns while keeping guideline changes under authorised human control.

The legacy `index.html`, `app.js`, and `styles.css` files are retained as prior static prototype assets; the runnable product entry point is the Next.js app under `app/`.
