import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import { DynamicTruthSync } from "../components/dynamic-truth-sync";

export const metadata: Metadata = {
  title: "Dynamic Brand Truth Sync & Enterprise Doc Ingestion | Proofline",
  description:
    "Automates Brand Truth Registry ingestion by syncing with live corporate data sources (Notion, Google Docs, Shopify ERP, and product spec sheets).",
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
        style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}
      >
        <DynamicTruthSync />
      </section>
    </main>
  );
}
