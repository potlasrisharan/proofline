import type { ProoflineRole } from "./proofline-api";

export type AuditSourceEvent<Kind extends string = string> = {
  id: string;
  kind: Kind;
  actor: string;
  role: ProoflineRole;
  timestamp: string;
  summary: string;
  contentVersion: string;
};

export type LinkedAuditEvent<Kind extends string = string> = AuditSourceEvent<Kind> & {
  hash: string;
  previousHash: string | null;
  chainVerified: boolean;
};

export type AuditChainVerification = {
  verified: boolean;
  checkedEvents: number;
  invalidEventId: string | null;
};

function serializeEvent(event: AuditSourceEvent, previousHash: string | null) {
  return JSON.stringify([
    event.id,
    event.kind,
    event.actor,
    event.role,
    event.timestamp,
    event.summary,
    event.contentVersion,
    previousHash,
  ]);
}

async function eventHash(event: AuditSourceEvent, previousHash: string | null) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Browser integrity verification is unavailable. Open the demo on localhost or HTTPS.");
  }

  const bytes = new TextEncoder().encode(serializeEvent(event, previousHash));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function linkAuditEvent<Kind extends string>(
  event: AuditSourceEvent<Kind>,
  previousHash: string | null,
): Promise<LinkedAuditEvent<Kind>> {
  return {
    ...event,
    previousHash,
    hash: await eventHash(event, previousHash),
    chainVerified: true,
  };
}

export async function buildAuditChain<Kind extends string>(events: readonly AuditSourceEvent<Kind>[]) {
  const chain: LinkedAuditEvent<Kind>[] = [];
  for (const event of events) {
    chain.push(await linkAuditEvent(event, chain.at(-1)?.hash ?? null));
  }
  return chain;
}

export async function verifyAuditChain(events: readonly LinkedAuditEvent[]): Promise<AuditChainVerification> {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const previousHash = index === 0 ? null : events[index - 1].hash;
    if (event.previousHash !== previousHash || event.hash !== await eventHash(event, previousHash)) {
      return { verified: false, checkedEvents: index + 1, invalidEventId: event.id };
    }
  }

  return { verified: true, checkedEvents: events.length, invalidEventId: null };
}
