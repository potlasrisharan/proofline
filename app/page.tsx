"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DisclosurePanel } from "./components/disclosure-panel";
import { StatePanel } from "./components/status-state";
import { useLocalAuditLog } from "./components/use-local-audit-log";
import { RevisionHistory, type ReviewRevision } from "./components/revision-history";
import { ReviewAuditLog } from "./components/review-audit-log";
import { ReviewContentPreview, suggestionReplacement } from "./components/review-content-preview";
import { SpanComments, type VersionedSpanComment } from "./components/span-comments";
import type { ProoflineRole } from "./lib/proofline-api";

type View = "overview" | "reviews" | "registry" | "insights" | "audit-log";
type DetailTab = "findings" | "content" | "history";
type AuditState = "needs-changes" | "scanning" | "ready" | "submitted" | "approved" | "changes-requested";
type Severity = "critical" | "high" | "medium" | "low";
type QueueStatus = "needs-changes" | "review-required" | "in-review" | "approved";
type QueueRisk = "high" | "medium" | "low";
type QueueTone = "coral" | "amber" | "blue" | "mint";
type QueueSort = "risk" | "newest";

type Finding = {
  id: string;
  category: string;
  severity: Severity;
  excerpt: string;
  description: string;
  evidenceTitle: string;
  evidence: string;
  evidenceStatus: "supported mismatch" | "evidence not found" | "style suggestion";
  suggestion: string;
  resolved: boolean;
  span: { start: number; end: number; text: string };
  verdict?: "supported" | "contradicted" | "outdated" | "unsupported" | "needs_human";
  reason?: string;
  method?: "rule" | "llm" | "hybrid";
  confidence?: number;
  aiGenerated?: boolean;
  evidenceSourceId?: string;
  evidenceVersion?: string;
  actionStatus?: "open" | "accepted" | "edited" | "dismissed";
  dismissReason?: string | null;
};

type SubmitForm = {
  title: string;
  content: string;
  channel: string;
  region: string;
  language: string;
  scheduledDate: string;
  altText: string;
};

const defaultSubmitForm: SubmitForm = {
  title: "NovaBook S1 launch email",
  content: "Meet the VoltEdge NovaBook S1. It delivers up to 20 hours of battery life and is our most reliable laptop yet. Pre-order today and be among the first to experience it.",
  channel: "Email campaign",
  region: "US market",
  language: "English (US)",
  scheduledDate: "2026-11-06",
  altText: "",
};

type ReviewItem = {
  id: string;
  title: string;
  type: string;
  submittedBy: string;
  time: string;
  submittedOrder: number;
  status: QueueStatus;
  statusLabel: string;
  risk: QueueRisk;
  riskScore: number;
  icon: string;
  tone: QueueTone;
};

type Activity = {
  icon: string;
  title: string;
  detail: string;
  time: string;
  tone?: "good" | "alert" | "neutral";
};

type SpanComment = VersionedSpanComment;

type Revision = ReviewRevision;

type AuditEvent = {
  id: string;
  kind:
    | "audit_completed"
    | "suggestion_applied"
    | "finding_edited"
    | "finding_dismissed"
    | "comment_added"
    | "rescan_completed"
    | "submitted_for_approval"
    | "changes_requested"
    | "revision_approved"
    | "role_preview_changed";
  actor: string;
  role: ProoflineRole;
  timestamp: string;
  summary: string;
  contentVersion: string;
  hash: string;
  previousHash: string | null;
  chainVerified: boolean;
};

type PermissionSet = {
  canApprove: boolean;
  canRequestChanges: boolean;
  canComment: boolean;
  canApplySuggestion: boolean;
  canSubmit: boolean;
  canManageRegistry: boolean;
  canViewAuditLog: boolean;
  canViewInsights: boolean;
  canStartReview: boolean;
};

const workflow = [
  { number: "01", title: "Set the truth", detail: "Approved facts, rules, and assets" },
  { number: "02", title: "Review content", detail: "Evidence-linked checks before publish" },
  { number: "03", title: "Keep humans in", detail: "Resolve, approve, and learn" },
];

const roleLabels: Record<ProoflineRole, string> = {
  creator: "Creator",
  manager: "Manager",
  legal_reviewer: "Authorised reviewer",
  brand_owner: "Brand owner",
  agency: "Agency / freelancer",
};

const rolePermissions: Record<ProoflineRole, PermissionSet> = {
  creator: {
    canApprove: false,
    canRequestChanges: false,
    canComment: true,
    canApplySuggestion: true,
    canSubmit: true,
    canManageRegistry: false,
    canViewAuditLog: false,
    canViewInsights: false,
    canStartReview: true,
  },
  manager: {
    canApprove: false,
    canRequestChanges: true,
    canComment: true,
    canApplySuggestion: true,
    canSubmit: true,
    canManageRegistry: false,
    canViewAuditLog: true,
    canViewInsights: true,
    canStartReview: true,
  },
  legal_reviewer: {
    canApprove: true,
    canRequestChanges: true,
    canComment: true,
    canApplySuggestion: false,
    canSubmit: false,
    canManageRegistry: false,
    canViewAuditLog: true,
    canViewInsights: true,
    canStartReview: false,
  },
  brand_owner: {
    canApprove: true,
    canRequestChanges: true,
    canComment: true,
    canApplySuggestion: true,
    canSubmit: true,
    canManageRegistry: true,
    canViewAuditLog: true,
    canViewInsights: true,
    canStartReview: true,
  },
  agency: {
    canApprove: false,
    canRequestChanges: false,
    canComment: true,
    canApplySuggestion: true,
    canSubmit: true,
    canManageRegistry: false,
    canViewAuditLog: false,
    canViewInsights: false,
    canStartReview: true,
  },
};

const reviewItems: ReviewItem[] = [
  {
    id: "novabook-launch",
    title: defaultSubmitForm.title,
    type: "Email campaign",
    submittedBy: "Aisha Rahman",
    time: "18 min ago",
    submittedOrder: 4,
    status: "needs-changes",
    statusLabel: "Needs changes",
    risk: "high",
    riskScore: 92,
    icon: "✣",
    tone: "coral",
  },
  {
    id: "spring-poster",
    title: "Spring upgrade poster",
    type: "Static image · OCR",
    submittedBy: "Leo Martins",
    time: "1 hr ago",
    submittedOrder: 3,
    status: "review-required",
    statusLabel: "Review required",
    risk: "high",
    riskScore: 84,
    icon: "▧",
    tone: "amber",
  },
  {
    id: "partner-brief",
    title: "Partner launch brief",
    type: "PDF document",
    submittedBy: "Maya Chen",
    time: "Yesterday",
    submittedOrder: 2,
    status: "in-review",
    statusLabel: "In review",
    risk: "medium",
    riskScore: 61,
    icon: "▤",
    tone: "blue",
  },
  {
    id: "support-note",
    title: "Support team release note",
    type: "Plain text",
    submittedBy: "Sam Okafor",
    time: "Yesterday",
    submittedOrder: 1,
    status: "approved",
    statusLabel: "Approved",
    risk: "low",
    riskScore: 24,
    icon: "✓",
    tone: "mint",
  },
];

const registryRecords = [
  { type: "Product specification", title: "NovaBook S1 · Battery life", value: "Up to 12 hours", source: "VoltEdge product specification v3", owner: "Priya Nair · Product info", version: "Current · reviewed Oct 24" },
  { type: "Voice rule", title: "Tone · Product launches", value: "Clear, capable, never exaggerated", source: "VoltEdge voice guide v2", owner: "Lena Ortiz · Brand", version: "Current · reviewed Oct 20" },
  { type: "Terminology", title: "Preferred product name", value: "VoltEdge NovaBook S1", source: "VoltEdge naming system v2", owner: "Maya Chen · Content", version: "Current · reviewed Oct 18" },
  { type: "Promotion rule", title: "Launch offer qualifier", value: "Terms apply · US market", source: "VoltEdge offer policy v4", owner: "Owen Brooks · Legal ops", version: "Current · reviewed Oct 22" },
  { type: "Claim policy", title: "Comparative claims", value: "Evidence required for “best”", source: "VoltEdge claims policy v2", owner: "Lena Ortiz · Brand", version: "Current · reviewed Oct 20" },
  { type: "Accessibility rule", title: "Email readability", value: "Normal text contrast ≥ 4.5:1", source: "VoltEdge accessibility baseline v1", owner: "Maya Chen · Content", version: "Current · reviewed Oct 16" },
];

function contentSpan(text: string) {
  const start = defaultSubmitForm.content.indexOf(text);
  return { start, end: start + text.length, text };
}

const initialFindings: Finding[] = [
  {
    id: "battery",
    category: "Fact mismatch",
    severity: "high",
    excerpt: "“up to 20 hours of battery life”",
    description: "The submitted claim conflicts with the current approved specification for the VoltEdge NovaBook S1.",
    evidenceTitle: "Approved fact · NovaBook S1 battery life",
    evidence: "Up to 12 hours · VoltEdge product specification v3 · US market · Current",
    evidenceStatus: "supported mismatch",
    suggestion: "Change to “up to 12 hours of battery life”",
    resolved: false,
    span: contentSpan("up to 20 hours of battery life"),
    verdict: "contradicted",
    reason: "The submitted value conflicts with the active VoltEdge product specification for the US launch scope.",
    method: "rule",
    confidence: 0.99,
    aiGenerated: false,
    evidenceSourceId: "brand_record_voltedge_novabook_battery",
    evidenceVersion: "3",
    actionStatus: "open",
    dismissReason: null,
  },
  {
    id: "reliable",
    category: "Unsupported claim",
    severity: "medium",
    excerpt: "“our most reliable laptop yet”",
    description: "Proofline could not find an approved source that substantiates this comparative claim.",
    evidenceTitle: "Evidence not found · Claims policy v2",
    evidence: "Comparative claims need an approved benchmark or a reviewer decision.",
    evidenceStatus: "evidence not found",
    suggestion: "Soften to “built for dependable, all-day performance”",
    resolved: false,
    span: contentSpan("our most reliable laptop yet"),
    verdict: "unsupported",
    reason: "Missing evidence is not proof that this claim is false; a reviewer must add a source, soften the wording, or record a decision.",
    method: "hybrid",
    confidence: 0.83,
    aiGenerated: true,
    evidenceSourceId: "rule_voltedge_comparative_claims",
    evidenceVersion: "2",
    actionStatus: "open",
    dismissReason: null,
  },
  {
    id: "tone",
    category: "Tone & voice",
    severity: "low",
    excerpt: "“be among the first to experience”",
    description: "The phrase adds urgency that is not part of the current launch voice guidance.",
    evidenceTitle: "Voice rule · Product launches",
    evidence: "Clear, capable, never exaggerated · VoltEdge voice guide v2",
    evidenceStatus: "style suggestion",
    suggestion: "Use “explore the new NovaBook S1” for a calmer launch tone",
    resolved: false,
    span: contentSpan("be among the first to experience"),
    verdict: "needs_human",
    reason: "The current VoltEdge voice rule prefers clear, capable language and leaves this urgency choice to human review.",
    method: "llm",
    confidence: 0.72,
    aiGenerated: true,
    evidenceSourceId: "guideline_voltedge_launch_voice",
    evidenceVersion: "2",
    actionStatus: "open",
    dismissReason: null,
  },
];

const initialActivity: Activity[] = [
  { icon: "!", title: "Audit completed", detail: "3 findings linked to current VoltEdge registry sources.", time: "18 min ago", tone: "alert" },
  { icon: "↗", title: "Version 2 submitted", detail: "Aisha Rahman submitted an updated draft.", time: "21 min ago" },
  { icon: "✓", title: "Version 1 audited", detail: "1 terminology issue resolved before resubmission.", time: "Yesterday", tone: "good" },
  { icon: "↻", title: "Registry record updated", detail: "NovaBook S1 battery life is current through v3.", time: "Yesterday" },
];

const initialComments: SpanComment[] = [
  { id: "comment-1", findingId: "battery", author: "Priya Nair", role: "brand_owner", text: "Please use the current registry value and keep the “up to” qualifier.", time: "16 min ago", contentVersion: "Version 2" },
  { id: "comment-2", findingId: "battery", author: "Aisha Rahman", role: "creator", text: "Got it — I will update the hero copy before the next scan.", time: "14 min ago", contentVersion: "Version 2" },
  { id: "comment-3", findingId: "reliable", author: "Lena Ortiz", role: "legal_reviewer", text: "No approved benchmark is attached, so this should stay review-required.", time: "12 min ago", contentVersion: "Version 2" },
];

const initialRevisions: Revision[] = [
  { id: "revision-1", label: "Version 1", author: "Aisha Rahman", time: "Oct 25 · 13:18 UTC", status: "superseded", summary: "Initial draft submitted for a pre-publication audit.", content: [defaultSubmitForm.content.replace("VoltEdge NovaBook S1", "VoltEdge Novabook")] },
  { id: "revision-2", label: "Version 2", author: "Aisha Rahman", time: "Oct 25 · 13:39 UTC", status: "audited", summary: "Corrected the product terminology; 3 findings still need review.", content: [defaultSubmitForm.content] },
];

const initialAuditLog: Omit<AuditEvent, "hash" | "previousHash" | "chainVerified">[] = [
  { id: "event-001", kind: "audit_completed", actor: "Seeded audit fixture", role: "manager", timestamp: "2026-10-25T13:42:00Z", summary: "Version 2 seeded audit recorded 3 findings against the VoltEdge source set.", contentVersion: "Version 2" },
  { id: "event-002", kind: "comment_added", actor: "Priya Nair", role: "brand_owner", timestamp: "2026-10-25T13:45:00Z", summary: "Span comment added to the NovaBook S1 battery claim.", contentVersion: "Version 2" },
  { id: "event-003", kind: "comment_added", actor: "Lena Ortiz", role: "legal_reviewer", timestamp: "2026-10-25T13:49:00Z", summary: "Evidence-gap comment added to the comparative reliability claim.", contentVersion: "Version 2" },
];

const issueMix = [
  { label: "Fact mismatch", value: 68, count: 14, tone: "coral" },
  { label: "Unsupported claim", value: 52, count: 11, tone: "amber" },
  { label: "Tone & voice", value: 39, count: 8, tone: "blue" },
  { label: "Terminology", value: 26, count: 5, tone: "mint" },
  { label: "Accessibility", value: 18, count: 3, tone: "mint" },
];

const clarityOpportunities = [
  ["Product specification wording", "Reviewers disagree on when “up to” can be used without a qualifier."],
  ["Comparative claim evidence", "Three items were held because no benchmark source was linked."],
  ["Offer qualifiers", "A required terms line was added to two drafts this month."],
];

const statusLabels: Record<QueueStatus, string> = {
  "needs-changes": "Needs changes",
  "review-required": "Review required",
  "in-review": "In review",
  approved: "Approved",
};

const auditStateLabels: Record<AuditState, string> = {
  "needs-changes": "Needs changes",
  scanning: "Scanning",
  ready: "Ready for approval",
  submitted: "Pending approval",
  approved: "Approved",
  "changes-requested": "Changes requested",
};

const queueStatusForAudit: Record<AuditState, QueueStatus> = {
  "needs-changes": "needs-changes",
  scanning: "in-review",
  ready: "in-review",
  submitted: "in-review",
  approved: "approved",
  "changes-requested": "needs-changes",
};

const auditKindLabels: Record<AuditEvent["kind"], string> = {
  audit_completed: "Audit completed",
  suggestion_applied: "Suggestion applied",
  finding_edited: "Finding edited",
  finding_dismissed: "Finding dismissed",
  comment_added: "Span comment added",
  rescan_completed: "Re-scan completed",
  submitted_for_approval: "Submitted for approval",
  changes_requested: "Changes requested",
  revision_approved: "Revision approved",
  role_preview_changed: "Role preview changed",
};

function severityLabel(severity: Severity) {
  return severity[0].toUpperCase() + severity.slice(1);
}

function roleInitials(role: ProoflineRole) {
  return role === "legal_reviewer" ? "AR" : role === "brand_owner" ? "BO" : role === "creator" ? "CR" : role === "manager" ? "MG" : "AG";
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [detailTab, setDetailTab] = useState<DetailTab>("findings");
  const [auditState, setAuditState] = useState<AuditState>("needs-changes");
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [comments, setComments] = useState<SpanComment[]>(initialComments);
  const [revisions, setRevisions] = useState<Revision[]>(initialRevisions);
  const { auditLog, appendAuditEvent, chainState, chainError } = useLocalAuditLog(initialAuditLog);
  const [activeRevisionId, setActiveRevisionId] = useState("revision-2");
  const [selectedReviewId, setSelectedReviewId] = useState("novabook-launch");
  const [selectedSpanId, setSelectedSpanId] = useState("battery");
  const [currentRole, setCurrentRole] = useState<ProoflineRole>("legal_reviewer");
  const [queueRiskFilter, setQueueRiskFilter] = useState<"all" | QueueRisk>("all");
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | QueueStatus>("all");
  const [queueSort, setQueueSort] = useState<QueueSort>("risk");
  const [contentVersion, setContentVersion] = useState("Version 2");
  const [commentDraft, setCommentDraft] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [toast, setToast] = useState("");
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const [documentIntakeError, setDocumentIntakeError] = useState(false);
  const [submittedContent, setSubmittedContent] = useState(defaultSubmitForm.content);

  const permissions = rolePermissions[currentRole];
  const openFindings = useMemo(() => findings.filter((finding) => !finding.resolved), [findings]);
  const highCount = openFindings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length;
  const mediumCount = openFindings.filter((finding) => finding.severity === "medium").length;
  const canRescan = openFindings.length === 0 && auditState === "needs-changes" && permissions.canApplySuggestion;
  const canSubmit = auditState === "ready" && permissions.canSubmit;
  const canApprove = auditState === "submitted" && permissions.canApprove;
  const roleScopedReviewItems = useMemo(
    () => currentRole === "agency" ? reviewItems.filter((item) => item.id === "novabook-launch") : reviewItems,
    [currentRole],
  );
  const filteredQueueItems = useMemo(() => {
    const items = roleScopedReviewItems.filter((item) => {
      const status = item.id === "novabook-launch" ? queueStatusForAudit[auditState] : item.status;
      const matchesRisk = queueRiskFilter === "all" || item.risk === queueRiskFilter;
      const matchesStatus = queueStatusFilter === "all" || status === queueStatusFilter;
      return matchesRisk && matchesStatus;
    });

    return [...items].sort((left, right) => queueSort === "risk" ? right.riskScore - left.riskScore : right.submittedOrder - left.submittedOrder);
  }, [auditState, queueRiskFilter, queueSort, queueStatusFilter, roleScopedReviewItems]);
  const selectedReview = filteredQueueItems.find((item) => item.id === selectedReviewId) ?? filteredQueueItems[0] ?? roleScopedReviewItems[0] ?? reviewItems[0];
  const selectedIsInteractive = selectedReview.id === "novabook-launch";
  const selectedQueueStatus = selectedIsInteractive ? queueStatusForAudit[auditState] : selectedReview.status;
  const selectedStatusLabel = selectedIsInteractive ? auditStateLabels[auditState] : selectedReview.statusLabel;
  const selectedFinding = findings.find((finding) => finding.id === selectedSpanId) ?? findings[0];

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function navigate(view: View) {
    if (view === "audit-log" && !permissions.canViewAuditLog) {
      notify("Audit history is limited to managers, authorised reviewers, and brand owners.");
      return;
    }
    if (view === "insights" && !permissions.canViewInsights) {
      notify("Governance insights are limited to workspace reviewers and managers.");
      return;
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDetailTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, tab: DetailTab) {
    const tabs: DetailTab[] = ["findings", "content", "history"];
    const currentIndex = tabs.indexOf(tab);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === currentIndex) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setDetailTab(nextTab);
    window.setTimeout(() => document.getElementById(`review-tab-${nextTab}`)?.focus(), 0);
  }

  function addActivity(entry: Activity) {
    setActivity((current) => [entry, ...current]);
  }

  function createRevision(summary: string, content: readonly string[] = [submittedContent]) {
    const nextRevisionNumber = revisions.length + 1;
    const nextRevisionId = `revision-${nextRevisionNumber}`;
    const nextLabel = `Version ${nextRevisionNumber} draft`;
    setRevisions((current) => [
      ...current.map((revision) => ({ ...revision, status: "superseded" as const })),
      { id: nextRevisionId, label: nextLabel, author: "Maya Chen", time: new Date().toISOString(), status: "draft", summary, content: [...content] },
    ]);
    setActiveRevisionId(nextRevisionId);
    setContentVersion(nextLabel);
    return nextLabel;
  }

  function applySuggestion(findingId: string) {
    if (!permissions.canApplySuggestion) {
      notify(`${roleLabels[currentRole]} can comment and review, but cannot edit this draft.`);
      return;
    }
    const finding = findings.find((item) => item.id === findingId);
    if (!finding || finding.resolved) return;

    const replacement = suggestionReplacement(finding.suggestion);
    const revisedContent = submittedContent.replace(finding.span.text, replacement);
    const nextLabel = createRevision(`Applied the suggested correction for ${finding.category.toLowerCase()}.`, [revisedContent]);
    setSubmittedContent(revisedContent);
    setAuditState("needs-changes");
    setFindings((current) => current.map((item) => (item.id === findingId ? { ...item, resolved: true, actionStatus: "accepted" } : item)));
    addActivity({ icon: "✦", title: "Suggestion applied", detail: `${finding.category} correction added to ${nextLabel}.`, time: "Just now", tone: "good" });
    appendAuditEvent({ kind: "suggestion_applied", actor: "Maya Chen", role: currentRole, summary: `${finding.category} suggestion applied to ${nextLabel}.`, contentVersion: nextLabel });
    notify("Suggestion applied to a new revision. The original content is preserved.");
  }

  function undoSuggestion(findingId: string) {
    if (!permissions.canApplySuggestion) return;
    const finding = findings.find((item) => item.id === findingId);
    if (!finding) return;
    const revisedContent = submittedContent.replace(suggestionReplacement(finding.suggestion), finding.span.text);
    const nextLabel = createRevision(`Reopened the ${finding.category.toLowerCase()} finding for review.`, [revisedContent]);
    setSubmittedContent(revisedContent);
    setFindings((current) => current.map((item) => (item.id === findingId ? { ...item, resolved: false, actionStatus: "open" } : item)));
    setAuditState("needs-changes");
    addActivity({ icon: "↶", title: "Finding reopened", detail: `${finding.category} is open again in ${nextLabel}.`, time: "Just now", tone: "alert" });
    appendAuditEvent({ kind: "suggestion_applied", actor: "Maya Chen", role: currentRole, summary: `${finding.category} correction was undone in ${nextLabel}.`, contentVersion: nextLabel });
    notify("The finding is open again for review.");
  }

  function runRescan() {
    if (!canRescan) {
      notify("Resolve the remaining findings before running a re-scan.");
      return;
    }

    setAuditState("scanning");
    notify("Proofline is checking the revision against the same VoltEdge source set.");
    window.setTimeout(() => {
      setAuditState("ready");
      addActivity({ icon: "✓", title: "Version re-scan passed", detail: "The same source set found no new issues.", time: "Just now", tone: "good" });
      appendAuditEvent({ kind: "rescan_completed", actor: "Proofline audit service", role: currentRole, summary: `${contentVersion} re-scan completed with no new findings.`, contentVersion });
      notify("Re-scan complete. The revision is ready for human approval.");
    }, 1200);
  }

  function submitForApproval() {
    if (!canSubmit) return;
    setAuditState("submitted");
    addActivity({ icon: "↗", title: `${contentVersion} sent for approval`, detail: "The revision is now in the authorised reviewer queue.", time: "Just now" });
    appendAuditEvent({ kind: "submitted_for_approval", actor: "Maya Chen", role: currentRole, summary: `${contentVersion} submitted for an authorised review decision.`, contentVersion });
    notify("Revision sent to the approval queue.");
  }

  function approveReview() {
    if (!canApprove) return;
    setAuditState("approved");
    const note = decisionNote.trim() || "Approved after evidence review.";
    addActivity({ icon: "✓", title: `${contentVersion} approved`, detail: "Approval, actor, timestamp, and evidence links are retained.", time: "Just now", tone: "good" });
    appendAuditEvent({ kind: "revision_approved", actor: "Maya Chen", role: currentRole, summary: `${contentVersion} approved. Note: ${note}`, contentVersion });
    notify("Approved. The decision and evidence links are now part of the audit history.");
  }

  function requestChanges() {
    if (!permissions.canRequestChanges || auditState === "approved") return;
    const note = decisionNote.trim();
    if (!note) {
      notify("Add a decision note before requesting changes.");
      return;
    }
    setAuditState("changes-requested");
    addActivity({ icon: "!", title: "Changes requested", detail: note, time: "Just now", tone: "alert" });
    appendAuditEvent({ kind: "changes_requested", actor: "Maya Chen", role: currentRole, summary: `Changes requested: ${note}`, contentVersion });
    setDecisionNote("");
    notify("The review note was added and the creator was notified.");
  }

  function addSpanComment() {
    const text = commentDraft.trim();
    if (!text || !selectedFinding || !permissions.canComment) return;
    const comment: SpanComment = { id: `comment-${comments.length + 1}`, findingId: selectedFinding.id, author: "Maya Chen", role: currentRole, text, time: new Date().toISOString(), contentVersion };
    setComments((current) => [...current, comment]);
    addActivity({ icon: "◌", title: "Span comment added", detail: `${selectedFinding.category} comment linked to the content span.`, time: "Just now" });
    appendAuditEvent({ kind: "comment_added", actor: "Maya Chen", role: currentRole, summary: `Comment added to the ${selectedFinding.category.toLowerCase()} span.`, contentVersion });
    setCommentDraft("");
    notify("Comment added to the span and recorded in the audit log.");
  }

  function changeRole(role: ProoflineRole) {
    setCurrentRole(role);
    if (activeView === "audit-log" && !rolePermissions[role].canViewAuditLog) setActiveView("overview");
    if (activeView === "insights" && !rolePermissions[role].canViewInsights) setActiveView("overview");
    appendAuditEvent({ kind: "role_preview_changed", actor: "Maya Chen", role, summary: `Demo role preview changed to ${roleLabels[role]}.`, contentVersion });
    notify(`Role preview: ${roleLabels[role]}. Restricted actions are hidden.`);
  }

  function selectReview(item: ReviewItem) {
    setSelectedReviewId(item.id);
    setDetailTab("findings");
    if (item.id === "novabook-launch") notify("VoltEdge NovaBook S1 launch email is the active review.");
    else notify(`${item.title} is available as a seeded queue preview.`);
  }

  function startNewReview(source: "text" | "document") {
    if (!permissions.canStartReview) return;
    if (source === "document") {
      setDocumentIntakeError(true);
      notify("Document intake is unavailable in this demo because extraction is a STUB.");
      return;
    }
    setIsStartModalOpen(false);
    setDocumentIntakeError(false);
    navigate("reviews");
    notify("Text intake opened. The seeded VoltEdge review is ready to inspect.");
  }

  const pageTitles: Record<View, string> = {
    overview: "Overview",
    reviews: "Review queue",
    registry: "Truth registry",
    insights: "Insights",
    "audit-log": "Audit log",
  };

  const navViews = (Object.keys(pageTitles) as View[]).filter((view) => view !== "audit-log" || permissions.canViewAuditLog).filter((view) => view !== "insights" || permissions.canViewInsights);
  const openReviewCount = reviewItems.filter((item) => (item.id === "novabook-launch" ? queueStatusForAudit[auditState] : item.status) !== "approved").length;

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">P</div>
          <div>
            <div className="brand-name">Proofline</div>
            <div className="brand-caption">Brand truth, before publish.</div>
          </div>
        </div>

        <button className="workspace-switcher" type="button" onClick={() => notify("Workspace switching is scoped to the VoltEdge demo workspace.")}>
          <span className="workspace-dot" />
          <span>VoltEdge workspace</span>
          <span className="chevron" aria-hidden="true">⌄</span>
        </button>

        <nav className="nav-list" aria-label="Primary">
          <Link className="nav-item" href="/submit"><span aria-hidden="true">＋</span>Submit content</Link>
          <Link className="nav-item" href="/impact"><span aria-hidden="true">!</span>Impact radar</Link>
          {navViews.map((view) => (
              <button className={`nav-item ${activeView === view ? "active" : ""}`} key={view} type="button" aria-current={activeView === view ? "page" : undefined} onClick={() => navigate(view)}>
              <span aria-hidden="true">{view === "overview" ? "◈" : view === "reviews" ? "◇" : view === "registry" ? "▦" : view === "insights" ? "⌁" : "≋"}</span>
              {pageTitles[view]}
              {view === "reviews" ? <b>{openReviewCount}</b> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {permissions.canManageRegistry ? <button className="nav-item muted" type="button" onClick={() => navigate("registry")}><span aria-hidden="true">⚙</span> Workspace settings</button> : null}
          <div className="registry-health"><span className="health-dot" /><div><strong>Seeded registry</strong><small>VoltEdge demo · local state only</small></div></div>
          <div className="profile-card">
            <div className="avatar">{roleInitials(currentRole)}</div>
            <div><strong>Maya Chen</strong><small>{roleLabels[currentRole]}</small></div>
            <span className="more" aria-hidden="true">•••</span>
          </div>
        </div>
      </aside>

      <section id="main-content" className="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb"><span>VoltEdge Labs</span><i>/</i><strong>{pageTitles[activeView]}</strong></div>
          <div className="top-actions">
            <span className="save-state"><span className="health-dot" /> Demo state only</span>
            <label className="role-preview"><span>Role preview</span><select aria-label="Role preview" value={currentRole} onChange={(event) => changeRole(event.target.value as ProoflineRole)}>{(Object.keys(roleLabels) as ProoflineRole[]).map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
            <button className="icon-button" type="button" aria-label="Open AI and services disclosure" onClick={() => setIsDisclosureOpen(true)}>?</button>
            <button className="avatar avatar-button" type="button" aria-label="Open Maya Chen profile" onClick={() => notify(`Signed in as Maya Chen · ${roleLabels[currentRole]}`)}>{roleInitials(currentRole)}</button>
          </div>
        </header>

        <div className="content-wrap">
          {activeView === "overview" ? (
            <section className="view-panel" aria-labelledby="overview-heading">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Sunday, October 25, 2026 <span className="eyebrow-dot" /> Week at a glance</p>
                  <h1 id="overview-heading">Good morning, Maya.</h1>
                  <p className="lede">Your workspace has <strong>{openReviewCount} items</strong> waiting for a human decision.</p>
                </div>
                {permissions.canStartReview ? <button className="primary-button" type="button" onClick={() => setIsStartModalOpen(true)}><span>＋</span> Start a review</button> : <span className="permission-note heading-permission">Read-only reviewer view</span>}
              </div>

              <div className="signal-grid" aria-label="Workspace signals">
                <article className="signal-card highlight"><div className="signal-label">In review <span className="trend up">↑ 18%</span></div><div className="signal-value">{openReviewCount + 8}</div><div className="signal-foot">content items this week</div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
                <article className="signal-card"><div className="signal-label">Open findings <span className="trend down">↓ 6%</span></div><div className="signal-value">{openFindings.length + 4}</div><div className="signal-foot">{highCount} high priority in this review</div><div className="progress-track"><span style={{ width: `${Math.max(26, 100 - openFindings.length * 18)}%` }} /></div></article>
                <article className="signal-card"><div className="signal-label">Registry coverage <span className="trend up">↑ 4%</span></div><div className="signal-value">86<span className="value-unit">%</span></div><div className="signal-foot">facts with an active source</div><div className="progress-track mint"><span style={{ width: "86%" }} /></div></article>
              </div>

              <div className="dashboard-grid">
                <section className="panel workflow-panel">
                  <div className="panel-heading"><div><p className="eyebrow">The Proofline method</p><h2>From source to sign-off</h2></div><span className="panel-badge">3 steps</span></div>
                  <div className="workflow-list">{workflow.map((step) => <div className="workflow-row" key={step.number}><span className="step-number">{step.number}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div><span className="row-arrow" aria-hidden="true">↗</span></div>)}</div>
                  <div className="workflow-note"><span>✦</span> Every finding keeps its evidence trail.</div>
                </section>

                <section className="panel activity-panel">
                  <div className="panel-heading"><div><p className="eyebrow">Needs your attention</p><h2>Recent activity</h2></div><button className="text-link" type="button" onClick={() => navigate("reviews")}>View review <span>↗</span></button></div>
                  <div className="finding-list">{activity.slice(0, 4).map((item) => <div className="finding-row" key={`${item.title}-${item.time}`}><span className={`finding-icon ${item.tone ?? "blue"}`} aria-hidden="true">{item.icon}</span><div className="finding-copy"><div><span className={`finding-label ${item.tone ?? "blue"}`}>{item.tone === "good" ? "Approved" : item.tone === "alert" ? "Needs review" : "Activity"}</span><time>{item.time}</time></div><strong>{item.title}</strong></div><span className="row-arrow" aria-hidden="true">↗</span></div>)}</div>
                </section>
              </div>

              <section className="tip-banner"><div className="tip-icon">✦</div><div><strong>Make your registry work harder.</strong><p>Add one approved source to unlock evidence-linked reviews for your next campaign.</p></div><button type="button" className="tip-link" onClick={() => navigate("registry")}>Open truth registry <span>↗</span></button></section>
              <footer className="footer"><span>Proofline beta · VoltEdge seeded workspace · local state only</span><span><Link href="/privacy">Privacy and AI disclosure</Link> · Built for confident publishing.</span></footer>
            </section>
          ) : null}

          {activeView === "reviews" ? (
            <section className="view-panel" aria-labelledby="reviews-heading">
              <div className="page-heading compact-heading"><div><p className="eyebrow">Content review</p><h1 id="reviews-heading">Make the decision easy to defend.</h1><p className="lede">Every finding below is connected to a current source, rule, or explicit evidence gap.</p></div><div className="review-summary-chip"><span className="status-dot coral" /><strong>{openFindings.length} findings need review</strong></div></div>
              <div className="review-layout">
                <section className="panel review-list-panel" aria-labelledby="review-list-heading">
                  <div className="panel-heading"><div><p className="eyebrow">Assigned to you</p><h2 id="review-list-heading">Open reviews</h2></div><span className="risk-sort-note">Highest risk first</span></div>
                  <div className="queue-controls" aria-label="Review queue filters">
                    <label>Risk<select className="filter-select" value={queueRiskFilter} onChange={(event) => setQueueRiskFilter(event.target.value as "all" | QueueRisk)}><option value="all">All risk</option><option value="high">High risk</option><option value="medium">Medium risk</option><option value="low">Low risk</option></select></label>
                    <label>Status<select className="filter-select" value={queueStatusFilter} onChange={(event) => setQueueStatusFilter(event.target.value as "all" | QueueStatus)}><option value="all">All statuses</option>{(Object.keys(statusLabels) as QueueStatus[]).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
                    <label>Sort<select className="filter-select" value={queueSort} onChange={(event) => setQueueSort(event.target.value as QueueSort)}><option value="risk">Highest risk</option><option value="newest">Newest first</option></select></label>
                  </div>
                  <div className="queue-list">
                    {filteredQueueItems.length ? filteredQueueItems.map((item) => {
                      const itemStatusLabel = item.id === "novabook-launch" ? auditStateLabels[auditState] : item.statusLabel;
                      return <button className={`queue-item ${selectedReviewId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => selectReview(item)} aria-current={selectedReviewId === item.id ? "true" : undefined}><span className={`file-icon ${item.tone}`}>{item.icon}</span><span><strong>{item.title}</strong><small>{item.type} · {item.submittedBy} · {item.time}</small></span><span className={`queue-status ${item.tone}`}><span className={`status-dot ${item.risk}`} />{itemStatusLabel}<small className="queue-risk-score">{item.riskScore}</small></span></button>;
                    }) : <StatePanel kind="empty" title="No reviews match these filters." description="Clear a filter to bring the next VoltEdge item into view." />}
                  </div>
                </section>

                <section className="review-detail" aria-labelledby="detail-heading">
                  <div className="detail-header"><div className="detail-title-wrap"><div className={`file-icon ${selectedReview.tone}`}>{selectedReview.icon}</div><div><div className="title-row"><h2 id="detail-heading">{selectedReview.title}</h2><span className={`status-pill ${selectedQueueStatus === "approved" ? "approved" : selectedQueueStatus === "in-review" ? "in-review" : selectedQueueStatus === "review-required" ? "review-required" : "needs-changes"}`}>{selectedStatusLabel}</span></div><p className="detail-meta">{selectedReview.type} · {selectedIsInteractive ? contentVersion.replace("Version ", "v") : "Version 1"} · Submitted by {selectedReview.submittedBy} · {selectedReview.time}</p></div></div><button className="icon-button detail-more" type="button" aria-label="More review actions" onClick={() => notify("Review actions are available through the decision record below.")}>•••</button></div>

                  {selectedIsInteractive ? <>
                    <div className="review-progress" aria-label="Review progress"><div className="progress-step done"><span>✓</span><strong>Submitted</strong></div><div className={`progress-line ${openFindings.length === 0 ? "done" : ""}`} /><div className={`progress-step ${openFindings.length === 0 ? "done" : "active"}`}><span>{openFindings.length === 0 ? "✓" : "2"}</span><strong>Resolve findings</strong></div><div className={`progress-line ${auditState === "submitted" || auditState === "approved" ? "done" : ""}`} /><div className={`progress-step ${auditState === "submitted" ? "active" : auditState === "approved" ? "done" : ""}`}><span>{auditState === "approved" ? "✓" : "3"}</span><strong>Approval</strong></div></div>
                  </> : <div className="preview-state"><span className="status-dot blue" /><div><strong>Seeded queue preview</strong><p>Select the VoltEdge NovaBook S1 launch email to inspect findings, comments, revisions, and review decisions.</p></div></div>}

                  <div className="detail-tabs" role="tablist" aria-label="Review detail tabs">{(["findings", "content", "history"] as DetailTab[]).map((tab) => <button className={`detail-tab ${detailTab === tab ? "active" : ""}`} id={`review-tab-${tab}`} key={tab} type="button" role="tab" tabIndex={detailTab === tab ? 0 : -1} aria-selected={detailTab === tab} aria-controls={`review-panel-${tab}`} onKeyDown={(event) => handleDetailTabKeyDown(event, tab)} onClick={() => setDetailTab(tab)}>{tab === "findings" ? "Findings" : tab === "content" ? "Submitted content" : "History"}{tab === "findings" && selectedIsInteractive ? <span className="tab-count">{openFindings.length}</span> : null}</button>)}</div>

                  {detailTab === "findings" ? <div id="review-panel-findings" className="detail-tab-panel" role="tabpanel" aria-labelledby="review-tab-findings" tabIndex={0}>{selectedIsInteractive ? <>
                    <div className={`finding-banner ${openFindings.length === 0 ? "success" : ""}`}><div className="banner-symbol">{openFindings.length === 0 ? "✓" : "!"}</div><div><strong>{openFindings.length === 0 ? "All findings resolved" : `${openFindings.length} ${openFindings.length === 1 ? "issue needs" : "issues need"} attention before approval`}</strong><p>{openFindings.length === 0 ? "Run a fresh scan to confirm the revision, then send it to an authorised reviewer." : "Apply the suggested correction, then run a fresh scan to confirm the revision."}</p></div><span className="banner-risk">{openFindings.length === 0 ? "Ready to scan" : `${highCount} high · ${mediumCount} medium`}</span></div>
                    <div className="finding-list detailed-list">{findings.map((finding) => <article className={`finding-card ${finding.resolved ? "resolved" : ""}`} key={finding.id}><div className="finding-card-top"><span className="finding-label"><span className={`status-dot ${finding.severity}`} />{finding.category}</span><span className={`finding-severity ${finding.severity}`}>{finding.resolved ? "Resolved" : severityLabel(finding.severity)}</span></div><p className="finding-excerpt">{finding.excerpt}</p><p className="finding-description">{finding.resolved ? "The suggested correction is included in this revision and will be checked again during the next scan." : finding.description}</p><div className="evidence-row"><span className="evidence-icon">⌁</span><div><strong>{finding.evidenceTitle}</strong><p>{finding.evidence}</p><span className={`evidence-status ${finding.evidenceStatus === "evidence not found" ? "gap" : ""}`}>{finding.evidenceStatus}</span></div></div><div className="finding-footer"><div className="suggestion"><span className="suggestion-icon">✦</span><p><strong>Suggested correction:</strong> {finding.suggestion}</p></div><div className="finding-actions"><button className="small-button comment-link" type="button" onClick={() => { setSelectedSpanId(finding.id); setDetailTab("content"); }}>{comments.filter((comment) => comment.findingId === finding.id).length} span comment{comments.filter((comment) => comment.findingId === finding.id).length === 1 ? "" : "s"}</button>{permissions.canApplySuggestion ? finding.resolved ? <button className="small-button" type="button" onClick={() => undoSuggestion(finding.id)}>Undo</button> : <button className="small-button apply-button" type="button" onClick={() => applySuggestion(finding.id)}>Apply</button> : null}</div></div></article>)}</div>
                    <div className={`scan-panel ${auditState === "scanning" ? "scanning" : auditState === "ready" ? "complete" : ""}`}><div className="scan-copy"><span className="scan-icon">{auditState === "scanning" ? "↻" : auditState === "ready" ? "✓" : "⌁"}</span><div><strong>{auditState === "scanning" ? "Checking the revision" : auditState === "ready" ? "Revision ready for approval" : "Re-scan after corrections"}</strong><p>{auditState === "scanning" ? "Using the same VoltEdge registry and ruleset." : auditState === "ready" ? "No new findings were returned by the seeded audit state." : "A fresh audit keeps the correction and source versions traceable."}</p></div></div>{auditState === "scanning" ? <span className="scan-loading">Working…</span> : auditState === "ready" ? <span className="scan-loading complete-copy">Verified</span> : permissions.canApplySuggestion ? <button className="secondary-button" type="button" disabled={!canRescan} onClick={runRescan}>Run re-scan</button> : null}</div>
                  </> : <div className="preview-placeholder"><strong>No detail loaded for this seeded preview.</strong><p>The collaboration demo is attached to the VoltEdge NovaBook S1 launch email, where each flagged span has a source, comments, and a revision trail.</p></div>}</div> : null}

                  {detailTab === "content" ? <div id="review-panel-content" className="detail-tab-panel" role="tabpanel" aria-labelledby="review-tab-content" tabIndex={0}>{selectedIsInteractive ? <>
                    <ReviewContentPreview content={submittedContent} contentVersion={contentVersion} findings={findings} selectedSpanId={selectedSpanId} onSelectSpan={setSelectedSpanId} />
                    <SpanComments findings={findings} selectedId={selectedSpanId} onSelect={setSelectedSpanId} comments={comments} canComment={permissions.canComment} roleLabels={roleLabels} draft={commentDraft} onDraftChange={setCommentDraft} onAddComment={addSpanComment} />
                    <p className="tab-helper">Suggested edits create a new version rather than replacing the original submission. Proofline does not publish content automatically.</p>
                  </> : <div className="preview-placeholder"><strong>Submitted content preview</strong><p>Open the VoltEdge NovaBook S1 launch email to inspect span-level comments.</p></div>}</div> : null}

                  {detailTab === "history" ? <div id="review-panel-history" className="detail-tab-panel" role="tabpanel" aria-labelledby="review-tab-history" tabIndex={0}>{selectedIsInteractive ? <>
                    <RevisionHistory revisions={revisions} selectedId={activeRevisionId} onSelect={setActiveRevisionId} />
                    <div className="history-list"><div className="history-section-heading"><div><p className="eyebrow">Decision activity</p><h3>Who changed what</h3></div><button className="text-link" type="button" onClick={() => navigate("audit-log")}>Open audit log <span>↗</span></button></div>{activity.map((item) => <div className="history-item" key={`${item.title}-${item.time}`}><span className={`history-icon ${item.tone ?? ""}`}>{item.icon}</span><div className="history-copy"><strong>{item.title}</strong><p>{item.detail}</p></div><span className="history-time">{item.time}</span></div>)}</div>
                  </> : <div className="preview-placeholder"><strong>No revision history loaded for this seeded preview.</strong><p>The active VoltEdge launch email retains every revision and decision in its audit trail.</p></div>}</div> : null}

                  {selectedIsInteractive ? <section className="review-decision-panel" aria-labelledby="decision-heading"><div className="decision-panel-heading"><div><p className="eyebrow">Decision record</p><h3 id="decision-heading">Leave the next action easy to audit.</h3></div><span className="decision-role"><span className="status-dot blue" /> {roleLabels[currentRole]}</span></div><label className="decision-note-label" htmlFor="decision-note">Decision note{permissions.canRequestChanges ? <span>Required for a change request</span> : null}<textarea id="decision-note" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Add context for the creator or future reviewer…" rows={3} /></label><div className="decision-actions">{permissions.canRequestChanges && auditState !== "approved" ? <button className="ghost-button wide-button" type="button" onClick={requestChanges}>Request changes</button> : null}{permissions.canApprove && canApprove ? <button className="primary-button wide-button" type="button" onClick={approveReview}>Approve revision</button> : null}{permissions.canSubmit && canSubmit ? <button className="primary-button wide-button" type="button" onClick={submitForApproval}>Send for approval</button> : null}{!permissions.canApprove && !permissions.canRequestChanges && !permissions.canSubmit ? <span className="permission-note">This role can inspect evidence and comments. Approval actions are hidden.</span> : null}</div></section> : null}
                </section>
              </div>
            </section>
          ) : null}

          {activeView === "registry" ? <section className="view-panel" aria-labelledby="registry-heading"><div className="page-heading compact-heading"><div><p className="eyebrow">Brand truth registry</p><h1 id="registry-heading">The sources behind every decision.</h1><p className="lede">Current approved facts and rules are versioned, scoped, and visible to reviewers.</p></div>{permissions.canManageRegistry ? <button className="primary-button" type="button" onClick={() => setIsSourceModalOpen(true)}><span>＋</span> Add source</button> : <span className="permission-note heading-permission">Read-only registry view</span>}</div><div className="registry-grid">{registryRecords.filter((record) => currentRole !== "agency" || record.title === "NovaBook S1 · Battery life").map((record) => <article className="registry-card" key={record.title}><div className="registry-card-top"><span className="registry-type">{record.type}</span><span className="registry-status"><span className="health-dot" /> Active</span></div><h3>{record.title}</h3><p className="registry-value">{record.value}</p><div className="registry-meta"><span><strong>Source</strong> {record.source}</span><span><strong>Owner</strong> {record.owner}</span><span>{record.version}</span></div>{permissions.canManageRegistry && record.title === "NovaBook S1 · Battery life" ? <button className="small-button" type="button" onClick={() => notify("Battery fact is already approved in this synthetic registry.")}>Approve</button> : null}</article>)}</div><div className="registry-footer"><span className="health-dot" /><strong>All 18 active records have an owner and source.</strong><span>Last reviewed October 24, 2026</span></div></section> : null}

          {activeView === "insights" ? <section className="view-panel" aria-labelledby="insights-heading"><div className="page-heading compact-heading"><div><p className="eyebrow">Governance insights</p><h1 id="insights-heading">See where your guidelines need help.</h1><p className="lede">Patterns come from saved findings and reviewer decisions, not model confidence scores.</p></div><div className="heading-actions"><span className="review-summary-chip"><span className="status-dot blue" /> Last 30 days</span><Link className="ghost-button pl-link-button" href="/insights">Open insights dashboard</Link></div></div><div className="insights-grid"><section className="panel insight-chart-card"><div className="panel-heading"><div><p className="eyebrow">Issue mix</p><h2>What keeps surfacing</h2></div></div><div className="bar-chart">{issueMix.map((item) => <div className="bar-row" key={item.label}><label>{item.label}</label><div className="bar-track"><span className={item.tone} style={{ width: `${item.value}%` }} /></div><strong>{item.count}</strong></div>)}</div></section><section className="panel insight-list-card"><div className="panel-heading"><div><p className="eyebrow">Guideline health</p><h2>Clarity opportunities</h2></div></div><div className="clarity-list">{clarityOpportunities.map(([title, copy]) => <div className="clarity-item" key={title}><span className="clarity-marker" /><div><strong>{title}</strong><p>{copy}</p></div></div>)}</div></section></div><div className="privacy-note"><span>◌</span><p><strong>Human review stays in the loop.</strong> Insights suggest where a rule may need clarification; only an authorised brand owner can update the registry.</p></div></section> : null}

          {activeView === "audit-log" && permissions.canViewAuditLog ? <ReviewAuditLog events={auditLog} chainState={chainState} chainError={chainError} kindLabels={auditKindLabels} roleLabels={roleLabels} /> : null}
        </div>
      </section>

        {isStartModalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setIsStartModalOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="start-review-title" onKeyDown={(event) => event.key === "Escape" && setIsStartModalOpen(false)} onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsStartModalOpen(false)}>×</button><p className="eyebrow">New review</p><h2 id="start-review-title">Bring a draft into Proofline.</h2><p className="modal-copy">Choose a supported intake path. The demo keeps the original submission intact while you inspect its evidence trail.</p>{documentIntakeError ? <StatePanel kind="error" title="Document intake is unavailable" description="PDF, DOCX, JPG, and PNG extraction is a STUB in this build. Use the seeded text review instead." actionLabel="Dismiss message" onAction={() => setDocumentIntakeError(false)} /> : null}<div className="intake-options"><button className="intake-option" type="button" onClick={() => startNewReview("text")}><span className="intake-icon">T</span><span><strong>Paste text</strong><small>Best for a quick claim check</small></span><span>→</span></button><button className="intake-option" type="button" onClick={() => startNewReview("document")}><span className="intake-icon">▧</span><span><strong>Upload a document</strong><small>Unavailable · extraction is a STUB</small></span><span>→</span></button></div></section></div> : null}

      {isSourceModalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setIsSourceModalOpen(false)}><section className="modal-card source-modal" role="dialog" aria-modal="true" aria-labelledby="source-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsSourceModalOpen(false)}>×</button><p className="eyebrow">Registry intake</p><h2 id="source-title">Add an approved source.</h2><p className="modal-copy">This demo keeps source intake intentionally explicit: an authorised owner supplies the source, scope, and validity before it can inform a review.</p><div className="source-form"><label>Source name<input defaultValue="Campaign claims policy" /></label><label>Applies to<select defaultValue="VoltEdge Labs"><option>VoltEdge Labs</option><option>VoltEdge NovaBook S1</option></select></label><label>Validity<input defaultValue="Current · reviewed October 25, 2026" /></label></div><button className="primary-button modal-save" type="button" onClick={() => { setIsSourceModalOpen(false); notify("Source draft saved for authorised review."); }}>Save source draft</button></section></div> : null}

      {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
      <DisclosurePanel open={isDisclosureOpen} onClose={() => setIsDisclosureOpen(false)} />
    </main>
  );
}
