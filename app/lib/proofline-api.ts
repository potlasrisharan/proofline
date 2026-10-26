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
     | "translation"
     | "security"
     | "other";
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
  status: "open" | "accepted" | "edited" | "dismissed" | "resolved" | "overridden";
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

export type ContentCreateInput = {
  title: string;
  content_type?: "text" | "pdf" | "docx" | "image" | "other";
  text: string;
  confidential?: boolean;
  exposure?: 1 | 2 | 3;
  regulated?: boolean;
  product?: string;
  market?: string;
  channel?: string;
  language?: string;
  metadata?: Record<string, unknown>;
};

export type ContentVersionInput = Omit<ContentCreateInput, "title" | "content_type"> & {
  auto_recheck?: boolean;
};

export type BackendFinding = {
  id: string;
  content_version_id: string;
  span: { start: number; end: number; text: string };
  category: string;
  verdict: Finding["verdict"];
  severity: string;
  confidence: number;
  method: Finding["method"];
  evidence: {
    source_type: string;
    source_id: string;
    version: string;
    quote: string;
    record_id?: string | null;
  } | null;
  reason: string;
  suggestion: { text: string; intent_note: string } | null;
  status: string;
  dismiss_reason: string | null;
};

export type ContentAuditResponse = {
  content_id: string;
  content_version_id: string;
  audit_id: string | null;
  findings: BackendFinding[];
  status: string;
  workflow_status: string | null;
  persistence: "in_memory_demo";
  content_version?: {
    id: string;
    version: number;
    source_text: string | null;
    extracted_text: string | null;
    parent_version_id: string | null;
    created_at: string;
    metadata: Record<string, unknown>;
  };
  versions?: Array<{
    id: string;
    version: number;
    source_text: string | null;
    extracted_text: string | null;
    parent_version_id: string | null;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  audits?: Array<{
    id: string;
    content_version_id: string;
    status: string;
    created_at: string;
  }>;
  audit?: {
    id: string;
    content_version_id: string;
    status: string;
    created_at: string;
    completed_at?: string | null;
  } | null;
  actions?: Array<{
    finding_id: string;
    action: string;
    reason: string | null;
    replacement_text: string | null;
    created_at: string;
  }>;
  service_metadata?: Record<string, unknown>;
  error?: string | null;
};

export type FindingActionInput = {
  action: "accept" | "edit" | "dismiss";
  reason?: string;
  replacement_text?: string;
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
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

export function createProoflineApiClient(baseUrl: string, options: RequestOptions = {}) {
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body) headers.set("Content-Type", "application/json");
    if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
    for (const [key, value] of Object.entries(options.headers ?? {})) headers.set(key, value);

    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers,
      credentials: options.credentials ?? init?.credentials,
    });
    const body = (await response.json().catch(() => null)) as { detail?: string | { message?: string } } | null;
    if (!response.ok) {
      const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.message;
      throw new ProoflineApiError(response.status, detail ?? "Proofline API request failed");
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
    createContent(input: ContentCreateInput) {
      return request<ContentAuditResponse>("/contents", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    recheckContent(contentId: string, input: ContentVersionInput) {
      return request<ContentAuditResponse>(`/contents/${contentId}/recheck`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    actOnFinding(findingId: string, input: FindingActionInput) {
      return request<ContentAuditResponse>(`/findings/${findingId}/action`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  };
}

export type LocalApiConfig = {
  baseUrl: string;
  user: string;
  organisation: string;
  role: ProoflineRole;
  agency?: string;
  auth: "local_headers" | "cloudflare_access";
};

export function getLocalApiConfig(): LocalApiConfig | null {
  if (process.env.NEXT_PUBLIC_PROOFLINE_LOCAL_API !== "true") return null;
  const baseUrl = process.env.NEXT_PUBLIC_PROOFLINE_API_URL?.trim();
  if (!baseUrl) return null;
  const auth = process.env.NEXT_PUBLIC_PROOFLINE_API_AUTH?.trim() || "local_headers";
  if (auth !== "development_headers" && auth !== "local_headers") return null;
  const role = (process.env.NEXT_PUBLIC_PROOFLINE_API_ROLE?.trim() || "creator") as ProoflineRole;
  if (!(["creator", "manager", "legal_reviewer", "brand_owner", "agency"] as string[]).includes(role)) return null;
  return {
    baseUrl,
    user: process.env.NEXT_PUBLIC_PROOFLINE_API_USER?.trim() || "user-voltedge-ui",
    organisation: process.env.NEXT_PUBLIC_PROOFLINE_API_ORGANISATION?.trim() || "org-voltedge-ui",
    role,
    agency: process.env.NEXT_PUBLIC_PROOFLINE_API_AGENCY?.trim() || undefined,
    auth: "local_headers",
  };
}

export function createLocalApiClient() {
  const config = getLocalApiConfig();
  if (!config) return null;
  return {
    config,
    client: createProoflineApiClient(config.baseUrl, {
      credentials: config.auth === "cloudflare_access" ? "include" : undefined,
      headers: config.auth === "local_headers"
        ? {
            "X-Proofline-User": config.user,
            "X-Proofline-Organisation": config.organisation,
            "X-Proofline-Role": config.role,
            ...(config.agency ? { "X-Proofline-Agency": config.agency } : {}),
          }
        : undefined,
    }),
  };
}
