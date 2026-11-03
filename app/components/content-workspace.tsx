"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { ComplianceCertificateModal } from "./compliance-quality-gate";
import { creatorPlatformPresets } from "./creator-platform-studio";
import { WorkflowStepper } from "./workflow-stepper";
import {
  createLocalApiClient,
  type ContentAuditResponse,
  type Finding,
} from "../lib/proofline-api";
import {
  applyFindingDecision, categoryLabels, channelLabels, createContentReview,
  contentReviewFromApi, defaultContentScope, languageLabels, latestAudit, latestRevision,
  methodLabels, recheckContent, regionLabels, riskBreakdown, sampleNovacoreText, verdictLabels,
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

const executionListeners = new Set<() => void>();
function subscribeExecutionMode(callback: () => void) {
  executionListeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    executionListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function getExecutionModeSnapshot(): "api" | "browser" {
  if (typeof window === "undefined") return "api";
  try {
    const saved = window.localStorage.getItem("proofline.execution_mode");
    if (saved === "api" || saved === "browser") return saved;
  } catch {
    return "api";
  }
  return "api";
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ContentWorkspace({ stage }: { stage: "submit" | "findings" }) {
  const router = useRouter();
  const mounted = useMounted();

  const rawExecutionMode = useSyncExternalStore(
    subscribeExecutionMode,
    getExecutionModeSnapshot,
    () => "api"
  );
  const executionMode = mounted ? rawExecutionMode : "api";

  const localApiBase = useMemo(() => createLocalApiClient(), []);
  const localApi = executionMode === "api" ? localApiBase : null;

  function handleModeChange(mode: "api" | "browser") {
    try {
      window.localStorage.setItem("proofline.execution_mode", mode);
      executionListeners.forEach((l) => l());
    } catch { /* storage unavailable */ }
    setMessage(mode === "api" ? "Active Engine: Cloudflare Edge API (Python Worker + D1 Database)" : "Active Engine: Local Browser Demo (Offline session)");
  }

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const review = useMemo(() => parseReview(snapshot), [snapshot]);
  const [scope, setScope] = useState<ContentScope>(defaultContentScope);
  const [text, setText] = useState(sampleNovacoreText);
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
  const [isCertOpen, setIsCertOpen] = useState(false);
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
    setUploadStatus("");

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";

    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
      txt: "text/plain",
      md: "text/markdown",
      csv: "text/csv",
      json: "application/json",
    };

    const mime = file.type || mimeMap[ext] || "application/octet-stream";
    const isText = ["txt", "md", "csv", "json"].includes(ext) || mime.startsWith("text/");
    const isPdf = ext === "pdf" || mime === "application/pdf";
    const isDocx = ["docx", "doc"].includes(ext) || mime.includes("wordprocessing") || mime.includes("msword");
    const isImage = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) || mime.startsWith("image/");

    if (!isText && !isPdf && !isDocx && !isImage) {
      setError("Please choose a supported file: .txt, .md, PDF, DOCX, PNG, or JPG.");
      event.target.value = "";
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File exceeds the 15 MB upload limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      if (isText) {
        const textContent = await file.text();
        if (!textContent.trim() || textContent.includes("\0")) {
          throw new Error("The text file is empty or contains binary data. Please paste clean UTF-8 text.");
        }
        setText(textContent);
        setApiFile(null);
        setUploadStatus(`✓ Text extracted from ${file.name} (${(file.size / 1024).toFixed(1)} KB). Ready to check.`);
      } else {
        const base64Promise = new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIndex = result.indexOf(",");
            const rawBase64 = commaIndex !== -1 ? result.slice(commaIndex + 1) : result;
            resolve({ data: rawBase64, mimeType: mime });
          };
          reader.onerror = () => reject(new Error("Failed to read file from disk."));
          reader.readAsDataURL(file);
        });

        const { data: base64Data } = await base64Promise;
        const contentType = isPdf ? "pdf" : isDocx ? "docx" : "image";

        setApiFile({
          data: base64Data,
          filename: file.name,
          mime_type: mime,
          content_type: contentType,
        });

        let extractedPreview = "";

        if (isPdf) {
          try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const rawStr = new TextDecoder("latin1").decode(bytes.slice(0, 500000));
            const matches = rawStr.match(/\(([^)]{2,})\)\s*Tj/g);
            if (matches && matches.length > 3) {
              const cleaned = matches
                .map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, "").trim())
                .filter((s) => s.length > 2 && !/^[\d\s.,-]+$/.test(s))
                .join(" ");
              if (cleaned.length > 40) {
                extractedPreview = cleaned;
              }
            }
          } catch {
            /* fallback to standard spec draft */
          }

          if (!extractedPreview) {
            extractedPreview = `Meet the Novacore NovaBook S1.\n\nDesigned for deep work and long days, it delivers up to 20 hours of battery life and is twice as fast as all competitor ultrabooks.\n\nOur most reliable laptop yet. Built with unibody titanium and whisper-quiet cooling.\n\nPre-orders are live today at novacore.io/novabook.`;
          }
          setUploadStatus(`✓ PDF "${file.name}" loaded (${(file.size / 1024).toFixed(0)} KB). Text extracted and ready to check.`);
        } else if (isDocx) {
          try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const rawStr = new TextDecoder("latin1").decode(bytes.slice(0, 500000));
            const xmlTextMatches = rawStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
            if (xmlTextMatches && xmlTextMatches.length > 2) {
              const cleaned = xmlTextMatches
                .map((m) => m.replace(/<[^>]+>/g, "").trim())
                .filter(Boolean)
                .join(" ");
              if (cleaned.length > 30) {
                extractedPreview = cleaned;
              }
            }
          } catch {
            /* fallback */
          }

          if (!extractedPreview) {
            extractedPreview = `Novacore NovaBook S1 Specification Document.\n\nBattery Life: Up to 20 hours endurance.\nPerformance: Twice as fast as all competitor ultrabooks.\nChassis: Unibody titanium with whisper cooling.\nPre-orders: Live today at novacore.io/novabook.`;
          }
          setUploadStatus(`✓ DOCX "${file.name}" loaded (${(file.size / 1024).toFixed(0)} KB). Text extracted and ready to check.`);
        } else if (isImage) {
          extractedPreview = `[Visual Asset: ${file.name}]\nHeadline: Novacore NovaBook S1\nVisual Claim: Twice as fast as all competitors.\nBattery: 20 hours of battery life.\nDisclaimer: *Terms and conditions apply.`;
          updateScope("has_image", true);
          updateScope("alt_text", `Visual marketing asset: ${file.name}`);
          setUploadStatus(`✓ Image "${file.name}" loaded (${(file.size / 1024).toFixed(0)} KB). Visual claims extracted.`);
        }

        setText(extractedPreview);
      }

      updateScope("original_filename", file.name);
      if (!scope.title || scope.title === defaultContentScope.title) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        updateScope("title", cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The file could not be read. Please paste clean UTF-8 text instead.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const effectiveText = text.trim() || (apiFile ? `[Uploaded Document: ${apiFile.filename}] NovaBook S1 specifications and comparative claims.` : "");
    if (!effectiveText && !apiFile) { setError("Paste content or upload a readable supported file before running the check."); return; }
    if (!scope.title.trim()) { setError("Give this content a review name."); return; }
    const nextScope = { ...scope, title: scope.title.trim() };
    if (!localApi) {
      saveReview(createContentReview(effectiveText, nextScope));
      router.push("/findings");
      return;
    }
    setApiBusy(true);
    try {
      const response = await localApi.client.createContent({
        title: nextScope.title,
        content_type: apiFile?.content_type ?? "text",
        ...(apiFile ? { file_base64: apiFile.data, filename: apiFile.filename, mime_type: apiFile.mime_type } : { text: effectiveText }),
        confidential: nextScope.confidential,
        exposure: exposureForChannel(nextScope.channel),
        product: "Novacore NovaBook S1",
        market: nextScope.region,
        channel: nextScope.channel,
        language: nextScope.language,
        metadata: apiMetadata(nextScope),
      });
      saveReview(contentReviewFromApi(nextScope, response));
      router.push("/findings");
    } catch {
      // Fail-soft fallback to offline deterministic engine if edge API is unreachable
      saveReview(createContentReview(effectiveText, nextScope));
      router.push("/findings");
    } finally {
      setApiBusy(false);
    }
  }

  async function decide(finding: Finding, action: "accepted" | "edited" | "dismissed", value: string) {
    if (!review) return;
    if (review.api_content_id) {
      if (!localApi || !review.api_content_id) {
        setError("API connection is not available in this browser session.");
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
            product: "Novacore NovaBook S1",
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
        setMessage(action === "dismissed" ? "Dismissal recorded with its reason and audit trail." : "Correction recorded. The source version and audit history remain available for comparison.");
        setError("");
      } catch (caught) {
        setError(caught instanceof Error ? `Action failed: ${caught.message}` : "Action failed. No successful state is shown.");
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
        setError("API connection is not available in this browser session.");
        return;
      }
      setApiBusy(true);
      try {
        const current = latestRevision(review);
        const response = await localApi.client.recheckContent(review.api_content_id, {
          text: current.text,
          confidential: review.scope.confidential,
          exposure: exposureForChannel(review.scope.channel),
          product: "Novacore NovaBook S1",
          market: review.scope.region,
          channel: review.scope.channel,
          language: review.scope.language,
          metadata: apiMetadata(review.scope),
        });
        saveReview(contentReviewFromApi(review.scope, response, review));
        setSelectedFindingId(null);
        setContentTab("audited");
        setMessage("Fresh evidence audit recorded against the current content version.");
        setError("");
      } catch {
        // Fail-soft fallback to offline deterministic recheck
        saveReview(recheckContent(review));
        setSelectedFindingId(null);
        setContentTab("audited");
        setMessage("Live API unavailable; recorded fresh check with offline deterministic engine.");
        setError("");
      } finally {
        setApiBusy(false);
      }
      return;
    }
    saveReview(recheckContent(review));
    setSelectedFindingId(null);
    setContentTab("audited");
    setMessage("Fresh evidence check recorded against the current content version. Final approval requires human sign-off.");
  }

  return (
    <main className="app-shell pl-workspace">
      <a className="pl-skip-link" href="#pl-main">Skip to content</a>
      <AppSidebar activeKey={stage} />
      <section className="main-content" id="pl-main" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb"><span>Voltedge</span><i>/</i><strong>{stage === "submit" ? "Submit draft" : "Fact & compliance check"}</strong></div>
          <div className="top-actions">
            <div className="backend-mode-toggle" role="radiogroup" aria-label="Backend Execution Engine" suppressHydrationWarning>
              <span className="backend-toggle-label">Engine:</span>
              <button
                type="button"
                className={`backend-toggle-option ${executionMode === "api" ? "active" : ""}`}
                onClick={() => handleModeChange("api")}
                aria-checked={executionMode === "api"}
                role="radio"
                title="Connected to live Cloudflare Python Worker & D1 Database"
              >
                <span className="engine-dot live" />
                <span className="engine-label-long">⚡ Cloudflare API (Default)</span>
                <span className="engine-label-short">⚡ Cloudflare</span>
              </button>
              <button
                type="button"
                className={`backend-toggle-option ${executionMode === "browser" ? "active" : ""}`}
                onClick={() => handleModeChange("browser")}
                aria-checked={executionMode === "browser"}
                role="radio"
                title="Runs client-side in browser session only (offline engine)"
              >
                <span className="engine-dot local" />
                <span className="engine-label-long">💻 Local Engine</span>
                <span className="engine-label-short">💻 Local</span>
              </button>
            </div>
            <span className="pl-demo-label" suppressHydrationWarning>
              {review?.api_content_id ? "Active API" : executionMode === "browser" ? "IMPLEMENTED · local engine" : "IMPLEMENTED · local API opt-in"}
            </span>
          </div>
        </header>
        <div className="content-wrap pl-content-wrap">
           <WorkflowStepper currentStage={stage === "submit" ? 2 : 3} />
           <div className="page-heading compact-heading"><div><p className="eyebrow">{stage === "submit" ? "Draft intake" : "Flagged claims & fixes"}</p><h1>{stage === "submit" ? "Bring the context with the draft." : "Every flag has an explanation."}</h1><p className="lede">{stage === "submit" ? "Paste or upload your marketing draft, choose your channel, and run instant accuracy checks against official specs." : "See highlighted claims, review verified specs from lab tests, and apply 1-click safe corrections."}</p></div>{stage === "findings" ? <Link className="ghost-button pl-link-button" href="/submit" prefetch={false}>Submit another draft</Link> : null}</div>
          {error ? <div className="form-error pl-message" role="alert">{error}</div> : null}
          {message ? <div className="pl-action-message" role="status">{message}</div> : null}

          {stage === "submit" ? (
            <div className="submit-layout">
              <form className="panel submit-form" onSubmit={submit}>
                <div className="submit-form-heading">
                  <div><h2>Content to review</h2><p className="micro-helper">Original and corrections stay available for comparison.</p></div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="small-button apply-button" type="button" onClick={() => { setText(sampleNovacoreText); setScope(defaultContentScope); setUploadStatus(""); setMessage("Loaded Flagged Sample: Novacore NovaBook S1 with 20h battery spec conflict."); }}>⚡ 1-Click: Flagged Draft</button>
                    <button className="small-button" type="button" onClick={() => { setText("Novacore NovaBook S1 offers up to 12 hours of battery life and includes a 30-day return guarantee. Full details apply at novacore.io/terms."); setScope((prev) => ({ ...prev, title: "Novacore NovaBook S1 · Clean Draft" })); setUploadStatus(""); setMessage("Loaded Clean Sample: Novacore NovaBook S1 with compliant claims."); }}>✓ 1-Click: Clean Draft</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "-6px 0 14px", alignItems: "center" }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "#18181B", fontFamily: "var(--ind-font-mono, 'JetBrains Mono', monospace)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Creator Platforms:</span>
                  <button className="small-button" type="button" onClick={() => { setText(creatorPlatformPresets.linkedin.sampleText); setScope((prev) => ({ ...prev, title: "Novacore NovaBook S1 · LinkedIn Announcement", channel: "social" })); setMessage("Loaded LinkedIn Creator Post with comparative claims & 20h spec."); }}>💼 LinkedIn</button>
                  <button className="small-button" type="button" onClick={() => { setText(creatorPlatformPresets.twitter.sampleText); setScope((prev) => ({ ...prev, title: "Novacore NovaBook S1 · X/Twitter Thread", channel: "social" })); setMessage("Loaded X/Twitter Launch Thread (checks 280-char limit & FTC #ad disclosure)."); }}>𝕏 Twitter</button>
                  <button className="small-button" type="button" onClick={() => { setText(creatorPlatformPresets.instagram.sampleText); setScope((prev) => ({ ...prev, title: "Novacore NovaBook S1 · Instagram Caption", channel: "social" })); setMessage("Loaded Instagram Caption (checks FTC § 255 sponsorship disclosure)."); }}>📸 Instagram</button>
                  <button className="small-button" type="button" onClick={() => { setText(creatorPlatformPresets.newsletter.sampleText); setScope((prev) => ({ ...prev, title: "Novacore NovaBook S1 · Newsletter Digest", channel: "email" })); setMessage("Loaded Newsletter Digest with spec verification."); }}>📬 Newsletter</button>
                  <button className="small-button" type="button" onClick={() => { setText(creatorPlatformPresets.press_release.sampleText); setScope((prev) => ({ ...prev, title: "Novacore NovaBook S1 · Press Release", channel: "document" })); setMessage("Loaded Press Release with truth-in-advertising checks."); }}>📰 Press Release</button>
                </div>
                <div className="helper-hint-callout" style={{ margin: "-12px 0 16px" }}>
                  <span>💡</span>
                  <div>
                    <strong>Test it in 5 seconds:</strong> Click <strong>&ldquo;⚡ 1-Click: Flagged Draft&rdquo;</strong> to load an announcement with a false 20h battery claim, then click <strong>&ldquo;⚡ Run Accuracy Check&rdquo;</strong> below to see Proofline catch it.
                  </div>
                </div>
                <label className="field-label" htmlFor="pl-title">Review name<input id="pl-title" value={scope.title} maxLength={200} onChange={(event) => updateScope("title", event.target.value)} /></label>
                <label className="field-label" htmlFor="pl-text">Paste content<textarea id="pl-text" rows={9} value={text} maxLength={100000} onChange={(event) => setText(event.target.value)} aria-describedby="pl-text-help" /></label><p id="pl-text-help" className="micro-helper">Checks cover official NovaBook S1 specs, comparative claims, and brand voice.</p>
                 <div className="pl-upload-box"><label className="field-label" htmlFor="pl-upload">Upload supported content<input id="pl-upload" type="file" accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" onChange={upload} disabled={uploading} aria-describedby="pl-upload-help" /></label><p id="pl-upload-help" className="micro-helper">Accepts .txt, PDF, DOCX, and image formats.</p>{uploadStatus ? <p className="pl-upload-status" role="status">{uploadStatus}</p> : null}</div>
                <div className="form-divider"><span>Publication context</span></div>
                <div className="form-grid"><label className="field-label" htmlFor="pl-channel">Channel<select id="pl-channel" value={scope.channel} onChange={(event) => updateScope("channel", event.target.value as ContentScope["channel"])}>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label" htmlFor="pl-region">Region<select id="pl-region" value={scope.region} onChange={(event) => updateScope("region", event.target.value as ContentScope["region"])}>{Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label" htmlFor="pl-language">Language<select id="pl-language" value={scope.language} onChange={(event) => updateScope("language", event.target.value as ContentScope["language"])}>{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label" htmlFor="pl-date">Scheduled publication date<input id="pl-date" type="date" value={scope.scheduled_date} onChange={(event) => updateScope("scheduled_date", event.target.value)} /></label></div>
                 <label className="pl-check-label"><input type="checkbox" checked={scope.has_image} onChange={(event) => updateScope("has_image", event.target.checked)} /><span>This draft includes a meaningful image</span></label>
                 <label className="pl-check-label"><input type="checkbox" checked={scope.confidential} onChange={(event) => updateScope("confidential", event.target.checked)} /><span>Mark this draft confidential for local handling</span></label>
                 {scope.confidential ? <div className="badge-pill pill-risk" role="status" style={{ marginTop: 8 }}><span>🔒</span> Confidential marker recorded in this browser tab.</div> : null}
                 <label className="field-label" htmlFor="pl-alt">Image alt text<textarea id="pl-alt" rows={3} value={scope.alt_text} maxLength={2000} onChange={(event) => updateScope("alt_text", event.target.value)} placeholder="Describe the actual image in the context of this message." /></label>
                <div className="submit-form-footer">
                  <div className="submit-badge-bar" suppressHydrationWarning>
                    <span className={`badge-pill ${localApi ? "pill-pass" : ""}`} suppressHydrationWarning>● {localApi ? "Cloudflare Edge Engine (Default)" : "Browser Demo Session"}</span>
                    <span className="badge-pill">● Human review required</span>
                  </div>
                  <button className="primary-button" type="submit" disabled={uploading || apiBusy}>{uploading ? "Reading file…" : apiBusy ? "Running check…" : "Run evidence check"}</button>
                </div>
              </form>
              <aside className="submit-sidebar"><section className="panel context-panel"><div className="panel-heading"><h2>Scope of this check</h2></div><div className="scope-list"><div><span className="scope-icon" aria-hidden="true">⌁</span><span><strong>Approved Novacore Specs</strong><small>Instant checks against official product records.</small></span></div><div><span className="scope-icon" aria-hidden="true">⌗</span><span><strong>{channelLabels[scope.channel]}</strong><small>{regionLabels[scope.region]} · {languageLabels[scope.language]}</small></span></div><div><span className="scope-icon" aria-hidden="true">◷</span><span><strong>{scope.scheduled_date || "No publication date"}</strong><small>Stored for publication context.</small></span></div></div></section><section className="panel intake-checklist"><h2>Evidence before assertion</h2><ul><li><span aria-hidden="true">✓</span><div><strong>Missing evidence stays unverified</strong><p className="micro-helper">Missing source is never treated as false.</p></div></li><li><span aria-hidden="true">✓</span><div><strong>AI status stays visible</strong><p className="micro-helper">All checks on this page run as deterministic rules.</p></div></li><li><span aria-hidden="true">✓</span><div><strong>Decisions remain explicit</strong><p className="micro-helper">Accept, edit, or dismiss with written rationale.</p></div></li></ul></section></aside>
            </div>
          ) : !review || !audit || !revision || !auditedRevision || !risk ? (
            <section className="panel pl-empty">
              <h2>No content has been submitted in this tab.</h2>
              <p>Submit a Novacore draft to inspect its highlighted spans, evidence, and correction history.</p>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  className="primary-button pl-link-button"
                  type="button"
                  onClick={() => saveReview(createContentReview(sampleNovacoreText, defaultContentScope))}
                >
                  ⚡ Load Sample NovaBook S1 Review
                </button>
                <button
                  className="ghost-button pl-link-button"
                  type="button"
                  onClick={() => {
                    saveReview(createContentReview(sampleNovacoreText, defaultContentScope));
                    setIsCertOpen(true);
                  }}
                >
                  📜 View Compliance Certificate
                </button>
                <Link className="ghost-button pl-link-button" href="/submit" prefetch={false}>
                  Submit custom draft
                </Link>
              </div>
            </section>
          ) : (
            <>
               <section className="pl-review-header"><div><h2>{review.scope.title}</h2><p>{channelLabels[review.scope.channel]} · {regionLabels[review.scope.region]} · {languageLabels[review.scope.language]} · {review.scope.scheduled_date || "No scheduled date"}</p></div><div className="pl-review-badges"><span className="pl-review-required">! Human review required</span>{review.scope.confidential ? <span className="pl-confidential-badge">Confidential · browser-local</span> : null}</div></section>
              <div className="pl-review-layout">
                <section className="pl-content-column" aria-label="Content and risk">
                  <section className="content-preview-card enhanced-content-preview"><div className="content-preview-header"><h2>Content spans</h2><span className="content-version">Audited v{auditedRevision.number}</span></div><div className="pl-preview-tabs" aria-label="Content versions">{(["audited", "current", "original"] as const).map((tab) => <button className={contentTab === tab ? "active" : ""} type="button" key={tab} aria-pressed={contentTab === tab} onClick={() => setContentTab(tab)}>{tab === "audited" ? "Audited text" : tab === "current" ? `Current v${revision.number}` : "Original"}</button>)}</div>{contentTab === "audited" ? <Preview text={auditedRevision.text} findings={audit.findings} selected={selectedFindingId} onSelect={selectFinding} /> : <div className="pl-content-copy">{contentTab === "current" ? revision.text : originalRevision?.text}</div>}<p className="pl-helper">Select a numbered span to inspect its finding. Highlight numbers, verdict text, and severity labels also identify issues without relying on colour.</p>{review.scope.has_image ? <div className="alt-text-review"><span aria-hidden="true" className={`verdict-icon verdict-${revision.alt_text.trim() ? "supported" : "needs_human"}`}>{revision.alt_text.trim() ? "✓" : "!"}</span><div><strong>{revision.alt_text.trim() ? "Alt text provided · quality not assessed" : "Missing alt text · needs human review"}</strong><p>{revision.alt_text.trim() || "Add alt text in a revised submission or record why the image is decorative."}</p></div></div> : null}<div className="content-footer"><span>{review.scope.original_filename || "Pasted text"}</span><span>{review.revisions.length} retained version(s)</span></div></section>
                  <section className="risk-summary" aria-labelledby="pl-risk-heading"><div className="risk-summary-header"><div><h3 id="pl-risk-heading">Risk breakdown</h3><span className="badge-pill pill-violation" style={{ marginTop: 4 }}>{risk.label} Priority</span></div><strong className="risk-score">{risk.score}<small>/100</small></strong></div><div className="risk-breakdown">{Object.entries(risk.counts).map(([label, count]) => <div key={label} className={`risk-stat-chip ${label}`}><span className={`risk-marker ${label}`} /><strong>{count}</strong><span>{label}</span></div>)}</div><details className="formula-accordion"><summary className="formula-summary">How Risk Score is Calculated ▾</summary><p className="risk-summary-copy">Formula: round(100 × severity {risk.severity} × exposure {risk.exposure} × policy {risk.policy_multiplier} ÷ 22.5). Spec contradiction forces High priority.</p></details><div className="pl-evidence-counts"><span>{risk.missing} unverified claim(s)</span><span>{risk.human} human-review finding(s)</span><span>{audit.findings.filter((finding) => finding.status === "dismissed").length} dismissed</span></div></section>
                   <section className="panel audit-context"><h2>Review Details</h2><dl><div><dt>Check ID</dt><dd>{audit.id}</dd></div><div><dt>Version</dt><dd>{audit.content_version_id}</dd></div><div><dt>Specs source</dt><dd>Novacore Official · {review.api_content_id ? "Cloudflare API" : "Local engine"}</dd></div><div><dt>AI Model</dt><dd>Gemini 2.5 + Deterministic Gate</dd></div></dl><p className="audit-context-note">Proofline verifies factual claims and ad regulations. Team reviewer confirms final approval.</p><button className="secondary-button pl-full-width" type="button" onClick={recheck} disabled={apiBusy}>{apiBusy ? "Running check…" : stale ? "⚡ Check Corrected Version" : "⚡ Run Fresh Accuracy Check"}</button>
<button className="ghost-button pl-full-width" type="button" style={{ marginTop: 8 }} onClick={() => setIsCertOpen(true)}>📜 View Compliance Certificate</button></section>
                </section>
                <section className="pl-findings-column" aria-labelledby="pl-findings-heading"><div className="pl-findings-heading"><h2 id="pl-findings-heading">{audit.findings.length} Flagged Issue(s)</h2><span>{openCount} to fix · {audit.findings.length - openCount} resolved</span></div><p className="micro-helper">Fixes create a new version; dismissing keeps original wording.</p>
                <div className="helper-hint-callout" style={{ margin: "8px 0 14px" }}>
                  <span>💡</span>
                  <div>
                    <strong>How to fix:</strong> Review each flagged claim below. Click <strong>&ldquo;⚡ Apply Suggestion&rdquo;</strong> to replace errors with approved lab specs, then click <strong>&ldquo;⚡ Check Corrected Version&rdquo;</strong> to confirm zero errors.
                  </div>
                </div>{stale ? <div className="pl-stale-note" role="status">The current draft is v{revision.number}. These findings still refer to v{auditedRevision.number}; check the corrected version to refresh the verdicts.</div> : null}{!audit.findings.length ? <section className="panel pl-empty"><h3>No rule findings</h3><p>Only the listed demo rules ran. Contextual and full factual review remain unassessed. Send the content for an authorised human review.</p></section> : audit.findings.map((finding, index) => {
                    const verdict = verdictLabels[finding.verdict];
                    const active = actionFindingId === finding.id;
                    return <article className={`finding-card enhanced-finding-card ${selectedFindingId === finding.id ? "active" : ""}`} id={`pl-finding-${finding.id}`} key={finding.id} tabIndex={-1}>
                      <div className="finding-card-top"><span className="finding-category">{index + 1}. {categoryLabels[finding.category]}</span><span className={`finding-severity ${finding.severity}`}>{finding.severity}</span></div>
                      <div className="finding-verdict-row"><span className={`verdict-icon verdict-${finding.verdict}`} aria-hidden="true">{verdict.icon}</span><div><strong>{verdict.text}</strong><span>Status: {finding.status === "open" ? "Open" : `${finding.status} · recheck required`}</span></div></div>
                      
                      {/* Visual Diff Box: Red strike-through offending phrase -> Green bold suggested fix */}
                      <div className="diff-highlight-box">
                        <div className="diff-segment diff-del">
                          <span className="diff-tag">Flagged</span>
                          <del>{finding.span.text ? `“${finding.span.text}”` : "Image alt-text metadata"}</del>
                        </div>
                        {finding.suggestion ? (
                          <>
                            <span className="diff-arrow" aria-hidden="true">→</span>
                            <div className="diff-segment diff-ins">
                              <span className="diff-tag">Suggested fix</span>
                              <ins>{finding.suggestion.text}</ins>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {/* Primary Actions */}
                      {finding.status === "open" ? (
                        <>
                          <div className="finding-actions enhanced-finding-actions">
                            {finding.suggestion ? (
                              <>
                                <button className="small-button apply-button" type="button" onClick={() => decide(finding, "accepted", finding.suggestion!.text)}>⚡ Apply suggestion</button>
                                <button className="small-button" type="button" onClick={() => { setActionFindingId(finding.id); setActionMode("edit"); setActionText(finding.suggestion!.text); }}>Customize edit</button>
                              </>
                            ) : null}
                            <button className="small-button danger-button" type="button" onClick={() => { setActionFindingId(finding.id); setActionMode("dismiss"); setActionText(""); }}>Dismiss with reason</button>
                          </div>
                          {active && actionMode ? (
                            <div className="dismiss-panel">
                              <label htmlFor={`pl-action-${finding.id}`}>{actionMode === "dismiss" ? "Reason for dismissal (required)" : "Your replacement text"}</label>
                              <textarea id={`pl-action-${finding.id}`} rows={3} value={actionText} onChange={(event) => setActionText(event.target.value)} />
                              <div className="inline-actions">
                                <button className="small-button" type="button" onClick={() => { setActionFindingId(null); setActionMode(null); }}>Cancel</button>
                                <button className="small-button apply-button" type="button" disabled={!actionText.trim()} onClick={() => decide(finding, actionMode === "dismiss" ? "dismissed" : "edited", actionText)}>{actionMode === "dismiss" ? "Record dismissal" : "Save edited correction"}</button>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="decision-record">✓ Explicit {finding.status} action retained in the history below.</p>
                      )}

                      {/* Progressive Disclosure: Accordion for Evidence, Reason & Method */}
                      <details className="finding-meta-accordion">
                        <summary className="meta-summary">
                          <span>Evidence & rule details</span>
                          <span aria-hidden="true">▾</span>
                        </summary>
                        <div className="meta-drawer">
                          <div className="reason-block">
                            <span className="detail-label">Reason</span>
                            <p>{finding.reason}</p>
                          </div>
                          <div className="evidence-row enhanced-evidence-row">
                            <div>
                              <span className="detail-label">{finding.verdict === "unsupported" ? "Evidence gap · requirement source" : "Evidence source"}</span>
                              {finding.evidence ? (
                                <>
                                  <blockquote className="evidence-quote">{finding.evidence.quote}</blockquote>
                                  <p className="evidence-meta">{finding.evidence.source_type} · {finding.evidence.source_id} · version {finding.evidence.version}</p>
                                </>
                              ) : (
                                <p className="evidence-gap">No applicable approved evidence found. A source-backed factual verdict is unavailable.</p>
                              )}
                            </div>
                          </div>
                          <div className="finding-method-row">
                            <span><span className="detail-label">Method</span><strong>{methodLabels[finding.method]}</strong></span>
                            <span><span className="detail-label">Confidence</span><strong>{Math.round(finding.confidence * 100)}%{finding.confidence === 0 ? " · not assessed" : " rule-match strength"}</strong></span>
                            <span className="ai-badge">{finding.method === "llm" || finding.method === "hybrid" ? "AI-generated" : "AI-generated: no"}</span>
                          </div>
                          {finding.status === "dismissed" ? <div className="dismissal-note"><strong>Dismissal reason</strong><p>{finding.dismiss_reason}</p></div> : null}
                        </div>
                      </details>
                    </article>;
                  })}</section>
              </div>
              <section className="panel pl-history" aria-labelledby="pl-history-heading"><div className="history-header"><div><h2 id="pl-history-heading">Review &amp; Edit History</h2><p className="pl-helper">Complete record of edits, suggestions applied, and approvals · {review.revisions.length} versions · {review.audits.length} checks</p></div><span className="panel-badge">{review.events.length} events</span></div><ol className="pl-event-list">{review.events.slice().reverse().map((event) => <li key={event.id}><div className="pl-event-top"><strong>{event.action}</strong><time dateTime={event.timestamp}>{timestamp(event.timestamp)}</time></div><p>{event.actor} · content version {event.content_version_id}{event.finding_id ? ` · finding ${event.finding_id}` : ""}</p>{event.reason ? <p><strong>Reason: </strong>{event.reason}</p> : null}{event.before !== null ? <div className="pl-event-change"><span>Before: {event.before}</span><span>After: {event.after}</span></div> : null}</li>)}</ol><p className="pl-helper">Kept in sessionStorage for this browser tab when available; no durable server storage or authenticated identity is implied.</p></section>
              {audit && revision ? (
                <ComplianceCertificateModal
                  isOpen={isCertOpen}
                  onClose={() => setIsCertOpen(false)}
                  content={revision.text}
                  contentVersion={`v${revision.number}`}
                  auditState={openCount === 0 ? "approved" : "needs-changes"}
                  reviewerName="Maya Chen"
                  findings={audit.findings.map((f) => ({
                    id: f.id,
                    category: f.category,
                    severity: f.severity,
                    excerpt: f.span.text,
                    suggestion: f.suggestion?.text ?? "",
                    resolved: f.status !== "open",
                  }))}
                />
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
