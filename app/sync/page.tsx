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
        className="main-content page-container-section"
        tabIndex={-1}
      >
        <WorkflowStepper currentStage={1} />
        <DynamicTruthSync />
      </section>
    </main>
  );
}
