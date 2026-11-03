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
    <main className="app-shell pl-workspace">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AppSidebar activeKey="drift" />
      <section
        id="main-content"
        className="main-content"
        tabIndex={-1}
        style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}
      >
        <PublishingDriftRadar />
      </section>
    </main>
  );
}
