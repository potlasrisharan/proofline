"use client";

import Link from "next/link";

type DisclosureStatus = "IMPLEMENTED" | "STUB" | "PLANNED" | "MISSING";

type DisclosureEntry = {
  name: string;
  scope: string;
  status: DisclosureStatus;
  data: string;
  retention: string;
  note: string;
};

type DisclosurePanelProps = {
  open: boolean;
  onClose: () => void;
};

const runtimeServices: DisclosureEntry[] = [
  {
    name: "Next.js seeded demo UI",
    scope: "Product runtime · browser",
    status: "IMPLEMENTED",
    data: "Synthetic VoltEdge records, user-entered drafts and publication context, and explicit clicks, edits, comments, and decisions made in the local demo.",
    retention: "Overview/review-queue state is held in React memory and resets on refresh. The /submit and /findings flow stores its review in browser sessionStorage for this tab, with an in-memory fallback if storage is unavailable. No durable server storage is connected.",
    note: "The default screen is a demonstration UI. The optional local API mode still does not call an external model, OCR provider, or Cloudflare project.",
  },
  {
    name: "FastAPI local foundation",
    scope: "Local API · opt-in from this screen",
    status: "IMPLEMENTED",
    data: "Organisation-scoped vault and local content-workflow requests when the API is called with configured local development headers. The content review routes invoke it only when the explicit opt-in flag is enabled.",
    retention: "In-memory demo adapter for the lifetime of the local process. Records are lost when the process stops.",
    note: "Verified local foundation only. If the opt-in API call fails, the UI shows an error rather than silently reporting a successful audit. It is not durable storage and must not be used for confidential production records.",
  },
  {
    name: "Browser-local deterministic checker",
    scope: "Submit/findings demo · browser",
    status: "IMPLEMENTED",
    data: "Synthetic VoltEdge drafts, publication context, and bounded local rules used for highlighted spans, evidence gaps, risk triage, and explicit correction actions.",
    retention: "The current review is kept in this browser tab's sessionStorage when available, with an in-memory fallback. No model or external service receives the draft.",
    note: "This is a deterministic demo checker, not a calibrated truth score or a live AI provider.",
  },
  {
    name: "Google Gemini adapter",
    scope: "Backend adapter · not called by the UI",
    status: "STUB",
    data: "None from the frontend demo routes. The backend adapter requires server-only GEMINI_API_KEY and GEMINI_MODEL configuration; a live provider/model call has not been verified for this UI.",
    retention: "No frontend model request is made. Gemini model selection, processing region, training-use settings, and provider retention remain unverified.",
    note: "Adapter code is not proof of an active model. A future live path must disclose its exact payload, model, provider terms, and configuration before confidential content is accepted.",
  },
  {
    name: "OCR / PDF / DOCX extraction service",
    scope: "Planned content intake",
    status: "STUB",
    data: "Default browser-only mode reads UTF-8 .txt locally. Explicit opt-in local API mode can send bounded PDF, DOCX, PNG, and JPG bytes to the local FastAPI process; no hosted OCR or extraction service receives data.",
    retention: "Local text enters the browser-tab review record. No external extraction-service retention is established. Backend extraction modules are separate from this UI path.",
    note: "Local API extraction is dependency-gated and reports partial/failed states. A local parser and a hosted OCR service have different data-transfer boundaries; hosted OCR remains STUB.",
  },
  {
    name: "Cloudflare Access, D1, R2, and Queues",
    scope: "Target durable foundation",
    status: "STUB",
    data: "None in this build. Wrangler bindings and a D1 schema are present, but no live Access policy, membership lookup, D1 database, R2 bucket, or Queue consumer is configured.",
    retention: "Not applicable because no live Cloudflare resource receives data. Retention and deletion rules remain to be configured and verified.",
    note: "The repository contains deployment-ready bindings and a Python Worker entrypoint; that does not mean Cloudflare services are active.",
  },
  {
    name: "Hosting, analytics, and deployment services",
    scope: "Deployment-specific infrastructure",
    status: "MISSING",
    data: "No hosted deployment or analytics integration has been verified for this local build. Ordinary hosting request/log behavior must be documented for any future deployment.",
    retention: "Unknown until an actual hosting deployment and its request-log policy are verified.",
    note: "Do not infer a live Cloudflare Pages or Workers deployment, analytics provider, processing region, or retention guarantee from a framework name or configuration file.",
  },
];

const developmentServices: DisclosureEntry[] = [
  {
    name: "Coding assistant · gpt-6.1-sol",
    scope: "Development assistance · not product runtime",
    status: "IMPLEMENTED",
    data: "Repository files, task instructions, and tool output supplied during this coding session; no customer records, credentials, or private brand data were added.",
    retention: "The project does not control the coding environment's provider retention. Refer to the environment's own terms for that separate development activity.",
    note: "This model is disclosed for development transparency. It is not called by the Proofline demo UI or represented as an audit provider.",
  },
];

function StatusBadge({ status }: { status: DisclosureStatus }) {
  return <span className={`disclosure-status disclosure-${status.toLowerCase()}`}>{status}</span>;
}

function DisclosureEntryCard({ entry }: { entry: DisclosureEntry }) {
  return (
    <article className="disclosure-entry">
      <div className="disclosure-entry-heading">
        <div>
          <h3>{entry.name}</h3>
          <p>{entry.scope}</p>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <dl className="disclosure-facts">
        <div>
          <dt>Data received</dt>
          <dd>{entry.data}</dd>
        </div>
        <div>
          <dt>Retention</dt>
          <dd>{entry.retention}</dd>
        </div>
      </dl>
      <p className="disclosure-note">{entry.note}</p>
    </article>
  );
}

export function DisclosurePanel({ open, onClose }: DisclosurePanelProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop disclosure-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section
        className="modal-card disclosure-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclosure-title"
        aria-describedby="disclosure-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close AI and services disclosure" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Trust center</p>
        <h2 id="disclosure-title">AI and services disclosure</h2>
        <p id="disclosure-description" className="modal-copy">
          This panel describes the services and models that are actually connected to this build. A status of STUB or PLANNED means the service is not receiving data.
        </p>

        <div className="synthetic-data-note">
          <strong>Demo-data notice</strong>
          <p>
            This interface uses synthetic VoltEdge demo records and local browser state. It is not a production workspace. Do not submit customer or confidential brand material to this demo.
          </p>
        </div>

        <div className="disclosure-section">
          <div className="disclosure-section-heading">
            <div>
              <p className="eyebrow">Product runtime</p>
              <h3>What can receive data</h3>
            </div>
            <span className="panel-badge">{runtimeServices.length} entries</span>
          </div>
          <div className="disclosure-list">
            {runtimeServices.map((entry) => <DisclosureEntryCard key={entry.name} entry={entry} />)}
          </div>
        </div>

        <div className="disclosure-section development-disclosure">
          <div className="disclosure-section-heading">
            <div>
              <p className="eyebrow">Separate activity</p>
              <h3>Development assistance</h3>
            </div>
            <span className="panel-badge">Not runtime</span>
          </div>
          <div className="disclosure-list">
            {developmentServices.map((entry) => <DisclosureEntryCard key={entry.name} entry={entry} />)}
          </div>
        </div>

        <div className="disclosure-footer">
          <span>Last reviewed October 26, 2026 · Local boundary</span>
          <Link href="/privacy" onClick={onClose}>Read privacy and data handling</Link>
        </div>
      </section>
    </div>
  );
}
