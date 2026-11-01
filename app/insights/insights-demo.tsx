"use client";

import { useState } from "react";

import GovernanceInsights from "../components/GovernanceInsights";
import { demoGovernanceInsights } from "../lib/insights-demo";
import type { SuggestedRuleUpdate } from "../lib/insights";

export function InsightsDemo() {
  const [data, setData] = useState(demoGovernanceInsights);

  async function approveSuggestion(proposal: SuggestedRuleUpdate) {
    setData((current) => ({
      ...current,
      suggested_rule_updates: current.suggested_rule_updates.map((item) =>
        item.proposal_id === proposal.proposal_id
          ? {
              ...item,
              status: "approved",
              approved_by: "user-voltedge-brand-owner",
              approved_at: "2026-10-25T12:00:00Z",
              applied: false,
            }
          : item,
      ),
    }));
  }

  return (
    <div>
      <div className="helper-hint-callout" style={{ marginBottom: 16 }}>
        <span>💡</span>
        <div>
          <strong>What is Governance Insights?</strong> It spots recurring marketing mistakes across teams and detects confusing brand rules. Under <strong>&ldquo;Rules that need attention&rdquo;</strong>, brand owners can approve clearer wording in 1 click to prevent future mistakes.
        </div>
      </div>
      <GovernanceInsights
        data={data}
        role="brand_owner"
        isDemo
        onApproveSuggestion={approveSuggestion}
      />
    </div>
  );
}
