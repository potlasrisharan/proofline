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
        className="main-content page-container-section"
        tabIndex={-1}
      >
        <WorkflowStepper currentStage={4} />
        <PublishingDriftRadar />
      </section>
    </main>
  );
}
