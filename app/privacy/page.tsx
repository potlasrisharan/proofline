import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy and AI transparency · Proofline",
  description: "Verified local data-handling and AI-service boundaries for the Proofline demonstration UI.",
};

type DisclosureStatus = "IMPLEMENTED" | "STUB" | "PLANNED" | "MISSING";

type TransparencyEntry = {
  name: string;
  scope: string;
  status: DisclosureStatus;
  data: string;
  retention: string;
  note: string;
};

const transparencyEntries: TransparencyEntry[] = [
  {
    name: "Browser demo and deterministic checker",
    scope: "Product runtime · browser",
    status: "IMPLEMENTED",
    data: "Synthetic VoltEdge records, user-entered drafts and publication context, and explicit local clicks, edits, comments, and review actions.",
    retention: "Overview and review-queue state stays in React memory. The /submit and /findings flow uses sessionStorage for this tab when available, with an in-memory fallback.",
    note: "No runtime model, hosted OCR service, Cloudflare project, or durable database is called by these frontend routes.",
  },
  {
    name: "FastAPI local foundation",
    scope: "Local API · separate from this screen",
    status: "IMPLEMENTED",
    data: "Organisation-scoped vault and local content-workflow requests only when the API is called directly with its configured local authentication boundary.",
    retention: "The adapter is process-memory only. Its records disappear when the local API process stops.",
    note: "This is a verified local contract/RBAC foundation, not durable storage and not a safe destination for confidential production records.",
  },
  {
    name: "External AI provider",
    scope: "Backend adapter · not called by the UI",
    status: "STUB",
    data: "None from the current frontend routes. A server-side Gemini adapter is disabled unless environment-only configuration is supplied, and no provider/model call was observed.",
    retention: "No provider request is made by this demo. Model, region, training-use settings, and provider retention remain unverified.",
    note: "An adapter or environment variable is not evidence that an AI provider is active.",
  },
  {
    name: "Hosted OCR, PDF, or DOCX service",
    scope: "Document intake · not connected",
    status: "MISSING",
    data: "No hosted extraction service receives data. The frontend only reads supported UTF-8 .txt files locally; PDF, DOCX, and image/OCR intake remains a STUB in this path.",
    retention: "No hosted extraction retention exists for this build. Future parser/provider behavior must be documented before use.",
    note: "Local backend parsers and a hosted OCR service are separate boundaries; one does not prove the other is active.",
  },
  {
    name: "Cloudflare Access, D1, R2, and Queues",
    scope: "Planned durable foundation",
    status: "STUB",
    data: "None in this build. Wrangler bindings and D1 schema/seed artifacts exist, but no live Access policy, membership lookup, D1 database, R2 bucket, or Queue consumer is connected.",
    retention: "Not applicable because no live Cloudflare resource receives data. Retention and deletion rules remain to be configured and verified.",
    note: "The planned foundation does not turn the seeded browser demo into an authenticated tenant workspace.",
  },
  {
    name: "Confidential-material flag",
    scope: "User control · current demo",
    status: "IMPLEMENTED",
    data: "A browser-local checkbox records that a draft is confidential in the current review record; it is a safety marker, not an identity or consent system.",
    retention: "The marker and draft remain in this tab's sessionStorage when available, with no server-side deletion guarantee. Clear this site's session storage and close the tab if sensitive text was entered.",
    note: "The local demo makes no external request, but the control does not make this a production-safe confidential workspace. Use fictional VoltEdge material only.",
  },
  {
    name: "Hosting, analytics, and deployment services",
    scope: "Deployment infrastructure",
    status: "MISSING",
    data: "No hosted deployment or analytics integration has been verified for this local build.",
    retention: "Request-log, region, and analytics retention are unknown until an actual deployment is selected and verified.",
    note: "Do not infer a live hosting provider, processing region, or retention guarantee from framework files or a local Dockerfile.",
  },
];

function StatusBadge({ status }: { status: DisclosureStatus }) {
  return <span className={`disclosure-status disclosure-${status.toLowerCase()}`}>{status}</span>;
}

function TransparencyEntry({ entry }: { entry: TransparencyEntry }) {
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

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-shell">
        <header className="privacy-header">
          <Link className="privacy-back-link" href="/">
            <span aria-hidden="true">←</span> Back to Proofline
          </Link>
          <p className="eyebrow">Trust center · Verified local boundary</p>
          <h1>Privacy and AI transparency</h1>
          <p className="privacy-lede">
            This page records the verified behavior of the current seeded demonstration UI and its separate local API foundation. It is a product disclosure, not a complete production privacy policy or a legal commitment about services that are not configured.
          </p>
        </header>

        <section className="privacy-status" aria-labelledby="privacy-status-heading">
          <span className="status-dot blue" aria-hidden="true" />
          <div>
            <h2 id="privacy-status-heading">Current boundary: local demo state only</h2>
            <p>
              As of October 26, 2026, the runnable screens are Next.js client-side demonstrations using fictional VoltEdge records. No external AI/OCR/database/hosting service is verified as connected to these frontend routes, and the local API uses process-memory adapters.
            </p>
            <dl className="disclosure-facts">
              <div>
                <dt>Runtime model</dt>
                <dd><StatusBadge status="STUB" /> No provider or model is configured or verified for the demo UI.</dd>
              </div>
              <div>
                <dt>Data boundary</dt>
                <dd><StatusBadge status="IMPLEMENTED" /> Browser-local state; direct API calls remain in-memory and separate.</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="privacy-grid">
          <section className="privacy-section" aria-labelledby="privacy-receives-heading">
            <p className="eyebrow">01 · Inputs</p>
            <h2 id="privacy-receives-heading">What this demo receives</h2>
            <ul>
              <li>Seeded review, registry, and activity records included in the application bundle.</li>
              <li>Button clicks, tab changes, suggestion actions, and other interactions held in React memory while the page is open.</li>
              <li>Text and publication context entered on the /submit route, including locally read UTF-8 .txt files, if a user chooses to run the bounded demo checks.</li>
              <li>An optional confidential marker selected on /submit, which stays with the browser-local review record and does not authorize external processing.</li>
            </ul>
          </section>

          <section className="privacy-section" aria-labelledby="privacy-stores-heading">
            <p className="eyebrow">02 · Storage</p>
            <h2 id="privacy-stores-heading">What is stored</h2>
            <ul>
              <li>The overview and review-queue interactions are held in React memory and reset when those screens are refreshed.</li>
              <li>The /submit and /findings flow keeps its content versions, findings, and explicit actions in browser sessionStorage for this tab when available. Refreshing that flow preserves its tab record; an in-memory fallback is used if browser storage is unavailable.</li>
              <li>No frontend route sends those records to a durable database. The separately called local FastAPI foundation uses process-memory adapters whose records disappear when that process stops.</li>
            </ul>
          </section>

          <section className="privacy-section" aria-labelledby="privacy-external-heading">
            <p className="eyebrow">03 · External processing</p>
            <h2 id="privacy-external-heading">What leaves the app</h2>
            <p>
              The current frontend routes do not send draft content to an external model, hosted OCR/PDF service, Cloudflare project, or storage provider. A backend Gemini adapter and local document-extraction modules are separate integration boundaries; their existence does not prove a live model call from the UI. Provider model, region, retention, and training-use terms must be verified for any connected deployment.
            </p>
          </section>

          <section className="privacy-section" aria-labelledby="privacy-retention-heading">
            <p className="eyebrow">04 · Retention</p>
            <h2 id="privacy-retention-heading">Retention and deletion</h2>
            <p>
              React-only state is discarded on refresh or close. The /submit and /findings sessionStorage record remains for the browser tab session; close the tab or clear this site&apos;s browser session storage to remove it. Browser session-restore behavior is controlled by the browser, so this is not a guaranteed timed-deletion policy. Retention rules for a future hosted model, OCR provider, Cloudflare D1/R2 deployment, or production storage system are <strong>PLANNED</strong> and must be verified before confidential content is accepted.
            </p>
          </section>
        </div>

        <section className="privacy-section privacy-wide" aria-labelledby="privacy-services-heading">
          <p className="eyebrow">05 · Runtime inventory</p>
          <h2 id="privacy-services-heading">What can receive data in this build</h2>
          <p>
            Status labels describe the verified local boundary. <strong>IMPLEMENTED</strong> means a local path exists; <strong>STUB</strong>, <strong>PLANNED</strong>, and <strong>MISSING</strong> do not mean that a service is receiving demo content.
          </p>
          <div className="disclosure-list">
            {transparencyEntries.map((entry) => <TransparencyEntry key={entry.name} entry={entry} />)}
          </div>
        </section>

        <section className="privacy-section privacy-wide" aria-labelledby="privacy-choices-heading">
          <p className="eyebrow">06 · User choices</p>
          <h2 id="privacy-choices-heading">Use the demo safely</h2>
          <div className="privacy-callout">
            <strong>Use synthetic or fictional material only.</strong>
            <p>
              The demo and documentation use fictional VoltEdge records. The confidential-material checkbox is only a browser-local safety marker; there is still no server-side deletion workflow or production confidentiality guarantee. Do not paste customer information, confidential brand sources, credentials, private keys, or other sensitive material into this demonstration.
            </p>
          </div>
          <p>
            The /submit route reads supported plain-text files locally. PDF, DOCX, and image/OCR intake remain a <strong>STUB</strong> in this frontend path. If sensitive material was entered, clear this site&apos;s session storage and close the tab; browser session restore is outside the app&apos;s control. If an audit dependency fails, Proofline should show a failed or review-required state rather than a successful-looking result.
          </p>
        </section>

        <section className="privacy-section privacy-wide" aria-labelledby="privacy-verification-heading">
          <p className="eyebrow">07 · Verification provenance</p>
          <h2 id="privacy-verification-heading">What the local checks actually prove</h2>
          <ul>
            <li>The Evidence-or-Abstain report measures 194 synthetic VoltEdge cases through a local deterministic engine and records <code>external_calls=0</code>.</li>
            <li>Those measurements are reproducible implementation checks, not model accuracy, real-world truth, legal compliance, accessibility certification, or production reliability.</li>
            <li>The test wrapper checks the generated section of <code>docs/EVAL_REPORT.md</code> without rewriting the tracked report. Intentional regeneration is a separate explicit command, and the evaluator refuses secret-like destinations.</li>
          </ul>
        </section>

        <section className="privacy-section privacy-wide" aria-labelledby="privacy-limitations-heading">
          <p className="eyebrow">08 · Scope</p>
          <h2 id="privacy-limitations-heading">Human review and product limits</h2>
          <ul>
            <li>AI-assisted findings, when a verified provider is eventually configured, will be advisory and may be wrong, incomplete, stale, or biased.</li>
            <li>Evidence is expected to come from approved, versioned records; missing evidence is not proof that a claim is false.</li>
            <li>Suggestions are proposals. An authorised human remains responsible for approval, override, or request for changes.</li>
            <li>Proofline is not legal advice, a guarantee of real-world truth, or a complete accessibility certification.</li>
          </ul>
        </section>

        <footer className="privacy-footer">
          <span>Proofline local demo · Last reviewed October 26, 2026</span>
          <Link href="/">Return to the demo</Link>
        </footer>
      </div>
    </main>
  );
}
