import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy and data handling · Proofline",
  description: "Verified local data-handling boundaries for the Proofline demonstration UI.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-shell">
        <header className="privacy-header">
          <Link className="privacy-back-link" href="/">
            <span aria-hidden="true">←</span> Back to Proofline
          </Link>
          <p className="eyebrow">Trust center · Local demo</p>
          <h1>Privacy and data handling</h1>
          <p className="privacy-lede">
            This page records the verified behavior of the current seeded demonstration UI. It is a product disclosure, not a complete production privacy policy or a legal commitment about services that are not configured.
          </p>
        </header>

        <section className="privacy-status" aria-labelledby="privacy-status-heading">
          <span className="status-dot blue" aria-hidden="true" />
          <div>
            <h2 id="privacy-status-heading">Current boundary: local demo state only</h2>
            <p>
              The runnable screens are Next.js client-side demonstrations using fictional VoltEdge records. Their interaction state is not connected to a live model provider, hosted OCR service, Supabase project, or durable review database.
            </p>
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
              The current frontend routes do not send draft content to an external model, hosted OCR/PDF service, Supabase project, or storage provider. A backend Gemini adapter and document-extraction modules are separate integration boundaries; their existence does not prove a live model call from the UI. Provider model, region, retention, and training-use terms must be verified for any connected deployment.
            </p>
          </section>

          <section className="privacy-section" aria-labelledby="privacy-retention-heading">
            <p className="eyebrow">04 · Retention</p>
            <h2 id="privacy-retention-heading">Retention and deletion</h2>
            <p>
              React-only state is discarded on refresh or close. The /submit and /findings sessionStorage record remains for the browser tab session; close the tab or clear this site&apos;s browser session storage to remove it. Browser session-restore behavior is controlled by the browser, so this is not a guaranteed timed-deletion policy. Retention rules for a future hosted model, OCR provider, Supabase project, or production storage system are <strong>PLANNED</strong> and must be verified before confidential content is accepted.
            </p>
          </section>
        </div>

        <section className="privacy-section privacy-wide" aria-labelledby="privacy-choices-heading">
          <p className="eyebrow">05 · User choices</p>
          <h2 id="privacy-choices-heading">Use the demo safely</h2>
          <div className="privacy-callout">
            <strong>Use synthetic or fictional material only.</strong>
            <p>
              The demo and documentation use fictional VoltEdge records. Do not paste customer information, confidential brand sources, credentials, private keys, or other sensitive material into this demonstration.
            </p>
          </div>
          <p>
            The /submit route reads supported plain-text files locally. PDF, DOCX, and image/OCR intake remain a <strong>STUB</strong> in this frontend path. If an audit dependency fails, Proofline should show a failed or review-required state rather than a successful-looking result.
          </p>
        </section>

        <section className="privacy-section privacy-wide" aria-labelledby="privacy-limitations-heading">
          <p className="eyebrow">06 · Scope</p>
          <h2 id="privacy-limitations-heading">Human review and product limits</h2>
          <ul>
            <li>AI-assisted findings, when a verified provider is eventually configured, will be advisory and may be wrong, incomplete, stale, or biased.</li>
            <li>Evidence is expected to come from approved, versioned records; missing evidence is not proof that a claim is false.</li>
            <li>Suggestions are proposals. An authorised human remains responsible for approval, override, or request for changes.</li>
            <li>Proofline is not legal advice, a guarantee of real-world truth, or a complete accessibility certification.</li>
          </ul>
        </section>

        <footer className="privacy-footer">
          <span>Proofline local demo · Last reviewed October 25, 2026</span>
          <Link href="/">Return to the demo</Link>
        </footer>
      </div>
    </main>
  );
}
