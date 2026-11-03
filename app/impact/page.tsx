import type { Metadata } from "next";

import { Phase4Shell } from "../components/phase4-shell";
import { ImpactDemo } from "./impact-demo";

export const metadata: Metadata = {
  title: "Fact-change impact radar · Proofline",
  description: "See which marketing drafts and social posts are affected when a product spec changes.",
};

export default function ImpactPage() {
  return (
    <Phase4Shell
      current="impact"
      eyebrow="Spec Change Radar"
      title="Fact-Change Impact Radar"
      description="Find stored content that relied on an older approved fact."
    >
      <ImpactDemo />
    </Phase4Shell>
  );
}
