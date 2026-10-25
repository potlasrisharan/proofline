import type { Metadata } from "next";

import { Phase4Shell } from "../components/phase4-shell";
import { InsightsDemo } from "./insights-demo";

export const metadata: Metadata = {
  title: "Governance insights · Proofline",
  description: "A local, synthetic VoltEdge demonstration of aggregate review insights and guideline-gap signals.",
};

export default function InsightsPage() {
  return (
    <Phase4Shell
      current="insights"
      eyebrow="Governance insights"
      title="Find patterns. Clarify the guidance."
      description="Review aggregate issue patterns, expiring facts, and guideline ambiguity signals without ranking individual people."
    >
      <InsightsDemo />
    </Phase4Shell>
  );
}
