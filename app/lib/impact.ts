/** Local Fact-Change Impact Radar API boundary. No connection is assumed by this module. */

export type ImpactWorkflowStatus = "draft" | "in_review" | "approved" | "re_review_required";
export type ImpactFactStatus = "draft" | "approved" | "superseded" | "expired";

export type ImpactItem = {
  task_id: string;
  content_id: string;
  content_version_id: string;
  claim_id: string;
  title: string;
  workflow_status: ImpactWorkflowStatus;
  previous_workflow_status: ImpactWorkflowStatus | null;
  re_review_required: boolean;
  claim_text: string;
  fact_id: string;
  old_fact_version: number;
  new_fact_version: number | null;
  old_value: string;
  new_value: string | null;
  old_source_id: string | null;
  old_source_version: string | null;
  new_source_id: string | null;
  new_source_version: string | null;
  reason: "fact_changed" | "fact_expired";
  task_status: "open" | "rechecked";
  created_at: string;
};

export type ImpactLocalBoundary = {
  persistence: "in_memory_demo";
  implementation_status: "implemented_local_stub_persistence";
};

export type ImpactResponse = ImpactLocalBoundary & {
  organisation_id: string;
  fact_id: string | null;
  status: "available" | "no_affected_content";
  items: ImpactItem[];
  affected_content: ImpactItem[];
  affected_content_count: number;
  affected_claim_count: number;
  task_count: number;
  message: string;
};

export type ImpactFactVersion = {
  id: string;
  organisation_id: string;
  fact_id: string;
  fact_version: number;
  value: string;
  unit: string | null;
  status: ImpactFactStatus;
  effective_from: string | null;
  effective_to: string | null;
  source_id: string | null;
  source_version: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  supersedes_version: number | null;
};

export type ImpactFactVersionInput = {
  fact_id: string;
  value: string;
  status?: "draft" | "approved";
  unit?: string;
  effective_from?: string;
  effective_to?: string;
  source_id?: string;
  source_version?: string;
  metadata?: Record<string, unknown>;
};

export type ImpactFactVersionResponse = ImpactLocalBoundary & {
  item: ImpactFactVersion;
  impact: ImpactResponse | null;
};

export type ImpactClaimInput = {
  claim_id?: string;
  claim_text: string;
  fact_id: string;
  fact_version: number;
  normalized_value?: string | number;
  unit?: string;
  metadata?: Record<string, unknown>;
};

export type ImpactContentInput = {
  content_id?: string;
  content_version_id?: string;
  title: string;
  workflow_status?: "draft" | "in_review" | "approved";
  claims: ImpactClaimInput[];
  metadata?: Record<string, unknown>;
};

export type ImpactContent = {
  id: string;
  organisation_id: string;
  title: string;
  current_content_version_id: string;
  workflow_status: ImpactWorkflowStatus;
  previous_workflow_status: ImpactWorkflowStatus | null;
  re_review_required: boolean;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ImpactStoredClaim = ImpactClaimInput & {
  id: string;
  organisation_id: string;
  content_id: string;
  content_version_id: string;
  workflow_status: ImpactWorkflowStatus;
  re_review_required: boolean;
  created_by: string;
  created_at: string;
};

export type ImpactContentResponse = ImpactLocalBoundary & {
  content: ImpactContent;
  claims: ImpactStoredClaim[];
};

export type ImpactReReviewTask = {
  id: string;
  organisation_id: string;
  content_id: string;
  content_version_id: string;
  claim_id: string;
  fact_id: string;
  old_fact_version: number;
  new_fact_version: number | null;
  old_value: string;
  new_value: string | null;
  reason: "fact_changed" | "fact_expired";
  status: "open" | "rechecked";
  created_by: string;
  created_at: string;
  updated_at: string;
  rechecked_at: string | null;
  recheck_ids: string[];
  audit_event_ids: string[];
};

export type ImpactRecheckResult = {
  id: string;
  task_id: string;
  content_id: string;
  content_version_id: string;
  claim_id: string;
  fact_id: string;
  linked_fact_version: number;
  checked_fact_version: number | null;
  linked_value: string;
  current_value: string | null;
  verdict: "outdated" | "needs_human";
  evidence: Record<string, string> | null;
  reason: string;
  method: "deterministic_fact_version_check";
  actor_id: string;
  created_at: string;
};

export type ImpactRecheckResponse = ImpactLocalBoundary & {
  organisation_id: string;
  recheck_run_id: string;
  status: "completed_review_required" | "no_affected_content";
  checked_content_count: number;
  checked_claim_count: number;
  tasks: ImpactReReviewTask[];
  results: ImpactRecheckResult[];
  message: string;
};

export type ImpactAuditEvent = {
  id: string;
  organisation_id: string;
  event_type: string;
  object_id: string;
  actor_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

export class ImpactApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ImpactApiError";
  }
}

type ImpactApiOptions = {
  /** An authenticated token resolved by the host; no token is embedded or persisted here. */
  token?: string;
  fetcher?: typeof fetch;
  /** Optional host-supplied headers, e.g. explicit local-development auth in a test. */
  headers?: HeadersInit;
};

export function createImpactApiClient(baseUrl: string, options: ImpactApiOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (init?.body) headers.set("Content-Type", "application/json");
    if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
    const response = await fetcher(`${base}/v1/impact${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof body === "object" && body !== null && "detail" in body ? body.detail : null;
      throw new ImpactApiError(
        response.status,
        typeof detail === "string" ? detail : "Impact Radar request failed. Check the API response and authentication.",
      );
    }
    if (typeof body !== "object" || body === null || !("persistence" in body) || body.persistence !== "in_memory_demo") {
      throw new ImpactApiError(502, "The impact API returned an unexpected response; no result was accepted.");
    }
    return body as T;
  }

  return {
    listAffected(factId?: string, signal?: AbortSignal) {
      const query = factId ? `?${new URLSearchParams({ fact_id: factId })}` : "";
      return request<ImpactResponse>(`/revalidation${query}`, { signal });
    },
    createFactVersion(input: ImpactFactVersionInput) {
      return request<ImpactFactVersionResponse>("/fact-versions", { method: "POST", body: JSON.stringify(input) });
    },
    approveFactVersion(factId: string, version: number) {
      return request<ImpactFactVersionResponse>(`/facts/${encodeURIComponent(factId)}/versions/${version}/approve`, { method: "POST" });
    },
    listFactVersions(factId: string) {
      return request<ImpactLocalBoundary & { items: ImpactFactVersion[] }>(`/facts/${encodeURIComponent(factId)}/versions`);
    },
    endFactValidity(factId: string, effectiveTo: string, version?: number) {
      return request<ImpactFactVersionResponse>(`/facts/${encodeURIComponent(factId)}/end-validity`, {
        method: "POST",
        body: JSON.stringify({ effective_to: effectiveTo, fact_version: version }),
      });
    },
    registerContent(input: ImpactContentInput) {
      return request<ImpactContentResponse>("/content", { method: "POST", body: JSON.stringify(input) });
    },
    getContent(contentId: string) {
      return request<ImpactContentResponse>(`/content/${encodeURIComponent(contentId)}`);
    },
    recheckAllAffected(factId?: string, note?: string) {
      return request<ImpactRecheckResponse>("/recheck-all", {
        method: "POST",
        body: JSON.stringify({ fact_id: factId, note }),
      });
    },
    listEvents() {
      return request<ImpactLocalBoundary & { organisation_id: string; items: ImpactAuditEvent[] }>("/events");
    },
    listRechecks() {
      return request<ImpactLocalBoundary & { items: ImpactRecheckResult[] }>("/rechecks");
    },
  };
}

export type ImpactApiClient = ReturnType<typeof createImpactApiClient>;

export const impactStatusLabels: Record<ImpactWorkflowStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  re_review_required: "Re-review required",
};
