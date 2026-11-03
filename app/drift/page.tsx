import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import { PublishingDriftRadar } from "../components/publishing-drift-radar";

export const metadata: Metadata = {
  title: "Multi-Platform Publishing & Post-Publish Drift Radar | Proofline",
  description:
    "Live production multi-platform publishing (Meta, X, LinkedIn) with active drift monitoring that continuously watches live published content against the Brand Truth Registry.",
};

export default function DriftRadarPage() {
  return (
    <div className="layout-root">
      <AppSidebar activeKey="drift" />
      <main className="main-content" style={{ padding: "24px 32px" }}>
        <PublishingDriftRadar />
      </main>
    </div>
  );
}
