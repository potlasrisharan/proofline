"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import {
  createLocalApiClient,
  type ContentAuditResponse,
  type Finding,
} from "../lib/proofline-api";
import {
  applyFindingDecision, categoryLabels, channelLabels, createContentReview,
  contentReviewFromApi, defaultContentScope, languageLabels, latestAudit, latestRevision,
  methodLabels, recheckContent, regionLabels, riskBreakdown, sampleVoltEdgeText, verdictLabels,
  type ContentReview, type ContentScope,
} from "../lib/content-review";

const storageKey = "proofline.voltedge.content-review.v1";
const listeners = new Set<() => void>();
let volatileSnapshot: string | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  try { return window.sessionStorage.getItem(storageKey) ?? volatileSnapshot; }
  catch { return volatileSnapshot; }
}

function saveReview(review: ContentReview | null) {
  volatileSnapshot = review ? JSON.stringify(review) : null;
  try {
    if (volatileSnapshot) window.sessionStorage.setItem(storageKey, volatileSnapshot);
    else window.sessionStorage.removeItem(storageKey);
  } catch { /* Browsers with storage disabled keep only this page's in-memory state. */ }
  listeners.forEach((listener) => listener());
}

function parseReview(value: string | null): ContentReview | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as ContentReview;
    if (candidate.schema_version !== 1 || !candidate.id || !candidate.scope || !Array.isArray(candidate.revisions) || !candidate.revisions.length || !Array.isArray(candidate.audits) || !candidate.audits.length || !Array.isArray(candidate.events)) return null;
    if (!candidate.revisions.every((revision) => typeof revision.text === "string" && typeof revision.alt_text === "string" && typeof revision.id === "string")) return null;
    if (!candidate.audits.every((audit) => Array.isArray(audit.findings) && audit.findings.every((finding) => typeof finding.id === "string" && finding.span && typeof finding.span.text === "string" && typeof finding.reason === "string" && finding.verdict in verdictLabels && finding.method in methodLabels))) return null;
    if (!(candidate.scope.channel in channelLabels) || !(candidate.scope.region in regionLabels) || !(candidate.scope.language in languageLabels)) return null;
    return { ...candidate, scope: { ...candidate.scope, confidential: candidate.scope.confidential === true } };
  } catch { return null; }
}

function timestamp(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function exposureForChannel(channel: ContentScope["channel"]): 1 | 2 | 3 {
  return channel === "social" || channel === "web" ? 3 : channel === "email" ? 2 : 1;
}

function apiMetadata(scope: ContentScope) {
  return {
    fictional: true,
    scheduled_date: scope.scheduled_date || null,
    alt_text: scope.alt_text,
    has_image: scope.has_image,
  };
}

function Preview({ text, findings, selected, onSelect }: { text: string; findings: Finding[]; selected: string | null; onSelect: (id: string) => void }) {
  const pieces: ReactNode[] = [];
  let cursor = 0;
  const spans = findings.filter((finding) => finding.span.end > finding.span.start && text.slice(finding.span.start, finding.span.end) === finding.span.text).slice().sort((a, b) => a.span.start - b.span.start);
  spans.forEach((finding, index) => {
    if (finding.span.start < cursor) return;
    pieces.push(<span key={`${finding.id}-before`}>{text.slice(cursor, finding.span.start)}</span>);
    pieces.push(<button key={finding.id} className={`pl-span ${finding.severity} ${selected === finding.id ? "selected" : ""}`} type="button" onClick={() => onSelect(finding.id)} aria-label={`Finding ${index + 1}, ${categoryLabels[finding.category]}, ${verdictLabels[finding.verdict].text}, ${finding.severity} severity`}><span className="pl-span-index" aria-hidden="true">{index + 1}</span>{finding.span.text}</button>);
    cursor = finding.span.end;
  });
  pieces.push(<span key="after">{text.slice(cursor)}</span>);
  return <div className="pl-content-copy">{pieces}</div>;
}

export function ContentWorkspace({ stage }: { stage: "submit" | "findings" }) {
  const router = useRouter();
  const localApi = useMemo(() => createLocalApiClient(), []);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const review = useMemo(() => parseReview(snapshot), [snapshot]);
  const [scope, setScope] = useState<ContentScope>(defaultContentScope);
  const [text, setText] = useState(sampleVoltEdgeText);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [apiFile, setApiFile] = useState<{ data: string; filename: string; mime_type: string; content_type: "pdf" | "docx" | "image" } | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [actionFindingId, setActionFindingId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<"edit" | "dismiss" | null>(null);
  const [actionText, setActionText] = useState("");
  const [contentTab, setContentTab] = useState<"audited" | "current" | "original">("audited");
  const [message, setMessage] = useState("");
  const [apiBusy, setApiBusy] = useState(false);
  const audit = review ? latestAudit(review) : null;
  const revision = review ? latestRevision(review) : null;
  const auditedRevision = review?.revisions.find((item) => item.id === audit?.content_version_id) ?? null;
  const originalRevision = review?.revisions[0] ?? null;
  const risk = audit && review ? riskBreakdown(audit.findings, review.scope.channel) : null;
  const openCount = audit?.findings.filter((finding) => finding.status === "open").length ?? 0;
  const stale = audit?.content_version_id !== revision?.id;

  function updateScope<K extends keyof ContentScope>(field: K, value: ContentScope[K]) {
    setScope((current) => ({ ...current, [field]: value }));
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    const mime = file.type || ({ ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain" }[file.name.slice(file.name.lastIndexOf(".")).toLowerCase()] ?? "");
    const isText = /\.txt$/i.test(file.name) && ["text/plain", "text/markdown"].includes(mime);
    const isApiDocument = Boolean(localApi) && ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"].includes(mime);
    if (!isText && !isApiDocument) {
      setError(localApi ? "Choose a UTF-8 .txt, PDF, DOCX, PNG, or JPG file in local API mode." : "Choose a plain-text .txt file. PDF, DOCX, and image extraction require the opt-in local API mode.");
      event.target.value = "";
      return;
    }
    if (file.size > (isText ? 1024 * 1024 : 10 * 1024 * 1024)) {
      setError(isText ? "This file exceeds the local 1 MB text limit. Upload a smaller .txt file or paste the relevant content." : "This file exceeds the local 10 MB API upload limit.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isText) {
        const extracted = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (!extracted.trim() || extracted.includes("\0")) throw new Error("The text file is empty or contains unreadable binary data. Paste clean UTF-8 text instead.");
        setText(extracted);
        setApiFile(null);
      } else {
        let binary = "";
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        setApiFile({ data: btoa(binary), filename: file.name, mime_type: mime, content_type: mime === "application/pdf" ? "pdf" : mime.includes("wordprocessing") ? "docx" : "image" });
        setText("");
      }
      updateScope("original_filename", file.name);
      setUploadStatus(isText ? `Text extracted locally from ${file.name}. Confirm the text before running the check.` : `${file.name} is ready for bounded local API extraction. The API will show extracted text and its extraction status after submission.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The file could not be read. Paste clean UTF-8 text instead.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!text.trim() && !apiFile) { setError("Paste content or upload a readable supported file before running the check."); return; }
    if (!scope.title.trim()) { setError("Give this content a review name."); return; }
    const nextScope = { ...scope, title: scope.title.trim() };
    if (!localApi) {
      saveReview(createContentReview(text, nextScope));
      router.push("/findings");
      return;
    }
    setApiBusy(true);
    try {
      const response = await localApi.client.createContent({
        title: nextScope.title,
        content_type: apiFile?.content_type ?? "text",
        ...(apiFile ? { file_base64: apiFile.data, filename: apiFile.filename, mime_type: apiFile.mime_type } : { text }),
        confidential: nextScope.confidential,
        exposure: exposureForChannel(nextScope.channel),
        product: "VoltEdge NovaBook S1",
        market: nextScope.region,
        channel: nextScope.channel,
        language: nextScope.language,
        metadata: apiMetadata(nextScope),
      });
      saveReview(contentReviewFromApi(nextScope, response));
      router.push("/findings");
    } catch (caught) {
      setError(caught instanceof Error ? `Local API audit failed: ${caught.message}` : "Local API audit failed. Review is not marked successful.");
    } finally {
      setApiBusy(false);
    }
  }

  async function decide(finding: Finding, action: "accepted" | "edited" | "dismissed", value: string) {
    if (!review) return;
    if (review.api_content_id) {
      if (!localApi || !review.api_content_id) {
        setError("This review uses the local API, but the API configuration is not available in this browser session.");
        return;
      }
      setApiBusy(true);
      try {
        const response = await localApi.client.actOnFinding(finding.id, {
          action: action === "accepted" ? "accept" : action === "edited" ? "edit" : "dismiss",
          reason: action === "dismissed" ? value : undefined,
          replacement_text: action === "edited" ? value : undefined,
        });
        let nextResponse: ContentAuditResponse = response;
        if (action === "edited") {
          const audited = review.revisions.find((item) => item.id === finding.content_version_id);
          if (!audited || audited.text.slice(finding.span.start, finding.span.end) !== finding.span.text) {
            throw new Error("The finding no longer matches the audited source. Run a fresh check.");
          }
          const revisedText = `${audited.text.slice(0, finding.span.start)}${value}${audited.text.slice(finding.span.end)}`;
          nextResponse = await localApi.client.recheckContent(review.api_content_id, {
            text: revisedText,
            confidential: review.scope.confidential,
            exposure: exposureForChannel(review.scope.channel),
            product: "VoltEdge NovaBook S1",
            market: review.scope.region,
            channel: review.scope.channel,
            language: review.scope.language,
            metadata: apiMetadata(review.scope),
          });
        }
        saveReview(contentReviewFromApi(review.scope, nextResponse, review));
        setActionFindingId(null);
        setActionMode(null);
        setActionText("");
        setMessage(action === "dismissed" ? "Dismissal recorded by the local API with its reason and audit record." : "Local API action recorded. The source version and audit history remain available for comparison.");
        setError("");
      } catch (caught) {
        setError(caught instanceof Error ? `Local API action failed: ${caught.message}` : "Local API action failed. No successful state is shown.");
      } finally {
        setApiBusy(false);
      }
      return;
    }
    try {
      saveReview(applyFindingDecision(review, finding.id, action, value));
      setActionFindingId(null);
      setActionMode(null);
      setActionText("");
      setMessage(action === "dismissed" ? "Dismissal recorded with your reason, actor, time, and content version. The original wording is retained." : "Correction saved in a new content version. Run a fresh check; this action is not an approval.");
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The action could not be recorded. Run a fresh check."); }
  }

  function selectFinding(id: string) {
    setSelectedFindingId(id);
    document.getElementById(`pl-finding-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.getElementById(`pl-finding-${id}`)?.focus({ preventScroll: true });
  }

  async function recheck() {
    if (!review) return;
    if (review.api_content_id) {
      if (!localApi || !review.api_content_id) {
        setError("This review uses the local API, but the API configuration is not available in this browser session.");
        return;
      }
      setApiBusy(true);
      try {
        const current = latestRevision(review);
        const response = await localApi.client.recheckContent(review.api_content_id, {
          text: current.text,
          confidential: review.scope.confidential,
          exposure: exposureForChannel(review.scope.channel),
          product: "VoltEdge NovaBook S1",
          market: review.scope.region,
          channel: review.scope.channel,
          language: review.scope.language,
          metadata: apiMetadata(review.scope),
        });
        saveReview(contentReviewFromApi(review.scope, response, review));
        setSelectedFindingId(null);
        setContentTab("audited");
        setMessage("Fresh local API check recorded against the current content version. External AI/OCR and final approval remain unconfigured.");
        setError("");
      } catch (caught) {
        setError(caught instanceof Error ? `Local API recheck failed: ${caught.message}` : "Local API recheck failed. No successful state is shown.");
      } finally {
        setApiBusy(false);
      }
      return;
    }
    saveReview(recheckContent(review));
    setSelectedFindingId(null);
    setContentTab("audited");
    setMessage("Fresh local check recorded against the current content version. AI, full factual coverage, visual analysis, and final approval still require human review.");
  }

  return (
    <main className="app-shell pl-workspace">
      <a className="pl-skip-link" href="#pl-main">Skip to content</a>
      <AppSidebar activeKey={stage} />
      <section className="main-content" id="pl-main" tabIndex={-1}>
        <header className="topbar"><div className="breadcrumb"><span>VoltEdge</span><i>/</i><strong>{stage === "submit" ? "Submit content" : "Evidence review"}</strong></div><span className="pl-demo-label">{review?.api_content_id ? "IMPLEMENTED · local API" : localApi ? "IMPLEMENTED · local API opt-in" : "IMPLEMENTED · local demo"}</span></header>
        <div className="content-wrap pl-content-wrap">
           <div className="page-heading compact-heading"><div><p className="eyebrow">{stage === "submit" ? "Content intake" : "Findings & corrections"}</p><h1>{stage === "submit" ? "Bring the context with the draft." : "Every flag has an explanation."}</h1><p className="lede">{stage === "submit" ? "Paste or upload text, set its publication context, and run bounded checks against fictional VoltEdge sources." : "Inspect the exact span, its source version, and the limits of the check before choosing a correction."}</p></div>{stage === "findings" ? <Link className="ghost-button pl-link-button" href="/submit">Submit another draft</Link> : null}</div>
           <nav className="workflow-progress" aria-label="Review workflow"><Link className={stage === "submit" ? "active" : "completed"} href="/submit"><span>1</span>Submit</Link><span className="workflow-progress-line" /><Link className={stage === "findings" ? "active" : "completed"} href="/findings"><span>2</span>Fix findings</Link><span className="workflow-progress-line" /><Link href="/?view=reviews"><span>3</span>Human approval</Link></nav>
          {error ? <div className="form-error pl-message" role="alert">{error}</div> : null}
          {message ? <div className="pl-action-message" role="status">{message}</div> : null}

          {stage === "submit" ? (
            <div className="submit-layout">
              <form className="panel submit-form" onSubmit={submit}>
                <div className="submit-form-heading"><div><h2>Content to review</h2><p className="pl-helper">The original and each explicit correction stay available for comparison.</p></div><button className="small-button" type="button" onClick={() => { setText(sampleVoltEdgeText); setScope(defaultContentScope); setUploadStatus(""); }}>Load VoltEdge sample</button></div>
                <label className="field-label" htmlFor="pl-title">Review name<input id="pl-title" value={scope.title} maxLength={200} onChange={(event) => updateScope("title", event.target.value)} /></label>
                <label className="field-label" htmlFor="pl-text">Paste content<textarea id="pl-text" rows={9} value={text} maxLength={100000} onChange={(event) => setText(event.target.value)} aria-describedby="pl-text-help" /></label><p id="pl-text-help" className="pl-helper">English US checks cover the synthetic NovaBook S1 battery fact, comparative wording, and a voice-review phrase. Other context remains review-required.</p>
                 <div className="pl-upload-box"><label className="field-label" htmlFor="pl-upload">Upload supported content<input id="pl-upload" type="file" accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" onChange={upload} disabled={uploading} aria-describedby="pl-upload-help" /></label><p id="pl-upload-help" className="pl-helper">UTF-8 .txt is checked in the browser. In opt-in local API mode, bounded PDF, DOCX, PNG, and JPG extraction preserves provenance and reports partial/failed extraction instead of claiming success.</p>{uploadStatus ? <p className="pl-upload-status" role="status">{uploadStatus}</p> : null}</div>
                <div className="form-divider"><span>Publication context</span></div>
                <div className="form-grid"><label className="field-label" htmlFor="pl-channel">Channel<select id="pl-channel" value={scope.channel} onChange={(event) => updateScope("channel", event.target.value as ContentScope["channel"])}>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label" htmlFor="pl-region">Region<select id="pl-region" value={scope.region} onChange={(event) => updateScope("region", event.target.value as ContentScope["region"])}>{Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label" htmlFor="pl-language">Language<select id="pl-language" value={scope.language} onChange={(event) => updateScope("language", event.target.value as ContentScope["language"])}>{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label" htmlFor="pl-date">Scheduled publication date<input id="pl-date" type="date" value={scope.scheduled_date} onChange={(event) => updateScope("scheduled_date", event.target.value)} /></label></div>
                 <label className="pl-check-label"><input type="checkbox" checked={scope.has_image} onChange={(event) => updateScope("has_image", event.target.checked)} /><span>This draft includes a meaningful image</span></label>
                 <label className="pl-check-label"><input type="checkbox" checked={scope.confidential} onChange={(event) => updateScope("confidential", event.target.checked)} /><span>Mark this draft confidential for local handling</span></label>
                 {scope.confidential ? <p className="pl-helper" role="status">Confidential marker recorded in this browser tab. The local demo makes no external request, but it does not provide server-side deletion or production confidentiality guarantees.</p> : null}
                 <label className="field-label" htmlFor="pl-alt">Image alt text<textarea id="pl-alt" rows={3} value={scope.alt_text} maxLength={2000} onChange={(event) => updateScope("alt_text", event.target.value)} placeholder="Describe the actual image in the context of this message." /></label>
                <div className="submit-form-footer"><p><strong>{localApi ? "Opt-in local API mode." : "Local browser-tab state."}</strong> {localApi ? "The configured local API receives this fictional VoltEdge draft and returns an in-memory audit; no external provider is called." : "No content is sent to an external model or backend."} Nothing is auto-applied, approved, or published.</p><button className="primary-button" type="submit" disabled={uploading || apiBusy}>{uploading ? "Reading file…" : apiBusy ? "Running local API check…" : "Run local evidence check"}</button></div>
              </form>
              <aside className="submit-sidebar"><section className="panel context-panel"><div className="panel-heading"><h2>Scope of this check</h2></div><div className="scope-list"><div><span className="scope-icon" aria-hidden="true">⌁</span><span><strong>Synthetic, versioned VoltEdge sources</strong><small>Facts and rules are demonstration records, not production brand knowledge.</small></span></div><div><span className="scope-icon" aria-hidden="true">⌗</span><span><strong>{channelLabels[scope.channel]}</strong><small>{regionLabels[scope.region]} · {languageLabels[scope.language]}</small></span></div><div><span className="scope-icon" aria-hidden="true">◷</span><span><strong>{scope.scheduled_date || "No publication date"}</strong><small>This date is retained as context; no external scheduling occurs.</small></span></div></div></section><section className="panel intake-checklist"><h2>Evidence before assertion</h2><ul><li><span aria-hidden="true">✓</span><div><strong>Missing evidence stays unverified</strong><p>A missing source is never treated as proof that a claim is false.</p></div></li><li><span aria-hidden="true">✓</span><div><strong>AI status stays visible</strong><p>Contextual model review is STUB. All checks on this page run as local rules.</p></div></li><li><span aria-hidden="true">✓</span><div><strong>Decisions remain explicit</strong><p>Accept or edit a correction, or dismiss it with a written reason.</p></div></li></ul></section></aside>
            </div>
          ) : !review || !audit || !revision || !auditedRevision || !risk ? (
            <section className="panel pl-empty"><h2>No content has been submitted in this tab.</h2><p>Submit a VoltEdge draft to inspect its highlighted spans, evidence, and correction history.</p><Link className="primary-button pl-link-button" href="/submit">Submit content</Link></section>
          ) : (
            <>
               <section className="pl-review-header"><div><h2>{review.scope.title}</h2><p>{channelLabels[review.scope.channel]} · {regionLabels[review.scope.region]} · {languageLabels[review.scope.language]} · {review.scope.scheduled_date || "No scheduled date"}</p></div><div className="pl-review-badges"><span className="pl-review-required">! Human review required</span>{review.scope.confidential ? <span className="pl-confidential-badge">Confidential · browser-local</span> : null}</div></section>
              <div className="pl-review-layout">
                <section className="pl-content-column" aria-label="Content and risk">
                  <section className="content-preview-card enhanced-content-preview"><div className="content-preview-header"><h2>Content spans</h2><span className="content-version">Audited v{auditedRevision.number}</span></div><div className="pl-preview-tabs" aria-label="Content versions">{(["audited", "current", "original"] as const).map((tab) => <button className={contentTab === tab ? "active" : ""} type="button" key={tab} aria-pressed={contentTab === tab} onClick={() => setContentTab(tab)}>{tab === "audited" ? "Audited text" : tab === "current" ? `Current v${revision.number}` : "Original"}</button>)}</div>{contentTab === "audited" ? <Preview text={auditedRevision.text} findings={audit.findings} selected={selectedFindingId} onSelect={selectFinding} /> : <div className="pl-content-copy">{contentTab === "current" ? revision.text : originalRevision?.text}</div>}<p className="pl-helper">Select a numbered span to inspect its finding. Highlight numbers, verdict text, and severity labels also identify issues without relying on colour.</p>{review.scope.has_image ? <div className="alt-text-review"><span aria-hidden="true" className={`verdict-icon verdict-${revision.alt_text.trim() ? "supported" : "needs_human"}`}>{revision.alt_text.trim() ? "✓" : "!"}</span><div><strong>{revision.alt_text.trim() ? "Alt text provided · quality not assessed" : "Missing alt text · needs human review"}</strong><p>{revision.alt_text.trim() || "Add alt text in a revised submission or record why the image is decorative."}</p></div></div> : null}<div className="content-footer"><span>{review.scope.original_filename || "Pasted text"}</span><span>{review.revisions.length} retained version(s)</span></div></section>
                  <section className="risk-summary" aria-labelledby="pl-risk-heading"><div className="risk-summary-header"><div><h3 id="pl-risk-heading">Risk breakdown</h3><span className="pl-risk-label">{risk.label} triage priority</span></div><strong className="risk-score">{risk.score}<small>/100</small></strong></div><p className="risk-summary-copy">Demo triage formula: round(100 × severity {risk.severity} × exposure {risk.exposure} × policy {risk.policy_multiplier} ÷ 22.5). A direct fact contradiction forces High. Confidence is shown separately.</p><div className="risk-breakdown">{Object.entries(risk.counts).map(([label, count]) => <div key={label}><span className={`risk-marker ${label}`} /><strong>{count}</strong><span>{label}</span></div>)}</div><div className="pl-evidence-counts"><span>{risk.missing} evidence gap(s)</span><span>{risk.human} human-review finding(s)</span><span>{audit.findings.filter((finding) => finding.status === "dismissed").length} explicitly dismissed</span></div><p className="pl-helper">A triage aid, not a truth probability. Zero open findings is not an approval or a full-coverage pass.</p></section>
                   <section className="panel audit-context"><h2>Check context</h2><dl><div><dt>Audit</dt><dd>{audit.id}</dd></div><div><dt>Version</dt><dd>{audit.content_version_id}</dd></div><div><dt>Source set</dt><dd>Synthetic VoltEdge · {review.api_content_id ? "local API" : "browser v1"}</dd></div><div><dt>External AI</dt><dd>STUB · no model called</dd></div></dl><p className="audit-context-note">OCR, visual checks, broad fact verification, and legal review were not assessed. An authorised person owns the final decision.</p><button className="secondary-button pl-full-width" type="button" onClick={recheck} disabled={apiBusy}>{apiBusy ? "Running check…" : stale ? "Check corrected version" : "Run fresh local check"}</button></section>
                </section>
                <section className="pl-findings-column" aria-labelledby="pl-findings-heading"><div className="pl-findings-heading"><h2 id="pl-findings-heading">{audit.findings.length} finding(s)</h2><span>{openCount} open · {audit.findings.length - openCount} actioned</span></div><p className="pl-helper">Actions refer to audited v{auditedRevision.number}. Corrections create a new version; dismissing retains the original wording.</p>{stale ? <div className="pl-stale-note" role="status">The current draft is v{revision.number}. These findings still refer to v{auditedRevision.number}; check the corrected version to refresh the verdicts.</div> : null}{!audit.findings.length ? <section className="panel pl-empty"><h3>No local rule findings</h3><p>Only the listed demo rules ran. Contextual and full factual review remain unassessed. Send the content for an authorised human review.</p></section> : audit.findings.map((finding, index) => {
                    const verdict = verdictLabels[finding.verdict];
                    const active = actionFindingId === finding.id;
                    return <article className={`finding-card enhanced-finding-card ${selectedFindingId === finding.id ? "active" : ""}`} id={`pl-finding-${finding.id}`} key={finding.id} tabIndex={-1}><div className="finding-card-top"><span className="finding-category">{index + 1}. {categoryLabels[finding.category]}</span><span className={`finding-severity ${finding.severity}`}>{finding.severity}</span></div><div className="finding-verdict-row"><span className={`verdict-icon verdict-${finding.verdict}`} aria-hidden="true">{verdict.icon}</span><div><strong>{verdict.text}</strong><span>Status: {finding.status === "open" ? "Open" : `${finding.status} · recheck required`}</span></div></div><p className="finding-excerpt">{finding.span.text ? `“${finding.span.text}”` : "Image alt-text metadata"}</p><div className="reason-block"><span className="detail-label">Reason</span><p>{finding.reason}</p></div><div className="evidence-row enhanced-evidence-row"><div><span className="detail-label">{finding.verdict === "unsupported" ? "Evidence gap · requirement source" : "Evidence source"}</span>{finding.evidence ? <><blockquote className="evidence-quote">{finding.evidence.quote}</blockquote><p className="evidence-meta">{finding.evidence.source_type} · {finding.evidence.source_id} · version {finding.evidence.version}</p></> : <p className="evidence-gap">No applicable approved evidence found. A source-backed factual verdict is unavailable.</p>}</div></div><div className="finding-method-row"><span><span className="detail-label">Method</span><strong>{methodLabels[finding.method]}</strong></span><span><span className="detail-label">Confidence</span><strong>{Math.round(finding.confidence * 100)}%{finding.confidence === 0 ? " · not assessed" : " rule-match strength"}</strong></span><span className="ai-badge">{finding.method === "llm" || finding.method === "hybrid" ? "AI-generated" : "AI-generated: no"}</span></div><p className="pl-helper">Confidence describes the check, never real-world truth.</p>{finding.suggestion ? <div className="suggestion-block"><span className="detail-label">Suggested correction</span><p className="suggestion-copy">{finding.suggestion.text}</p><p className="suggestion-intent">{finding.suggestion.intent_note}</p></div> : <p className="pl-helper">No safe replacement has been generated. Revise the source text or record a reviewer reason.</p>}{finding.status === "dismissed" ? <div className="dismissal-note"><strong>Dismissal reason</strong><p>{finding.dismiss_reason}</p></div> : null}{finding.status === "open" ? <><div className="finding-actions enhanced-finding-actions">{finding.suggestion ? <><button className="small-button apply-button" type="button" onClick={() => decide(finding, "accepted", finding.suggestion!.text)}>Accept suggestion</button><button className="small-button" type="button" onClick={() => { setActionFindingId(finding.id); setActionMode("edit"); setActionText(finding.suggestion!.text); }}>Edit suggestion</button></> : null}<button className="small-button danger-button" type="button" onClick={() => { setActionFindingId(finding.id); setActionMode("dismiss"); setActionText(""); }}>Dismiss with reason</button></div>{active && actionMode ? <div className="dismiss-panel"><label htmlFor={`pl-action-${finding.id}`}>{actionMode === "dismiss" ? "Reason for dismissal (required)" : "Your replacement text"}</label><textarea id={`pl-action-${finding.id}`} rows={3} value={actionText} onChange={(event) => setActionText(event.target.value)} /><div className="inline-actions"><button className="small-button" type="button" onClick={() => { setActionFindingId(null); setActionMode(null); }}>Cancel</button><button className="small-button apply-button" type="button" disabled={!actionText.trim()} onClick={() => decide(finding, actionMode === "dismiss" ? "dismissed" : "edited", actionText)}>{actionMode === "dismiss" ? "Record dismissal" : "Save edited correction"}</button></div></div> : null}</> : <p className="decision-record">✓ Explicit {finding.status} action retained in the history below.</p>}</article>;
                  })}</section>
              </div>
              <section className="panel pl-history" aria-labelledby="pl-history-heading"><div className="history-header"><div><h2 id="pl-history-heading">Explicit action history</h2><p className="pl-helper">Local tab records · {review.revisions.length} versions · {review.audits.length} audit runs</p></div><span className="panel-badge">{review.events.length} events</span></div><ol className="pl-event-list">{review.events.slice().reverse().map((event) => <li key={event.id}><div className="pl-event-top"><strong>{event.action}</strong><time dateTime={event.timestamp}>{timestamp(event.timestamp)}</time></div><p>{event.actor} · content version {event.content_version_id}{event.finding_id ? ` · finding ${event.finding_id}` : ""}</p>{event.reason ? <p><strong>Reason: </strong>{event.reason}</p> : null}{event.before !== null ? <div className="pl-event-change"><span>Before: {event.before}</span><span>After: {event.after}</span></div> : null}</li>)}</ol><p className="pl-helper">Kept in sessionStorage for this browser tab when available; no durable server storage or authenticated identity is implied.</p></section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
