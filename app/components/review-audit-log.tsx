"use client";

import { useState } from "react";
import type { LinkedAuditEvent } from "../lib/review-audit-chain";
import type { ProoflineRole } from "../lib/proofline-api";

type ReviewAuditLogProps<Kind extends string> = {
  events: readonly LinkedAuditEvent<Kind>[];
  chainState: "verifying" | "verified" | "failed";
  chainError: string;
  kindLabels: Record<Kind, string>;
  roleLabels: Record<ProoflineRole, string>;
};

export function ReviewAuditLog<Kind extends string>({ events, chainState, chainError, kindLabels, roleLabels }: ReviewAuditLogProps<Kind>) {
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const verified = chainState === "verified";
  const visibleEvents = events.filter((event) => filter === "all" || event.kind === filter).slice().reverse();

  return (
    <section className="view-panel" aria-labelledby="audit-log-heading">
      <div className="page-heading compact-heading">
        <div><p className="eyebrow">Decision trace</p><h1 id="audit-log-heading">Every decision has a link.</h1><p className="lede">The synthetic VoltEdge log retains the actor, role, content version, and SHA-256 links for this browser session.</p></div>
        <div className={`chain-status-card ${verified ? "verified" : "needs-review"}`} role="status" aria-live="polite">
          <span className="chain-indicator"><span className="status-dot" />{chainState === "verifying" ? "Verifying chain…" : verified ? "Chain verified" : "Chain needs review"}</span>
          <small>{events.length} linked events · local session only</small>
        </div>
      </div>
      <div className="privacy-note audit-scope-note"><span aria-hidden="true">⌁</span><p><strong>Local integrity check, not durable proof.</strong> The chain is computed and re-checked in this browser. It can detect changes to the recorded event payloads, but it does not authenticate an actor or replace a server-side audit trail.</p></div>
      {chainError ? <div className="preview-state" role="alert"><strong>Verification failed</strong><p>{chainError}</p></div> : null}
      <div className="audit-toolbar">
        <div><p className="eyebrow">Audit events</p><h2>Recorded actions</h2></div>
        <label>Event type<select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value as "all" | Kind)}><option value="all">All events</option>{(Object.keys(kindLabels) as Kind[]).map((kind) => <option value={kind} key={kind}>{kindLabels[kind]}</option>)}</select></label>
      </div>
      <div className="audit-log-list">
        {visibleEvents.length === 0 ? <div className="queue-empty"><strong>{chainState === "verifying" ? "Verifying the event chain…" : "No events match this filter."}</strong><p>{chainState === "verifying" ? "The recorded links will appear after they have been checked." : "Choose another event type to inspect the recorded actions."}</p></div> : visibleEvents.map((event) => (
          <article className="audit-event" key={event.id}>
            <div className="audit-event-marker"><span className="status-dot mint" /></div>
            <div className="audit-event-body">
              <div className="audit-event-heading"><div><span className="audit-event-kind">{kindLabels[event.kind]}</span><h3>{event.summary}</h3></div><span className="audit-event-verified">{verified && event.chainVerified ? "Link verified" : "Verification pending"}</span></div>
              <div className="audit-event-meta"><span><strong>Actor</strong> {event.actor}</span><span><strong>Role</strong> {roleLabels[event.role]}</span><span><strong>Version</strong> {event.contentVersion}</span><time dateTime={event.timestamp}>{event.timestamp.replace("T", " · ").replace("Z", " UTC")}</time></div>
              <details className="hash-details"><summary>Show chain link</summary><p><strong>Event</strong> {event.id}</p><p><strong>SHA-256</strong> {event.hash}</p><p><strong>Previous</strong> {event.previousHash ?? "Genesis event"}</p></details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
