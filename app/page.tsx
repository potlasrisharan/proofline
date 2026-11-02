"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AppSidebar } from "./components/app-sidebar";
import { DisclosurePanel } from "./components/disclosure-panel";
import { StatePanel } from "./components/status-state";
import { useLocalAuditLog } from "./components/use-local-audit-log";
import { RevisionHistory, type ReviewRevision } from "./components/revision-history";
import { ReviewAuditLog } from "./components/review-audit-log";
import { ReviewContentPreview, suggestionReplacement } from "./components/review-content-preview";
import { SpanComments, type VersionedSpanComment } from "./components/span-comments";
import { ComplianceQualityGate, ComplianceCertificateModal } from "./components/compliance-quality-gate";
import {
  EnterpriseSingleLogin,
  ActiveRoleWorkflowBanner,
  SingleLoginModal,
  demoPersonas,
} from "./components/role-dashboard-showcase";
import { CreatorPlatformStudioModal } from "./components/creator-platform-studio";
import PortalPage from "./portal/page";
import type { ProoflineRole } from "./lib/proofline-api";

type View = "overview" | "reviews" | "registry" | "insights" | "audit-log" | "portal";
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

type RegistryRecord = {
  type: string;
  title: string;
  value: string;
  source: string;
  owner: string;
  version: string;
  status?: "draft" | "approved";
};

const registryRecords: RegistryRecord[] = [
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

function replaceFindingText(content: string, finding: Finding, replacement: string) {
  const exactAtOriginalOffset = content.slice(finding.span.start, finding.span.end) === finding.span.text;
  if (exactAtOriginalOffset) {
    return `${content.slice(0, finding.span.start)}${replacement}${content.slice(finding.span.end)}`;
  }
  const matches: number[] = [];
  let cursor = content.indexOf(finding.span.text);
  while (cursor >= 0) {
    matches.push(cursor);
    cursor = content.indexOf(finding.span.text, cursor + finding.span.text.length);
  }
  if (matches.length !== 1) {
    throw new Error("The finding no longer identifies one exact span. Run a fresh check before editing it.");
  }
  const start = matches[0];
  return `${content.slice(0, start)}${replacement}${content.slice(start + finding.span.text.length)}`;
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

function initialDashboardView(): View {
  if (typeof window === "undefined") return "overview";
  const requestedView = new URLSearchParams(window.location.search).get("view");
  return requestedView === "portal" || requestedView === "reviews" || requestedView === "registry" || requestedView === "insights" || requestedView === "audit-log" ? requestedView : "overview";
}

const emptySubscribe = () => () => {};

function getClientGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

function getClientDateString(): string {
  try {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Sunday, October 25, 2026";
  }
}

export default function Home() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>(initialDashboardView);

  useEffect(() => {
    const handleUrlView = () => {
      const requestedView = new URLSearchParams(window.location.search).get("view");
      if (requestedView === "portal" || requestedView === "reviews" || requestedView === "registry" || requestedView === "insights" || requestedView === "audit-log") {
        setActiveView(requestedView);
      } else if (!requestedView && window.location.pathname === "/") {
        setActiveView("overview");
      }
    };
    handleUrlView();
    window.addEventListener("popstate", handleUrlView);
    return () => window.removeEventListener("popstate", handleUrlView);
  }, []);

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
  const [currentRole, setCurrentRole] = useState<ProoflineRole>(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("proofline:active-role") || window.localStorage.getItem("proofline:active-role");
      if (stored === "creator" || stored === "manager" || stored === "legal_reviewer" || stored === "brand_owner" || stored === "agency") {
        return stored;
      }
    }
    return "legal_reviewer";
  });
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
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isComplianceCertOpen, setIsComplianceCertOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("openSwitchRole") === "true" || params.get("switchRole") === "1";
    }
    return false;
  });
  const [isCreatorStudioOpen, setIsCreatorStudioOpen] = useState(false);
  const [isIndicModalOpen, setIsIndicModalOpen] = useState(false);
  const [indicLang, setIndicLang] = useState<"te" | "hi">("te");
  const [engineMode, setEngineMode] = useState<"api" | "browser">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("proofline.execution_mode");
      if (saved === "api" || saved === "browser") return saved;
    }
    return "api";
  });
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["LinkedIn", "Instagram", "X"]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchReceipts, setDispatchReceipts] = useState<{ channel: string; platformPostId: string; status: string }[] | null>(null);
  const [documentIntakeError, setDocumentIntakeError] = useState(false);
  const [submittedContent, setSubmittedContent] = useState(defaultSubmitForm.content);
  const [localRegistryRecords, setLocalRegistryRecords] = useState<RegistryRecord[]>(registryRecords);
  const [sourceDraft, setSourceDraft] = useState({ title: "Campaign claims policy", scope: "VoltEdge Labs", validity: "Current · reviewed October 25, 2026" });
  const greeting = useSyncExternalStore(emptySubscribe, getClientGreeting, () => "Good morning");
  const currentDateStr = useSyncExternalStore(emptySubscribe, getClientDateString, () => "Sunday, October 25, 2026");

  const permissions = rolePermissions[currentRole];
  const activePersona = demoPersonas[currentRole] ?? demoPersonas.legal_reviewer;
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
    window.history.replaceState(null, "", view === "overview" ? "/" : `/?view=${view}`);
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
    let revisedContent: string;
    try {
      revisedContent = replaceFindingText(submittedContent, finding, replacement);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The finding no longer matches this revision.");
      return;
    }
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
    const correctedText = suggestionReplacement(finding.suggestion);
    const correctedStart = submittedContent.indexOf(correctedText);
    if (correctedStart < 0 || submittedContent.indexOf(correctedText, correctedStart + correctedText.length) >= 0) {
      notify("The corrected wording is no longer unique in this revision. Run a fresh scan before undoing it.");
      return;
    }
    const revisedContent = `${submittedContent.slice(0, correctedStart)}${finding.span.text}${submittedContent.slice(correctedStart + correctedText.length)}`;
    const nextLabel = createRevision(`Reopened the ${finding.category.toLowerCase()} finding for review.`, [revisedContent]);
    setSubmittedContent(revisedContent);
    setFindings((current) => current.map((item) => (item.id === findingId ? { ...item, resolved: false, actionStatus: "open" } : item)));
    setAuditState("needs-changes");
    addActivity({ icon: "↶", title: "Finding reopened", detail: `${finding.category} is open again in ${nextLabel}.`, time: "Just now", tone: "alert" });
    appendAuditEvent({ kind: "suggestion_applied", actor: "Maya Chen", role: currentRole, summary: `${finding.category} correction was undone in ${nextLabel}.`, contentVersion: nextLabel });
    notify("The finding is open again for review.");
  }

  function addMandatoryDisclaimer() {
    if (!permissions.canApplySuggestion && currentRole !== "legal_reviewer") {
      notify(`${roleLabels[currentRole]} can comment and review, but cannot edit this draft.`);
      return;
    }
    const disclaimerText = " *Terms apply. Full details at voltedge.com/terms.";
    if (submittedContent.includes("voltedge.com/terms")) {
      notify("Mandatory disclaimer footnote is already present in draft.");
      return;
    }
    const revisedContent = `${submittedContent.trim()}${disclaimerText}`;
    const nextLabel = createRevision("Added mandatory terms disclaimer footnote.", [revisedContent]);
    setSubmittedContent(revisedContent);
    addActivity({ icon: "⚖️", title: "Disclaimer added", detail: `Mandatory legal terms footnote added to ${nextLabel}.`, time: "Just now", tone: "good" });
    appendAuditEvent({ kind: "suggestion_applied", actor: "Maya Chen", role: currentRole, summary: `Mandatory disclaimer footnote inserted into ${nextLabel}.`, contentVersion: nextLabel });
    notify("Mandatory legal disclaimer added to new draft revision.");
  }

  function applySafeHarbor() {
    const finding = findings.find((item) => item.id === "reliable");
    if (!finding || finding.resolved) {
      notify("Superlative claim has already been mitigated.");
      return;
    }
    const replacement = suggestionReplacement(finding.suggestion);
    let revisedContent: string;
    try {
      revisedContent = replaceFindingText(submittedContent, finding, replacement);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The finding no longer matches this revision.");
      return;
    }
    const nextLabel = createRevision(`Applied safe-harbor rewrite for ${finding.category.toLowerCase()}.`, [revisedContent]);
    setSubmittedContent(revisedContent);
    setAuditState("needs-changes");
    setFindings((current) => current.map((item) => (item.id === "reliable" ? { ...item, resolved: true, actionStatus: "accepted" } : item)));
    addActivity({ icon: "⚖️", title: "Safe-harbor applied", detail: `Statutory safe-harbor rewrite added to ${nextLabel}.`, time: "Just now", tone: "good" });
    appendAuditEvent({ kind: "suggestion_applied", actor: "Maya Chen", role: currentRole, summary: `Superlative safe-harbor rewrite applied to ${nextLabel}.`, contentVersion: nextLabel });
    notify("Safe-harbor rewrite applied to new revision.");
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

  function handleDispatch() {
    if (selectedChannels.length === 0) {
      notify("Select at least one channel to dispatch.");
      return;
    }
    setIsDispatching(true);
    window.setTimeout(() => {
      const receipts = selectedChannels.map((ch) => ({
        channel: ch,
        platformPostId: `${ch.toLowerCase()}_sim_${Math.random().toString(36).substring(2, 9)}`,
        status: "published_simulated",
      }));
      setDispatchReceipts(receipts);
      setIsDispatching(false);
      appendAuditEvent({
        kind: "revision_approved",
        actor: "Maya Chen",
        role: currentRole,
        summary: `Dispatched to ${selectedChannels.join(", ")} via Multi-Channel Dispatch (Simulated).`,
        contentVersion,
      });
      addActivity({
        icon: "↗",
        title: `Dispatched to ${selectedChannels.length} channels`,
        detail: `Social & CMS dispatch: ${selectedChannels.join(", ")}.`,
        time: "Just now",
        tone: "good",
      });
      notify("Simulated multi-platform dispatch complete!");
    }, 900);
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
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("proofline:active-role", role);
      window.localStorage.setItem("proofline:active-role", role);
    }
    const persona = demoPersonas[role] ?? demoPersonas.legal_reviewer;
    if (activeView === "audit-log" && !rolePermissions[role].canViewAuditLog) setActiveView("overview");
    if (activeView === "insights" && !rolePermissions[role].canViewInsights) setActiveView("overview");
    appendAuditEvent({ kind: "role_preview_changed", actor: persona.name, role, summary: `Logged in as ${persona.name} (${persona.title}).`, contentVersion });
    notify(`Signed in as ${persona.name} · ${persona.title} (${roleLabels[role]}).`);
  }

  function launchRoleDashboard(role: ProoflineRole) {
    changeRole(role);
    const persona = demoPersonas[role] ?? demoPersonas.legal_reviewer;
    navigate(persona.primaryView);
    if (persona.primaryView === "reviews") {
      setSelectedReviewId("novabook-launch");
      setDetailTab("findings");
      setSelectedSpanId("battery");
    }
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
      setIsStartModalOpen(false);
      router.push("/submit");
      return;
    }
    setIsStartModalOpen(false);
    setDocumentIntakeError(false);
    navigate("reviews");
    notify("Text intake opened. The seeded VoltEdge review is ready to inspect.");
  }

  function saveSourceDraft() {
    const title = sourceDraft.title.trim();
    const validity = sourceDraft.validity.trim();
    if (!title || !validity) {
      notify("Add a source name and validity before saving the draft.");
      return;
    }
    if (localRegistryRecords.some((record) => record.title.localeCompare(title, undefined, { sensitivity: "accent" }) === 0)) {
      notify("A registry entry with this name already exists in the local workspace.");
      return;
    }
    setLocalRegistryRecords((current) => [
      ...current,
      {
        type: "Claim policy",
        title,
        value: `Scoped to ${sourceDraft.scope}`,
        source: `${title} · draft`,
        owner: "Maya Chen · Brand owner",
        version: `Draft · ${validity}`,
        status: "draft",
      },
    ]);
    setIsSourceModalOpen(false);
    notify(`Source draft “${title}” saved to the local registry view. It is not active until approved.`);
  }

  const pageTitles: Record<View, string> = {
    overview: "Overview",
    reviews: "Review queue",
    registry: "Truth registry",
    insights: "Insights",
    "audit-log": "Audit log",
    portal: "Enterprise Role Portal",
  };

  const openReviewCount = reviewItems.filter((item) => (item.id === "novabook-launch" ? queueStatusForAudit[auditState] : item.status) !== "approved").length;

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppSidebar
        activeKey={activeView}
        onNavigateView={navigate}
        openReviewCount={openReviewCount}
        currentRole={roleLabels[currentRole]}
        roleKey={currentRole}
        onSwitchRole={() => setIsRoleModalOpen(true)}
      />

      <section id="main-content" className="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb"><span>VoltEdge Labs</span><i>/</i><strong>{pageTitles[activeView]}</strong></div>
          <div className="top-actions">
            <div className="backend-mode-toggle" role="radiogroup" aria-label="Backend Execution Engine">
              <span className="backend-toggle-label">Engine:</span>
              <button
                type="button"
                className={`backend-toggle-option ${engineMode === "api" ? "active" : ""}`}
                onClick={() => {
                  setEngineMode("api");
                  if (typeof window !== "undefined") window.localStorage.setItem("proofline.execution_mode", "api");
                  notify("Connected to live Cloudflare Edge API (Python Worker + D1 SQL).");
                }}
                aria-checked={engineMode === "api"}
                role="radio"
                title="Live Cloudflare Python Worker + D1 Database"
              >
                <span className="engine-dot live" /> ⚡ Cloudflare API (Default)
              </button>
              <button
                type="button"
                className={`backend-toggle-option ${engineMode === "browser" ? "active" : ""}`}
                onClick={() => {
                  setEngineMode("browser");
                  if (typeof window !== "undefined") window.localStorage.setItem("proofline.execution_mode", "browser");
                  notify("Switched to Local Demo mode (In-memory browser session).");
                }}
                aria-checked={engineMode === "browser"}
                role="radio"
                title="Client-side JavaScript only (offline demo)"
              >
                <span className="engine-dot local" /> 💻 Local Engine
              </button>
            </div>
            <span className="save-state"><span className="health-dot" /> Enterprise workspace</span>
            <label className="role-preview"><span>Role preview</span><select aria-label="Role preview" value={currentRole} onChange={(event) => changeRole(event.target.value as ProoflineRole)}>{(Object.keys(roleLabels) as ProoflineRole[]).map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
            <button className="icon-button" type="button" aria-label="Open AI and services disclosure" onClick={() => setIsDisclosureOpen(true)}>?</button>
            <button
              className={`avatar avatar-button persona-avatar ${activePersona.badgeTone}`}
              type="button"
              aria-label={`Open ${activePersona.name} profile`}
              onClick={() => setIsRoleModalOpen(true)}
              title="Click to switch account / role"
            >
              {activePersona.initials}
            </button>
          </div>
        </header>

        <div className="content-wrap">
          <ActiveRoleWorkflowBanner
            currentRole={currentRole}
            onOpenSwitchRole={() => setIsRoleModalOpen(true)}
            onOpenCreatorStudio={() => setIsCreatorStudioOpen(true)}
          />

          {activeView === "overview" ? (
            <section className="view-panel" aria-labelledby="overview-heading">
              <div className="page-heading">
                <div>
                  <p className="eyebrow" suppressHydrationWarning>{currentDateStr} <span className="eyebrow-dot" /> VoltEdge Workspace</p>
                  <h1 id="overview-heading" suppressHydrationWarning>{greeting}, {activePersona.name.split(" ")[0]}.</h1>
                  <button
                    className="friendly-role-badge clickable-role-badge"
                    type="button"
                    onClick={() => setIsRoleModalOpen(true)}
                    title="Click to switch account / role"
                  >
                    <span>👤</span>
                    <span>Logged in as <strong>{activePersona.name} ({activePersona.title})</strong> · <code>{activePersona.email}</code></span>
                    <span className="role-switch-pill">⇄ Switch Role</span>
                  </button>
                  <p className="lede">Your workspace has <strong>{openReviewCount} items</strong> waiting for a human decision.</p>
                </div>
                <div className="overview-actions">
                  <button className="ghost-button" type="button" onClick={() => window.dispatchEvent(new Event("proofline:open-tour"))}>
                    Take the guided tour
                  </button>
                  {permissions.canStartReview ? (
                    <button className="primary-button" type="button" onClick={() => setIsStartModalOpen(true)}>
                      <span>＋</span> Start a review
                    </button>
                  ) : (
                    <span className="permission-note heading-permission">Read-only reviewer view</span>
                  )}
                </div>
              </div>

              {/* SEPARATE MAIN SCREEN GATEWAY BANNER */}
              <div
                className="portal-entry-card"
                role="region"
                aria-label="Separate Main Screen & Dedicated Dashboards"
                style={{
                  background: "#ffffff",
                  border: "2px solid #176553",
                  borderRadius: 12,
                  padding: "16px 22px",
                  margin: "18px 0 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  boxShadow: "0 4px 18px rgba(23, 101, 83, 0.08)",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#176553", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    🚀 SEPARATE MAIN SCREEN &amp; DEDICATED ROLE DASHBOARDS
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 850, color: "#0c2b23", margin: "4px 0" }}>
                    Proofline Enterprise Role Portal
                  </h3>
                  <p style={{ fontSize: 12, color: "#496a5f", margin: 0, lineHeight: 1.5 }}>
                    Access the separate main screen with individual logins and tailored dashboards for Creator, Campaign Manager, Legal Reviewer, Brand Owner, and Agency Partner.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Link
                    href="/portal"
                    prefetch={false}
                    className="primary-button"
                    style={{ textDecoration: "none", whiteSpace: "nowrap", padding: "10px 18px", fontSize: 12, fontWeight: 800 }}
                  >
                    Open Separate Main Screen (/portal) →
                  </Link>
                </div>
              </div>

              {/* WHAT WE PROVIDE - HERO & CORE VALUE PILLARS */}
              <div className="what-we-provide-hero" role="region" aria-label="What Proofline Provides">
                <div className="what-we-provide-badge">
                  <span>🛡️</span>
                  <span>What Proofline Provides · Automated Brand Truth &amp; Quality Gate</span>
                </div>
                <h2 className="what-we-provide-title">
                  The Automated Quality Gate &amp; Fact-Checker Before You Publish.
                </h2>
                <p className="what-we-provide-lede">
                  Proofline protects brands from unverified claims, regulatory fines, and reputational risk. We automatically verify marketing text, product announcements, and creator posts against your company&apos;s approved specifications and legal guidelines with 1-click fixes.
                </p>

                <div className="what-we-provide-grid">
                  <div className="provide-card">
                    <div className="provide-icon-box coral">🎯</div>
                    <h3>1. Automated Spec &amp; Fact Verification</h3>
                    <p>
                      Automatically catches false numbers and specs (like claiming &ldquo;20h battery&rdquo; when lab tests say &ldquo;12 hours&rdquo;). Highlights inaccuracies with visual diffs and applies approved lab specs in 1 click.
                    </p>
                    <span className="provide-badge">Zero Hallucinations</span>
                  </div>

                  <div className="provide-card">
                    <div className="provide-icon-box blue">⚖️</div>
                    <h3>2. Legal &amp; Regulatory Quality Gate</h3>
                    <p>
                      Scans copy against statutory rules (FTC 16 CFR § 255 sponsorship tags, Lanham Act § 43(a) superlative risks). Automatically generates tamper-proof cryptographic compliance certificates.
                    </p>
                    <span className="provide-badge">Audit-Proof Evidence</span>
                  </div>

                  <div className="provide-card">
                    <div className="provide-icon-box mint">🚀</div>
                    <h3>3. Role Governance &amp; Gated Dispatch</h3>
                    <p>
                      Strict separation of duties across Creators, Editorial Managers, Legal Reviewers, and Brand Owners. Unlocks 1-click gated multi-channel dispatch (LinkedIn, X, Instagram) only after human sign-off.
                    </p>
                    <span className="provide-badge">5 Role Workspaces</span>
                  </div>
                </div>

                <div className="what-we-provide-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("proofline:open-tour"))}
                  >
                    ▶ Take Guided Product Tour
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      navigate("reviews");
                      setSelectedReviewId("novabook-launch");
                      setDetailTab("findings");
                      setSelectedSpanId("battery");
                      notify("Inspecting NovaBook S1 launch email in review workspace.");
                    }}
                  >
                    Open Review Workspace →
                  </button>
                  <Link className="ghost-button" href="/submit" prefetch={false}>
                    ＋ Test Marketing Copy Now
                  </Link>
                </div>
              </div>

              {/* SINGLE ENTERPRISE LOGIN & QUICK-ROLE ACCESS DIRECTLY BELOW */}
              <EnterpriseSingleLogin
                currentRole={currentRole}
                onSelectRole={launchRoleDashboard}
              />

              <footer className="footer">
                <span>Proofline · VoltEdge workspace · Truth Engine active</span>
                <span>
                  <Link href="/privacy" prefetch={false}>Privacy and AI disclosure</Link> · Built for confident publishing.
                </span>
              </footer>
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
                    <ComplianceQualityGate
                      findings={findings}
                      submittedContent={submittedContent}
                      auditState={auditState}
                      currentRoleLabel={roleLabels[currentRole]}
                      onViewCertificate={() => setIsComplianceCertOpen(true)}
                      onAddDisclaimer={addMandatoryDisclaimer}
                      onApplySafeHarbor={applySafeHarbor}
                    />
                    <div className="helper-hint-callout" style={{ margin: "4px 0 14px" }}>
                      <span>💡</span>
                      <div>
                        <strong>How to review this draft:</strong> Review the flagged claims below. Click <strong>&ldquo;Apply&rdquo;</strong> to update the draft with the approved lab spec, then run <strong>&ldquo;Run re-scan&rdquo;</strong> to confirm zero errors.
                      </div>
                    </div>
                    <div className={`finding-banner ${openFindings.length === 0 ? "success" : ""}`}><div className="banner-symbol">{openFindings.length === 0 ? "✓" : "!"}</div><div><strong>{openFindings.length === 0 ? "All findings resolved" : `${openFindings.length} ${openFindings.length === 1 ? "issue needs" : "issues need"} attention before approval`}</strong><p className="micro-helper">{openFindings.length === 0 ? "Run a fresh scan to confirm revision, then send for approval." : "Apply corrections, then run a fresh scan to confirm."}</p></div><span className="banner-risk">{openFindings.length === 0 ? "Ready to scan" : `${highCount} high · ${mediumCount} medium`}</span></div>
                    <div className="finding-list detailed-list">{findings.map((finding) => (
                      <article className={`finding-card ${finding.resolved ? "resolved" : ""}`} key={finding.id}>
                        <div className="finding-card-top">
                          <span className="finding-label"><span className={`status-dot ${finding.severity}`} /><strong>{finding.category}</strong></span>
                          <span className={`finding-severity ${finding.severity}`}>{finding.resolved ? "Resolved" : severityLabel(finding.severity)}</span>
                        </div>
                        {/* Visual Diff: Red strike-through offending phrase -> Green bold suggested fix */}
                        <div className="diff-highlight-box">
                          <div className="diff-segment diff-del">
                            <span className="diff-tag">Flagged text</span>
                            <del>{finding.excerpt}</del>
                          </div>
                          <span className="diff-arrow" aria-hidden="true">→</span>
                          <div className="diff-segment diff-ins">
                            <span className="diff-tag">Suggested fix</span>
                            <ins>{suggestionReplacement(finding.suggestion)}</ins>
                          </div>
                        </div>
                        {finding.resolved ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", background: "var(--mint-soft)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "var(--mint-deep, #1b604e)", margin: "8px 0" }}>
                            <span>✓</span> Fix applied to draft! Run re-scan below to confirm.
                          </div>
                        ) : null}
                        {/* High-contrast evidence chip */}
                        <div className="approved-fact-pill" title={finding.evidenceTitle}>
                          <span>⌁</span>
                          <span><strong>Evidence:</strong> {finding.evidence}</span>
                          <span className={`evidence-status ${finding.evidenceStatus === "evidence not found" ? "gap" : ""}`}>{finding.evidenceStatus}</span>
                        </div>
                        {/* Action buttons */}
                        <div className="finding-footer">
                          <div className="finding-actions">
                            <button className="small-button comment-link" type="button" onClick={() => { setSelectedSpanId(finding.id); setDetailTab("content"); }}>
                              {comments.filter((comment) => comment.findingId === finding.id).length} span comment{comments.filter((comment) => comment.findingId === finding.id).length === 1 ? "" : "s"}
                            </button>
                            {permissions.canApplySuggestion ? finding.resolved ? (
                              <button className="small-button" type="button" onClick={() => undoSuggestion(finding.id)} title="Undo fix and restore original text">Undo</button>
                            ) : (
                              <button className="small-button apply-button" type="button" onClick={() => applySuggestion(finding.id)} title="Update draft text with approved lab spec">Apply</button>
                            ) : null}
                          </div>
                        </div>
                        {/* Progressive Disclosure: Collapsible Rule Rationale */}
                        <details className="finding-meta-accordion">
                          <summary className="meta-summary">
                            <span>Rule rationale & method</span>
                            <span aria-hidden="true">▾</span>
                          </summary>
                          <div className="meta-drawer">
                            <p className="finding-description">{finding.resolved ? "The suggested correction is included in this revision and will be checked again during the next scan." : finding.description}</p>
                            <div className="meta-chips">
                              <span className="meta-chip">Source: {finding.evidenceTitle}</span>
                              <span className="meta-chip">Method: {finding.method}</span>
                              <span className="meta-chip">Confidence: {Math.round((finding.confidence || 0.9) * 100)}%</span>
                            </div>
                          </div>
                        </details>
                      </article>
                    ))}</div>
                    <div className={`scan-panel ${auditState === "scanning" ? "scanning" : auditState === "ready" ? "complete" : ""}`}><div className="scan-copy"><span className="scan-icon">{auditState === "scanning" ? "↻" : auditState === "ready" ? "✓" : "⌁"}</span><div><strong>{auditState === "scanning" ? "Checking the revision" : auditState === "ready" ? "Revision ready for approval" : "Re-scan after corrections"}</strong><p className="micro-helper">{auditState === "scanning" ? "Scanning against current VoltEdge registry." : auditState === "ready" ? "Zero open findings returned." : "Verify corrections before final approval."}</p></div></div>{auditState === "scanning" ? <span className="scan-loading">Working…</span> : auditState === "ready" ? <span className="scan-loading complete-copy">Verified</span> : permissions.canApplySuggestion ? <button className="secondary-button" type="button" disabled={!canRescan} onClick={runRescan}>Run re-scan</button> : null}</div>
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
                  {selectedIsInteractive && auditState === "approved" ? (
                    <section className="publish-dispatch-banner" aria-label="Gated publication dispatch">
                      <div className="dispatch-badge">
                        <span className="dispatch-check" aria-hidden="true">✓</span>
                        <div>
                          <strong>Compliance verified · Ready for 1-click dispatch</strong>
                          <p className="micro-helper" style={{ margin: 0 }}>All claims substantiated against VoltEdge truth registry.</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          className="ghost-button"
                          type="button"
                          style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff", padding: "0 12px", minHeight: 38, fontSize: 11, fontWeight: 700 }}
                          onClick={() => setIsComplianceCertOpen(true)}
                        >
                          📜 Compliance Certificate
                        </button>
                        <button
                          className="dispatch-btn"
                          type="button"
                          onClick={() => {
                            setDispatchReceipts(null);
                            setIsPublishModalOpen(true);
                          }}
                        >
                          Dispatch to Channels ↗
                        </button>
                      </div>
                    </section>
                  ) : null}
                </section>
              </div>
            </section>
          ) : null}

          {activeView === "registry" ? <section className="view-panel" aria-labelledby="registry-heading"><div className="page-heading compact-heading"><div><p className="eyebrow">Brand truth registry</p><h1 id="registry-heading">The sources behind every decision.</h1><p className="lede">Current approved facts and rules are versioned, scoped, and visible to reviewers.</p></div>{permissions.canManageRegistry ? <button className="primary-button" type="button" onClick={() => setIsSourceModalOpen(true)}><span>＋</span> Add source</button> : <span className="permission-note heading-permission">Read-only registry view</span>}</div><div className="registry-grid">{localRegistryRecords.filter((record) => currentRole !== "agency" || record.title === "NovaBook S1 · Battery life").map((record) => <article className="registry-card registry-card-compact" key={`${record.title}-${record.version}`}><div className="registry-card-top"><span className="badge-pill pill-pass">{record.type}</span><span className="registry-status"><span className="health-dot" /> {record.status === "draft" ? "Draft · not active" : "Active"}</span></div><h3>{record.title}</h3><p className="registry-value">{record.value}</p><div className="registry-meta"><span><strong>Source:</strong> {record.source}</span><span><strong>Owner:</strong> {record.owner}</span><span>{record.version}</span></div>{permissions.canManageRegistry && record.title === "NovaBook S1 · Battery life" ? <button className="small-button apply-button" type="button" style={{ marginTop: 10, width: "100%" }} onClick={() => notify("Battery fact is already approved in this synthetic registry.")}>Approve</button> : null}</article>)}</div><div className="registry-footer"><span className="health-dot" /><strong>{localRegistryRecords.filter((record) => record.status !== "draft").length} active records shown; every source keeps an owner and status.</strong><span>Last reviewed October 24, 2026</span></div></section> : null}

          {activeView === "insights" ? <section className="view-panel" aria-labelledby="insights-heading"><div className="page-heading compact-heading"><div><p className="eyebrow">Governance insights</p><h1 id="insights-heading">See where your guidelines need help.</h1><p className="lede">Patterns come from saved findings and reviewer decisions, not model confidence scores.</p></div><div className="heading-actions"><span className="review-summary-chip"><span className="status-dot blue" /> Last 30 days</span><Link className="ghost-button pl-link-button" href="/insights" prefetch={false}>Open insights dashboard</Link></div></div><div className="insights-grid"><section className="panel insight-chart-card"><div className="panel-heading"><div><p className="eyebrow">Issue mix</p><h2>What keeps surfacing</h2></div></div><div className="bar-chart">{issueMix.map((item) => <div className="bar-row" key={item.label}><label>{item.label}</label><div className="bar-track"><span className={item.tone} style={{ width: `${item.value}%` }} /></div><strong>{item.count}</strong></div>)}</div></section><section className="panel insight-list-card"><div className="panel-heading"><div><p className="eyebrow">Guideline health</p><h2>Clarity opportunities</h2></div></div><div className="clarity-list">{clarityOpportunities.map(([title, copy]) => <div className="clarity-item" key={title}><span className="clarity-marker" /><div><strong>{title}</strong><p>{copy}</p></div></div>)}</div></section></div><div className="privacy-note"><span>◌</span><p><strong>Human review stays in the loop.</strong> Insights suggest where a rule may need clarification; only an authorised brand owner can update the registry.</p></div></section> : null}

          {activeView === "audit-log" && permissions.canViewAuditLog ? <ReviewAuditLog events={auditLog} chainState={chainState} chainError={chainError} kindLabels={auditKindLabels} roleLabels={roleLabels} /> : null}

          {activeView === "portal" ? <PortalPage /> : null}
        </div>
      </section>

        {isStartModalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setIsStartModalOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="start-review-title" onKeyDown={(event) => event.key === "Escape" && setIsStartModalOpen(false)} onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsStartModalOpen(false)}>×</button><p className="eyebrow">New review</p><h2 id="start-review-title">Bring a draft into Proofline.</h2><p className="modal-copy">Choose a supported intake path. The demo keeps the original submission intact while you inspect its evidence trail.</p>{documentIntakeError ? <StatePanel kind="error" title="Document intake is unavailable" description="The configured intake path could not be opened. Use paste text or verify your file format." actionLabel="Dismiss message" onAction={() => setDocumentIntakeError(false)} /> : null}<div className="intake-options"><button className="intake-option" type="button" onClick={() => startNewReview("text")}><span className="intake-icon">T</span><span><strong>Paste text</strong><small>Best for a quick claim check</small></span><span>→</span></button><button className="intake-option" type="button" onClick={() => startNewReview("document")}><span className="intake-icon">▧</span><span><strong>Upload a document</strong><small>Text, PDF, DOCX, and image formats</small></span><span>→</span></button></div></section></div> : null}

      {isSourceModalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setIsSourceModalOpen(false)}><section className="modal-card source-modal" role="dialog" aria-modal="true" aria-labelledby="source-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsSourceModalOpen(false)}>×</button><p className="eyebrow">Registry intake</p><h2 id="source-title">Add a source draft.</h2><p className="modal-copy">This demo keeps source intake intentionally explicit: an authorised owner supplies the source, scope, and validity before it can inform a review.</p><div className="source-form"><label>Source name<input value={sourceDraft.title} maxLength={200} onChange={(event) => setSourceDraft((current) => ({ ...current, title: event.target.value }))} /></label><label>Applies to<select value={sourceDraft.scope} onChange={(event) => setSourceDraft((current) => ({ ...current, scope: event.target.value }))}><option>VoltEdge Labs</option><option>VoltEdge NovaBook S1</option></select></label><label>Validity<input value={sourceDraft.validity} maxLength={200} onChange={(event) => setSourceDraft((current) => ({ ...current, validity: event.target.value }))} /></label></div><button className="primary-button modal-save" type="button" onClick={saveSourceDraft}>Save source draft</button></section></div> : null}

      {isPublishModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPublishModalOpen(false)}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatch-modal-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.key === "Escape" && setIsPublishModalOpen(false)}
          >
            <button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsPublishModalOpen(false)}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Image src="/logo.png" alt="Proofline" width={22} height={22} style={{ borderRadius: 5, border: "1px solid rgba(0,0,0,0.1)" }} />
              <p className="eyebrow" style={{ margin: 0 }}>Gated Multi-Platform Dispatch</p>
              <span className="badge-pill pill-risk" style={{ fontSize: 9 }}>SIMULATED · Multi-Channel Dispatch Mock</span>
            </div>
            <h2 id="dispatch-modal-title">Publish approved revision</h2>
            <p className="modal-copy">
              Dispatches verified content across connected social channels and CMS via verified channel APIs. 
              Unverified claims are strictly blocked from distribution.
            </p>

            <div className="dispatch-payload-preview">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <small>Verified Payload · {contentVersion}</small>
                <span className="asset-type-badge">Email &amp; Social Copy</span>
              </div>
              <p>{submittedContent.length > 220 ? `${submittedContent.slice(0, 220)}…` : submittedContent}</p>
            </div>

            <label style={{ fontSize: 11, fontWeight: 750, color: "var(--navy)" }}>Select Target Channels</label>
            <div className="channel-selector-grid">
              {[
                { id: "LinkedIn", name: "LinkedIn Post / Article", icon: "in", cls: "linkedin" },
                { id: "Instagram", name: "Instagram (Carousel / Reel)", icon: "ig", cls: "instagram" },
                { id: "X", name: "X (Twitter) Thread", icon: "𝕏", cls: "x" },
                { id: "Facebook", name: "Facebook Page", icon: "fb", cls: "facebook" },
              ].map((ch) => {
                const checked = selectedChannels.includes(ch.id);
                return (
                  <label key={ch.id} className={`channel-checkbox ${checked ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedChannels((prev) =>
                          checked ? prev.filter((c) => c !== ch.id) : [...prev, ch.id]
                        );
                      }}
                    />
                    <span className={`channel-icon ${ch.cls}`}>{ch.icon}</span>
                    <span style={{ fontSize: 11 }}>{ch.name}</span>
                  </label>
                );
              })}
            </div>

            {dispatchReceipts ? (
              <div className="dispatch-receipt-box">
                <strong>✓ Dispatch Successful (Simulated Sandbox)</strong>
                {dispatchReceipts.map((r) => (
                  <div key={r.platformPostId} className="receipt-item">
                    <span><strong>{r.channel}</strong> · {r.status}</span>
                    <code>{r.platformPostId}</code>
                  </div>
                ))}
                <p style={{ margin: "8px 0 0", fontSize: 9, color: "#4f756b" }}>
                  Audit event recorded: Dispatched by Maya Chen ({roleLabels[currentRole]}).
                </p>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="ghost-button" type="button" onClick={() => setIsPublishModalOpen(false)}>
                {dispatchReceipts ? "Close" : "Cancel"}
              </button>
              {!dispatchReceipts ? (
                <button
                  className="primary-button"
                  type="button"
                  disabled={isDispatching || selectedChannels.length === 0}
                  onClick={handleDispatch}
                >
                  {isDispatching ? "Dispatching…" : `Simulate Multi-Platform Dispatch (${selectedChannels.length})`}
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setDispatchReceipts(null);
                    setIsPublishModalOpen(false);
                  }}
                >
                  Done
                </button>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <ComplianceCertificateModal
        isOpen={isComplianceCertOpen}
        onClose={() => setIsComplianceCertOpen(false)}
        content={submittedContent}
        contentVersion={contentVersion}
        auditState={auditState}
        reviewerName="Maya Chen"
        findings={findings}
      />

      {isIndicModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsIndicModalOpen(false)}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="indic-modal-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.key === "Escape" && setIsIndicModalOpen(false)}
            style={{ maxWidth: 620 }}
          >
            <button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsIndicModalOpen(false)}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Indic Regional Verification</p>
              <span className="badge-pill pill-pass" style={{ fontSize: 9 }}>Powered by Sarvam AI</span>
              <span className="badge-pill pill-pass" style={{ fontSize: 9 }}>PII Masked</span>
            </div>
            <h2 id="indic-modal-title">Cross-Lingual Brand Compliance</h2>
            <p className="modal-copy">
              Verifies regional market copy against registered brand truth. Detects factual contradictions, 
              unsupported claims, and unapproved translations across Indian languages via <code>sarvam-105b</code>.
            </p>

            <div className="indic-tabs">
              <button
                className={`indic-tab-btn ${indicLang === "te" ? "active" : ""}`}
                type="button"
                onClick={() => setIndicLang("te")}
              >
                Telugu (తెలుగు)
              </button>
              <button
                className={`indic-tab-btn ${indicLang === "hi" ? "active" : ""}`}
                type="button"
                onClick={() => setIndicLang("hi")}
              >
                Hindi (हिन्दी)
              </button>
            </div>

            <div className="indic-preview-box">
              <small style={{ color: "#7f938c", textTransform: "uppercase", fontSize: 9, fontWeight: 750 }}>
                Source Copy (English)
              </small>
              <p className="indic-source-quote">
                “VoltEdge NovaBook S1 delivers 36 hours of battery life and is twice as fast as all competitors.”
              </p>
              
              <small style={{ color: "#7f938c", textTransform: "uppercase", fontSize: 9, fontWeight: 750 }}>
                {indicLang === "te" ? "Telugu Translation (Sarvam Translate)" : "Hindi Translation (Sarvam Translate)"}
              </small>
              <p className="indic-quote">
                {indicLang === "te"
                  ? "“వోల్ట్‌ఎడ్జ్ నోవాబుక్ S1 36 గంటల బ్యాటరీ లైఫ్‌ను అందిస్తుంది మరియు మార్కెట్‌లోని అన్ని ల్యాప్‌టాప్‌ల కంటే రెండు రెట్లు వేగవంతమైనది.”"
                  : "“वोल्टएज नोवाबुक S1 36 घंटे की बैटरी लाइफ प्रदान करता है और सभी प्रतिस्पर्धियों की तुलना में दोगुना तेज है।”"}
              </p>
            </div>

            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              <div className="approved-fact-pill" style={{ background: "#fff5f5", borderColor: "#f9d2d2" }}>
                <span style={{ color: "var(--coral)" }}>✗</span>
                <span>
                  <strong style={{ color: "var(--coral)" }}>Fact Mismatch:</strong>{" "}
                  {indicLang === "te" ? "36 గంటలు (36 hours)" : "36 घंटे (36 hours)"} contradicts Truth Registry spec (<strong>Up to 24 hours</strong>).
                </span>
              </div>
              <div className="approved-fact-pill" style={{ background: "#fffaf0", borderColor: "#fae6b8" }}>
                <span style={{ color: "var(--amber)" }}>!</span>
                <span>
                  <strong style={{ color: "#8a6d42" }}>Evidence Gap:</strong>{" "}
                  {indicLang === "te" ? "రెండు రెట్లు వేగవంతమైనది (Twice as fast)" : "दोगुना तेज (Twice as fast)"} lacks comparative benchmark documentation.
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#7a918a" }}>Model: sarvam-105b · saaras:v2</span>
              <button className="primary-button" type="button" onClick={() => setIsIndicModalOpen(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <SingleLoginModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentRole={currentRole}
        onSelectRole={(role) => {
          launchRoleDashboard(role);
          setIsRoleModalOpen(false);
        }}
      />

      <CreatorPlatformStudioModal
        isOpen={isCreatorStudioOpen}
        onClose={() => setIsCreatorStudioOpen(false)}
        initialText={submittedContent}
        onApplyToDraft={(cleanText) => {
          setSubmittedContent(cleanText);
          navigate("reviews");
          setSelectedReviewId("novabook-launch");
          setDetailTab("findings");
          notify("Compliant creator copy applied to workspace! Fresh evidence check verified.");
        }}
      />

      {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
      <DisclosurePanel open={isDisclosureOpen} onClose={() => setIsDisclosureOpen(false)} />
    </main>
  );
}
