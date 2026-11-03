import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import { MultimodalComplianceStudio } from "../components/multimodal-compliance-studio";
import { WorkflowStepper } from "../components/workflow-stepper";

export const metadata: Metadata = {
  title: "Video & Visual Scan | Proofline",
  description:
    "Check video reels, image carousels, and footnotes for accurate specs, honest pricing, and readable disclaimer text.",
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
        className="main-content page-container-section"
        tabIndex={-1}
      >
        <WorkflowStepper currentStage={2} />
        <MultimodalComplianceStudio />
      </section>
    </main>
  );
}
