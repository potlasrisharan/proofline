"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildAuditChain,
  linkAuditEvent,
  verifyAuditChain,
  type AuditSourceEvent,
  type LinkedAuditEvent,
} from "../lib/review-audit-chain";

export function useLocalAuditLog<Kind extends string>(seed: readonly AuditSourceEvent<Kind>[]) {
  const [auditLog, setAuditLog] = useState<LinkedAuditEvent<Kind>[]>([]);
  const [chainState, setChainState] = useState<"verifying" | "verified" | "failed">("verifying");
  const [chainError, setChainError] = useState("");
  const chain = useRef<LinkedAuditEvent<Kind>[]>([]);
  const workQueue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    workQueue.current = workQueue.current.then(async () => {
      if (chain.current.length > 0) return;
      try {
        const entries = await buildAuditChain(seed);
        const verification = await verifyAuditChain(entries);
        chain.current = entries;
        if (mounted.current) {
          setAuditLog(entries);
          setChainState(verification.verified ? "verified" : "failed");
        }
      } catch (error) {
        if (mounted.current) {
          setChainState("failed");
          setChainError(error instanceof Error ? error.message : "Audit-chain verification failed.");
        }
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [seed]);

  const appendAuditEvent = useCallback((input: Omit<AuditSourceEvent<Kind>, "id" | "timestamp">) => {
    const timestamp = new Date().toISOString();
    setChainState("verifying");
    workQueue.current = workQueue.current.then(async () => {
      try {
        const event: AuditSourceEvent<Kind> = {
          ...input,
          id: `event-${String(chain.current.length + 1).padStart(3, "0")}`,
          timestamp,
        };
        const entry = await linkAuditEvent(event, chain.current.at(-1)?.hash ?? null);
        const next = [...chain.current, entry];
        const verification = await verifyAuditChain(next);
        chain.current = next;
        if (mounted.current) {
          setAuditLog(next);
          setChainState(verification.verified ? "verified" : "failed");
          setChainError(verification.verified ? "" : `The link for ${verification.invalidEventId} could not be verified.`);
        }
      } catch (error) {
        if (mounted.current) {
          setChainState("failed");
          setChainError(error instanceof Error ? error.message : "This action could not be added to the local audit chain.");
        }
      }
    });
  }, []);

  return {
    auditLog,
    appendAuditEvent,
    chainState,
    chainError,
    auditChainVerified: chainState === "verified",
  };
}
