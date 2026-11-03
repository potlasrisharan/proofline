import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import { DynamicTruthSync } from "../components/dynamic-truth-sync";
import { WorkflowStepper } from "../components/workflow-stepper";

export const metadata: Metadata = {
  title: "Live Spec Sync (Notion, Google Docs & Shopify) | Proofline",
  description:
    "Automatically syncs approved specs from Notion, Google Docs, and Shopify inventory into Proofline.",
};

export default function DynamicSyncPage() {
  return (
    <main className="app-shell pl-workspace">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AppSidebar activeKey="sync" />
      <section
        id="main-content"
        className="main-content"
        tabIndex={-1}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--ind-bg, #EBEBE8)" }}
      >
        <header className="topbar">
          <div className="breadcrumb">
            <span>VOLTEDGE</span><i>/</i><strong>Dynamic truth sync</strong>
          </div>
          <div className="top-actions">
            <div className="backend-mode-toggle" role="radiogroup" aria-label="Backend Execution Engine" suppressHydrationWarning>
              <span className="backend-toggle-label">Engine:</span>
              <button
                type="button"
                className="backend-toggle-option active"
                aria-checked="true"
                role="radio"
                title="Connected to live Cloudflare Python Worker & D1 Database"
              >
                <span className="engine-dot live" /> ⚡ Cloudflare API (Default)
              </button>
            </div>
            <span className="pl-demo-label" suppressHydrationWarning>
              IMPLEMENTED · Live Notion &amp; Docs Sync
            </span>
          </div>
        </header>

        <div className="page-container-section">
          <WorkflowStepper currentStage={1} />
          <DynamicTruthSync />
        </div>
      </section>
    </main>
  );
}
