import { createHash, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type APIResponse, type PlaywrightWorkerArgs } from "@playwright/test";

type Role = "brand_owner" | "creator" | "manager" | "legal_reviewer" | "agency";
type Json = Record<string, unknown>;
type TestFinding = {
  id: string;
  content_version_id: string;
  span: { start: number; end: number; text: string };
  category: string;
  verdict: string;
  severity: string;
  evidence: { source_id: string; version: string; quote: string; record_id?: string } | null;
  suggestion: { text: string } | null;
  status: string;
};
type ContentAudit = {
  content_id: string;
  content_version_id: string;
  audit_id: string;
  findings: TestFinding[];
  persistence: string;
  status: string;
  workflow_status: string;
};
type AuditEvent = {
  organisation_id: string;
  actor_id: string;
  actor_role: Role;
  event_type: string;
  object_type: string;
  object_id: string;
  metadata: Json;
  prev_hash: string | null;
  hash: string;
  occurred_at: string;
};

const adText = "VoltEdge NovaBook S1 delivers up to 20 hours of battery life.";
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8015";

async function body<T>(response: APIResponse, expectedStatus = 200): Promise<T> {
  expect(response.status(), `${response.url()} returned: ${await response.text()}`).toBe(expectedStatus);
  return (await response.json()) as T;
}

async function clientsFor(playwright: PlaywrightWorkerArgs["playwright"], organisation: string) {
  const clients = {} as Record<Role, APIRequestContext>;
  for (const role of ["brand_owner", "creator", "manager", "legal_reviewer", "agency"] as const) {
    clients[role] = await playwright.request.newContext({
      baseURL: apiURL,
      extraHTTPHeaders: {
        "X-Proofline-User": `user-voltedge-${role}`,
        "X-Proofline-Organisation": organisation,
        "X-Proofline-Role": role,
        ...(role === "agency" ? { "X-Proofline-Agency": "agency-voltedge-spark" } : {}),
      },
    });
  }
  return clients;
}

async function approveBatteryFact(owner: APIRequestContext) {
  const created = await body<{ item: { id: string; version: number; status: string } }>(
    await owner.post("/v1/facts", {
      data: {
        value: {
          key: "novabook_s1_battery_life",
          value: "up to 10 hours",
          unit: "hours",
          product: "VoltEdge NovaBook S1",
        },
        source_id: "source-voltedge-e2e-spec-v1",
        source_version: "1",
        metadata: { product: "VoltEdge NovaBook S1", market: "US", fictional: true },
      },
    }),
    201,
  );
  expect(created.item.status).toBe("draft");
  const approved = await body<{ item: { id: string; version: number; status: string; approved_by: string; approved_at: string } }>(
    await owner.post(`/v1/facts/${created.item.id}/approve`),
  );
  expect(approved.item.status).toBe("approved");
  expect(approved.item.approved_by).toBe("user-voltedge-brand_owner");
  expect(Number.isFinite(Date.parse(approved.item.approved_at))).toBe(true);
  return approved.item;
}

async function createAd(creator: APIRequestContext, extra: Json = {}) {
  return body<ContentAudit>(
    await creator.post("/contents", {
      data: {
        title: "VoltEdge NovaBook S1 launch ad",
        content_type: "text",
        text: adText,
        exposure: 3,
        confidential: true,
        metadata: { product: "VoltEdge NovaBook S1", market: "US", fictional: true },
        ...extra,
      },
    }),
    201,
  );
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

test.describe("Phase 3 local API journey (development principals, in-memory storage)", () => {
  test("owner approves facts; creator sees and fixes the 20-hour finding; manager queue, legal approval, and audit chain agree", async ({ playwright }) => {
    const organisation = `org-voltedge-${randomUUID()}`;
    const clients = await clientsFor(playwright, organisation);
    const { brand_owner: owner, creator, manager, legal_reviewer: legal } = clients;
    try {
      const fact = await approveBatteryFact(owner);
      const original = await createAd(creator);
      expect(original.persistence).toBe("in_memory_demo");
      expect(original.audit_id).toBeTruthy();

      const mismatch = original.findings.find((finding) => finding.verdict === "contradicted" && finding.span.text.includes("20"));
      expect(mismatch, "the audit must generate a real evidence-linked mismatch, not a seeded test finding").toBeDefined();
      expect(mismatch!.content_version_id).toBe(original.content_version_id);
      expect(mismatch!.evidence).toMatchObject({ source_id: "source-voltedge-e2e-spec-v1", version: "1" });
      expect(mismatch!.evidence!.quote).toContain("10");
      expect(mismatch!.suggestion?.text).toContain("10");

      await body(await creator.post(`/findings/${mismatch!.id}/action`, { data: { action: "accept" } }));
      const unchanged = await body<ContentAudit>(await creator.get(`/contents/${original.content_id}`));
      expect(unchanged.content_version_id).toBe(original.content_version_id);

      const fixedText = adText.slice(0, mismatch!.span.start) + mismatch!.suggestion!.text + adText.slice(mismatch!.span.end);
      const revision = await body<ContentAudit>(
        await creator.post(`/contents/${original.content_id}/recheck`, { data: { text: fixedText, confidential: true } }),
        201,
      );
      expect(revision.content_version_id).not.toBe(original.content_version_id);
      expect(revision.audit_id).not.toBe(original.audit_id);
      expect(revision.findings.filter((finding) => finding.verdict === "contradicted")).toHaveLength(0);

      const submitted = await body<{ content_version: { workflow_status: string }; decision: { actor_id: string } }>(
        await creator.post(`/v1/content-versions/${revision.content_version_id}/review`, { data: { action: "submit" } }),
      );
      expect(submitted.content_version.workflow_status).toBe("in_review");
      expect(submitted.decision.actor_id).toBe("user-voltedge-creator");
      const queue = await body<{ items: { id: string; workflow_status: string }[] }>(await manager.get("/v1/content"));
      expect(queue.items).toContainEqual(expect.objectContaining({ id: original.content_id, workflow_status: "in_review" }));

      const approval = await body<{ content_version: { workflow_status: string; id: string }; decision: { actor_id: string; actor_role: string; created_at: string } }>(
        await legal.post(`/v1/content-versions/${revision.content_version_id}/review`, {
          data: { action: "approve", comment: "VoltEdge fictional evidence reviewed; corrected battery wording is approved." },
        }),
      );
      expect(approval.content_version).toMatchObject({ id: revision.content_version_id, workflow_status: "approved" });
      expect(approval.decision).toMatchObject({ actor_id: "user-voltedge-legal_reviewer", actor_role: "legal_reviewer" });
      expect(Number.isFinite(Date.parse(approval.decision.created_at))).toBe(true);

      const versions = await body<{ items: { id: string; source_text: string; workflow_status: string }[] }>(
        await creator.get(`/v1/content/${original.content_id}/versions`),
      );
      expect(versions.items).toHaveLength(2);
      expect(versions.items.find((version) => version.id === original.content_version_id)?.source_text).toBe(adText);
      expect(versions.items.find((version) => version.id === revision.content_version_id)).toMatchObject({ source_text: fixedText, workflow_status: "approved" });

      const verification = await body<{ valid: boolean; event_count: number }>(await legal.get("/v1/audit-events/verify-chain"));
      expect(verification.valid).toBe(true);
      expect(verification.event_count).toBeGreaterThan(0);
      const events = await body<{ items: AuditEvent[] }>(await legal.get("/v1/audit-events"));
      expect(events.items).toContainEqual(expect.objectContaining({ event_type: "review_approve", actor_role: "legal_reviewer", object_id: revision.content_version_id }));
      let previousHash: string | null = null;
      for (const event of events.items) {
        expect(event.prev_hash).toBe(previousHash);
        const payload = {
          organisation_id: event.organisation_id,
          actor_id: event.actor_id,
          actor_role: event.actor_role,
          event_type: event.event_type,
          object_type: event.object_type,
          object_id: event.object_id,
          metadata: event.metadata,
          prev_hash: event.prev_hash,
          occurred_at: event.occurred_at.replace(/Z$/, "+00:00"),
        };
        expect(event.hash).toBe(createHash("sha256").update(canonicalJson(payload)).digest("hex"));
        previousHash = event.hash;
      }

      const factAfter = await body<{ item: { id: string; version: number; status: string } }>(await owner.get(`/v1/facts/${fact.id}`));
      expect(factAfter.item).toMatchObject({ id: fact.id, version: fact.version, status: "approved" });
    } finally {
      await Promise.all(Object.values(clients).map((client) => client.dispose()));
    }
  });

  test("manager cannot final-approve content with an open High risk finding", async ({ playwright }) => {
    const clients = await clientsFor(playwright, `org-voltedge-${randomUUID()}`);
    try {
      await approveBatteryFact(clients.brand_owner);
      const original = await createAd(clients.creator);
      expect(original.findings.some((finding) => finding.severity === "high" && finding.status === "open")).toBe(true);
      await body(await clients.creator.post(`/v1/content-versions/${original.content_version_id}/review`, { data: { action: "submit" } }));
      const denied = await clients.manager.post(`/v1/content-versions/${original.content_version_id}/review`, { data: { action: "approve" } });
      expect(denied.status(), await denied.text()).toBe(403);
      const queue = await body<{ items: { id: string; workflow_status: string }[] }>(await clients.manager.get("/v1/content"));
      expect(queue.items).toContainEqual(expect.objectContaining({ id: original.content_id, workflow_status: "in_review" }));
      const events = await body<{ items: AuditEvent[] }>(await clients.manager.get("/v1/audit-events"));
      expect(events.items.filter((event) => event.event_type === "review_approve")).toHaveLength(0);
    } finally {
      await Promise.all(Object.values(clients).map((client) => client.dispose()));
    }
  });

  test("agency can read assigned content but cannot list or directly fetch unrelated content", async ({ playwright }) => {
    const clients = await clientsFor(playwright, `org-voltedge-${randomUUID()}`);
    try {
      const privateContent = await createAd(clients.creator);
      const assignedContent = await createAd(clients.brand_owner, { assigned_agency_id: "agency-voltedge-spark" });
      const agencyQueue = await body<{ items: { id: string }[] }>(await clients.agency.get("/v1/content"));
      expect(agencyQueue.items.map((item) => item.id)).toContain(assignedContent.content_id);
      expect(agencyQueue.items.map((item) => item.id)).not.toContain(privateContent.content_id);
      expect((await clients.agency.get(`/contents/${assignedContent.content_id}`)).status()).toBe(200);
      for (const path of [
        `/contents/${privateContent.content_id}`,
        `/v1/content/${privateContent.content_id}`,
        `/v1/content/${privateContent.content_id}/versions`,
        `/v1/content/${privateContent.content_id}/export`,
      ]) {
        const response = await clients.agency.get(path);
        expect(response.status(), `${path}: ${await response.text()}`).toBe(404);
      }
    } finally {
      await Promise.all(Object.values(clients).map((client) => client.dispose()));
    }
  });

  test("creator cannot create, version, or approve Vault facts", async ({ playwright }) => {
    const clients = await clientsFor(playwright, `org-voltedge-${randomUUID()}`);
    try {
      const fact = await approveBatteryFact(clients.brand_owner);
      const changedFact = { value: { key: "novabook_s1_battery_life", value: "up to 20 hours", unit: "hours" } };
      for (const path of ["/v1/facts", `/v1/facts/${fact.id}/versions`, `/v1/facts/${fact.id}/approve`]) {
        const response = await clients.creator.post(path, { data: changedFact });
        expect(response.status(), `${path}: ${await response.text()}`).toBe(403);
      }
      const readBack = await body<{ item: { version: number; value: { value: string } } }>(await clients.brand_owner.get(`/v1/facts/${fact.id}`));
      expect(readBack.item.version).toBe(fact.version);
      expect(readBack.item.value.value).toBe("up to 10 hours");
      const records = await body<{ items: unknown[] }>(await clients.brand_owner.get("/v1/facts"));
      expect(records.items).toHaveLength(1);
    } finally {
      await Promise.all(Object.values(clients).map((client) => client.dispose()));
    }
  });
});
