import type { Metadata } from "next";

import { Phase4Shell } from "../components/phase4-shell";
import { ImpactDemo } from "./impact-demo";

export const metadata: Metadata = {
  title: "Fact-change impact radar · Proofline",
  description: "A local, synthetic VoltEdge demonstration of version-aware content re-review.",
};

export default function ImpactPage() {
  return (
    <Phase4Shell
      current="impact"
      eyebrow="Fact-change impact radar"
      title="See what changed before it goes stale."
      description="When a versioned fact changes or an offer expires, registered claims are listed with their old and new evidence so an authorised reviewer can decide what happens next."
    >
      <ImpactDemo />
    </Phase4Shell>
  );
}
