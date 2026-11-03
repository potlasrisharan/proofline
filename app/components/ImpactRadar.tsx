"use client";

import { useId, useState, useTransition } from "react";

import { impactStatusLabels, type ImpactItem, type ImpactResponse, type ImpactRecheckResponse } from "../lib/impact";
import styles from "./ImpactRadar.module.css";

export type ImpactRadarProps = {
  /** Supply saved API data. This component does not invent or auto-load demo records. */
  data: ImpactResponse | null;
  loading?: boolean;
  error?: string | null;
  /** Bind to createImpactApiClient(...).recheckAllAffected() in the host. */
  onRecheckAll?: () => Promise<ImpactRecheckResponse>;
  onOpenContent?: (contentId: string, contentVersionId: string) => void;
  onRefresh?: () => void;
};

function FactChange({ item }: { item: ImpactItem }) {
  return (
    <dl className={styles.change}>
      <div>
        <dt>Referenced fact · v{item.old_fact_version}</dt>
        <dd>{item.old_value}</dd>
        <span className={styles.source}>
          {item.old_source_id
            ? `${item.old_source_id} · source v${item.old_source_version ?? "not recorded"}`
            : "Source not recorded — human evidence check required"}
        </span>
      </div>
      <div>
        <dt>{item.reason === "fact_expired" ? "Validity ended" : `Approved fact · v${item.new_fact_version}`}</dt>
        <dd>{item.new_value ?? "Expired · no replacement approved"}</dd>
        <span className={styles.source}>
          {item.new_source_id
            ? `${item.new_source_id} · source v${item.new_source_version ?? "not recorded"}`
            : item.reason === "fact_expired" ? "Review the offer before using this content" : "Source not recorded"}
        </span>
      </div>
    </dl>
  );
}

/** A data-driven view ready for the host workspace to integrate without page rewrites. */
export function ImpactRadar({ data, loading = false, error, onRecheckAll, onOpenContent, onRefresh }: ImpactRadarProps) {
  const headingId = useId();
  const [recheck, setRecheck] = useState<ImpactRecheckResponse | null>(null);
  const [actionError, setActionError] = useState("");
  const [pending, startTransition] = useTransition();
  const items = data?.items ?? [];
  const contentCount = new Set(items.map((item) => item.content_id)).size;
  const claimCount = new Set(items.map((item) => item.claim_id)).size;
  const recheckedIds = new Set(recheck?.results.map((result) => result.task_id) ?? []);

  function recheckAll() {
    if (!onRecheckAll || pending || loading || error) return;
    setActionError("");
    startTransition(async () => {
      try {
        setRecheck(await onRecheckAll());
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "Re-check failed. Refresh the impact queue and try again.");
      }
    });
  }

  return (
    <section className={styles.radar} aria-labelledby={headingId} aria-busy={loading || pending}>
      <header className={styles.header}>
        <div>
          <h2 id={headingId}>Spec Change Radar</h2>
          <p>Find marketing drafts and posts that rely on outdated specs or expired promos.</p>
        </div>
        <span className={styles.localLabel}>Active Engine</span>
      </header>

      <div className={styles.boundary}>
        Monitors drafts and live posts linked to approved product specs and seasonal discounts.
      </div>

      {loading ? <p className={styles.empty} role="status">Loading spec records…</p> : null}
      {error ? <div className={styles.error} role="alert"><strong>Spec records could not be loaded.</strong><p>{error}</p>{onRefresh ? <button type="button" onClick={onRefresh}>Try again</button> : null}</div> : null}
      {!loading && !error && data === null ? <p className={styles.empty}>Connect this view to the authenticated local impact API to load registered records.</p> : null}
      {!loading && !error && data !== null && items.length === 0 ? <div className={styles.empty}><strong>All drafts are up to date!</strong><p>When an approved product spec changes or a promo expires, affected drafts will appear here.</p></div> : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div className={styles.summary}>
            <div>
              <strong>{contentCount} {contentCount === 1 ? "draft needs" : "drafts need"} review</strong>
              <p>{claimCount} linked {claimCount === 1 ? "claim" : "claims"} · {items.length} review {items.length === 1 ? "task" : "tasks"}</p>
            </div>
            <button className={styles.recheckButton} type="button" disabled={!onRecheckAll || pending} onClick={recheckAll}>
              {pending ? "Re-checking…" : "Re-check all affected"}
            </button>
          </div>
          {!onRecheckAll ? <p className={styles.help}>An authorised re-check action has not been connected to this view.</p> : null}
          <ol className={styles.list}>
            {items.map((item) => (
              <li className={styles.item} key={item.task_id}>
                <div className={styles.itemHeading}>
                  <h3>{item.title}</h3>
                  <span className={styles.reviewLabel}>Needs update</span>
                </div>
                <p className={styles.meta}>
                  {item.previous_workflow_status ? `Previously ${impactStatusLabels[item.previous_workflow_status].toLowerCase()} · ` : ""}
                  {item.content_version_id}
                </p>
                <blockquote>{item.claim_text}</blockquote>
                <FactChange item={item} />
                <div className={styles.itemFooter}>
                  <span>{item.task_status === "rechecked" || recheckedIds.has(item.task_id) ? "Re-checked · ready for team review" : "Awaiting review"}</span>
                  {onOpenContent ? <button type="button" onClick={() => onOpenContent(item.content_id, item.content_version_id)}>Open draft</button> : null}
                </div>
                <details className={styles.trace}>
                  <summary>Record IDs</summary>
                  <dl><div><dt>Fact</dt><dd>{item.fact_id}</dd></div><div><dt>Claim</dt><dd>{item.claim_id}</dd></div><div><dt>Task</dt><dd>{item.task_id}</dd></div></dl>
                </details>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {actionError ? <p className={styles.error} role="alert">{actionError}</p> : null}
      {recheck && !actionError ? <p className={styles.result} role="status">Re-checked {recheck.checked_content_count} content {recheck.checked_content_count === 1 ? "item" : "items"} against latest specs. Ready for review.</p> : null}
      <p className={styles.help}>Re-checking highlights outdated numbers and claims; your team reviews and confirms the final edit.</p>
    </section>
  );
}

export function ImpactRadarBanner({ data, onOpenImpact }: { data: ImpactResponse | null; onOpenImpact?: () => void }) {
  if (!data || data.items.length === 0) return null;
  const count = new Set(data.items.map((item) => item.content_id)).size;

  return (
    <aside className={styles.banner} aria-label="Fact-change re-review required">
      <span className={styles.bannerSymbol} aria-hidden="true">!</span>
      <div><strong>{count} {count === 1 ? "draft needs" : "drafts need"} review.</strong><p>A product spec changed or an offer expired. Check linked claims before publishing.</p><small>Live Spec Monitor</small></div>
      {onOpenImpact ? <button type="button" onClick={onOpenImpact}>View impact</button> : null}
    </aside>
  );
}

export default ImpactRadar;
