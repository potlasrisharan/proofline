import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import { PublishingDriftRadar } from "../components/publishing-drift-radar";
import { WorkflowStepper } from "../components/workflow-stepper";

export const metadata: Metadata = {
  title: "Safe Publishing & 24/7 Live Post Monitor | Proofline",
  description:
    "Publish approved content to social channels and monitor live posts 24/7 for updates when specs change.",
};

export default function DriftRadarPage() {
  return (
    <main className="app-shell pl-workspace">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AppSidebar activeKey="drift" />
      <section
        id="main-content"
        className="main-content"
        tabIndex={-1}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--ind-bg, #EBEBE8)" }}
      >
        <header className="topbar">
          <div className="breadcrumb">
            <span>VOLTEDGE</span><i>/</i><strong>Safe publishing &amp; drift radar</strong>
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
              IMPLEMENTED · Zernio Publishing Gateway
            </span>
          </div>
        </header>

        <div className="page-container-section">
          <WorkflowStepper currentStage={4} />
          <PublishingDriftRadar />
        </div>
      </section>
    </main>
  );
}
