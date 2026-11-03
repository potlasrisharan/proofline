import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import { MultimodalComplianceStudio } from "../components/multimodal-compliance-studio";

export const metadata: Metadata = {
  title: "Multimodal Visual & Video Compliance Engine | Proofline",
  description:
    "Extracts and verifies claims, price tags, and mandatory disclaimer font sizes directly from image carousels, Figma exports, and video frames (Instagram Reels / YouTube Shorts) using multimodal vision models.",
};

export default function MultimodalPage() {
  return (
    <div className="layout-root">
      <AppSidebar activeKey="multimodal" />
      <main className="main-content" style={{ padding: "24px 32px" }}>
        <MultimodalComplianceStudio />
      </main>
    </div>
  );
}
