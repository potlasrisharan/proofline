const reviewItems = [
  {
    id: "model-x",
    title: "Model X launch email",
    type: "Email campaign",
    submittedBy: "Aisha Rahman",
    time: "18 min ago",
    status: "Needs changes",
    statusClass: "status-high",
    icon: "✣",
    iconClass: "",
  },
  {
    id: "spring-poster",
    title: "Spring upgrade poster",
    type: "Static image · OCR",
    submittedBy: "Leo Martins",
    time: "1 hr ago",
    status: "Review required",
    statusClass: "status-review",
    icon: "▧",
    iconClass: "file-image",
  },
  {
    id: "partner-brief",
    title: "Partner launch brief",
    type: "PDF document",
    submittedBy: "Maya Chen",
    time: "Yesterday",
    status: "In review",
    statusClass: "status-review",
    icon: "▤",
    iconClass: "file-pdf",
  },
  {
    id: "support-note",
    title: "Support team release note",
    type: "Plain text",
    submittedBy: "Sam Okafor",
    time: "Yesterday",
    status: "Approved",
    statusClass: "status-approved",
    icon: "✓",
    iconClass: "",
  },
];

const activities = [
  { initials: "AR", text: "Aisha submitted Model X launch email", time: "18 min" },
  { initials: "MC", text: "You applied a correction to Spring upgrade poster", time: "1 hr" },
  { initials: "LO", text: "Lena approved Support team release note", time: "Yesterday" },
  { initials: "SY", text: "Registry record updated: Model X battery life", time: "Yesterday" },
];

const registryRecords = [
  { type: "Product specification", title: "Model X · Battery life", value: "Up to 10 hours", source: "Product specification v4", owner: "Priya Nair · Product info", version: "Current · reviewed Oct 24" },
  { type: "Voice rule", title: "Tone · Product launches", value: "Clear, capable, never exaggerated", source: "Northstar voice guide v3", owner: "Lena Ortiz · Brand", version: "Current · reviewed Oct 20" },
  { type: "Terminology", title: "Preferred product name", value: "Northstar Model X", source: "Naming system v2", owner: "Maya Chen · Content", version: "Current · reviewed Oct 18" },
  { type: "Promotion rule", title: "Launch offer qualifier", value: "Terms apply · US market", source: "Offer policy v7", owner: "Owen Brooks · Legal ops", version: "Current · reviewed Oct 22" },
  { type: "Claim policy", title: "Comparative claims", value: "Evidence required for “best”", source: "Claims policy v2", owner: "Lena Ortiz · Brand", version: "Current · reviewed Oct 20" },
  { type: "Accessibility rule", title: "Email readability", value: "Normal text contrast ≥ 4.5:1", source: "Accessibility baseline v1", owner: "Maya Chen · Content", version: "Current · reviewed Oct 16" },
];

const findingsSeed = [
  {
    id: "battery",
    category: "Fact mismatch",
    severity: "high",
    label: "High",
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
    label: "Medium",
    excerpt: "“our most reliable laptop yet”",
    description: "Proofline could not find an approved source that substantiates this comparative claim.",
    evidenceTitle: "Evidence not found · Claims policy v2",
    evidence: "Comparative claims need an approved benchmark or a reviewer decision.",
    suggestion: "Soften to “built for dependable, all-day performance”",
    resolved: false,
  },
];

let findings = structuredClone(findingsSeed);
let auditState = "needs-changes";
let history = [
  { icon: "!", iconClass: "is-alert", title: "Audit completed", copy: "2 findings linked to current registry sources.", time: "18 min ago" },
  { icon: "↗", iconClass: "", title: "Version 2 submitted", copy: "Aisha Rahman submitted an updated draft.", time: "21 min ago" },
  { icon: "✓", iconClass: "is-good", title: "Version 1 audited", copy: "1 terminology issue resolved before resubmission.", time: "Yesterday" },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function statusMarkup(item) {
  const dotClass = item.statusClass === "status-high" ? "is-coral" : item.statusClass === "status-approved" ? "is-good" : "";
  return `<span class="queue-status ${item.statusClass}"><span class="status-dot ${dotClass}"></span>${item.status}</span>`;
}

function queueItemMarkup(item, selected = false) {
  const itemStatus = item.id === "model-x" ? statusMarkup(item) : statusMarkup(item);
  return `<button class="queue-item ${selected ? "is-selected" : ""}" data-review-id="${item.id}" type="button">
    <span class="file-icon ${item.iconClass}">${item.icon}</span>
    <span><strong>${item.title}</strong><p>${item.type} · ${item.submittedBy} · ${item.time}</p></span>
    ${itemStatus}
  </button>`;
}

function renderQueues() {
  const queueMarkup = reviewItems.map((item, index) => queueItemMarkup(item, index === 0)).join("");
  $("#overview-queue").innerHTML = reviewItems.slice(0, 3).map((item, index) => queueItemMarkup(item, index === 0)).join("");
  $("#review-queue").innerHTML = queueMarkup;
  $$(`[data-review-id]`).forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.reviewId === "model-x") {
        showView("reviews");
        showToast("Showing the active Model X review.");
      } else {
        showToast("This seeded item is available as a queue preview.");
      }
    });
  });
}

function renderActivities() {
  $("#overview-activity").innerHTML = activities.map((activity) => `<div class="activity-item"><span class="activity-avatar">${activity.initials}</span><p>${activity.text}</p><span class="activity-time">${activity.time}</span></div>`).join("");
}

function renderFindings() {
  const openFindings = findings.filter((finding) => !finding.resolved);
  $("#findings-tab-count").textContent = openFindings.length;
  $("#review-summary-count").textContent = `${openFindings.length} ${openFindings.length === 1 ? "finding needs" : "findings need"} review`;
  const findingBanner = $("#finding-banner");
  if (openFindings.length === 0) {
    findingBanner.innerHTML = `<div class="banner-symbol" style="background: var(--mint);">✓</div><div><strong style="color: var(--mint);">All findings resolved</strong><p>The revision is ready for a fresh scan and human approval.</p></div><span class="banner-risk" style="color: var(--mint);">Ready to re-scan</span>`;
  } else {
    const high = openFindings.filter((finding) => finding.severity === "high").length;
    const medium = openFindings.filter((finding) => finding.severity === "medium").length;
    findingBanner.innerHTML = `<div class="banner-symbol">!</div><div><strong>${openFindings.length} ${openFindings.length === 1 ? "issue needs" : "issues need"} attention before approval</strong><p>Apply the suggested correction, then run a fresh scan to confirm the revision.</p></div><span class="banner-risk">${high} high · ${medium} medium</span>`;
  }
  $("#finding-list").innerHTML = findings.map((finding) => `<article class="finding-card ${finding.resolved ? "is-resolved" : ""}" data-finding-id="${finding.id}">
    <div class="finding-top"><span class="finding-label"><span class="status-dot ${finding.severity}"></span>${finding.category}</span><span class="finding-severity ${finding.severity}">${finding.resolved ? "Resolved" : finding.label}</span></div>
    <p class="finding-excerpt">${finding.excerpt.replace(/(20 hours|most reliable laptop yet)/, "<mark>$1</mark>")}</p>
    <p class="finding-description">${finding.resolved ? "The suggested correction is included in this revision and will be checked again during the next scan." : finding.description}</p>
    <div class="evidence-row"><span class="evidence-icon">⌁</span><div><strong>${finding.evidenceTitle}</strong><p>${finding.evidence}</p></div></div>
    <div class="finding-footer"><div class="suggestion"><span class="suggestion-icon">✦</span><p><strong>Suggested correction:</strong> ${finding.suggestion}</p></div><div class="finding-actions">${finding.resolved ? `<button class="small-button" data-action="undo" type="button">Undo</button>` : `<button class="small-button" data-action="edit" type="button">Edit text</button><button class="small-button apply-button" data-action="apply" type="button">Apply suggestion</button>`}</div></div>
  </article>`).join("");
  $$(`[data-action]`).forEach((button) => {
    button.addEventListener("click", () => handleFindingAction(button.dataset.action, button.closest("[data-finding-id]").dataset.findingId));
  });
  const approveButton = $("#approve-button");
  approveButton.disabled = auditState !== "ready";
}

function renderHistory() {
  $("#history-list").innerHTML = history.map((entry) => `<div class="history-item"><span class="history-icon ${entry.iconClass}">${entry.icon}</span><div class="history-copy"><strong>${entry.title}</strong><p>${entry.copy}</p></div><span class="history-time">${entry.time}</span></div>`).join("");
}

function renderRegistry() {
  $("#registry-grid").innerHTML = registryRecords.map((record) => `<article class="registry-card"><div class="registry-card-top"><span class="registry-type">${record.type}</span><span class="registry-status"><span class="status-dot is-good"></span>Active</span></div><h3>${record.title}</h3><p class="registry-value">${record.value}</p><div class="registry-meta"><span><strong>Source:</strong> ${record.source}</span><span><strong>Owner:</strong> ${record.owner}</span><span>${record.version}</span></div></article>`).join("");
}

function renderInsights() {
  const bars = [
    ["Fact mismatch", 68, "is-coral", 14],
    ["Unsupported claim", 52, "is-amber", 11],
    ["Tone & voice", 39, "", 8],
    ["Terminology", 26, "is-mint", 5],
    ["Accessibility", 18, "is-mint", 3],
  ];
  $("#issue-bars").innerHTML = bars.map(([label, width, color, count]) => `<div class="bar-row"><label>${label}</label><div class="bar-track"><div class="bar-fill ${color}" style="width:${width}%"></div></div><strong>${count}</strong></div>`).join("");
  const clarity = [
    ["Product specification wording", "Reviewers disagree on when “up to” can be used without a qualifier."],
    ["Comparative claim evidence", "3 items were held because no benchmark source was linked."],
    ["Offer qualifiers", "A required terms line was added to 2 drafts this month."],
  ];
  $("#clarity-list").innerHTML = clarity.map(([title, copy]) => `<div class="clarity-item"><span class="clarity-marker"></span><div><strong>${title}</strong><p>${copy}</p></div></div>`).join("");
}

function showView(view) {
  $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  $$(".view-panel").forEach((panel) => panel.classList.toggle("is-visible", panel.dataset.panel === view));
  const labels = { overview: "Overview", reviews: "Review queue", registry: "Truth registry", insights: "Insights" };
  $("#page-breadcrumb").textContent = labels[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDetailTab(tab) {
  $$(".detail-tab").forEach((button) => button.classList.toggle("is-active", button.dataset.detailTab === tab));
  $$(".detail-tab-panel").forEach((panel) => panel.classList.toggle("is-visible", panel.dataset.detailPanel === tab));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function handleFindingAction(action, findingId) {
  const finding = findings.find((item) => item.id === findingId);
  if (!finding) return;
  if (action === "apply") {
    finding.resolved = true;
    if (finding.id === "battery") {
      $("#battery-claim").textContent = "10 hours";
      $("#battery-claim").classList.add("is-resolved");
    }
    if (finding.id === "reliable") {
      $("#content-copy").textContent = "Designed for deep work and long days, Model X gives you up to 10 hours of battery life, with a brighter display and dependable, all-day performance.";
    }
    history.unshift({ icon: "✦", iconClass: "is-good", title: "Suggestion applied", copy: `${finding.category} correction added to Version 3 draft.`, time: "Just now" });
    renderFindings();
    renderHistory();
    $("#content-version-label").textContent = "Version 3 draft";
    showToast("Suggestion applied to a new revision. Original content is preserved.");
  } else if (action === "undo") {
    finding.resolved = false;
    renderFindings();
    showToast("The finding is open again for review.");
  } else if (action === "edit") {
    showDetailTab("content");
    showToast("Edit the submitted text in your source system, then re-submit a new version.");
  }
}

function runRescan() {
  const scanPanel = $("#scan-panel");
  const button = $("#rescan-button");
  if (auditState === "scanning") return;
  auditState = "scanning";
  scanPanel.classList.add("is-scanning");
  button.disabled = true;
  button.textContent = "Scanning…";
  scanPanel.querySelector(".scan-copy strong").textContent = "Checking the revision";
  scanPanel.querySelector(".scan-copy p").textContent = "Comparing Version 3 against the same registry source set.";
  setTimeout(() => {
    auditState = "ready";
    scanPanel.classList.remove("is-scanning");
    scanPanel.classList.add("is-complete");
    button.disabled = false;
    button.textContent = "Submit for approval";
    scanPanel.querySelector(".scan-icon").textContent = "✓";
    scanPanel.querySelector(".scan-copy strong").textContent = "Re-scan complete · ready for approval";
    scanPanel.querySelector(".scan-copy p").textContent = "2 original findings resolved. No new issues detected in Version 3.";
    $("#detail-status").textContent = "Ready for approval";
    $("#detail-status").className = "status-pill status-approved";
    $("#progress-line-two").classList.add("is-done");
    $("#progress-approval").classList.add("is-active");
    $("#progress-approval").querySelector("span").style.borderColor = "var(--blue)";
    $("#progress-approval").querySelector("span").style.background = "var(--blue)";
    $("#progress-approval").querySelector("span").style.color = "#fff";
    renderFindings();
    history.unshift({ icon: "✓", iconClass: "is-good", title: "Version 3 re-scan passed", copy: "The same source set found no new issues.", time: "Just now" });
    renderHistory();
    showToast("Re-scan complete. The revision is ready for human approval.");
  }, 1350);
}

function submitForApproval() {
  if (auditState !== "ready") return;
  auditState = "pending-approval";
  $("#detail-status").textContent = "Pending approval";
  $("#detail-status").className = "status-pill status-in-review";
  $("#rescan-button").disabled = true;
  $("#rescan-button").textContent = "Submitted";
  $("#scan-panel").querySelector(".scan-copy strong").textContent = "Revision submitted for approval";
  $("#scan-panel").querySelector(".scan-copy p").textContent = "An authorised reviewer can now approve or request changes.";
  $("#approve-button").disabled = false;
  $("#progress-approval").classList.add("is-active");
  history.unshift({ icon: "↗", iconClass: "", title: "Version 3 sent for approval", copy: "Maya Chen submitted the revision to the authorised reviewer queue.", time: "Just now" });
  renderHistory();
  showToast("Revision sent to the approval queue.");
}

function approveReview() {
  if ($("#approve-button").disabled) return;
  auditState = "approved";
  $("#detail-status").textContent = "Approved";
  $("#detail-status").className = "status-pill status-approved";
  $("#approve-button").disabled = true;
  $("#request-changes-button").disabled = true;
  $("#progress-approval").classList.remove("is-active");
  $("#progress-approval").classList.add("is-complete");
  $("#progress-approval").querySelector("span").style = "";
  $("#progress-approval").querySelector("span").textContent = "✓";
  history.unshift({ icon: "✓", iconClass: "is-good", title: "Version 3 approved", copy: "Maya Chen approved the revision with all registry links retained.", time: "Just now" });
  renderHistory();
  showToast("Approved. The decision and evidence links are now part of the review history.");
}

function requestChanges() {
  $("#detail-status").textContent = "Changes requested";
  $("#detail-status").className = "status-pill status-needs-changes";
  history.unshift({ icon: "!", iconClass: "is-alert", title: "Changes requested", copy: "Reviewer note added: please confirm the comparative claim evidence.", time: "Just now" });
  renderHistory();
  showToast("A review note was added and the creator was notified.");
}

function setupEvents() {
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
  $$(`[data-view-link]`).forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewLink)));
  $$(".detail-tab").forEach((button) => button.addEventListener("click", () => showDetailTab(button.dataset.detailTab)));
  $("#rescan-button").addEventListener("click", () => auditState === "ready" ? submitForApproval() : runRescan());
  $("#approve-button").addEventListener("click", approveReview);
  $("#request-changes-button").addEventListener("click", requestChanges);
  $("#new-review-button").addEventListener("click", () => $("#start-review-modal").showModal());
  $("#help-button").addEventListener("click", () => showToast("Proofline links each finding to a source or explains when evidence is missing."));
  $("#add-source-button").addEventListener("click", () => showToast("Source intake is staged for the next workspace setup flow."));
}

renderQueues();
renderActivities();
renderFindings();
renderHistory();
renderRegistry();
renderInsights();
setupEvents();
