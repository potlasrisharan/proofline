"use client";

import { useState } from "react";

import { ImpactRadar, ImpactRadarBanner } from "../components/ImpactRadar";
import { createDemoImpactRecheck, demoImpactResponse } from "../lib/impact-demo";

export function ImpactDemo() {
  const [notice, setNotice] = useState<string | null>(null);

  async function recheckAll() {
    const result = createDemoImpactRecheck();
    setNotice("The local re-check completed. The two records remain routed to human review.");
    return result;
  }

  return (
    <div>
      <ImpactRadarBanner data={demoImpactResponse} />
      <div style={{ marginTop: 14 }}>
        <ImpactRadar
          data={demoImpactResponse}
          onRecheckAll={recheckAll}
          onOpenContent={(contentId) => setNotice(`Review requested for ${contentId}. No content was changed.`)}
        />
      </div>
      {notice ? <p className="pl-action-message" role="status">{notice}</p> : null}
    </div>
  );
}
