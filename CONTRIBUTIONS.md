# Proofline contribution record template

**Document status:** Template only. This file does not assert that any person, tool, or
organisation contributed work. Add entries from actual project records only.
**Template date:** October 25, 2026.

Use this document to record human, tool, and external-resource contributions for a future
release or submission. Do not infer authorship from file history, generated text, or the
presence of a dependency. Do not add credentials, private prompts, customer data, or
confidential brand material.

## Contribution entry template

Copy this block for each confirmed contributor or tool:

```text
Name or handle: [actual name/handle]
Role: [actual role]
Dates: [YYYY-MM-DD to YYYY-MM-DD]
Areas: [code / docs / design / research / testing / operations]
Specific contribution: [short factual description]
Files or artifacts: [paths, issue IDs, or links]
Review/verification: [who reviewed and how]
Disclosure needed: [AI assistance / third-party asset / none / verify]
Permission to list: [yes/no/date]
```

## AI or tool assistance entry template

```text
Tool/provider: [actual tool/provider]
Model/version: [actual value, if applicable]
User/operator: [actual contributor]
Dates used: [actual dates]
Work assisted: [planning / code / docs / design / tests / other]
Material retained: [actual files or artifacts]
Human review: [actual reviewer and evidence]
License/terms checked: [yes/no/not applicable]
```

The project has a separate implementation disclosure in
[`docs/AI_DISCLOSURE.md`](docs/AI_DISCLOSURE.md). Keep tool-use details consistent with
that file, but do not copy unverified or guessed contributor information into either
document.

## Third-party assets and references template

| Asset/reference | Source | License/terms | Used in | Verification date | Notes |
|---|---|---|---|---|---|
| `[add actual item]` | `[source]` | `[terms]` | `[path]` | `[date]` | `[notes]` |

## Release review checklist

- [ ] Every listed contributor confirmed the entry and permission to list.
- [ ] AI/tool use is disclosed where required by the project or event rules.
- [ ] Third-party assets and licenses are recorded from actual sources.
- [ ] No customer data, credentials, private prompts, or confidential material is included.
- [ ] Claims about research, performance, deployment, or external services have evidence.
- [ ] Unverified items are marked `STUB`, `PLANNED`, or `MISSING` rather than implied to be complete.

Until entries are added from real records, this document should be treated as an empty
template and not as a contributor list.
