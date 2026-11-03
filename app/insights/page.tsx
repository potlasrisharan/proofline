import type { Metadata } from "next";

import { Phase4Shell } from "../components/phase4-shell";
import { InsightsDemo } from "./insights-demo";

export const metadata: Metadata = {
  title: "Governance insights · Proofline",
  description: "Learn from recurring edits, track expiring specs, and improve brand guidelines.",
};

export default function InsightsPage() {
  return (
    <Phase4Shell
      current="insights"
      eyebrow="Team Insights & Trends"
      title="Find patterns. Clarify the guidance."
      description="See recurring review issues, expiring product specs, and confusing rules so your team can improve brand guidelines."
    >
      <InsightsDemo />
    </Phase4Shell>
  );
}
