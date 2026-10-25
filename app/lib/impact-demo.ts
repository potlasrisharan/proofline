import type {
  ImpactItem,
  ImpactRecheckResponse,
  ImpactReReviewTask,
  ImpactResponse,
} from "./impact";

/**
 * Synthetic VoltEdge records for the standalone local Impact Radar page.
 * These values are a demo fixture, not a live API response or production metric.
 */
export const demoImpactItems: ImpactItem[] = [
  {
    task_id: "task-voltedge-battery-email-v1-v2",
    content_id: "content-voltedge-novabook-launch-email",
    content_version_id: "content-version-voltedge-novabook-launch-email-v1",
    claim_id: "claim-voltedge-novabook-battery-v1",
    title: "NovaBook S1 launch email",
    workflow_status: "re_review_required",
    previous_workflow_status: "approved",
    re_review_required: true,
    claim_text: "VoltEdge NovaBook S1 delivers up to 10 hours of battery life.",
    fact_id: "fact-voltedge-novabook-s1-battery",
    old_fact_version: 1,
    new_fact_version: 2,
    old_value: "Up to 10 hours",
    new_value: "Up to 12 hours",
    old_source_id: "source-voltedge-product-spec",
    old_source_version: "1",
    new_source_id: "source-voltedge-product-spec",
    new_source_version: "2",
    reason: "fact_changed",
    task_status: "open",
    created_at: "2026-10-25T09:00:00Z",
  },
  {
    task_id: "task-voltedge-offer-social-v1-expired",
    content_id: "content-voltedge-october-social-offer",
    content_version_id: "content-version-voltedge-october-social-offer-v1",
    claim_id: "claim-voltedge-october-offer-v1",
    title: "October social offer",
    workflow_status: "re_review_required",
    previous_workflow_status: "in_review",
    re_review_required: true,
    claim_text: "Save 20% on VoltEdge NovaBook S1 this month.",
    fact_id: "fact-voltedge-october-offer",
    old_fact_version: 1,
    new_fact_version: null,
    old_value: "20% off through October 31",
    new_value: null,
    old_source_id: "source-voltedge-october-offer",
    old_source_version: "1",
    new_source_id: null,
    new_source_version: null,
    reason: "fact_expired",
    task_status: "open",
    created_at: "2026-10-25T09:05:00Z",
  },
];

export const demoImpactResponse: ImpactResponse = {
  persistence: "in_memory_demo",
  implementation_status: "implemented_local_stub_persistence",
  organisation_id: "org-voltedge",
  fact_id: null,
  status: "available",
  items: demoImpactItems,
  affected_content: demoImpactItems,
  affected_content_count: 2,
  affected_claim_count: 2,
  task_count: 2,
  message: "2 fictional VoltEdge records require explicit human re-review.",
};

const demoTasks: ImpactReReviewTask[] = demoImpactItems.map((item) => ({
  id: item.task_id,
  organisation_id: demoImpactResponse.organisation_id,
  content_id: item.content_id,
  content_version_id: item.content_version_id,
  claim_id: item.claim_id,
  fact_id: item.fact_id,
  old_fact_version: item.old_fact_version,
  new_fact_version: item.new_fact_version,
  old_value: item.old_value,
  new_value: item.new_value,
  reason: item.reason,
  status: "rechecked",
  created_by: "user-voltedge-brand-owner",
  created_at: item.created_at,
  updated_at: "2026-10-25T12:00:00Z",
  rechecked_at: "2026-10-25T12:00:00Z",
  recheck_ids: [`recheck-${item.task_id}`],
  audit_event_ids: [`event-${item.task_id}`],
}));

/** Return the explicit local-demo result shown after the re-check button is pressed. */
export function createDemoImpactRecheck(): ImpactRecheckResponse {
  return {
    persistence: "in_memory_demo",
    implementation_status: "implemented_local_stub_persistence",
    organisation_id: demoImpactResponse.organisation_id,
    recheck_run_id: "recheck-run-voltedge-2026-10-25",
    status: "completed_review_required",
    checked_content_count: demoImpactItems.length,
    checked_claim_count: demoImpactItems.length,
    tasks: demoTasks,
    results: demoImpactItems.map((item) => ({
      id: `recheck-${item.task_id}`,
      task_id: item.task_id,
      content_id: item.content_id,
      content_version_id: item.content_version_id,
      claim_id: item.claim_id,
      fact_id: item.fact_id,
      linked_fact_version: item.old_fact_version,
      checked_fact_version: item.new_fact_version,
      linked_value: item.old_value,
      current_value: item.new_value,
      verdict: item.reason === "fact_changed" ? "outdated" : "needs_human",
      evidence:
        item.reason === "fact_changed"
          ? {
              source_id: item.new_source_id ?? "source-not-recorded",
              version: item.new_source_version ?? "not-recorded",
              quote: item.new_value ?? "",
            }
          : null,
      reason:
        item.reason === "fact_changed"
          ? "The stored claim still points to an older approved fact version. Human review must decide whether to update the content."
          : "The linked offer validity ended and no replacement approved value was supplied. Human review is required.",
      method: "deterministic_fact_version_check",
      actor_id: "user-voltedge-brand-owner",
      created_at: "2026-10-25T12:00:00Z",
    })),
    message: "The local re-check completed. Content remains marked for human review.",
  };
}
