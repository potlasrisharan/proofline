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
    <main className="app-shell pl-workspace">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AppSidebar activeKey="multimodal" />
      <section
        id="main-content"
        className="main-content"
        tabIndex={-1}
        style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}
      >
        <MultimodalComplianceStudio />
      </section>
    </main>
  );
}
