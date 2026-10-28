import type { BackendFinding, ContentAuditResponse, Finding } from "./proofline-api";

/** Local, synthetic VoltEdge review adapter. No network/model call or approval occurs. */
export type ContentScope = {
  title: string;
  channel: "email" | "social" | "web" | "document";
  region: "US" | "UK" | "IN" | "global";
  language: "en-US" | "en-GB" | "hi" | "es";
  scheduled_date: string;
  alt_text: string;
  has_image: boolean;
  confidential: boolean;
  original_filename: string | null;
};

export type ContentRevision = {
  id: string;
  number: number;
  text: string;
  alt_text: string;
  created_at: string;
  based_on: string | null;
};

export type ReviewEvent = {
  id: string;
  actor: string;
  timestamp: string;
  action: "submitted" | "audited" | "accepted" | "edited" | "dismissed";
  content_version_id: string;
  finding_id: string | null;
  reason: string | null;
  before: string | null;
  after: string | null;
};

export type ContentAudit = {
  id: string;
  content_version_id: string;
  created_at: string;
  findings: Finding[];
  status: "review_required" | "checked";
};

export type ContentReview = {
  schema_version: 1;
  id: string;
  api_content_id?: string;
  scope: ContentScope;
  revisions: ContentRevision[];
  audits: ContentAudit[];
  events: ReviewEvent[];
};

export const sampleVoltEdgeText = "Meet the VoltEdge NovaBook S1.\n\nDesigned for deep work and long days, it delivers up to 20 hours of battery life. Our most reliable laptop yet.\n\nPre-order today and be among the first to experience it.";

export const defaultContentScope: ContentScope = {
  title: "NovaBook S1 launch email",
  channel: "email",
  region: "US",
  language: "en-US",
  scheduled_date: "2026-11-06",
  alt_text: "",
  has_image: false,
  confidential: false,
  original_filename: null,
};

export const channelLabels = { email: "Email campaign", social: "Social post", web: "Web page", document: "Document" };
export const regionLabels = { US: "United States", UK: "United Kingdom", IN: "India", global: "Global" };
export const languageLabels = { "en-US": "English (US)", "en-GB": "English (UK)", hi: "Hindi", es: "Spanish" };

export const verdictLabels: Record<Finding["verdict"], { icon: string; text: string }> = {
  supported: { icon: "✓", text: "Supported" },
  contradicted: { icon: "×", text: "Contradicted" },
  outdated: { icon: "↻", text: "Outdated" },
  unsupported: { icon: "?", text: "Unsupported · evidence not found" },
  needs_human: { icon: "!", text: "Needs human review" },
};

export const categoryLabels: Record<Finding["category"], string> = {
  factual: "Product fact",
  offer_date: "Offer date",
  terminology: "Terminology",
  tone: "Tone & messaging",
  promotional: "Promotional claim",
  legal: "Configured policy",
  visual: "Visual review",
  accessibility: "Accessibility",
  translation: "Language review",
  security: "Security",
  other: "Other review",
};

export const methodLabels = { rule: "Deterministic rule", llm: "AI-assisted", hybrid: "Rule + AI" };

const demoEvidence: Record<string, NonNullable<Finding["evidence"]>> = {
  battery: {
    source_type: "synthetic_brand_record",
    source_id: "brand_record_voltedge_novabook_battery",
    version: "3",
    quote: "VoltEdge NovaBook S1 · US · English: battery life up to 12 hours.",
  },
  claims: {
    source_type: "synthetic_rule",
    source_id: "rule_voltedge_comparative_claims",
    version: "2",
    quote: "Comparative claims require an approved benchmark. When evidence is unavailable, request human review.",
  },
  voice: {
    source_type: "synthetic_guideline",
    source_id: "guideline_voltedge_launch_voice",
    version: "2",
    quote: "Product launches use clear, capable language. Urgency-led phrasing is a reviewer judgement.",
  },
  alt: {
    source_type: "synthetic_rule",
    source_id: "rule_voltedge_image_alt_text",
    version: "1",
    quote: "A meaningful campaign image requires a contextual text alternative. A reviewer confirms whether it is decorative.",
  },
};

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function latestRevision(review: ContentReview) {
  return review.revisions[review.revisions.length - 1];
}

export function latestAudit(review: ContentReview) {
  return review.audits[review.audits.length - 1];
}

function auditRevision(revision: ContentRevision, scope: ContentScope): ContentAudit {
  const findings: Finding[] = [];
  const text = revision.text;
  const inDemoScope = /VoltEdge\s+NovaBook\s+S1/i.test(text) && scope.region === "US" && scope.language === "en-US";
  function add(input: Omit<Finding, "id" | "content_version_id" | "status" | "dismiss_reason">) {
    findings.push({ ...input, id: uid("finding"), content_version_id: revision.id, status: "open", dismiss_reason: null });
  }
  function span(match: RegExpExecArray) {
    return { start: match.index, end: match.index + match[0].length, text: match[0] };
  }

  const batteryPattern = /(?:up to\s+)?(\d+(?:\.\d+)?)\s+hours?\s+of\s+battery\s+life/gi;
  let battery: RegExpExecArray | null;
  while ((battery = batteryPattern.exec(text)) !== null) {
    if (Number(battery[1]) === 12 && /^up to/i.test(battery[0]) && inDemoScope) continue;
    add({
      span: span(battery), category: "factual", verdict: inDemoScope ? "contradicted" : "needs_human", severity: inDemoScope ? "high" : "medium", confidence: inDemoScope ? 1 : 0,
      method: "rule", evidence: inDemoScope ? demoEvidence.battery : null,
      reason: inDemoScope ? "This number or its missing ‘up to’ qualifier conflicts with the synthetic US NovaBook S1 specification." : "No applicable approved battery source is available in this demo for the selected product, region, and language. The claim is not declared false.",
      suggestion: inDemoScope ? { text: "up to 12 hours of battery life", intent_note: "Keeps the performance message and the approved qualifier; changes only the conflicting span." } : null,
    });
  }

  const comparative = /(?:our\s+)?most reliable laptop(?: yet)?|(?:America['’]s\s+)?(?:best|cheapest|number one|no\.\s?1)\b/gi;
  let claim: RegExpExecArray | null;
  while ((claim = comparative.exec(text)) !== null) {
    add({ span: span(claim), category: "promotional", verdict: "unsupported", severity: "medium", confidence: 1, method: "rule", evidence: demoEvidence.claims,
      reason: "Comparative wording was detected, but no benchmark substantiating this claim is in the synthetic source set. The cited policy is a requirement for evidence, not evidence that the claim is false.",
      suggestion: { text: /reliable/i.test(claim[0]) ? "Built for everyday work" : "designed for everyday work", intent_note: "Removes the unsupported comparison while keeping the product positioning; a human should check the final wording." } });
  }

  const urgency = /be among the first to experience(?: it)?/i.exec(text);
  if (urgency) {
    add({ span: span(urgency), category: "tone", verdict: "needs_human", severity: "low", confidence: 0, method: "rule", evidence: demoEvidence.voice,
      reason: "A phrase rule found urgency-led wording. Contextual AI tone assessment has not run; a reviewer should judge the fit with the synthetic voice guideline.",
      suggestion: { text: "explore the new NovaBook S1", intent_note: "Keeps the invitation to learn about the launch with calmer phrasing." } });
  }

  if (scope.has_image && !revision.alt_text.trim()) {
    add({ span: { start: 0, end: 0, text: "" }, category: "accessibility", verdict: "needs_human", severity: "medium", confidence: 1, method: "rule", evidence: demoEvidence.alt,
      reason: "Image metadata says the draft includes a meaningful image, but its alt-text field is empty. Describe the actual image or record why it is decorative; this does not assess contrast or overall accessibility.",
      suggestion: null });
  }

  return { id: uid("audit"), content_version_id: revision.id, created_at: new Date().toISOString(), findings, status: "review_required" };
}

function replaceExactSpan(text: string, start: number, end: number, expected: string, replacement: string) {
  if (start < 0 || end < start || text.slice(start, end) !== expected) {
    throw new Error("The finding no longer matches the audited source. Run a fresh check.");
  }
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

export function createContentReview(text: string, scope: ContentScope): ContentReview {
  if (!text.trim()) throw new Error("Add content before running the local check.");
  const timestamp = new Date().toISOString();
  const revision: ContentRevision = { id: uid("version"), number: 1, text, alt_text: scope.alt_text, created_at: timestamp, based_on: null };
  const audit = auditRevision(revision, scope);
  return { schema_version: 1, id: uid("content"), scope, revisions: [revision], audits: [audit], events: [{ id: uid("event"), actor: "VoltEdge demo creator", timestamp, action: "submitted", content_version_id: revision.id, finding_id: null, reason: null, before: null, after: null }, { id: uid("event"), actor: "Local deterministic checker", timestamp: audit.created_at, action: "audited", content_version_id: revision.id, finding_id: null, reason: "Offline demo rules checked. Contextual AI, OCR, visual analysis, and full source coverage were not assessed.", before: null, after: null }] };
}

export function applyFindingDecision(review: ContentReview, findingId: string, action: "accepted" | "edited" | "dismissed", value: string): ContentReview {
  const audit = latestAudit(review);
  const finding = audit.findings.find((item) => item.id === findingId);
  if (!finding || finding.status !== "open") throw new Error("This finding already has a decision. Recheck the current version to produce new findings.");
  if (action === "dismissed" && !value.trim()) throw new Error("Record a reason to dismiss this finding.");
  if (action !== "dismissed" && (!finding.suggestion || !value.trim())) throw new Error("A non-empty correction is required.");
  const timestamp = new Date().toISOString();
  const current = latestRevision(review);
  let next = current;
  let before: string | null = null;
  if (action !== "dismissed") {
    const original = review.revisions.find((item) => item.id === finding.content_version_id);
    if (!original || original.text.slice(finding.span.start, finding.span.end) !== finding.span.text) throw new Error("The finding no longer matches the audited source. Run a fresh check.");
    const precedingChanges = review.events.filter((event) => event.finding_id && event.action !== "dismissed" && event.action !== "audited" && audit.findings.some((item) => item.id === event.finding_id && item.span.start < finding.span.start));
    const offset = precedingChanges.reduce((sum, event) => sum + (event.after?.length ?? 0) - (event.before?.length ?? 0), 0);
    const start = finding.span.start + offset;
    if (current.text.slice(start, start + finding.span.text.length) !== finding.span.text) throw new Error("Another edit overlaps this suggestion. Run a fresh check before changing this span.");
    before = finding.span.text;
    next = { ...current, id: uid("version"), number: current.number + 1, text: replaceExactSpan(current.text, start, start + finding.span.text.length, finding.span.text, value), created_at: timestamp, based_on: current.id };
  }
  const event: ReviewEvent = { id: uid("event"), actor: "VoltEdge demo creator", timestamp, action, content_version_id: next.id, finding_id: finding.id, reason: action === "dismissed" ? value.trim() : finding.suggestion?.intent_note ?? null, before, after: action === "dismissed" ? null : value };
  return { ...review, revisions: next === current ? review.revisions : [...review.revisions, next], audits: review.audits.map((item) => item.id === audit.id ? { ...item, findings: item.findings.map((entry) => entry.id === findingId ? { ...entry, status: action, dismiss_reason: action === "dismissed" ? value.trim() : null } : entry) } : item), events: [...review.events, event] };
}

export function recheckContent(review: ContentReview): ContentReview {
  const revision = latestRevision(review);
  const audit = auditRevision(revision, review.scope);
  return { ...review, audits: [...review.audits, audit], events: [...review.events, { id: uid("event"), actor: "Local deterministic checker", timestamp: audit.created_at, action: "audited", content_version_id: revision.id, finding_id: null, reason: `Fresh check of version ${revision.number}; ${audit.findings.length} finding(s). Contextual and visual checks remain unassessed.`, before: null, after: null }] };
}

const backendCategoryMap: Record<string, Finding["category"]> = {
  factual: "factual",
  fact_mismatch: "factual",
  offer_date: "offer_date",
  outdated_fact_or_offer: "offer_date",
  terminology: "terminology",
  terminology_violation: "terminology",
  tone: "tone",
  tone_messaging_mismatch: "tone",
  promotional: "promotional",
  unsupported_claim: "promotional",
  legal: "legal",
  configured_policy_disclaimer: "legal",
  visual: "visual",
  visual_mismatch: "visual",
  accessibility: "accessibility",
  accessibility_issue: "accessibility",
  translation: "translation",
  security: "security",
};

function mapBackendFinding(finding: BackendFinding): Finding {
  const severity = finding.severity === "critical" || finding.severity === "high" || finding.severity === "low"
    ? finding.severity
    : "medium";
  const status = ["open", "accepted", "edited", "dismissed", "resolved", "overridden"].includes(finding.status)
    ? finding.status as Finding["status"]
    : "open";
  return {
    id: finding.id,
    content_version_id: finding.content_version_id,
    span: finding.span,
    category: backendCategoryMap[finding.category] ?? "other",
    verdict: finding.verdict,
    severity,
    confidence: finding.confidence,
    method: finding.method,
    evidence: finding.evidence,
    reason: finding.reason,
    suggestion: finding.suggestion,
    status,
    dismiss_reason: finding.dismiss_reason,
  };
}

function backendTimestamp(response: ContentAuditResponse) {
  return response.audit?.created_at
    ?? response.audits?.find((audit) => audit.id === response.audit_id)?.created_at
    ?? new Date().toISOString();
}

function backendVersionText(version: NonNullable<ContentAuditResponse["content_version"]>) {
  return version.source_text ?? version.extracted_text ?? "";
}

/** Convert a verified local API response into the browser review presentation shape. */
export function contentReviewFromApi(
  scope: ContentScope,
  response: ContentAuditResponse,
  previous?: ContentReview,
): ContentReview {
  const versionRows = response.versions?.length
    ? response.versions
    : response.content_version
      ? [response.content_version]
      : [];
  const revisions: ContentRevision[] = versionRows.map((version) => ({
    id: version.id,
    number: version.version,
    text: backendVersionText(version),
    alt_text: typeof version.metadata.alt_text === "string" ? version.metadata.alt_text : scope.alt_text,
    created_at: version.created_at,
    based_on: version.parent_version_id,
  }));
  const currentVersion = response.content_version_id;
  const currentAudit: ContentAudit = {
    id: response.audit_id ?? `api-audit-${currentVersion}`,
    content_version_id: currentVersion,
    created_at: backendTimestamp(response),
    findings: response.findings.map(mapBackendFinding),
    status: response.status === "completed" ? "checked" : "review_required",
  };
  const previousAudits = previous?.audits.filter((audit) => audit.content_version_id !== currentVersion) ?? [];
  const summaryAudits = (response.audits ?? [])
    .filter((audit) => audit.content_version_id !== currentVersion)
    .map((audit) => ({
      id: audit.id,
      content_version_id: audit.content_version_id,
      created_at: audit.created_at,
      findings: previousAudits.find((item) => item.id === audit.id)?.findings ?? [],
      status: audit.status === "completed" ? "checked" as const : "review_required" as const,
    }));
  const audits = [...previousAudits, ...summaryAudits, currentAudit]
    .filter((audit, index, items) => items.findIndex((candidate) => candidate.id === audit.id) === index)
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  const events = [...(previous?.events ?? [])];
  if (!events.some((event) => event.action === "submitted")) {
    events.unshift({
      id: `api-submitted-${response.content_id}`,
      actor: "Local API creator",
      timestamp: revisions[0]?.created_at ?? currentAudit.created_at,
      action: "submitted",
      content_version_id: revisions[0]?.id ?? currentVersion,
      finding_id: null,
      reason: null,
      before: null,
      after: null,
    });
  }
  if (!events.some((event) => event.action === "audited" && event.content_version_id === currentVersion)) {
    events.push({
      id: `api-audited-${currentAudit.id}`,
      actor: "Local API verification pipeline",
      timestamp: currentAudit.created_at,
      action: "audited",
      content_version_id: currentVersion,
      finding_id: null,
      reason: response.error ?? `Local API audit status: ${response.status}.`,
      before: null,
      after: null,
    });
  }
  for (const action of response.actions ?? []) {
    const eventAction = action.action === "accept" ? "accepted" : action.action === "edit" ? "edited" : "dismissed";
    const eventId = `api-action-${action.finding_id}-${action.created_at}-${action.action}`;
    if (events.some((event) => event.id === eventId)) continue;
    events.push({
      id: eventId,
      actor: "Local API reviewer",
      timestamp: action.created_at,
      action: eventAction,
      content_version_id: currentVersion,
      finding_id: action.finding_id,
      reason: action.reason,
      before: null,
      after: action.replacement_text,
    });
  }
  return {
    schema_version: 1,
    id: response.content_id,
    api_content_id: response.content_id,
    scope,
    revisions,
    audits,
    events,
  };
}

export function riskBreakdown(findings: Finding[], channel: ContentScope["channel"]) {
  const exposure = channel === "social" || channel === "web" ? 3 : channel === "email" ? 2 : 1;
  const open = findings.filter((finding) => finding.status === "open");
  const points: Record<Finding["severity"], number> = { critical: 5, high: 5, medium: 3, low: 1 };
  const severity = Math.max(0, ...open.map((finding) => points[finding.severity]));
  const score = Math.round(100 * severity * exposure / 22.5);
  return { exposure, severity, policy_multiplier: 1, score, label: open.some((finding) => finding.verdict === "contradicted" || finding.severity === "critical") ? "High" : score >= 65 ? "High" : score >= 30 ? "Medium" : "Low", counts: { critical: open.filter((finding) => finding.severity === "critical").length, high: open.filter((finding) => finding.severity === "high").length, medium: open.filter((finding) => finding.severity === "medium").length, low: open.filter((finding) => finding.severity === "low").length }, missing: open.filter((finding) => finding.verdict === "unsupported").length, human: open.filter((finding) => finding.verdict === "needs_human").length };
}
