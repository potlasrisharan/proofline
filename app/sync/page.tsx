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
    <div className="layout-root">
      <AppSidebar activeKey="sync" />
      <main className="main-content" style={{ padding: "24px 32px" }}>
        <DynamicTruthSync />
      </main>
    </div>
  );
}
