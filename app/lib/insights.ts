import type { ProoflineRole } from "./proofline-api";

/** Serializable output of backend/app/insights.py; all counts are supplied records. */
export type FindingAggregate = {
  key: string;
  label: string;
  count: number;
  unique_findings: number;
  dismissed_count: number;
  overridden_count: number;
  needs_human_count: number;
  contradicted_count: number;
  dismissal_rate: number;
  override_rate: number;
  needs_human_rate: number;
};

export type GroupAggregate = {
  group_type: "team" | "agency";
  group_id: string;
  group_name: string;
  finding_count: number;
  unique_findings: number;
  dismissed_count: number;
  overridden_count: number;
  needs_human_count: number;
  needs_human_rate: number;
};

export type TrendPoint = {
  period_start: string;
  period_end: string;
  finding_count: number;
  unique_findings: number;
  dismissed_count: number;
  overridden_count: number;
  needs_human_count: number;
};

export type ExpiringFact = {
  fact_id: string;
  label: string;
  version: string | null;
  expires_at: string;
  days_remaining: number;
  status: string;
  source_id: string | null;
};

export type ContradictoryGuideline = {
  conflict_id: string;
  topic: string;
  rule_ids: string[];
  rule_versions: (string | null)[];
  explanation: string;
};

export type AmbiguitySignal = {
  signal_id: string;
  signal_type:
    | "high_dismissal_rate"
    | "high_override_rate"
    | "frequent_needs_human"
    | "contradictory_guideline";
  scope: "rule" | "category" | "guideline";
  key: string;
  label: string;
  count: number;
  sample_size: number;
  rate: number | null;
  explanation: string;
  evidence: string[];
};

export type SuggestedRuleUpdate = {
  proposal_id: string;
  organisation_id: string | null;
  rule_id: string | null;
  title: string;
  current_wording: string | null;
  suggested_wording: string;
  generated_label: "AI-generated";
  generation_method: "deterministic_local_template";
  evidence_summary: string;
  evidence: string[];
  status: "proposed" | "approved" | "rejected";
  approval_required_role: "brand_owner";
  approved_by: string | null;
  approved_at: string | null;
  applied: false;
};

export type GovernanceInsightsData = {
  analytics_version: string;
  organisation_id: string | null;
  window_start: string;
  window_end: string;
  window_days: number;
  sample_size: number;
  individual_rankings_included: false;
  by_category: FindingAggregate[];
  by_rule: FindingAggregate[];
  teams: GroupAggregate[];
  agencies: GroupAggregate[];
  trends: TrendPoint[];
  expiring_facts: ExpiringFact[];
  ambiguity_signals: AmbiguitySignal[];
  contradictory_guidelines: ContradictoryGuideline[];
  suggested_rule_updates: SuggestedRuleUpdate[];
};

/** Display-only affordance check. The server must authorise every approval. */
export function canApproveRuleUpdate(
  role: ProoflineRole | undefined,
  proposal: SuggestedRuleUpdate,
): boolean {
  return role === "brand_owner" && proposal.status === "proposed";
}

export function humaniseInsightLabel(value: string): string {
  const words = value.replace(/[_-]+/g, " ").trim();
  return words ? words[0].toLocaleUpperCase("en-US") + words.slice(1) : "Unlabelled";
}

export function formatInsightRate(value: number): string {
  if (!Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.min(1, value)));
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatInsightDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not available" : dateFormatter.format(date);
}
