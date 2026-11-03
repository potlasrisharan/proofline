"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImpactRadar, ImpactRadarBanner } from "../components/ImpactRadar";
import { createDemoImpactRecheck, demoImpactItems, demoImpactResponse } from "../lib/impact-demo";

export function ImpactDemo() {
  const router = useRouter();
  const [activeScenario, setActiveScenario] = useState<"all" | "battery" | "offer">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredItems = demoImpactItems.filter((item) => {
    if (activeScenario === "battery") return item.reason === "fact_changed";
    if (activeScenario === "offer") return item.reason === "fact_expired";
    return true;
  });

  const activeResponse = {
    ...demoImpactResponse,
    items: filteredItems,
    affected_content: filteredItems,
    affected_content_count: filteredItems.length,
    affected_claim_count: filteredItems.length,
    task_count: filteredItems.length,
  };

  async function recheckAll() {
    const result = createDemoImpactRecheck();
    setNotice(
      `⚡ Re-check completed for ${filteredItems.length} affected item(s). Audit tasks recorded with SHA-256 evidence hashes. Content remains marked for human review.`
    );
    return result;
  }

  function handleOpenContent(contentId: string) {
    setNotice(`Routing to review workspace for ${contentId}...`);
    router.push("/?view=reviews");
  }

  return (
    <div>
      <div className="helper-hint-callout" style={{ marginBottom: 14 }}>
        <span>💡</span>
        <div>
          <strong>What is Impact Radar?</strong> When engineers update a product spec (e.g., NovaBook battery tested at 12 hours instead of 10) or marketing promos expire, Impact Radar automatically finds every published email, ad, and social post that still quotes the old spec so your team can update them.
        </div>
      </div>
      <div className="impact-simulator-bar" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap", padding: "12px 16px", background: "#FFFFFF", border: "1px solid var(--ind-border, #D4D4D8)", borderRadius: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)", color: "#18181B", textTransform: "uppercase", letterSpacing: "0.14em" }}>⚡ Simulate Spec Change:</span>
        <button
          className={`small-button ${activeScenario === "all" ? "apply-button" : ""}`}
          type="button"
          onClick={() => { setActiveScenario("all"); setNotice("Displaying all cascading fact & offer impact items."); }}
        >
          All Impact Events ({demoImpactItems.length})
        </button>
        <button
          className={`small-button ${activeScenario === "battery" ? "apply-button" : ""}`}
          type="button"
          onClick={() => { setActiveScenario("battery"); setNotice("Filtered: NovaBook S1 battery life spec updated from 10h to 12h."); }}
        >
          NovaBook Battery (10h → 12h)
        </button>
        <button
          className={`small-button ${activeScenario === "offer" ? "apply-button" : ""}`}
          type="button"
          onClick={() => { setActiveScenario("offer"); setNotice("Filtered: October 20% promotional discount lapsed."); }}
        >
          Offer Validity Ended (20% Off)
        </button>
      </div>

      <ImpactRadarBanner data={activeResponse} onOpenImpact={() => window.scrollTo({ top: 150, behavior: "smooth" })} />
      <div style={{ marginTop: 14 }}>
        <ImpactRadar
          data={activeResponse}
          onRecheckAll={recheckAll}
          onOpenContent={handleOpenContent}
        />
      </div>
      {notice ? <p className="pl-action-message" role="status" style={{ marginTop: 12 }}>{notice}</p> : null}
    </div>
  );
}
