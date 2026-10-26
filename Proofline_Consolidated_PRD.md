# PROOFLINE
## Product Requirements Document (PRD)
### AI-Powered Brand Governance and Pre-Publication Review Platform

**Document version:** 2.0 — consolidated edition  
**Date:** 24 October 2026  
**Purpose:** Consolidated product requirements and Round 1 planning source for the team's presentation  
**Status:** Proposed product plan — not a claim that the product has already been built  
**Working product name:** Proofline (unified name used throughout this document)  
**Problem statement source:** Organiser-provided “Problem Statement by Inkloom AI”

> **One-line pitch:** Proofline is an evidence-backed brand-governance checkpoint that verifies content against approved, versioned brand knowledge before publication, explains potential issues, suggests minimal corrections, and routes decisions through accountable human review.

> **Core differentiator:** The Claim–Fact Ledger links each detected claim to the applicable approved fact, rule, source version, product/market scope, and validity window. When a fact changes or expires, Proofline can identify registered content that may need revalidation.

> **Three improvements promised for later rounds:** (1) Fact-Change Impact Radar, (2) Evidence-or-Abstain Reliability Layer, and (3) Governance Insights with a Guideline-Gap Detector. These are planned capabilities, not statements that the features already exist.

> **Important distinction:** The organiser's problem statement and judging criteria are the required baseline. Product design choices, planned features, proposed metrics, and research questions in this PRD are our recommendations for solving that problem. User interviews, measured results, and product performance must not be claimed until they have actually happened.

## Contents

1. Executive summary and product at a glance
2. Understanding the problem, evidence, and validation plan
3. Product vision, goals, non-goals, and principles
4. Users, roles, and jobs to be done
5. Proposed product and end-to-end workflow
6. Feature scope and prioritisation
7. Finding taxonomy and risk model
8. Functional requirements and acceptance tests
9. Technical approach, architecture, and data model
10. Privacy, security, accessibility, and responsible AI
11. Development plan across all three rounds
12. Team responsibilities
13. Validation plan and success metrics
14. Risks and mitigations
15. Expected impact
16. Future roadmap
17. Judging-criteria alignment and competitive positioning
18. Slide-ready content outline
19. Suggested demo script
20. Submission-readiness checklist
21. Glossary
22. Final product definition
23. Source notes and external references

---

# 1. Executive Summary

Growing organisations publish content through employees, agencies, contractors, and generative AI tools. As the number of creators and channels grows, organisations struggle to keep every message accurate, current, accessible, and consistent with approved brand identity. Incorrect specifications, expired offers, unsupported promotional claims, off-brand language, incorrect visual assets, and missing disclosures may go live before a reviewer notices them.

The core problem is not a lack of tools that can write or design content. It is the **Verification Gap**: content production has scaled faster than the ability to verify every item against the latest approved company information and brand rules.

**Proofline** is a proposed AI-powered brand-governance platform that acts as a pre-publication quality gate. It centralises the organisation's approved facts, terminology, guidelines, assets, and configured policy rules; reviews submitted content against that material; explains potential issues with evidence; suggests minimal corrections that preserve the creator's purpose; and routes revisions through an accountable human review process.

The core mechanism is the **Brand Truth Registry + Claim–Fact Ledger**. The registry stores approved facts and rules with sources, versions, owners, applicable products/markets, and validity dates. The ledger links claims extracted from submitted content to the fact/rule versions used to evaluate them. This supports explainable reviews now and a Fact-Change Impact Radar later: when a specification, price, or offer changes, Proofline can locate registered content that may have become stale.

Proofline is designed to complement content-generation products, including Pomelli-style brand-aware generators, rather than becoming another generic generator. The product's primary value is verification, evidence, review accountability, and change tracking. It must not guarantee truth, replace legal professionals, or auto-publish content.

### Product promise

**Before content reaches customers, Proofline helps teams answer four questions:**

1. Does this content agree with the organisation's currently approved facts and brand rules?
2. If something is flagged, what source or rule supports the finding?
3. What correction can resolve the issue while preserving the creator's intent?
4. Who reviewed the corrected version, and which source versions informed the decision?

### Three signature capabilities

- **Claim–Fact Ledger:** Records the relationship between a claim, the relevant approved fact/rule, its source version, and its status: supported, contradicted, outdated, unsupported/unverified, or needing human review.
- **Evidence-or-Abstain:** The system does not invent evidence. If sources are missing, conflicting, stale, or insufficient, it says so and routes the issue to a human rather than presenting a guess as fact.
- **Governance learning loop:** The platform identifies content patterns and unclear guidelines from saved findings and reviewer decisions. It may recommend rule updates, but only an authorised brand owner can approve and activate them.

### Round strategy

The MVP should demonstrate a complete workflow before expanding into every feature. Build brand setup, approved knowledge, multi-format intake, evidence-linked checks, correction and re-scan, role-based approval, and revision history first. Add deeper visual analysis, broad integrations, scheduled website scanning, video, and more languages only after the core is reliable. The product must be meaningfully developed during the official build window and must follow all organiser rules on pre-existing code, templates, AI usage, and disclosure.

**Research and performance caveat:** External research in this PRD is secondary evidence and is cited for validation. Vendor and self-reported survey findings are not universal facts. The team's own interviews, test results, or user feedback must only be reported after they actually occur.

## 1.1 Product at a glance

| Item | Definition |
|---|---|
| Product | Proofline — working name |
| Product category | AI-assisted brand governance and content review |
| Primary users | Content creators, marketing managers, brand/compliance reviewers, administrators |
| Primary workflow | Configure approved brand knowledge → submit content → audit → correct → re-audit → review → approve or request changes |
| Core differentiator | Evidence-linked findings grounded in a versioned registry of approved facts and rules |
| MVP content types | Text, text-extractable PDF, DOCX, and bounded PNG/JPG OCR for embedded text; deeper logo/palette analysis is conditional |
| Human control | An authorised person retains the final approval decision |
| Round 2 objective | Demonstrate the core workflow end to end with persistent audit and review history |
| Main constraint | The product must be meaningfully developed during the official build window; pre-event work is limited to permitted research and planning |

---

# 2. Understanding the Problem

## 2.1 Problem in plain English

An organisation may have a brand guide and approved product information, but the people creating content do not always use the latest and correct versions. Content may be copied, adapted, translated, regenerated by AI, or handed between teams. Manual review is inconsistent and may miss an incorrect number, expired offer, off-brand wording, inaccurate visual, accessibility issue, or unsupported claim.

The problem is therefore not simply “how to write better marketing content.” It is **how to maintain brand trust and control across content created by many people and tools**.

## 2.2 The organiser's core requirements

The supplied problem statement asks for a platform that:

1. Reviews content before publication against approved guidelines, facts, and assets.
2. Detects issues involving tone, terminology, messaging, visual consistency, accessibility, and unsupported promotional claims.
3. Explains why each issue was flagged and identifies the relevant guideline or approved source.
4. Suggests corrections that preserve the creator's original purpose rather than simply rejecting content.
5. Supports collaboration among creators, managers, and authorised reviewers, including comments, approvals, and change tracking.
6. Supports different content formats.
7. Identifies repeated mistakes and areas where brand guidelines may be unclear.
8. Protects confidential brand material and explains the use of AI or external services.
9. Balances automation with human oversight and produces reliable, explainable results.

These are the baseline requirements. Every proposed feature below should support at least one of them.

## 2.3 Main failure modes

| Failure mode | Example | Why it matters | Proofline response |
|---|---|---|---|
| Incorrect factual claim | Draft says a laptop provides 20 hours of battery life; approved specification says “up to 10 hours.” | Misleads customers and damages trust. | Compare the claim with the applicable approved fact and show both values and the source. |
| Outdated information | An advertisement repeats a discount after the offer expiry date. | Creates customer confusion and operational or legal exposure. | Store offer validity dates and flag content that uses an expired offer. |
| Unsupported promotional claim | “India's cheapest” or “guaranteed results” has no approved evidence. | A confident statement may not be substantiated. | Mark as unverified or unsupported; request evidence or reviewer action rather than declaring it false without proof. |
| Off-brand tone or terminology | A formal brand uses slang or a prohibited phrase. | Creates an inconsistent customer experience. | Compare content with configured tone and terminology rules, explain the mismatch, and suggest alternate wording. |
| Incorrect visual use | A poster uses an obsolete logo or incorrect brand colour. | Makes brand identity inconsistent. | Compare supported visual inputs with approved assets and visual rules; show the basis for the flag. |
| Accessibility issue | An uploaded campaign image has important text but no useful alternative text. | Some users may be unable to access the content. | Check applicable accessibility rules and suggest an alt-text or readability improvement. |
| Missing legal/market qualifier | A promotion omits a configured “terms apply” qualifier. | The content may be incomplete for its intended market. | Apply organisation-configured disclaimer and region rules; do not claim to replace legal advice. |
| No accountable approval | Content is published without a clear final reviewer or an auditable decision. | Teams cannot reliably know who approved which version. | Role-based approval actions, reviewer comments, and immutable-style audit events. |
| Conflicting or unclear guidelines | Two brand documents give conflicting instructions. | The checker may produce inconsistent recommendations. | Surface the conflict for a brand owner and record the clarified rule; do not silently choose one source. |

## 2.4 Example: battery-life verification

**Approved registry record**

- Product: Laptop Model X
- Fact: Battery life
- Approved value: Up to 10 hours
- Source: Approved product specification
- Applicable product/market: Model X, specified market
- Owner: Product information owner
- Validity: Current approved version

**Submitted advertisement:** “Our laptop provides 20 hours of battery life!”

**Expected Proofline response:**

- Finding: Factual inconsistency / product claim mismatch.
- Evidence: Submitted content says “20 hours”; the applicable approved record says “up to 10 hours.”
- Explanation: The submitted claim conflicts with the current approved specification.
- Suggested correction: “Up to 10 hours of battery life,” provided this exact wording is approved for the relevant product and market.
- Action: Creator reviews the correction, re-runs the audit, and submits the updated version for approval.

Proofline must not infer that “up to 10 hours” is automatically suitable in every context. The wording must remain consistent with approved specifications and applicable rules.

## 2.5 Evidence the problem is real — secondary sources

The organiser asks for evidence that the problem is real. The following external sources support the problem context. They are secondary research, industry surveys, or reported findings; they should be presented with their sample sizes and limitations rather than as universal statistics.

| Evidence | What the source reports | How it supports Proofline | Caveat to disclose |
|---|---|---|---|
| NP Digital, *AI Hallucinations and Accuracy Report* (4 February 2026) | A survey of 565 US digital marketers plus a 600-prompt model test reported that 47.1% encountered AI inaccuracies several times a week, 36.5% said inaccurate/hallucinated AI content had gone live publicly, and more than 70% spent 1–5 hours per week fact-checking AI output. | Shows the practical burden of checking AI-assisted marketing content and the risk of errors reaching the public. | This is a survey/report published by an industry vendor; figures are self-reported and apply to its sample, not every marketer. See [NP Digital report announcement](https://www.globenewswire.com/news-release/2026/02/04/3232208/0/en/NP-Digital-s-AI-Hallucinations-and-Accuracy-Report-Reveals-the-Marketing-Impact-of-AI-Errors.html). |
| Ahrefs, *State of AI in Content Marketing* (30 September 2026) | Among 301 surveyed marketers, 93% reported using AI to create or assist with content; Ahrefs reports that 89% manually check AI-generated content. | Supports the premise that AI is used at scale while human review remains common. | Survey sample and recruitment affect generalisability; use the published methodology and exact wording. See [Ahrefs research](https://ahrefs.com/blog/marketers-ai-content-creation/). |
| ASCI FY2024–25 annual complaints report, as reported by Moneylife (28 May 2025) | The report coverage states that 7,199 advertisements were scrutinised and 94% of the misleading advertisements were online; it also reports a sharp rise in public complaints. | Provides India-specific context for online advertising accountability and content review. | This is media coverage of the ASCI report; verify the exact phrasing against the underlying report before using a statistic on a slide. See [Moneylife report coverage](https://www.moneylife.in/article/94-percentage-of-misleading-ads-found-online-asci-report-flags-influencer-breaches-and-illegal-promotions/77259.html). |
| Department of Consumer Affairs, Government of India — CCPA Guidelines for Prevention of Misleading Advertisements and Endorsements for Misleading Advertisements, 2022 | Official guidance addresses misleading advertisements and endorsements. | Supports configurable India-focused disclaimer and promotional-claim checks as a possible rule pack. | Proofline would flag configured rules for review; it would not interpret itself as a complete legal-compliance engine or legal advice. See [official CCPA guidelines page](https://consumeraffairs.nic.in/latestnews/guidelines-prevention-misleading-advertisements-and-endorsements-misleading). |
| W3C, Web Content Accessibility Guidelines (WCAG) 2.2 | WCAG 2.2 includes measurable contrast requirements, including 4.5:1 for normal text and 3:1 for large text under Success Criterion 1.4.3, subject to stated exceptions. | Grounds a limited, measurable accessibility check rather than a vague claim that the product “does accessibility.” | Contrast checks are only one part of accessibility; automated checks cannot certify an entire asset or campaign as accessible. See [WCAG 2.2](https://www.w3.org/TR/WCAG22/). |

These sources justify why the problem deserves attention. They do not prove that Proofline will reduce errors or review time; those product outcomes must be tested.

## 2.6 Primary research plan — collect real evidence before presenting it

The secondary sources should be complemented with a small, honest primary-research effort. Do not fabricate interviews, response counts, quotes, or mini-audit findings. With fewer than ten survey responses, call the results an **early signal**, not a representative survey.

### Quick survey (about two minutes)

Use a form to ask creators, social-media leads, marketing managers, freelancers, small-business owners, or reviewers:

1. What is your role: creator, manager, agency/freelancer, owner, reviewer, or other?
2. How many people, agencies, or AI tools create content for the organisation?
3. In the last six months, have you encountered a wrong product detail, wrong price, expired offer, unsupported claim, off-brand wording, or visual inconsistency?
4. Who checks content before publication, and how?
5. How long does a typical item take to get approved?
6. Do you use AI to draft content? How do you verify its facts?
7. How confident are you that published content follows the approved brand guidelines (1–5)?
8. What is the most frustrating part of the current review process?
9. Would you use a tool that checks content against approved facts before publication? What concerns you most: accuracy, privacy, setup effort, cost, or something else?

### Short interview plan

Conduct three to five short interviews if possible, for example with a college club social-media lead, freelancer, agency copywriter, or small-business owner. Ask about the last mistake they observed, where approved facts live, how updates are communicated, who approves content, and what evidence an AI checker would need to show before they would trust it.

### Mini-audit plan

If time and permissions permit, review 15–20 public posts from two or three organisations or college clubs against their own available public references. Record only verifiable issues such as an expired visible offer, inconsistent product naming, missing alt text where metadata is observable, unclear disclosures, or measurable contrast concerns. Capture examples lawfully and avoid making unsupported claims about hidden internal policies.

### How to report findings

Include the sample size, date, respondent roles (anonymised as appropriate), method, three useful observations, and limitations. If no primary research is completed, explicitly label user pain points as hypotheses and state how they will be validated in the build round.

**Current evidence status:** The problem is grounded in the organiser's brief and the secondary sources above. No team-specific interviews, survey results, or measured Proofline outcomes are assumed by this document.

---

# 3. Product Vision, Goals, and Non-Goals

## 3.1 Vision

Make every content creator able to check against the latest approved brand knowledge, understand potential problems, and get the right human approval before content reaches customers.

## 3.2 Value proposition

**For organisations producing content across multiple people and tools, Proofline is an evidence-backed brand-governance layer that catches likely factual, language, visual, accessibility, and policy inconsistencies before publication. Unlike a generic content generator, it explains findings using the organisation's approved sources, supports correction and review, and records the decision history.**

## 3.3 Product goals

1. Provide one manageable place for approved brand facts, language rules, guidelines, and reusable assets.
2. Review submitted content against those approved sources before publication.
3. Make findings explainable: show what was flagged, why, and which source or rule applies.
4. Help users fix issues without losing the creator's intended message.
5. Provide a practical human approval workflow with roles, comments, version history, and decision records.
6. Track repeated violations and content affected by changes to approved facts.
7. Treat confidentiality, privacy, and uncertainty as core design requirements.
8. Deliver a scope that the team can plausibly build and demonstrate during the permitted event window.

## 3.4 Non-goals for the initial MVP

- Automatically publishing or scheduling marketing content to external platforms.
- Replacing legal counsel or guaranteeing legal compliance.
- Guaranteeing that every factual claim is true in the real world; the system checks against configured approved sources and flags uncertainty.
- Supporting every file format, every language, video, every CMS, and every social network in the first build.
- Automatically learning new brand rules from every correction without owner review.
- Making irreversible edits to a creator's source content.
- Treating a model confidence score as proof of factual correctness.

## 3.5 Product principles

- **Evidence before assertion:** Findings should cite a relevant approved rule or state clearly that adequate evidence was not found.
- **Human accountability:** AI assists; authorised people decide.
- **Preserve intent:** Suggestions should fix the issue while retaining the creator's original purpose where possible.
- **Version everything important:** Content, approved facts, and review decisions need traceable versions.
- **Least privilege:** Users see and change only the information their role and organisation permit.
- **Fail visibly:** If extraction fails, sources conflict, or the model returns invalid output, show a review-required state instead of pretending the audit succeeded.
- **Scope honestly:** Clearly distinguish supported capabilities from planned extensions.

---

# 4. Users and Their Needs

## 4.1 Primary personas

### Persona A — Content creator

**Context:** Writes social posts, advertisements, product descriptions, email copy, brochures, and campaign material. May use AI tools or receive input from an agency.

**Needs:** Fast feedback, clear explanations, practical corrections, minimal rework, and visibility into what must be fixed before submission.

**Success looks like:** The creator can submit a draft, understand the flags, apply or reject suggestions, re-run the check, and submit a revised version without losing the original.

### Persona B — Marketing manager / campaign owner

**Context:** Coordinates content across people, campaigns, and channels. Wants consistent brand execution and a predictable review process.

**Needs:** Overview of pending reviews, risk-based prioritisation, version comparison, and visibility into recurring issues.

**Success looks like:** High-priority issues reach the right reviewer, and the manager can see which version was approved and why.

### Persona C — Brand or compliance reviewer

**Context:** Owns or checks messaging, product facts, visual assets, required disclaimers, or market-specific rules.

**Needs:** Evidence for each finding, access to the applicable source and version, ability to comment, request changes, approve, or override a false positive with a reason.

**Success looks like:** Review decisions are traceable and evidence-based; the system does not force a reviewer to accept an AI suggestion.

### Persona D — Brand administrator / fact owner

**Context:** Maintains brand guidelines, current product specifications, price lists, promotions, terminology, and approved assets.

**Needs:** Ability to add or update approved records, set applicability and expiry, resolve conflicts, and identify content that may be affected by a change.

**Success looks like:** Creators can rely on current, governed information rather than copying older documents.

## 4.2 Ideal initial customer and organisational setting

**Initial target segment (a hypothesis to validate):** growing consumer-facing organisations and agencies that publish content across several channels and have multiple contributors but cannot justify a heavyweight governance programme. Candidate settings include direct-to-consumer retail, consumer electronics, edtech, personal care, healthcare, and financial services marketing. Regulated or high-consequence industries need stricter human review and legal/compliance escalation.

The suggested first customer profile is an organisation with multiple content creators, at least one brand or marketing approver, current product/offer information, and a mixture of human- and AI-assisted writing. The product must also support a small business with one brand owner and one creator; no claim about a minimum organisation size is required for the MVP.

This segment is a product hypothesis, not a researched market-size claim. Validate it through interviews before asserting buyer demand.

## 4.3 Role and permission model

| Role | Main permissions | Restricted actions |
|---|---|---|
| Creator | Create and edit own drafts, submit audits, review findings, accept/reject suggestions, request review | Cannot approve own content when policy requires separation of duties; cannot change approved brand facts unless granted permission |
| Manager | View assigned team/campaign content, assign reviewers, comment, request changes, view team-level insights | Cannot override restricted organisation-level settings without permission |
| Authorised reviewer | Review evidence, comment, approve, reject/request changes, record override reason | Cannot alter source records unless also designated as a fact/brand owner |
| Brand administrator / fact owner | Manage approved facts, rules, assets, versions, validity, and source records | Cannot access another organisation's workspace unless explicitly authorised |
| External agency / freelancer | Submit and revise assigned content; view only the approved guidelines/assets scoped to the engagement | Cannot browse unrelated campaigns, confidential sources, organisation-wide insights, or approve final content unless explicitly authorised |
| Organisation owner | Manage workspace members, access policies, retention settings, and organisation-level configuration | All sensitive actions should still be logged |

Roles are proposed; the minimum build should implement only the permissions needed for the demonstration. The key requirement is that approval actions are not available to unauthorised users.

## 4.4 Jobs to be done

- “When I prepare content, help me confirm that the factual claims match the latest approved information before I submit it.”
- “When a draft is flagged, show me the exact reason and source so I can fix it quickly.”
- “When a product fact or promotion changes, help me identify stored content that may now be outdated.”
- “When I review content, give me the evidence and history I need to make an accountable decision.”
- “When the same error appears repeatedly, show the pattern so we can improve our process or clarify the guidelines.”

---

# 5. Proposed Product and End-to-End Workflow

## 5.1 Product components

1. **Brand Workspace:** A private workspace for an organisation, its users, policies, and content.
2. **Brand Truth Registry / Source-of-Truth Vault:** Structured approved facts, terminology, voice rules, promotions, assets, and supporting sources, with owners, versions, applicability, and effective/expiry dates.
3. **Claim–Fact Ledger:** Links each extracted claim (or claim span) to the relevant approved fact/rule version and records its status: supported, contradicted, outdated, unsupported/unverified, ambiguous, or review required.
4. **Content Intake:** A controlled upload or paste experience for supported content.
5. **Audit Engine:** Combines deterministic rules with source-grounded AI checks.
6. **Findings and Fixes:** Presents evidence, severity, uncertainty, and suggested corrections.
7. **Review Workflow:** Supports creator revisions, comments, assigned reviewers, approval, and change requests.
8. **Version and Audit History:** Stores the content version, source versions used for checks, findings, and human decisions.
9. **Governance Insights:** Summarises recurring issue categories, rules frequently violated, review bottlenecks, and outdated content identified within the system. The advanced Guideline-Gap Detector proposes clearer rule wording but never activates policy changes without owner approval.

## 5.2 Primary workflow

**Step 1 — Set up the brand.** An administrator creates a brand workspace, adds approved facts and brand rules, and uploads reusable assets or reference documents. Each important record includes a source, owner or approver, version, and any relevant effective or expiry dates.

**Step 2 — Submit content.** A creator pastes text or uploads a supported PDF, DOCX, or static image. The creator may specify channel, product, region, language, content type, and planned publication date when relevant. If a file cannot be extracted reliably, the system reports the problem and asks for a supported format or manual text input. MVP image support is limited to OCR/text claims unless visual matching has been implemented and tested.

**Step 3 — Normalise and inspect.** The backend extracts text and relevant metadata, identifies claims and terminology, and prepares the content for checks. Any visual analysis is limited to formats supported by the implemented pipeline.

**Step 4 — Run the audit.** The claim extractor identifies candidate numeric claims, prices, dates, offers, product specifications, comparative/superlative language, and other relevant statements. Deterministic checks handle exact terms, dates, numbers, required disclaimers, and measurable rules. The AI layer evaluates tone, context, messaging, and possible claim mismatches against retrieved approved facts and guidelines.

**Step 5 — Validate and link findings.** The backend validates the output format, confirms that referenced rules or sources exist and are applicable to the current brand/product/market, and links claims to the relevant fact/rule versions in the Claim–Fact Ledger. Findings are marked supported, contradicted, outdated, unsupported/unverified, ambiguous, or requiring human judgement. If there is no defensible evidence, the system abstains from a hard factual verdict and routes the item for human review.

**Step 6 — Explain and correct.** The interface shows the relevant excerpt, issue category, severity, explanation, evidence or missing-evidence status, and a suggested correction. The creator can accept, edit, or reject a suggestion.

**Step 7 — Re-scan the revision.** The next version receives a new audit run. The product compares findings across versions and shows which issues were resolved, remain, or were introduced.

**Step 8 — Human review.** The creator submits the version for review. An authorised reviewer can approve, request changes, or leave comments. High-risk or unresolved findings can be configured to require reviewer acknowledgement before approval.

**Step 9 — Record the decision.** The platform stores the approved version, reviewer, timestamp, comments, overridden flags, and the source/rule versions used. Approval does not mean the system guarantees legal or factual perfection.

**Step 10 — Learn from patterns.** Governance insights summarise recurring errors and unclear rules. Changes to the underlying brand rules require review by an authorised owner.

## 5.3 Fact-change workflow

The Brand Truth Registry makes it possible to model changes to approved facts rather than treating the brand guide as a static file.

1. An authorised owner updates a fact, such as a product specification or promotion end date.
2. The new record is versioned, and the previous version remains traceable.
3. Proofline searches its own stored audit history and registered content for references to the changed fact.
4. Potentially affected content is marked for revalidation.
5. A creator or reviewer receives an in-product alert and sees the source change, affected content, and suggested next action.

**MVP boundary:** This workflow can cover content stored in Proofline's own database. Detecting old content on external websites or social platforms requires separate integrations and belongs in future scope unless specifically implemented and tested.

---

# 6. Feature Scope and Prioritisation

Priority definitions: **P0 = must-have for the first end-to-end demonstration; P1 = add only after P0 is reliable; P2 = future scope.** The final scope should be adjusted to the official build window and the team's available skills.

## 6.1 P0 — Core MVP

### F-01 — Brand workspace and role-based access

Create a workspace for a brand and allow users to access only the organisations and actions permitted by their role.

**Acceptance criteria:**
- A user cannot read another workspace's facts, files, content, or review history.
- Only permitted roles can modify approved brand records or make final approval decisions.
- Sensitive actions and review decisions are logged.

### F-02 — Brand Truth Registry

Store structured records for approved facts, terms, promotional information, tone rules, disclaimers, visual assets, and references. Records may be entered in a form or imported from supported CSV/PDF/DOCX sources. Every record should support a stable ID, key/value and unit where applicable, product/market/channel/language scope, source reference, owner/approver, version, status, and effective/expiry dates where relevant. Extracted or URL-derived brand information is a draft until an authorised brand owner reviews and approves it. The Claim–Fact Ledger links claims in audited content to these versioned records.

**Acceptance criteria:**
- An authorised user can create, edit, approve, and retire a brand record.
- Supported imports preserve the source file/reference and show an extraction/normalisation status.
- An authorised user can see which content claims reference a fact record/version when ledger links exist.
- Expired or superseded information is not silently treated as current.
- Each record can be traced to a source or explicitly marked as lacking a source.
- Conflicting records can be surfaced rather than silently resolved by AI.

### F-03 — Content intake and document extraction

Allow a user to paste text and submit a text-extractable PDF or DOCX. Accept JPG/PNG as a bounded multi-format path when OCR is enabled; for the MVP, use image OCR to extract embedded claims rather than promising full video or perfect visual brand inspection. Validate file type and size, handle extraction errors, and retain the submitted version.

**Acceptance criteria:**
- A valid text draft can be audited.
- A supported PDF or DOCX produces extracted text and a visible extraction status.
- A supported JPG/PNG can be submitted for OCR-backed text checks when the configured OCR service is available; the UI shows extracted text for human confirmation.
- Invalid or unreadable files produce a helpful error; the system does not report a successful audit over empty or incomplete text.
- The original submitted version remains available for comparison.

### F-04 — Multi-layer content audit

Combine deterministic checks and AI-supported checks grounded in the brand registry.

**Deterministic checks include:** banned/preferred terminology, numeric facts with compatible units and scope, offer dates and expiry, required configured disclaimers, explicit claim rules, and measurable accessibility checks where the input supports them.

**AI-supported checks include:** tone and messaging consistency, claim interpretation, contextual comparisons, ambiguity detection, and correction drafting grounded in retrieved source material.

**Claim types to examine:** factual/product claims, prices and offers, dates, comparative/superlative claims ("best", "No. 1", "cheapest", "better than X"), guarantee/performance claims, and statements that may require an approved qualifier.

**Acceptance criteria:**
- Every finding includes a category and a concise explanation.
- Evidence-backed findings reference a real registry record or source.
- Lack of evidence is reported as unverified, not automatically false.
- The system displays an error or review-required state if the audit fails or output cannot be validated.

### F-05 — Evidence-linked findings and risk categories

Show the excerpt that triggered the finding, the rule or source used, issue category, severity, and suggested next action.

**Acceptance criteria:**
- A reviewer can understand why a finding exists without needing to inspect raw model output.
- Severity labels have documented criteria. A risk score does not represent a calibrated probability unless separately tested.
- Findings can distinguish at least: confirmed rule mismatch, source conflict, evidence not found, style suggestion, and human review required.

### F-06 — Suggested corrections that preserve intent

Provide replacement text or an edit suggestion that attempts to retain the original message while resolving the flagged issue.

**Acceptance criteria:**
- The user can accept, edit, or reject a suggested correction.
- The original content is not overwritten silently.
- Suggestions are re-checked against the same approved sources and configured rules.
- The interface makes clear that a suggestion is not an approval.

### F-07 — Revision-aware audit history

Keep versioned content, audit runs, findings, and changes so the user can compare what changed between runs.

**Acceptance criteria:**
- Each edit creates a new identifiable content version or revision.
- The user can see which findings were resolved, remain, or were newly detected.
- Each audit stores which registry/rule versions were used.

### F-08 — Human review and approval

Allow a creator to submit a revision for review and an authorised reviewer to approve or request changes with comments.

**Acceptance criteria:**
- Approval actions are restricted to authorised roles.
- The system records decision, reviewer, timestamp, and comments.
- High-risk unresolved issues can be configured to require acknowledgement or block approval.
- Proofline never publishes content externally as a side effect of approval in the MVP.

### F-09 — Basic governance dashboard and audit export

Show a concise summary of audited content, open high-priority findings, approval state, and recurring issue categories. Provide a review report or export if time permits after the core flow.

**Acceptance criteria:**
- Dashboard numbers are derived from saved records, not fabricated demo values.
- An exported report includes content/version identifier, audit date, findings, evidence references, and review status.
- Users see only analytics they are permitted to view.

### F-10 — Privacy and AI-transparency panel

Provide a visible explanation of which external models/services are used, what data may be sent to them, what is stored, and how users can flag confidential material. In the MVP, use synthetic/demo data unless the team has verified that the chosen service terms and configuration are suitable for real confidential content.

**Acceptance criteria:**
- The product identifies the model/API and external processing components actually used.
- User-facing text states that suggestions are AI-assisted and may require human verification.
- Confidentiality claims match actual implementation; the product does not say data "never leaves the organisation" if a third-party service receives it.
- API keys are server-side only and brand/content records remain tenant-isolated.

### F-11 — Basic accessibility checks

Include a bounded accessibility baseline in the MVP: flag missing alternative text when the metadata is available, provide a text-readability check, and calculate contrast where the submitted format exposes measurable foreground/background colours. If the format does not support reliable measurement, show “Not assessed” instead of a pass.

**Acceptance criteria:**
- The UI distinguishes a measured failure, a suggestion, and a check that could not be run.
- For measurable contrast, use the applicable rule and threshold rather than an AI guess. WCAG 2.2 Success Criterion 1.4.3 defines 4.5:1 for normal text and 3:1 for large text, subject to exceptions.
- No single automated score is presented as proof that a full image, campaign, or website is accessible.

## 6.2 P1 — Enhancements if the core workflow is stable

### F-12 — Static image visual checks

Support a single uploaded image or poster beyond the MVP's OCR-backed embedded-text path. Compare the logo, colour palette, or known asset only where a tested matching method exists. Show detected elements and limitations, and request human confirmation for uncertain visual findings. Video remains out of scope for the initial rounds.

### F-13 — Fact-change impact alerts (basic link in Round 2; full Radar in Round 3)

When an approved record changes or expires, identify registered content and audit records likely to be affected, and mark them for revalidation. Round 2 may demonstrate the basic source/version link and a limited test scenario; Round 3 completes the impact queue and re-audit interaction.

### F-14 — Configurable market/claim rules

Allow brand owners to configure required qualifiers, prohibited phrases, and market-specific rules. Do not represent this as a complete legal research engine.

### F-15 — Team insights (basic dashboard in Round 2; advanced insights in Round 3)

Show recurring issue types, rules that frequently trigger, common reviewer overrides, and rules that may need clarification. Do not use a “worst employee” ranking by default; contextualise patterns and protect individual privacy. Guideline-gap proposals must be evidence-based suggestions requiring brand-owner approval.

## 6.3 P2 — Future scope

- Video frame and audio/transcript review.
- Continuous live website and public social-channel scanning.
- Integrations for Google Docs, Slack, email, CMS platforms, and campaign management tools.
- Cross-language claim consistency, terminology enforcement, and translation comparison.
- Enterprise approval policies, single sign-on, advanced retention controls, and organisation-wide analytics.
- More advanced visual asset matching across large brand libraries.
- Feedback-assisted guideline refinement with explicit brand-owner review before new rules become active.

## 6.4 How the teammate's 12 suggested features fit

| Suggested feature | Priority | How it addresses the problem | Key limitation/control |
|---|---|---|---|
| Brand voice check | P0 | Checks tone, message, banned/preferred wording, and terminology. | Tone is partly subjective; every finding should name the guideline and allow review. |
| Text, PDF, DOCX, static image input | P0 with bounded image OCR | Lets teams review more than one content format. | Image input initially means OCR-backed embedded-text checks, not guaranteed visual understanding. |
| Full logo/palette/outdated-image matching | P1 | Flags supported visual inconsistencies. | Requires approved reference assets and tested visual matching. |
| Video checks | P2 | Could extend review to campaign video. | Frame sampling/transcription adds substantial scope and should not be promised in the MVP. |
| Legal and regional rules | P0 for organisation-configured rules; P1 for a maintained India rule pack | Flags configured disclaimers, required wording, and claims needing review. | Not legal advice and not a comprehensive legal reasoning engine. |
| Competitor/comparative claim checks | P0 | Flags “best”, “No. 1”, “cheapest”, or “better than X” claims requiring substantiation. | A comparison is not automatically false; ask for an approved source or reviewer decision. |
| Multilingual consistency | P2 / a narrow Round 3 stretch | Compares numbers, units, dates, and core terminology across language variants. | Language quality needs testing; start with only languages the team can validate. |
| Explainable risk classification | P0 | Prioritises content review based on severity, exposure, and configured policy. | Show the reasons; do not represent a score as a calibrated probability of truth. |
| Fact-Change Impact Radar | Round 3 improvement 1 | Finds registered content potentially affected by a changed or expired fact. | The first implementation covers Proofline-stored content, not every external site or account. |
| Live website/social scan | P2 | Could identify stale claims on public pages. | Requires crawler limits, permissions, scheduling, and source-change handling. |
| Basic dashboard | P0; advanced insights Round 3 improvement 3 | Shows real review statuses and issue counts. | Metrics must derive from stored data; no fabricated scores or rankings. |
| Learning from fixes | Feedback captured in P0; guideline suggestions in Round 3 | Helps identify false positives and unclear rules. | No silent self-learning; a brand owner approves proposed rule changes. |
| Plugins and integrations | REST API/webhooks where feasible; one lightweight integration in Round 3; broad integrations P2 | Reduces workflow switching. | Do not promise Google Docs, email, CMS, and Slack integrations simultaneously. |
| Audit report | Basic saved audit history P0; PDF export P1/Round 3 | Supports accountability and review handoff. | Export only data actually saved, with source/version details. |
| Brand DNA from a website URL | Stretch / future scope | Drafts a brand profile from public content to reduce setup work. | All extracted rules remain draft until a brand owner approves them. |

---

# 7. Finding Taxonomy and Risk Model

## 7.1 Required finding categories

| Category | Examples | Detection method | Expected handling |
|---|---|---|---|
| Fact mismatch | Wrong battery life, price, product feature, offer percentage | Exact/structured comparison plus contextual AI check | Show submitted claim and applicable approved record; request correction or reviewer decision |
| Outdated fact or offer | Offer end date has passed; specification superseded | Date/version check | Mark stale and identify the current record |
| Unsupported claim | “Best,” “cheapest,” “guaranteed,” unsubstantiated performance promise | Claim-language rules plus source retrieval | Mark evidence not found or claim unverified; ask for evidence/review |
| Terminology violation | Banned term, wrong product spelling, unapproved name | Deterministic dictionary/rule check | Show rule and suggested accepted term |
| Tone/messaging mismatch | Too casual, aggressive, or inconsistent with approved voice | AI assessment grounded in voice guidelines | Explain which guideline may be violated and offer a rewrite |
| Visual mismatch | Wrong logo, colour, old product image | Visual comparison / OCR where implemented | Show the relevant asset/rule; request confirmation if confidence is uncertain |
| Accessibility issue | Missing alt text, low measured contrast, text-only image content | Deterministic checks, OCR, AI suggestions | State measurable issue and proposed remediation; mark subjective issues for human assessment |
| Configured policy/disclaimer issue | Required qualifier missing, prohibited phrase included | Explicit organisation-configured rules | Show the configured policy and expected addition/removal |
| Source conflict | Two active records disagree | Registry consistency check | Escalate to authorised brand/fact owner; do not silently select one |
| Guideline ambiguity | Repeated reviewer disagreements or unclear rule | Pattern analysis and reviewer feedback | Recommend guideline review, not automatic policy change |

## 7.2 Severity model

Use **High, Medium, Low, and Review Required** as the primary labels. A numeric score is an optional triage aid, not a probability that the content is true or false.

- **High:** Direct conflict with an active approved fact; expired promotion; serious configured policy breach; or a high-consequence claim with unresolved evidence. This triggers priority review and may block approval according to workspace policy.
- **Medium:** A plausible brand-voice mismatch, unresolved supporting evidence, visual inconsistency, or configured disclaimer issue needing review.
- **Low:** A minor style or terminology improvement with limited apparent impact.
- **Review Required:** The model could not establish the correct answer, source records conflict, extraction is incomplete, or the finding needs specialist judgement.

### Optional transparent risk score

If a numeric score is shown, calculate it from visible policy inputs rather than the LLM's self-reported confidence. A proposed starting formula is:

`Raw score = severity points (1–5) × exposure weight (1–3) × policy-sensitivity multiplier (1.0–1.5)`

`Display score = round(100 × raw score / 22.5)`

Where:
- **Severity points** are assigned from a documented issue-category rubric.
- **Exposure weight** is configured by the organisation, for example 1 for a limited internal/organic draft, 2 for email or paid campaign, and 3 for broad paid, press, or high-reach content.
- **Policy-sensitivity multiplier** is 1.0 for ordinary content and may be 1.5 for configured regulated/high-consequence categories.
- **Evidence status** is displayed separately; missing evidence must not be disguised by a low score.

Treat score bands as configurable starting points (for example Low 0–29, Medium 30–64, High 65–100) and validate them against the golden test set. Certain configured critical conditions, such as a confirmed expired offer or direct contradiction of a key approved fact, can force High regardless of the numeric calculation. Show the score breakdown beside every result. Do not call this a calibrated probability or universal risk model.

Severity must consider the issue type, source applicability, content context, and the workspace's configured rules. The system should state what it knows and what remains uncertain.

## 7.3 Finding record schema

Every finding should contain:

- Finding ID and audit-run ID.
- Content ID and content version.
- Excerpt or location in the content.
- Category and severity.
- Short explanation.
- Evidence status: supported mismatch, unsupported/unverified, source conflict, style suggestion, or review required.
- One or more source/rule identifiers and versions when applicable.
- Suggested correction, if appropriate.
- Creator action and reviewer outcome.
- Timestamp and model/rule version metadata sufficient to reproduce the audit context.

---

# 8. Functional Requirements and User Stories

The following requirements make the proposal testable rather than aspirational.

## 8.1 Brand setup

**US-01:** As a brand administrator, I want to add approved facts and rules so content can be checked against the information our organisation has authorised.

**Acceptance tests:**
- Create a product fact with value, source, applicability, owner, and effective date.
- Mark a fact superseded and add a new version.
- Search for a fact and view its source and current status.
- Detect and display two conflicting active records for the same applicable fact.

**US-02:** As an administrator, I want to configure brand voice and terminology rules.

**Acceptance tests:**
- Add an approved term and a banned term.
- Submit content containing the banned term and confirm the audit references the configured rule.
- Update the rule and ensure future audit runs use the correct version.

## 8.2 Content audit

**US-03:** As a creator, I want to submit text or a supported document (PDF/DOCX, with bounded OCR for JPG/PNG where enabled) and receive an understandable audit.

**Acceptance tests:**
- Submit valid text and receive a saved audit run.
- Submit a readable PDF/DOCX and confirm extracted content is reviewed.
- Submit a supported image and confirm OCR text is visible for human confirmation before claim checks.
- Submit an invalid or unreadable file and confirm the user sees a clear failure status.

**US-04:** As a creator, I want each finding to show why it was flagged and what evidence was used.

**Acceptance tests:**
- Seed a known factual mismatch and confirm the output references the exact applicable registry record.
- Remove the evidence record and confirm the system says evidence was not found instead of declaring the claim false.
- Create conflicting evidence records and confirm the system marks the issue for review.

**US-05:** As a creator, I want suggested corrections that preserve the intended meaning.

**Acceptance tests:**
- A user can accept, edit, or reject a suggestion.
- The source version is preserved.
- The revised version can be rescanned and compared with the previous audit.

## 8.3 Review and accountability

**US-06:** As an authorised reviewer, I want to approve or request changes with a recorded reason.

**Acceptance tests:**
- An authorised reviewer can approve or request changes.
- An unauthorised creator cannot perform the same final approval action where the policy separates responsibilities.
- Decisions include actor, timestamp, revision ID, and optional comments.

**US-07:** As a manager, I want to view open findings and review states so I can prioritise work.

**Acceptance tests:**
- The dashboard derives counts from stored audit records.
- High-priority items are filterable.
- Users cannot see another organisation's entries.

## 8.4 Fact changes and insights

**US-08:** As a fact owner, I want a change to an approved fact to identify stored content that may now be outdated.

**Acceptance tests:**
- Update a fact and identify registered content/audit records associated with the previous version.
- Mark affected content as needing revalidation.
- Preserve the old and new fact versions.

**US-09:** As a brand manager, I want recurring issue insights so I can improve guidelines or training.

**Acceptance tests:**
- Aggregate issue categories from real audit findings.
- Identify rules that repeatedly trigger or attract reviewer overrides.
- Show sample size and time period; do not claim a trend from insufficient data.

---

# 9. Technical Approach and Architecture

## 9.1 Recommended stack

The exact stack should be confirmed against the team's skills, current availability, event rules, and cost limits. The following is a proposed practical stack, not a requirement imposed by the organiser.

| Layer | Recommended option | Responsibility |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS | Brand setup, upload/editor, finding list, review queue, version comparison, dashboard |
| Backend API | Python + FastAPI | Access checks, ingestion, audit orchestration, source retrieval, model calls, approval workflow |
| Database | Cloudflare D1 (SQLite) behind a repository adapter | Workspaces, memberships, facts, rules, assets, content versions, findings, audits, decisions |
| Authentication | Cloudflare Access at the edge plus Worker-side membership lookup | Sign-in boundary, organisation selection, role/session mapping; the Worker must validate identity and never trust a client-supplied organisation ID |
| File storage | Cloudflare R2 with private bindings | Brand documents, uploaded content, and approved assets; store object keys and hashes in D1, not file contents in ordinary logs |
| AI layer | A configurable LLM API accessible to the team | Contextual tone, messaging, claim analysis, and correction suggestions |
| Deterministic rule engine | Python validation/rule functions | Exact terms, dates, numeric comparisons, mandatory disclaimers, schema checks |
| Document extraction | Python PDF text-extraction library | Extract content from supported PDFs; report extraction quality/failure |
| Optional vision/OCR | A tested OCR/vision component | Text embedded in supported images and limited visual checks |
| Async processing | Cloudflare Queues with an idempotent Worker consumer | Audit, re-check, expiry, and impact jobs with explicit pending/failed/review-required states |
| Deployment | Cloudflare Pages for the static Next.js export plus Cloudflare Python Workers for the FastAPI API | Reproducible frontend/API deployment, environment bindings, and smoke-tested demonstration endpoints |

Keep the AI provider behind a small server-side interface so the team can change providers if access or cost becomes a problem. Workers AI may be evaluated for contextual assistance, but it remains optional until its model, limits, retention, and output behavior are verified. Never place provider secrets in frontend code.

## 9.2 High-level architecture

The architecture should be drawn left-to-right in the PPT and implemented as a thin end-to-end slice rather than a collection of disconnected services.

1. **Web client:** Cloudflare Pages serves the static Next.js client; an authenticated user submits content and reviews findings.
2. **Edge/API and permission layer:** Cloudflare Access protects the Worker entrypoint; the Worker validates the Access identity, resolves D1 membership, and checks file limits and allowed actions.
3. **Ingestion layer:** Extracts text, records file metadata, and detects extraction errors.
4. **Brand registry retrieval:** Retrieves applicable current facts, rules, and assets based on brand, product, market, content type, and effective dates.
5. **Rule engine:** Runs exact checks and structured comparisons where deterministic outcomes are possible.
6. **AI audit service:** Receives the relevant content excerpt and retrieved evidence; returns structured potential findings and correction suggestions.
7. **Validation layer:** Checks the response schema, verifies cited registry IDs, deduplicates findings where possible, and marks uncertainty or failure.
8. **Persistence layer:** D1 saves content versions, audit runs, findings, source/rule versions, review decisions, and model/service metadata needed for traceability. R2 stores private source/upload objects.
9. **Async work layer:** Queues carries audit, re-check, expiry, and impact jobs; consumers are idempotent and preserve failed/review-required states.
10. **Review service:** Enforces approval permissions, writes comments and decisions, and creates new content revisions.
11. **Claim–Fact Ledger service:** Persists extracted claim spans and links them to the exact approved fact/rule versions used during review.
12. **Analytics service:** Aggregates saved records into workflow and recurring-issue summaries.

## 9.3 Audit pipeline in detail

**A. Prepare content:** Validate file type and size; extract text; preserve the original; flag low-quality extraction.

**B. Retrieve relevant knowledge:** Retrieve only brand records relevant to the workspace, product, market, language, and validity window. Prefer exact or structured matching for product specifications and offer dates. Use semantic search only when useful and feasible.

**C. Run deterministic rules:** Check known terminology, explicit number/value conflicts, promotion expiry, required qualifiers, and other configured rules.

**D. Run contextual AI checks:** Ask the model to identify candidate claims, tone/messaging mismatches, and possible conflicts with the retrieved approved sources. Require structured output with evidence IDs and uncertainty labels.

**E. Validate results:** Reject malformed output; ensure each evidence ID exists and belongs to the current brand workspace; prevent the model from inventing sources; convert missing evidence into an unverified state.

**F. Display findings:** Render each issue with the relevant excerpt, reason, source, severity, suggested fix, and review state.

**G. Capture human feedback:** Store accept/reject/override actions. Use feedback for analysis; do not silently convert it into authoritative policy.

## 9.4 Data model (conceptual)

| Entity/table | Important fields | Purpose |
|---|---|---|
| organisations | id, name, settings, created_at | Tenant/workspace boundary |
| users / memberships | user_id, organisation_id, role, status | Access and role permissions |
| brand_records | id, organisation_id, record_type, key, value, unit, product/market/channel/language scope, status, owner_id | Current approved facts and rules |
| brand_record_versions | record_id, version, source_id, effective_from, effective_to, approval_status, created_by | Historical source and validity window for each approved record |
| claim_fact_links | claim_id, fact_record_id, fact_version, link_status, evidence_excerpt | Claim–Fact Ledger relationship; supports audit explainability and later change impact |
| sources | id, organisation_id, file_id or URI, title, source_type, source_version | Where approved information comes from |
| brand_assets | id, organisation_id, asset_type, file_id, approved_version, guidance | Approved logos, images, colours, and reusable assets |
| content_items | id, organisation_id, owner_id, title, content_type, workflow_status | Logical content item |
| content_versions | id, content_item_id, version_number, text/extracted_text, file_id, created_by | Submitted and revised content |
| audit_runs | id, content_version_id, status, started_at, completed_at, ruleset/model metadata | One audit execution |
| findings | id, audit_run_id, category, severity, excerpt, explanation, evidence_status, evidence_ids, suggestion, verification_method | Results presented to users |
| review_comments | id, content_version_id, author_id, anchor/span, body, created_at | Comments attached to a version or excerpt |
| suggested_rule_updates | id, organisation_id, rule_id, proposal, evidence_summary, status, approved_by | Owner-reviewed guidance changes; never auto-activate |
| review_decisions | id, content_version_id, reviewer_id, decision, comment, created_at | Approval/request-change trail |
| audit_events | id, organisation_id, actor_id, event_type, object_id, timestamp, metadata | Traceability for sensitive actions |

This is a conceptual model. The implementation can simplify or combine entities, but must preserve tenant isolation, source/version traceability, and the link from each finding to the audited content version.

## 9.5 Suggested API surface

Initial endpoints may include:

- `POST /organisations` — create a workspace if the authentication model allows it.
- `GET /brand-records` and `POST /brand-records` — list and create approved knowledge records.
- `PATCH /brand-records/{id}` — update or version a record with permission checks.
- `POST /content` — create a content item/version from text or supported upload.
- `POST /content/{id}/audit` — run an audit on the selected version.
- `GET /audits/{id}` — retrieve audit status and findings.
- `POST /content/{id}/versions` — create a revised version.
- `POST /content-versions/{id}/review` — submit, approve, or request changes according to role policy.
- `GET /dashboard/summary` — return permitted aggregate insights.

These are implementation suggestions, not APIs provided by the organiser. Endpoint names and request formats may change during development.

## 9.6 Technology and service disclosure

The Round 2/3 submission should document the actual AI model/provider, API use, data sources, OCR/PDF libraries, frontend/backend libraries, database and hosting services, and any pre-existing templates or code. The team must disclose significant AI assistance and reused material as required by the event rules. Do not list a tool in the final submission unless it was actually used.

---

# 10. Privacy, Security, Accessibility, and Responsible AI

## 10.1 Data protection requirements

- Keep uploaded brand documents, approved sources, and content files private by default.
- Enforce organisation-level isolation in backend permission checks and database policies.
- Keep AI provider keys and other secrets only on the server or in a secret manager.
- Do not send unrelated brand records to the model; retrieve only the minimum relevant context.
- Clearly disclose when content or files are sent to an external AI/OCR provider and what that means for confidentiality.
- Define retention and deletion behaviour for uploads, audit records, and account data.
- Log sensitive changes and approval actions without storing unnecessary sensitive content in logs.
- Validate uploads and guard against malicious file content, oversized files, and parser failures.
- Avoid claiming a specific compliance certification unless the product has actually met and verified that standard.

## 10.2 Responsible AI rules

- Explain each substantive finding with evidence, a named rule, or an explicit “evidence not found” status.
- Treat model output as a candidate finding until validated.
- Do not invent sources, citations, product specifications, or policy text.
- Distinguish fact contradiction from absence of evidence and subjective style guidance.
- Allow users to reject corrections and allow authorised reviewers to override findings with a recorded reason.
- Avoid automatic changes to approved brand rules based solely on model suggestions or user edits.
- Report when extraction, source retrieval, or model output is incomplete.
- Test for false positives as well as missed issues.

## 10.3 Accessibility

- Design keyboard-accessible forms, buttons, and review controls.
- Use readable contrast, visible focus states, and meaningful labels.
- Ensure audit results do not rely on colour alone to communicate severity.
- For supported images, identify missing or weak alternative text and suggest improvements.
- Treat accessibility checks as a mixture of measurable rules and human-assessed guidance; do not present every suggestion as a definitive failure.

---

# 11. Development Plan Across All Three Rounds

The organiser's exact build-window dates and deliverable instructions take precedence. The timeline below describes milestones rather than claiming that development has already occurred.

## 11.1 Round 1 — The Plan

**Objective:** Demonstrate deep problem understanding, an original but feasible product concept, a credible technical path, responsible design, and clear team ownership.

**Activities:**
- Validate the problem using genuine user conversations where possible.
- Define the MVP and clearly mark future scope.
- Finalise workflow, architecture, data model, core requirements, and acceptance criteria.
- Choose a feasible stack based on actual team skills and tool access.
- Assign owners and define the proposed three improvements.
- Prepare the proposal PDF and verify all team/submission details.

**Deliverable:** A complete plan with no fabricated evidence or claims of already-built features.

## 11.2 Round 2 — The Build

**Objective:** Deliver a functional product or demonstrable MVP with an end-to-end workflow.

**Recommended sequence:**
1. Repository, environment, database, authentication, and workspace permission skeleton.
2. Brand Truth Registry and fact/rule CRUD with versioning and status.
3. Text input plus PDF/DOCX extraction with visible error handling; add bounded image OCR if the build window and team skills permit.
4. Deterministic rules and source retrieval.
5. AI audit with structured output validation and evidence-linked findings.
6. Finding presentation and editable suggested corrections.
7. Re-scan, version comparison, and review/approval actions.
8. Basic dashboard, representative test fixtures, and deployed demo.
9. Documentation of actual service/API/model use and team contributions.

**Round 2 exit criteria:** A judge can create or select a brand, register an approved fact and source, submit supported content, see a finding with a valid evidence reference (or a clear unverified state), apply/edit a correction, re-run the audit, and complete a human review with the selected content version and decision saved. Round 2 should also show the baseline foundations for each named improvement: a claim-to-fact link that supports impact tracking, explicit evidence-or-abstain states, and a basic dashboard built from actual finding/reviewer data. Round 3 strengthens and completes these improvements. The demo must show only inputs and checks that are actually implemented.

**Important:** Build only during the official build window and comply with the organisers' restrictions on pre-existing code and templates.

## 11.3 Round 3 — The Finish

**Objective:** Improve reliability, usability, test coverage, documentation, privacy explanation, and delivery of the three improvements promised in Round 1.

**Priorities:**
- Deliver the Fact-Change Impact Radar for registered content (Improvement 1).
- Deliver the Evidence-or-Abstain reliability layer and report test results (Improvement 2).
- Deliver Governance Insights and the Guideline-Gap Detector with owner-approved rule changes (Improvement 3).
- Improve source conflict handling, version comparison, audit reproducibility, accessibility, and security.
- Add deeper visual checks only if they do not compromise the end-to-end workflow.
- Conduct structured tests with realistic content and gather feedback where possible.
- Address false positives, malformed input, API errors, permissions, and extraction failures.
- Prepare the live demo/video, final report, known limitations, and future roadmap.

## 11.4 Three improvements to name explicitly in Round 1

These three improvements are the clearest commitments to carry consistently through the Round 1 plan, Round 2 progress report, and Round 3 finish. Revision history and evidence-linked findings remain part of the MVP foundation; the improvements below deepen their reliability and organisational value.

### Improvement 1 — Fact-Change Impact Radar

**Round 2 baseline:** Store claim-to-fact links and fact versions, and demonstrate a simple revalidation flag for a known changed fact if the core workflow is stable. **Round 3 completion:** Expand this into an impact queue with old/new values, affected registered content, and one-click re-audit.

**Problem solved:** A fact can change after content was drafted or reviewed. A price, product specification, discount, or offer end date may no longer be current, while old content remains in the system.

**Planned behaviour:** When an approved fact changes or expires, Proofline uses Claim–Fact Ledger links and stored content/audit records to list drafts and reviewed items that may refer to the older fact version. The item is marked **Re-review required** and displays the old value, new value, affected claim, source versions, and next action.

**Demo proof:** Change the registered battery-life fact from 10 to 12 hours or expire a sample discount. Show the stored content linked to the previous fact being flagged within the system and made available for re-audit.

**Boundary:** This improvement initially scans Proofline's own registered content. It does not imply automatic discovery of all live content on external websites or social media.

### Improvement 2 — Evidence-or-Abstain Reliability Layer

**Round 2 baseline:** Validate source IDs, distinguish unsupported from contradicted claims, and show “Needs human review” for missing or conflicting evidence. **Round 3 completion:** Add a verifier pass for high-severity findings, broader edge-case coverage, and published test-set results by issue type.

**Problem solved:** AI can produce confident but unsupported findings or corrections. A verification product loses trust if it invents a source or treats missing evidence as proof of falsity.

**Planned behaviour:** Validate structured AI output, verify every cited fact/rule ID and version, run a second check on high-severity findings, handle source conflicts, and abstain from a hard factual conclusion when the evidence is missing, stale, or ambiguous. The user sees **Unverified** or **Needs human review**, not a fabricated verdict.

**Demo proof:** Use a test claim with a matching approved fact, a contradictory claim, and a claim with no supporting record. Show distinct supported/contradicted/unverified states and report test-corpus results by issue type.

**Proposed evaluation target (not an achieved result):** Aim for at least 90% precision on deterministic numeric/date checks in the labelled test set, while reporting recall and false positives as well. Every hard-error finding should reference a valid applicable source/rule. Revise targets if the test design reveals a more appropriate baseline.

### Improvement 3 — Governance Insights and Guideline-Gap Detector

**Round 2 baseline:** Save finding and reviewer-action data and display basic issue counts/statuses. **Round 3 completion:** Identify recurring issues and potentially ambiguous rules, show the supporting counts, and propose owner-reviewed wording improvements.

**Problem solved:** Repeated mistakes can indicate training gaps or ambiguous brand guidelines. Simply correcting each draft does not solve the underlying cause.

**Planned behaviour:** Aggregate saved findings and reviewer actions to identify recurring issue categories, facts close to expiry, rules with frequent overrides/disputes, and common rejected suggestions. Propose clearer rule wording and show the observations behind each proposal. An authorised brand owner must approve changes before they become active.

**Demo proof:** Process a labelled batch of test content. Show the top repeated issue categories and two example rules proposed for clarification, with counts and an explanation of the pattern. Do not claim statistical significance from a small synthetic batch.

### What remains part of the MVP foundation

- Source-of-Truth Vault and Claim–Fact Ledger.
- Evidence-linked finding cards and intent-preserving corrections.
- Versioned content and re-scan comparisons.
- Human review roles, comments, approval/request-change flow, and audit history.
- Basic real-data dashboard, privacy/AI-transparency panel, and multi-format intake.

These foundational capabilities are not optional add-ons; they make the three improvements possible.
---

# 12. Team Responsibilities

Fill in the actual names and adjust the roles to match the team's size and real skills. Do not assign fictional people or claim work that a member did not do.

| Workstream | Accountable role | Responsibilities | Evidence of contribution |
|---|---|---|---|
| Product and research | Team leader / product owner — **[Name]** | Problem validation, requirements, prioritisation, coordination, final submission | Research notes, scope decisions, PRD and presentation ownership |
| Frontend and UX | Frontend engineer — **[Name]** | Brand setup, audit results, editor, review queue, responsive usability | UI components, pull requests, usability fixes |
| Backend and data | Backend engineer — **[Name]** | API, schema, auth, permission policies, file handling, versions | API code, schema migrations, tests |
| AI and rules | AI/ML engineer — **[Name]** | Source retrieval, deterministic checks, LLM prompts/schema, evidence validation | Audit pipeline, test cases, evaluation notes |
| QA and deployment | QA/integration owner — **[Name]** | End-to-end testing, error paths, deployment, documentation and demo readiness | Test evidence, deployment configuration, bug reports |

If there are fewer members, combine responsibilities transparently. Each team member should understand the whole product well enough to explain their own contribution and the main workflow.

---

# 13. Validation Plan and Success Metrics

The project should measure outcomes instead of claiming success before testing. The following are **proposed tests and acceptance targets**, not achieved results.

## 13.1 Test corpus

Create a labelled set of sample brand records and content drafts containing known cases:

1. Correct approved product specification.
2. Deliberately incorrect numeric claim.
3. Expired promotion.
4. Unsupported “best/cheapest/guaranteed” claim.
5. Banned terminology or voice mismatch.
6. Missing configured disclaimer.
7. Two conflicting approved source records.
8. Claim with no available approved evidence.
9. A correction that resolves one finding but leaves another unresolved.
10. An unreadable PDF or invalid upload.
11. A user with no permission attempting to approve content.
12. An approved fact updated after earlier content was audited.

Use enough cases to expose failure modes; record the data and test method. Do not create fake user feedback.

## 13.2 Metrics

| Metric | What it measures | How to evaluate |
|---|---|---|
| Seeded deterministic rule detection | Whether known explicit rules are caught | Run a controlled suite of deterministic cases and measure detected versus seeded violations |
| Evidence linkage validity | Whether findings reference real applicable registry records | Validate every evidence ID and check relevant version/applicability |
| False-positive rate | How often valid content is incorrectly flagged | Include compliant examples and review all flags in the labelled set |
| False-negative rate / recall | How often seeded issues are missed | Compare audit findings with manually labelled issues |
| End-to-end completion | Whether the core user journey works | Time a tester completing submit → audit → fix → rescan → review |
| Permission enforcement | Whether unauthorised access or approvals are prevented | Run cross-workspace and unauthorised-action tests |
| Revision traceability | Whether reviewers can identify which version was audited and approved | Confirm content, source/rule versions, findings, and decision are connected |
| Review efficiency | Whether audit assistance reduces manual effort | Compare time for a defined set of tasks with and without Proofline, using the same procedure |
| User comprehension | Whether people understand flags and suggested actions | Ask testers to explain why a flag appeared and what they would do next |

## 13.3 Proposed initial acceptance gates

- Every seeded deterministic test case has a documented expected result; any failure is recorded and addressed or disclosed.
- Every evidence-backed finding references a valid registry record and the applicable version.
- A missing evidence source is not labelled as a proven false claim.
- The full core workflow runs from submission through saved approval without manual database edits.
- Unauthorised users cannot read another organisation's content or perform protected approval actions.
- Audit failures and extraction failures are visible to the user.
- The demo dataset is clearly labelled as test data; it is not presented as customer research.

The team may add quantitative targets after the baseline test results are known. Avoid claiming a universal accuracy rate from a small demo corpus.

---

# 14. Risks and Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Scope creep | Too many features may leave no complete workflow. | Prioritise P0; treat video, live scans, plugins, and multilingual analysis as future scope. |
| Unsupported AI findings | The model may confidently infer a fact that has no approved evidence. | Retrieval-grounded prompts, structured output, evidence-ID validation, explicit uncertainty labels, human review. |
| Stale or conflicting registry data | A correct audit is impossible if the approved source is wrong or ambiguous. | Owner, version, source, applicability, validity dates, conflict status, and review process for updates. |
| False positives | Users may lose trust if harmless content is repeatedly flagged. | Severity criteria, user feedback, false-positive testing, overrides with reasons. |
| Missed violations | A clean-looking audit may miss an important problem. | Measure recall on labelled test cases; describe limitations; require human approval for high-consequence content. |
| PDF extraction failures | Incorrect extraction creates unreliable checks. | Show extraction status, support manual text paste, test scanned/complex PDFs, and fail visibly. |
| Privacy leak across organisations | Brand documents and drafts may be confidential. | Backend checks, database isolation policies, private file storage, least privilege, access tests. |
| External API confidentiality | Uploaded information may be sent to a third-party model. | Disclose services, minimise context sent, configure retention where available, and avoid sensitive test data. |
| Unavailable/expensive model API | The demo may fail due to quotas or cost. | Verify access early, use an abstraction layer, set timeouts/retries, keep deterministic checks functional without AI. |
| Legal overclaim | Users could misread a flag as a legal determination. | Call rules “configured policy checks,” flag uncertainty, and explicitly state the product does not replace legal review. |
| Misleading analytics | Raw counts may unfairly compare teams with different volumes. | Show time period and sample size; prefer patterns and rates over individual blame. |
| Build-window violation | Pre-built functionality may breach event rules. | Limit pre-event work to allowed planning/research; track commits and disclose reused templates/components. |
| Weak evidence of user need | The presentation may appear speculative. | Conduct genuine interviews or clearly state assumptions and a plan to test them. |

---

# 15. Expected Impact

Proofline is expected to help organisations catch potential content problems earlier in the workflow, reduce avoidable review cycles, improve the consistency of approved messages, and preserve accountability for content decisions. Those benefits are hypotheses to validate, not measured achievements at the planning stage.

## 15.1 Expected user-level impact

- Creators receive actionable feedback before requesting final approval.
- Reviewers see the evidence and source versions behind important flags.
- Brand administrators can update structured approved facts and identify stored content that may be stale.
- Managers gain visibility into recurring issue categories and unclear rules.
- Organisations retain a traceable history of reviewed versions and decisions.

## 15.2 How to demonstrate impact in the hackathon

Use a realistic small scenario with an explicit before-and-after comparison:

- Start with an approved product fact and offer expiry.
- Submit a draft with one wrong numerical claim, one expired offer, and one tone violation.
- Show the evidence-linked findings and suggested corrections.
- Revise the content and rerun the audit.
- Approve the corrected version with a reviewer account.
- Change the approved fact and show the previously audited content being marked for revalidation.
- Show that the database records the sources, revisions, findings, and decision.

This demonstration will provide stronger evidence of value than a dashboard with artificial percentages.

---

# 16. Future Roadmap

The following capabilities extend the core product after the initial workflow is reliable.

## Near-term extensions

- Static image audit for approved logo, colour, and embedded-text checks.
- Improved accessibility checks for alternative text, contrast, and reading clarity.
- Fact expiry/change notifications for stored content.
- More configurable rules for product claims, disclaimers, market, and campaign types.
- Better analytics for repeated issues and guideline ambiguity.

## Longer-term extensions

- Video and audio/transcript auditing.
- Live website and public-page scanning, where permitted and technically reliable.
- Google Docs, Slack, email, CMS, and campaign-platform integrations.
- Multi-language terminology and claim consistency checks.
- Enterprise role policies, single sign-on, retention configuration, and larger brand asset libraries.
- Feedback-assisted guideline recommendations with human owner approval.

## Future-scope guardrail

A website-URL onboarding assistant inspired by brand-DNA tools may be explored later. It can extract a *draft* tone profile, colours, publicly visible assets, and terminology from an organisation's own public website, but it must never make scraped inferences authoritative automatically. An authorised brand owner must review, edit, and approve every proposed rule/fact before it enters the Source-of-Truth Vault.

Do not claim these integrations or capabilities are available until they are built, tested, and documented. A credible roadmap names what comes later and explains why it is not required to prove the MVP.

---

# 17. Judging Criteria Alignment

The organiser states that Round 1 is scored out of 100 points across five categories. This plan should explicitly address all five.

| Official criterion | Points | What this PRD/presentation should prove |
|---|---:|---|
| Understanding of the problem statement | 25 | Describe the multi-creator governance problem, give concrete failure modes, identify target users, and provide genuine evidence or honestly labelled assumptions. |
| Proposed solution | 25 | Present the Brand Truth Registry, evidence-linked audit, correction workflow, human approval, revision history, and fact-change impact as one coherent solution. |
| Technical plan | 20 | Explain architecture, data model, deterministic versus AI checks, source retrieval, output validation, privacy, and testing. |
| Originality of approach | 15 | Emphasise source versioning, evidence-linked findings, uncertainty handling, and fact-change impact rather than generic content generation. |
| Feasibility and scope | 15 | Commit to a small complete workflow, define P0/P1/P2 boundaries, assign owners, and give realistic milestones. |

## Competitive positioning

The goal is not to claim that no other product performs brand governance. Established products already provide portions of brand validation, scoring, accessibility checks, and approval workflows. Proofline should differentiate by its focused product logic and audience rather than by making absolute claims about competitors.

| Reference/tool category | Publicly described focus | Proofline's intended focus | Positioning caveat |
|---|---|---|---|
| Google Pomelli | Google describes Pomelli as a tool that builds a Business DNA/brand identity and creates tailored, on-brand marketing content and assets. Google has continued expanding brand-book and website capabilities. | Be the verification and governance step for content produced by Pomelli or any human/AI tool: source-linked claims, version-aware facts, review history, and revalidation when facts change. | Say “complementary focus,” not “Pomelli cannot verify content.” Cite [Google's Pomelli introduction](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/) and [May 2026 product update](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-agentic-capabilities/). |
| Adobe GenStudio for Performance Marketing | Adobe publicly describes brand guidelines, compliance/validation, content scoring, accessibility support, and review/approval workflows. | Target a leaner, product-neutral governance layer with claim-to-fact lineage, effective/expiry windows, explicit abstention, and a fact-change impact workflow. | This is a substantial adjacent competitor. Do not claim feature superiority without hands-on comparison. See [Adobe brand compliance](https://business.adobe.com/products/genstudio-for-performance-marketing/brand-compliance.html) and [brand-validation documentation](https://experienceleague.adobe.com/en/docs/genstudio-for-performance-marketing/user-guide/guidelines/brand-validation). |
| Content-governance and writing-assistant tools | Some products focus on style, terminology, tone, content quality, or enterprise policy controls. | Emphasise temporal fact verification, claim/fact source mapping, and the review lifecycle around the audited version. | Verify each named vendor's current feature set and packaging before using a detailed comparison in the submission. |
| General-purpose LLMs and content generators | Help create or rewrite content quickly. | Add an organisation-controlled source of truth, rule-based exact checks, explainable evidence, workflow permissions, and durable audit history around content. | LLMs can also be configured with sources and tools; the differentiation is the integrated product workflow, not a claim that a general LLM is incapable of checking facts. |

**Positioning statement:** “Pomelli and other tools can help create on-brand content. Proofline is designed to verify that content against approved, versioned company knowledge and route unresolved issues through accountable review.”

**Five focus areas to communicate:** (1) claim-level verification linked to approved facts, (2) fact expiry/change impact, (3) evidence-or-abstain handling, (4) guideline-gap insights, and (5) lightweight review workflows with transparent privacy and AI disclosures.

This competitive description is based on the linked public product descriptions reviewed for this consolidated edition. Re-check them before presenting because product capabilities and availability change. The claimed differentiation is a design hypothesis to validate—not proof that competitors lack similar functionality.

---

# 18. Slide-Ready Content Outline

Use this section as the source material for a clean presentation. Each slide should make one main argument, show no more detail than the audience can absorb, and use the PRD for speaker notes or backup detail. A 14–16 slide deck is reasonable if the organiser has not set a maximum.

## Slide 1 — Product and promise

**Headline:** Proofline — Verify Before You Publish  
**Key message:** Proofline is an evidence-backed brand-governance layer between content creation and publication.  
**Include:** Product name, one-line pitch, team name, member names.  
**Visual:** Content draft → Proofline audit → approved content.

## Slide 2 — The problem / Verification Gap

**Headline:** Content production scaled faster than content verification.  
**Key message:** Employees, agencies, and AI tools can introduce incorrect claims, expired offers, inconsistent language, off-brand visuals, accessibility issues, and missing qualifiers.  
**Include:** Battery-life and expired-offer examples; make the failure concrete before showing the product.

## Slide 3 — Evidence the problem is real

**Headline:** AI is widely used, but verification remains a major part of the workflow.  
**Include:** Two or three properly sourced secondary findings from Section 2.5, with dates and sample sizes. Add an India-specific ASCI finding only after confirming the wording against the source report.  
**Caveat:** Survey findings are sample-specific; team interview/survey results must be genuine.

## Slide 4 — Users and organisational setting

**Headline:** The people creating content and the people accountable for it need one shared workflow.  
**Include:** Creator, manager, authorised reviewer, brand owner/fact owner, and scoped agency user. Show their main needs and the organisational setting you intend to validate.

## Slide 5 — Proposed solution

**Headline:** Check against approved brand knowledge before content reaches customers.  
**Include:** One workflow: configure brand → submit content → extract claims → audit → explain/fix → re-scan → human review → audit history.

## Slide 6 — The differentiator: Brand Truth Registry + Claim–Fact Ledger

**Headline:** From static guidelines to versioned, traceable brand knowledge.  
**Include:** Approved fact, source/version, product/market scope, owner, validity window, claim-to-fact link.  
**Example:** Approved battery specification versus the 20-hour claim.

## Slide 7 — Evidence-backed finding example

**Headline:** Every important flag must show the source and reason.  
**Include:** Flagged excerpt, finding category, approved value/source, explanation, status, correction.  
**Callout:** “Unverified” is not the same as “false.”

## Slide 8 — Correction and human approval

**Headline:** Fix the content without removing human accountability.  
**Include:** Accept/edit/reject suggestions, revision comparison, reviewer comments, authorised approval, decision history, and no auto-publication.

## Slide 9 — Features and scope

**Headline:** A focused MVP with a credible expansion path.  
**Include:** Round 2 P0 capabilities, three named improvements, and future scope. Explicitly defer video, live website scans, and broad integrations.

## Slide 10 — Architecture and technology

**Headline:** Deterministic rules for exact checks; source-grounded AI for context; humans for final decisions.  
**Include:** Frontend, API, ingestion/OCR, registry retrieval, rule engine, AI audit, output validation, database, review service, and dashboard.

## Slide 11 — Reliability and risk handling

**Headline:** Proofline can abstain when evidence is insufficient.  
**Include:** Supported / contradicted / outdated / unverified / needs human; source-ID validation; transparent severity and risk score; test corpus and proposed metrics.

## Slide 12 — Privacy and responsible AI

**Headline:** Confidential information and accountable decisions are product requirements.  
**Include:** Tenant isolation, private files, server-side secrets, external AI disclosure, no automatic policy changes, uncertainty handling, and accessibility limitations.

## Slide 13 — Three-round roadmap and named improvements

**Headline:** Plan the workflow, build the core, then strengthen impact and reliability.  
**Round 1:** Plan and validate.  
**Round 2:** Complete workflow plus baseline support for the three improvements.  
**Round 3:** Complete Fact-Change Impact Radar, Evidence-or-Abstain, and Governance Insights/Guideline-Gap Detector.

## Slide 14 — Team roles

**Headline:** Clear ownership for each part of the workflow.  
**Include:** Actual member names, real responsibilities, and how the roles combine if the team is small.

## Slide 15 — Validation and expected impact

**Headline:** Measure whether Proofline catches known issues and improves review.  
**Include:** Test corpus, detection/false-positive/evidence metrics, end-to-end workflow completion, permission tests, and usability observations. Mark targets as proposed until measured.

## Slide 16 — Future scope and close

**Headline:** Start with evidence-backed pre-publication review; expand as reliability is proven.  
**Include:** Static visual matching, more languages, video, live web scans, CMS/plugins, enterprise controls.  
**Closing line:** Proofline helps teams make brand review evidence-based, explainable, and accountable.

If the deck must be shortened, combine slides 3 and 4, slides 7 and 8, and slides 11 and 12. Keep team details, technology, development plan, and source-backed problem evidence represented somewhere in the PDF.
---

# 19. Suggested Demo Script for Later Rounds

This script is for the build demonstration when the product exists; it is not a claim that these features are already working.

**0:00–0:20 — Set context**  
“An organisation has approved product information, but different people create content. Proofline checks the draft against the approved source before publication.”

**0:20–0:45 — Show the registry**  
Open a brand record for a laptop's battery life or an offer's validity. Show the approved value, evidence source, applicable product/market, and version.

**0:45–1:15 — Submit an incorrect draft**  
Upload or paste content containing a deliberate mismatch and an unsupported claim. Start the audit.

**1:15–1:45 — Explain the findings**  
Show the flagged excerpt, the approved fact or missing evidence, the issue category, and the suggested correction. Explain the difference between a verified mismatch and unverified claim.

**1:45–2:10 — Correct and rescan**  
Accept or edit a suggested correction, create a new version, and show which issue was resolved and which remains.

**2:10–2:35 — Human review**  
Switch to an authorised reviewer, request changes or approve the revised version, and show the saved decision.

**2:35–3:00 — Fact-change impact**  
Update a registry record and show stored content associated with the older version being flagged for revalidation.

**3:00–3:15 — Close**  
“Proofline does not replace the creator or the reviewer. It makes the evidence visible, the corrections actionable, and the final decision traceable.”

Adapt the script to the features that are actually implemented and tested by the relevant round. Do not demonstrate mock states as if they came from working product logic.

---

# 20. Submission Readiness Checklist

## Product plan

- [ ] Problem definition clearly reflects the organiser's statement.
- [ ] Target users and organisational context are identified.
- [ ] Genuine evidence is included, or assumptions are explicitly labelled and a validation plan is supplied.
- [ ] Proposed solution and end-to-end workflow are clear.
- [ ] MVP, later enhancements, and future scope are separated.
- [ ] Technology stack, integrations, data sources, and architecture are described.
- [ ] Privacy, security, accessibility, and human oversight are addressed.
- [ ] Three named improvements are explicit and measurable.
- [ ] Each team member has a real role and contribution.
- [ ] Expected impact is framed as intended/proposed until measured.

## PDF submission operations

- [ ] Team name is correct.
- [ ] Names of all members are correct.
- [ ] Team leader's email ID is correct.
- [ ] PDF opens and is readable on another device.
- [ ] Google Drive access is set to “Anyone with the link — Viewer,” as required in the organiser message.
- [ ] Link is tested in an incognito/private browser window.
- [ ] Only the team leader submits once for the team, following the organiser instructions.
- [ ] Submission is complete before the official deadline or any officially announced extension.

## Integrity and compliance

- [ ] No fabricated interviews, numbers, user feedback, or product results.
- [ ] Reused templates, external services, and significant AI assistance are disclosed as required.
- [ ] No claim is made that future features are already built.
- [ ] The plan respects the rule that meaningful product development must happen during the official build window.
- [ ] Every team member can explain the problem, workflow, architecture, and their own role.

---

# 21. Glossary

**Approved source:** A document, record, or asset that the organisation has authorised as a basis for content review.

**Brand governance:** The policies, sources, checks, roles, and approval practices used to keep brand-related content accurate and consistent.

**Brand Truth Registry:** Proofline's proposed structured collection of approved facts, terms, promotions, sources, versions, validity periods, and assets.

**Evidence-linked finding:** An audit result tied to an applicable approved source or rule, or explicitly marked when evidence is missing or conflicting.

**Human-in-the-loop review:** A workflow where AI provides assistance but authorised people retain control over important decisions.

**MVP:** Minimum viable product — the smallest complete product that demonstrates the core user journey reliably.

**Source conflict:** A situation where two apparently applicable approved sources disagree and require an authorised owner to resolve the discrepancy.

**Revision-aware audit:** An audit process that records which version of content was checked and allows findings to be compared across revisions.

**Tenant isolation:** Ensuring one organisation cannot read or modify another organisation's data.

**Unverified claim:** A claim for which the configured approved sources do not provide adequate evidence. This does not necessarily mean the claim is false.

---

# 22. Final Product Definition

**Proofline is an AI-assisted brand-governance platform that checks content against versioned, approved brand knowledge before publication. It combines explicit rules with source-grounded AI, records claim-to-source relationships in a Claim–Fact Ledger, explains potential issues using evidence, suggests corrections that preserve creator intent, and routes content through a human approval process with revision and decision history. When approved facts change, it can identify registered content that may need revalidation. Its governance insights help organisations address recurring mistakes and clarify their own guidelines. Its purpose is to make brand review more consistent, transparent, and accountable—not to claim that AI can guarantee truth or replace authorised reviewers.**

This definition should remain consistent across the PRD, presentation, team pitch, and later product demonstration.


---

# 23. Source Notes and External References

This section records external references used to inform the problem context and proposed checks. Links should be opened and rechecked before the final submission. Statistics are secondary-source findings, often survey-based, and should be presented with their sample, date, and limitations. The team must not claim that it conducted these studies.

1. **Organiser-provided problem statement — Inkloom AI.** Primary source for the hackathon's product expectations, judging rubric, and general rules. Use the supplied `Problem_statement.md` as the authoritative event brief.
2. **NP Digital, *AI Hallucinations and Accuracy Report*, 4 February 2026.** [Report announcement](https://www.globenewswire.com/news-release/2026/02/04/3232208/0/en/NP-Digital-s-AI-Hallucinations-and-Accuracy-Report-Reveals-the-Marketing-Impact-of-AI-Errors.html). Survey and prompt-test findings; industry-published, sample-specific evidence.
3. **Ahrefs, *State of AI in Content Marketing*, 30 September 2026.** [Original Ahrefs article](https://ahrefs.com/blog/marketers-ai-content-creation/). Survey findings from 301 respondents; not a representative estimate for every market.
4. **Advertising Standards Council of India annual complaints report FY2024–25, reported by Moneylife, 28 May 2025.** [Media coverage](https://www.moneylife.in/article/94-percentage-of-misleading-ads-found-online-asci-report-flags-influencer-breaches-and-illegal-promotions/77259.html). Check the source report and exact wording before using individual figures.
5. **Department of Consumer Affairs, Government of India, CCPA Guidelines for Prevention of Misleading Advertisements and Endorsements for Misleading Advertisements, 2022.** [Official page](https://consumeraffairs.nic.in/latestnews/guidelines-prevention-misleading-advertisements-and-endorsements-misleading). Use for context and configurable rule-pack design; do not present Proofline as legal advice.
6. **W3C, Web Content Accessibility Guidelines (WCAG) 2.2.** [Official standard](https://www.w3.org/TR/WCAG22/). Used for measurable accessibility checks, especially contrast; it is not the whole of accessibility.
7. **Google Labs / Google DeepMind, Pomelli.** [Product announcement](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/) and [May 2026 update](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-agentic-capabilities/). Used to position Proofline as a complementary governance/checking workflow rather than a content-generation clone.
8. **Adobe GenStudio for Performance Marketing.** [Brand compliance feature page](https://business.adobe.com/products/genstudio-for-performance-marketing/brand-compliance.html) and [brand validation documentation](https://experienceleague.adobe.com/en/docs/genstudio-for-performance-marketing/user-guide/guidelines/brand-validation). Used as a public comparison reference; feature availability and packaging should be checked before finalising competitive claims.

**Evidence handling rule:** In the Round 1 submission, every external statistic must have a source citation and should be summarised fairly. Mark team interviews, surveys, mini-audits, target metrics, and planned product functionality as such unless and until the team has actual evidence.
