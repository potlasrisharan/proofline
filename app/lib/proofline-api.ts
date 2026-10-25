export const vaultResources = ["facts", "terms", "guidelines", "disclaimers", "assets"] as const;

export type VaultResource = (typeof vaultResources)[number];
export type VaultStatus = "draft" | "approved" | "superseded" | "expired" | "retired";
export type ProoflineRole = "creator" | "manager" | "legal_reviewer" | "brand_owner" | "agency";

export type Finding = {
  id: string;
  content_version_id: string;
  span: { start: number; end: number; text: string };
  category:
    | "factual"
    | "offer_date"
    | "terminology"
    | "tone"
    | "promotional"
    | "legal"
    | "visual"
    | "accessibility"
    | "translation";
  verdict: "supported" | "contradicted" | "outdated" | "unsupported" | "needs_human";
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  method: "rule" | "llm" | "hybrid";
  evidence: {
    source_type: string;
    source_id: string;
    version: string;
    quote: string;
  } | null;
  reason: string;
  suggestion: { text: string; intent_note: string } | null;
  status: "open" | "accepted" | "edited" | "dismissed";
  dismiss_reason: string | null;
};

export type VaultRecord = {
  id: string;
  organisation_id: string;
  resource: VaultResource;
  version: number;
  status: VaultStatus;
  value: Record<string, unknown>;
  source_id: string | null;
  source_version: string | null;
  effective_from: string | null;
  effective_to: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
};

export type VaultListResponse = {
  resource: VaultResource;
  organisation_id: string;
  persistence: "in_memory_demo";
  items: VaultRecord[];
};

export type VaultRecordResponse = {
  persistence: "in_memory_demo";
  item: VaultRecord;
};

export type VaultCreateInput = {
  value: Record<string, unknown>;
  source_id?: string;
  source_version?: string;
  effective_from?: string;
  effective_to?: string;
  metadata?: Record<string, unknown>;
};

export class ProoflineApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ProoflineApiError";
    this.status = status;
  }
}

type RequestOptions = {
  token?: string;
  fetcher?: typeof fetch;
};

export function createProoflineApiClient(baseUrl: string, options: RequestOptions = {}) {
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body) headers.set("Content-Type", "application/json");
    if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers,
    });
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    if (!response.ok) {
      throw new ProoflineApiError(response.status, body?.detail ?? "Proofline API request failed");
    }
    return body as T;
  }

  return {
    listVault(resource: VaultResource) {
      return request<VaultListResponse>(`/v1/${resource}`);
    },
    createVault(resource: VaultResource, input: VaultCreateInput) {
      return request<VaultRecordResponse>(`/v1/${resource}`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    createVaultVersion(resource: VaultResource, recordId: string, input: VaultCreateInput) {
      return request<VaultRecordResponse>(`/v1/${resource}/${recordId}/versions`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    approveVault(resource: VaultResource, recordId: string) {
      return request<VaultRecordResponse>(`/v1/${resource}/${recordId}/approve`, { method: "POST" });
    },
  };
}
