"use client";

import { useMemo, useState } from "react";

type View = "overview" | "reviews" | "registry" | "insights";
type DetailTab = "findings" | "content" | "history";
type AuditState = "needs-changes" | "scanning" | "ready" | "submitted" | "approved" | "changes-requested";
type Severity = "high" | "medium" | "low";

type Finding = {
  id: string;
  category: string;
  severity: Severity;
  excerpt: string;
  description: string;
  evidenceTitle: string;
  evidence: string;
  suggestion: string;
  resolved: boolean;
};

type Activity = {
  icon: string;
  title: string;
  detail: string;
  time: string;
  tone?: "good" | "alert" | "neutral";
};

const workflow = [
  { number: "01", title: "Set the truth", detail: "Approved facts, rules, and assets" },
  { number: "02", title: "Review content", detail: "Evidence-linked checks before publish" },
  { number: "03", title: "Keep humans in", detail: "Resolve, approve, and learn" },
];

const reviewItems = [
  { id: "model-x", title: "Model X launch email", type: "Email campaign", submittedBy: "Aisha Rahman", time: "18 min ago", status: "Needs changes", icon: "✣", tone: "coral" },
  { id: "spring-poster", title: "Spring upgrade poster", type: "Static image · OCR", submittedBy: "Leo Martins", time: "1 hr ago", status: "Review required", icon: "▧", tone: "amber" },
  { id: "partner-brief", title: "Partner launch brief", type: "PDF document", submittedBy: "Maya Chen", time: "Yesterday", status: "In review", icon: "▤", tone: "blue" },
  { id: "support-note", title: "Support team release note", type: "Plain text", submittedBy: "Sam Okafor", time: "Yesterday", status: "Approved", icon: "✓", tone: "mint" },
];

const registryRecords = [
  { type: "Product specification", title: "Model X · Battery life", value: "Up to 10 hours", source: "Product specification v4", owner: "Priya Nair · Product info", version: "Current · reviewed Oct 24" },
  { type: "Voice rule", title: "Tone · Product launches", value: "Clear, capable, never exaggerated", source: "Northstar voice guide v3", owner: "Lena Ortiz · Brand", version: "Current · reviewed Oct 20" },
  { type: "Terminology", title: "Preferred product name", value: "Northstar Model X", source: "Naming system v2", owner: "Maya Chen · Content", version: "Current · reviewed Oct 18" },
  { type: "Promotion rule", title: "Launch offer qualifier", value: "Terms apply · US market", source: "Offer policy v7", owner: "Owen Brooks · Legal ops", version: "Current · reviewed Oct 22" },
  { type: "Claim policy", title: "Comparative claims", value: "Evidence required for “best”", source: "Claims policy v2", owner: "Lena Ortiz · Brand", version: "Current · reviewed Oct 20" },
  { type: "Accessibility rule", title: "Email readability", value: "Normal text contrast ≥ 4.5:1", source: "Accessibility baseline v1", owner: "Maya Chen · Content", version: "Current · reviewed Oct 16" },
];

const initialFindings: Finding[] = [
  {
    id: "battery",
    category: "Fact mismatch",
    severity: "high",
    excerpt: "“up to 20 hours of battery life”",
    description: "The submitted claim conflicts with the current approved specification for Model X.",
    evidenceTitle: "Approved fact · Model X battery life",
    evidence: "Up to 10 hours · Product specification v4 · US market · Current",
    suggestion: "Change to “up to 10 hours of battery life”",
    resolved: false,
  },
  {
    id: "reliable",
    category: "Unsupported claim",
    severity: "medium",
    excerpt: "“our most reliable laptop yet”",
    description: "Proofline could not find an approved source that substantiates this comparative claim.",
    evidenceTitle: "Evidence not found · Claims policy v2",
    evidence: "Comparative claims need an approved benchmark or a reviewer decision.",
    suggestion: "Soften to “built for dependable, all-day performance”",
    resolved: false,
  },
  {
    id: "tone",
    category: "Tone & voice",
    severity: "low",
    excerpt: "“be among the first to experience”",
    description: "The phrase adds urgency that is not part of the current launch voice guidance.",
    evidenceTitle: "Voice rule · Product launches",
    evidence: "Clear, capable, never exaggerated · Northstar voice guide v3",
    suggestion: "Use “explore the new Model X” for a calmer launch tone",
    resolved: false,
  },
];

const initialActivity: Activity[] = [
  { icon: "!", title: "Audit completed", detail: "3 findings linked to current registry sources.", time: "18 min ago", tone: "alert" },
  { icon: "↗", title: "Version 2 submitted", detail: "Aisha Rahman submitted an updated draft.", time: "21 min ago" },
  { icon: "✓", title: "Version 1 audited", detail: "1 terminology issue resolved before resubmission.", time: "Yesterday", tone: "good" },
  { icon: "↻", title: "Registry record updated", detail: "Model X battery life is current through v4.", time: "Yesterday" },
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

function severityLabel(severity: Severity) {
  return severity[0].toUpperCase() + severity.slice(1);
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [detailTab, setDetailTab] = useState<DetailTab>("findings");
  const [auditState, setAuditState] = useState<AuditState>("needs-changes");
  const [findings, setFindings] = useState< Finding[]>(initialFindings);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);
  const [contentVersion, setContentVersion] = useState("Version 2");
  const [toast, setToast] = useState("");
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

  const openFindings = useMemo(() => findings.filter((finding) => !finding.resolved), [findings]);
  const highCount = openFindings.filter((finding) => finding.severity === "high").length;
  const mediumCount = openFindings.filter((finding) => finding.severity === "medium").length;
  const canRescan = openFindings.length === 0 && auditState === "needs-changes";
  const canSubmit = auditState === "ready";
  const canApprove = auditState === "submitted";

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function navigate(view: View) {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addActivity(entry: Activity) {
    setActivity((current) => [entry, ...current]);
  }

  function applySuggestion(findingId: string) {
    const finding = findings.find((item) => item.id === findingId);
    if (!finding) return;

    setFindings((current) => current.map((item) => (item.id === findingId ? { ...item, resolved: true } : item)));
    setContentVersion("Version 3 draft");
    addActivity({ icon: "✦", title: "Suggestion applied", detail: `${finding.category} correction added to Version 3 draft.`, time: "Just now", tone: "good" });
    notify("Suggestion applied to a new revision. The original content is preserved.");
  }

  function undoSuggestion(findingId: string) {
    setFindings((current) => current.map((item) => (item.id === findingId ? { ...item, resolved: false } : item)));
    setAuditState("needs-changes");
    notify("The finding is open again for review.");
  }

  function runRescan() {
    if (!canRescan) {
      notify("Resolve the remaining findings before running a re-scan.");
      return;
    }

    setAuditState("scanning");
    notify("Proofline is checking the revision against the same source set.");
    window.setTimeout(() => {
      setAuditState("ready");
      addActivity({ icon: "✓", title: "Version 3 re-scan passed", detail: "The same source set found no new issues.", time: "Just now", tone: "good" });
      notify("Re-scan complete. The revision is ready for human approval.");
    }, 1200);
  }

  function submitForApproval() {
    if (!canSubmit) return;
    setAuditState("submitted");
    addActivity({ icon: "↗", title: "Version 3 sent for approval", detail: "Maya Chen submitted the revision to the authorised reviewer queue.", time: "Just now" });
    notify("Revision sent to the approval queue.");
  }

  function approveReview() {
    if (!canApprove) return;
    setAuditState("approved");
    addActivity({ icon: "✓", title: "Version 3 approved", detail: "Approval and registry evidence links are retained in the review history.", time: "Just now", tone: "good" });
    notify("Approved. The decision and evidence links are now part of the review history.");
  }

  function requestChanges() {
    setAuditState("changes-requested");
    addActivity({ icon: "!", title: "Changes requested", detail: "Reviewer note added: confirm the comparative claim evidence.", time: "Just now", tone: "alert" });
    notify("A review note was added and the creator was notified.");
  }

  function startNewReview(source: "text" | "document") {
    setIsStartModalOpen(false);
    navigate("reviews");
    notify(source === "text" ? "Text intake opened. The seeded review is ready to inspect." : "Document intake queued. Extraction status will appear here.");
  }

  const pageTitles: Record<View, string> = {
    overview: "Overview",
    reviews: "Review queue",
    registry: "Truth registry",
    insights: "Insights",
  };

  const statusCopy: Record<AuditState, string> = {
    "needs-changes": "Needs changes",
    scanning: "Scanning",
    ready: "Ready for approval",
    submitted: "Pending approval",
    approved: "Approved",
    "changes-requested": "Changes requested",
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">P</div>
          <div>
            <div className="brand-name">Proofline</div>
            <div className="brand-caption">Brand truth, before publish.</div>
          </div>
        </div>

        <button className="workspace-switcher" type="button" onClick={() => notify("Workspace switching is scoped to the Northstar demo workspace.")}>
          <span className="workspace-dot" />
          <span>Northstar workspace</span>
          <span className="chevron" aria-hidden="true">⌄</span>
        </button>

        <nav className="nav-list" aria-label="Primary">
          {(["overview", "reviews", "registry", "insights"] as View[]).map((view) => (
            <button className={`nav-item ${activeView === view ? "active" : ""}`} key={view} type="button" onClick={() => navigate(view)}>
              <span aria-hidden="true">{view === "overview" ? "◈" : view === "reviews" ? "◇" : view === "registry" ? "▦" : "⌁"}</span>
              {pageTitles[view]}
              {view === "reviews" ? <b>{openFindings.length + 2}</b> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item muted" type="button" onClick={() => notify("Workspace settings are available to authorised brand owners.")}><span aria-hidden="true">⚙</span> Workspace settings</button>
          <div className="registry-health"><span className="health-dot" /><div><strong>Registry is current</strong><small>Last synced 8 min ago</small></div></div>
          <div className="profile-card">
            <div className="avatar">MC</div>
            <div><strong>Maya Chen</strong><small>Content lead</small></div>
            <span className="more" aria-hidden="true">•••</span>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Northstar Labs</span><i>/</i><strong>{pageTitles[activeView]}</strong></div>
          <div className="top-actions">
            <span className="save-state"><span className="health-dot" /> All changes saved</span>
            <button className="icon-button" type="button" aria-label="Explain Proofline" onClick={() => notify("Proofline links each finding to an approved source or explains when evidence is missing.")}>?</button>
            <button className="avatar avatar-button" type="button" aria-label="Open Maya Chen profile" onClick={() => notify("Signed in as Maya Chen · Content lead")}>MC</button>
          </div>
        </header>

        <div className="content-wrap">
          {activeView === "overview" ? (
            <section className="view-panel" aria-labelledby="overview-heading">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Sunday, October 25, 2026 <span className="eyebrow-dot" /> Week at a glance</p>
                  <h1 id="overview-heading">Good morning, Maya.</h1>
                  <p className="lede">Your workspace has <strong>{openFindings.length + 1} items</strong> waiting for a human decision.</p>
                </div>
                <button className="primary-button" type="button" onClick={() => setIsStartModalOpen(true)}><span>＋</span> Start a review</button>
              </div>

              <div className="signal-grid" aria-label="Workspace signals">
                <article className="signal-card highlight"><div className="signal-label">In review <span className="trend up">↑ 18%</span></div><div className="signal-value">12</div><div className="signal-foot">content items this week</div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
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
              <footer className="footer"><span>Proofline beta · seeded workspace</span><span>Built for confident publishing.</span></footer>
            </section>
          ) : null}

          {activeView === "reviews" ? (
            <section className="view-panel" aria-labelledby="reviews-heading">
              <div className="page-heading compact-heading"><div><p className="eyebrow">Content review</p><h1 id="reviews-heading">Make the decision easy to defend.</h1><p className="lede">Every finding below is connected to a current source, rule, or explicit evidence gap.</p></div><div className="review-summary-chip"><span className="status-dot coral" /><strong>{openFindings.length} findings need review</strong></div></div>
              <div className="review-layout">
                <section className="panel review-list-panel" aria-labelledby="review-list-heading"><div className="panel-heading"><div><p className="eyebrow">Assigned to you</p><h2 id="review-list-heading">Open reviews</h2></div><button className="filter-button" type="button" onClick={() => notify("Showing all seeded review statuses.")}>All statuses <span>⌄</span></button></div><div className="queue-list">{reviewItems.map((item, index) => <button className={`queue-item ${index === 0 ? "selected" : ""}`} type="button" key={item.id} onClick={() => index === 0 ? notify("Model X launch email is the active review.") : notify("This seeded item is available as a queue preview.")}><span className={`file-icon ${item.tone}`}>{item.icon}</span><span><strong>{item.title}</strong><small>{item.type} · {item.submittedBy} · {item.time}</small></span><span className={`queue-status ${item.tone}`}><span className="status-dot" />{index === 0 ? statusCopy[auditState] : item.status}</span></button>)}</div></section>

                <section className="review-detail" aria-labelledby="detail-heading">
                  <div className="detail-header"><div className="detail-title-wrap"><div className="file-icon coral">✣</div><div><div className="title-row"><h2 id="detail-heading">Model X launch email</h2><span className={`status-pill ${auditState === "approved" ? "approved" : auditState === "ready" ? "ready" : auditState === "submitted" ? "in-review" : "needs-changes"}`}>{statusCopy[auditState]}</span></div><p className="detail-meta">Email campaign · {contentVersion.replace("Version ", "v")} · Submitted by Aisha Rahman · 18 min ago</p></div></div><button className="icon-button detail-more" type="button" aria-label="More review actions" onClick={() => notify("Review actions are available through the controls below.")}>•••</button></div>

                  <div className="review-progress" aria-label="Review progress"><div className="progress-step done"><span>✓</span><strong>Submitted</strong></div><div className={`progress-line ${openFindings.length === 0 ? "done" : ""}`} /><div className={`progress-step ${openFindings.length === 0 ? "done" : "active"}`}><span>{openFindings.length === 0 ? "✓" : "2"}</span><strong>Resolve findings</strong></div><div className={`progress-line ${auditState === "submitted" || auditState === "approved" ? "done" : ""}`} /><div className={`progress-step ${auditState === "submitted" ? "active" : auditState === "approved" ? "done" : ""}`}><span>{auditState === "approved" ? "✓" : "3"}</span><strong>Approval</strong></div></div>

                  <div className="detail-tabs" role="tablist" aria-label="Review detail tabs">{(["findings", "content", "history"] as DetailTab[]).map((tab) => <button className={`detail-tab ${detailTab === tab ? "active" : ""}`} key={tab} type="button" role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)}>{tab === "findings" ? "Findings" : tab === "content" ? "Submitted content" : "History"}{tab === "findings" ? <span className="tab-count">{openFindings.length}</span> : null}</button>)}</div>

                  {detailTab === "findings" ? <div className="detail-tab-panel"><div className={`finding-banner ${openFindings.length === 0 ? "success" : ""}`}><div className="banner-symbol">{openFindings.length === 0 ? "✓" : "!"}</div><div><strong>{openFindings.length === 0 ? "All findings resolved" : `${openFindings.length} ${openFindings.length === 1 ? "issue needs" : "issues need"} attention before approval`}</strong><p>{openFindings.length === 0 ? "Run a fresh scan to confirm the revision, then send it to an authorised reviewer." : "Apply the suggested correction, then run a fresh scan to confirm the revision."}</p></div><span className="banner-risk">{openFindings.length === 0 ? "Ready to scan" : `${highCount} high · ${mediumCount} medium`}</span></div><div className="finding-list detailed-list">{findings.map((finding) => <article className={`finding-card ${finding.resolved ? "resolved" : ""}`} key={finding.id}><div className="finding-card-top"><span className="finding-label"><span className={`status-dot ${finding.severity}`} />{finding.category}</span><span className={`finding-severity ${finding.severity}`}>{finding.resolved ? "Resolved" : severityLabel(finding.severity)}</span></div><p className="finding-excerpt">{finding.excerpt}</p><p className="finding-description">{finding.resolved ? "The suggested correction is included in this revision and will be checked again during the next scan." : finding.description}</p><div className="evidence-row"><span className="evidence-icon">⌁</span><div><strong>{finding.evidenceTitle}</strong><p>{finding.evidence}</p></div></div><div className="finding-footer"><div className="suggestion"><span className="suggestion-icon">✦</span><p><strong>Suggested correction:</strong> {finding.suggestion}</p></div><div className="finding-actions">{finding.resolved ? <button className="small-button" type="button" onClick={() => undoSuggestion(finding.id)}>Undo</button> : <><button className="small-button" type="button" onClick={() => { setDetailTab("content"); notify("Review the source copy before choosing a correction."); }}>Inspect text</button><button className="small-button apply-button" type="button" onClick={() => applySuggestion(finding.id)}>Apply suggestion</button></>}</div></div></article>)}</div><div className={`scan-panel ${auditState === "scanning" ? "scanning" : auditState === "ready" ? "complete" : ""}`}><div className="scan-copy"><span className="scan-icon">{auditState === "scanning" ? "↻" : auditState === "ready" ? "✓" : "⌁"}</span><div><strong>{auditState === "scanning" ? "Checking the revision" : auditState === "ready" ? "Re-scan complete · ready for approval" : "Ready to re-scan"}</strong><p>{auditState === "scanning" ? "Comparing Version 3 against the same registry source set." : auditState === "ready" ? "No new issues detected in Version 3." : "Run Proofline against the edited version and the same source set."}</p></div></div><button className="secondary-button" type="button" disabled={auditState === "scanning"} onClick={canSubmit ? submitForApproval : runRescan}>{canSubmit ? "Submit for approval" : auditState === "scanning" ? "Scanning…" : "Re-scan revision"}</button></div></div> : null}

                  {detailTab === "content" ? <div className="detail-tab-panel"><div className="content-preview-card"><div className="content-preview-header"><span className="content-type">EMAIL · PRODUCT LAUNCH</span><span className="content-version">{contentVersion}</span></div><h3>Meet the new Northstar Model X.</h3><p>Designed for deep work and long days, Model X gives you up to <mark className={findings.find((finding) => finding.id === "battery")?.resolved ? "resolved-mark" : ""}>{findings.find((finding) => finding.id === "battery")?.resolved ? "10 hours" : "20 hours"}</mark> of battery life, with a brighter display and <mark className={findings.find((finding) => finding.id === "reliable")?.resolved ? "resolved-mark" : "flagged-mark"}>{findings.find((finding) => finding.id === "reliable")?.resolved ? "dependable, all-day performance" : "our most reliable laptop yet"}</mark>.</p><p>{findings.find((finding) => finding.id === "tone")?.resolved ? "Explore the new Model X." : "Pre-order today and be among the first to experience it."}</p><div className="content-footer"><span>Northstar Labs · Consumer hardware</span><span>Source text retained</span></div></div><p className="tab-helper">Suggested edits create a new version rather than replacing the original submission. Proofline does not publish content automatically.</p></div> : null}

                  {detailTab === "history" ? <div className="detail-tab-panel"><div className="history-list">{activity.map((item) => <div className="history-item" key={`${item.title}-${item.time}`}><span className={`history-icon ${item.tone ?? ""}`}>{item.icon}</span><div className="history-copy"><strong>{item.title}</strong><p>{item.detail}</p></div><span className="history-time">{item.time}</span></div>)}</div></div> : null}

                  <div className="review-actions"><button className="ghost-button wide-button" type="button" disabled={auditState === "approved"} onClick={requestChanges}>Request changes</button><button className="primary-button wide-button" type="button" disabled={!canApprove} onClick={approveReview}>Approve revision</button></div>
                </section>
              </div>
            </section>
          ) : null}

          {activeView === "registry" ? <section className="view-panel" aria-labelledby="registry-heading"><div className="page-heading compact-heading"><div><p className="eyebrow">Brand truth registry</p><h1 id="registry-heading">The sources behind every decision.</h1><p className="lede">Current approved facts and rules are versioned, scoped, and visible to reviewers.</p></div><button className="primary-button" type="button" onClick={() => setIsSourceModalOpen(true)}><span>＋</span> Add source</button></div><div className="registry-grid">{registryRecords.map((record) => <article className="registry-card" key={record.title}><div className="registry-card-top"><span className="registry-type">{record.type}</span><span className="registry-status"><span className="health-dot" /> Active</span></div><h3>{record.title}</h3><p className="registry-value">{record.value}</p><div className="registry-meta"><span><strong>Source</strong> {record.source}</span><span><strong>Owner</strong> {record.owner}</span><span>{record.version}</span></div></article>)}</div><div className="registry-footer"><span className="health-dot" /><strong>All 18 active records have an owner and source.</strong><span>Last reviewed October 24, 2026</span></div></section> : null}

          {activeView === "insights" ? <section className="view-panel" aria-labelledby="insights-heading"><div className="page-heading compact-heading"><div><p className="eyebrow">Governance insights</p><h1 id="insights-heading">See where your guidelines need help.</h1><p className="lede">Patterns come from saved findings and reviewer decisions, not model confidence scores.</p></div><span className="review-summary-chip"><span className="status-dot blue" /> Last 30 days</span></div><div className="insights-grid"><section className="panel insight-chart-card"><div className="panel-heading"><div><p className="eyebrow">Issue mix</p><h2>What keeps surfacing</h2></div></div><div className="bar-chart">{issueMix.map((item) => <div className="bar-row" key={item.label}><label>{item.label}</label><div className="bar-track"><span className={item.tone} style={{ width: `${item.value}%` }} /></div><strong>{item.count}</strong></div>)}</div></section><section className="panel insight-list-card"><div className="panel-heading"><div><p className="eyebrow">Guideline health</p><h2>Clarity opportunities</h2></div></div><div className="clarity-list">{clarityOpportunities.map(([title, copy]) => <div className="clarity-item" key={title}><span className="clarity-marker" /><div><strong>{title}</strong><p>{copy}</p></div></div>)}</div></section></div><div className="privacy-note"><span>◌</span><p><strong>Human review stays in the loop.</strong> Insights suggest where a rule may need clarification; only an authorised brand owner can update the registry.</p></div></section> : null}
        </div>
      </section>

      {isStartModalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setIsStartModalOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="start-review-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsStartModalOpen(false)}>×</button><p className="eyebrow">New review</p><h2 id="start-review-title">Bring a draft into Proofline.</h2><p className="modal-copy">Choose a supported intake path. The demo keeps the original submission intact while you inspect its evidence trail.</p><div className="intake-options"><button className="intake-option" type="button" onClick={() => startNewReview("text")}><span className="intake-icon">T</span><span><strong>Paste text</strong><small>Best for a quick claim check</small></span><span>→</span></button><button className="intake-option" type="button" onClick={() => startNewReview("document")}><span className="intake-icon">▧</span><span><strong>Upload a document</strong><small>PDF, DOCX, JPG or PNG</small></span><span>→</span></button></div></section></div> : null}

      {isSourceModalOpen ? <div className="modal-backdrop" role="presentation" onClick={() => setIsSourceModalOpen(false)}><section className="modal-card source-modal" role="dialog" aria-modal="true" aria-labelledby="source-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setIsSourceModalOpen(false)}>×</button><p className="eyebrow">Registry intake</p><h2 id="source-title">Add an approved source.</h2><p className="modal-copy">This demo keeps source intake intentionally explicit: an authorised owner supplies the source, scope, and validity before it can inform a review.</p><div className="source-form"><label>Source name<input defaultValue="Campaign claims policy" /></label><label>Applies to<select defaultValue="Northstar Labs"><option>Northstar Labs</option><option>Northstar Model X</option></select></label><label>Validity<input defaultValue="Current · reviewed October 25, 2026" /></label></div><button className="primary-button modal-save" type="button" onClick={() => { setIsSourceModalOpen(false); notify("Source draft saved for authorised review."); }}>Save source draft</button></section></div> : null}

      {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
    </main>
  );
}
