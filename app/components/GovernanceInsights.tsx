"use client";

import { useId, useState } from "react";
import type { ProoflineRole } from "../lib/proofline-api";
import {
  canApproveRuleUpdate,
  formatInsightDate,
  formatInsightRate,
  humaniseInsightLabel,
  type FindingAggregate,
  type GovernanceInsightsData,
  type GroupAggregate,
  type SuggestedRuleUpdate,
  type TrendPoint,
} from "../lib/insights";
import styles from "./GovernanceInsights.module.css";

export type GovernanceInsightsProps = {
  data: GovernanceInsightsData | null;
  role?: ProoflineRole;
  loading?: boolean;
  error?: string | null;
  /** Makes the synthetic origin visible when rendering the VoltEdge simulation. */
  isDemo?: boolean;
  /** An explicit click only. The parent must persist approval and refresh the data. */
  onApproveSuggestion?: (proposal: SuggestedRuleUpdate) => Promise<void> | void;
  onRetry?: () => void;
};

function FindingBars({ items, emptyText }: { items: FindingAggregate[]; emptyText: string }) {
  if (items.length === 0) return <p className={styles.empty}>{emptyText}</p>;
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <ol className={styles.bars}>
      {items.map((item) => (
        <li className={styles.barItem} key={item.key}>
          <div className={styles.barLabel}>
            <span>{humaniseInsightLabel(item.label)}</span>
            <strong>{item.count}<span className={styles.srOnly}> review events</span></strong>
          </div>
          <div className={styles.barTrack} aria-hidden="true">
            <span style={{ width: `${(item.count / maximum) * 100}%` }} />
          </div>
          <p>{item.unique_findings} distinct findings · {item.needs_human_count} need human review</p>
        </li>
      ))}
    </ol>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const total = points.reduce((sum, point) => sum + point.finding_count, 0);
  const maximum = Math.max(1, ...points.map((point) => point.finding_count));
  const coordinates = points.map((point, index) => {
    const x = points.length < 2 ? 50 : 8 + (index / (points.length - 1)) * 84;
    const y = 90 - (point.finding_count / maximum) * 70;
    return `${x},${y}`;
  }).join(" ");

  if (points.length === 0) return <p className={styles.empty}>No activity is available for this period.</p>;
  return (
    <figure className={styles.trendFigure}>
      <svg className={styles.trendChart} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 8 90 H 92" className={styles.chartAxis} />
        <polyline points={coordinates} fill="none" className={styles.chartLine} vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => (
          <circle
            key={point.period_start}
            cx={points.length < 2 ? 50 : 8 + (index / (points.length - 1)) * 84}
            cy={90 - (point.finding_count / maximum) * 70}
            r="1.4"
            className={styles.chartDot}
          />
        ))}
      </svg>
      <figcaption>{total} review events in UTC weekly buckets. Partial weeks are included; this is descriptive activity, not statistical significance.</figcaption>
      <details className={styles.chartDetails}>
        <summary>Show chart data</summary>
        <div className={styles.tableScroll}>
          <table>
            <caption className={styles.srOnly}>Weekly review activity</caption>
            <thead><tr><th scope="col">Week starting</th><th scope="col">Events</th><th scope="col">Needs human</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.period_start}><th scope="row">{formatInsightDate(point.period_start)}</th><td>{point.finding_count}</td><td>{point.needs_human_count}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function GroupTable({ groups, groupLabel }: { groups: GroupAggregate[]; groupLabel: "Team" | "Agency" }) {
  if (groups.length === 0) return <p className={styles.empty}>No {groupLabel.toLowerCase()} attribution was supplied for this period.</p>;
  return (
    <div className={styles.tableScroll}>
      <table>
        <caption className={styles.srOnly}>{groupLabel}-level aggregate review activity</caption>
        <thead><tr><th scope="col">{groupLabel}</th><th scope="col">Events</th><th scope="col">Distinct findings</th><th scope="col">Needs human</th></tr></thead>
        <tbody>{groups.map((group) => <tr key={group.group_id}><th scope="row">{group.group_name}</th><td>{group.finding_count}</td><td>{group.unique_findings}</td><td>{group.needs_human_count} <span className={styles.muted}>({formatInsightRate(group.needs_human_rate)})</span></td></tr>)}</tbody>
      </table>
    </div>
  );
}

function RuleSuggestion({
  proposal,
  role,
  onApprove,
}: {
  proposal: SuggestedRuleUpdate;
  role?: ProoflineRole;
  onApprove?: GovernanceInsightsProps["onApproveSuggestion"];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function approve() {
    if (busy || !onApprove || !canApproveRuleUpdate(role, proposal)) return;
    setBusy(true);
    setMessage(null);
    setFailed(false);
    try {
      await onApprove(proposal);
      setMessage("Approval request completed. The parent view must refresh the recorded status.");
    } catch (error: unknown) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "The approval could not be recorded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.suggestion}>
      <div className={styles.suggestionTop}><span className={styles.generated}>AI-generated</span><span className={styles.state}>{humaniseInsightLabel(proposal.status)}</span></div>
      <h3>{proposal.title}</h3>
      <p className={styles.muted}>Deterministic local wording template · requires brand-owner review.</p>
      {proposal.current_wording ? <div className={styles.wording}><span>Current guideline</span><p>{proposal.current_wording}</p></div> : null}
      <div className={`${styles.wording} ${styles.proposedWording}`}><span>Suggested clearer wording</span><p>{proposal.suggested_wording}</p></div>
      <p className={styles.evidence}><strong>Observed pattern:</strong> {proposal.evidence_summary}</p>
      {proposal.evidence.length > 0 ? <details className={styles.chartDetails}><summary>Evidence references</summary><ul className={styles.references}>{proposal.evidence.map((reference) => <li key={reference}><code>{reference}</code></li>)}</ul></details> : null}
      <div className={styles.suggestionFooter}>
        {proposal.status === "approved" ? <p>Owner approval recorded{proposal.approved_at ? ` on ${formatInsightDate(proposal.approved_at)}` : ""}. The live rule has not been changed.</p> : role === "brand_owner" && onApprove ? <button type="button" className={styles.approveButton} disabled={busy || !canApproveRuleUpdate(role, proposal)} onClick={approve}>{busy ? "Recording approval…" : "Approve proposed update"}</button> : <p>Only a brand_owner can approve this proposed update.</p>}
        <span>Never auto-applied</span>
      </div>
      {message ? <p className={failed ? styles.error : styles.muted} role={failed ? "alert" : "status"}>{message}</p> : null}
    </article>
  );
}

/** Reusable display boundary: supplied records in, explicit owner actions out. */
export default function GovernanceInsights({ data, role, loading = false, error = null, isDemo = false, onApproveSuggestion, onRetry }: GovernanceInsightsProps) {
  const headingId = useId();

  if (loading) return <section className={styles.insights} aria-busy="true" aria-label="Governance insights"><p className={styles.empty} role="status">Loading governance insights…</p></section>;
  if (error) return <section className={styles.insights} aria-label="Governance insights"><div className={styles.error} role="alert"><p>Governance insights could not be loaded: {error}</p>{onRetry ? <button type="button" className={styles.approveButton} onClick={onRetry}>Try again</button> : null}</div></section>;
  if (!data) return <section className={styles.insights} aria-label="Governance insights"><p className={styles.empty}>No review activity has been supplied. Add local review records to calculate governance insights.</p></section>;

  return (
    <section className={styles.insights} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Governance insights</p><h2 id={headingId}>Find patterns. Clarify the guidance.</h2><p className={styles.subtitle}>{formatInsightDate(data.window_start)} – {formatInsightDate(data.window_end)} · {data.sample_size} review events · UTC</p></div>
        <span className={styles.mode}>{isDemo ? "Fictional VoltEdge simulation" : "Local supplied records"}</span>
      </header>

      <p className={styles.context}>Team and agency aggregates support guideline improvement. Individual rankings are excluded. {isDemo ? "Synthetic activity demonstrates the method and is not a measured production result." : "Counts reflect only the records supplied for this reporting window."}</p>

      <div className={styles.metrics}>
        <div><span>Review events</span><strong>{data.sample_size}</strong></div>
        <div><span>Issue categories</span><strong>{data.by_category.length}</strong></div>
        <div><span>Facts expiring soon</span><strong>{data.expiring_facts.length}</strong></div>
        <div><span>Clarification signals</span><strong>{data.ambiguity_signals.length}</strong></div>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}><p className={styles.eyebrow}>Recurring categories</p><h3>What keeps surfacing</h3><FindingBars items={data.by_category} emptyText="No findings were recorded in this window." /></section>
        <section className={styles.panel}><p className={styles.eyebrow}>Over time</p><h3>Recorded review activity</h3><TrendChart points={data.trends} /></section>
        <section className={styles.panel}><p className={styles.eyebrow}>Rule-level patterns</p><h3>Rules that need attention</h3><FindingBars items={data.by_rule} emptyText="No rule identifiers were linked to the supplied findings." /></section>
        <section className={styles.panel}><p className={styles.eyebrow}>Validity window</p><h3>Facts expiring soon</h3>{data.expiring_facts.length > 0 ? <ul className={styles.expiryList}>{data.expiring_facts.map((fact) => <li key={`${fact.fact_id}-${fact.version}`}><div><strong>{fact.label}</strong><p>{fact.version ? `Version ${fact.version} · ` : ""}<time dateTime={fact.expires_at}>{formatInsightDate(fact.expires_at)}</time></p><code>{fact.fact_id}</code></div><span>{fact.days_remaining === 0 ? "Today" : `${fact.days_remaining} days`}</span></li>)}</ul> : <p className={styles.empty}>No active supplied facts expire within the configured horizon.</p>}</section>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}><p className={styles.eyebrow}>Aggregate activity</p><h3>By team</h3><GroupTable groups={data.teams} groupLabel="Team" /></section>
        <section className={styles.panel}><p className={styles.eyebrow}>Aggregate activity</p><h3>By agency</h3><GroupTable groups={data.agencies} groupLabel="Agency" /></section>
      </div>

      <section className={styles.panel}>
        <p className={styles.eyebrow}>Guideline-gap detector</p><h3>Signals to review</h3>
        <p className={styles.subtitle}>Dismissals, overrides, needs_human outcomes, and explicit guideline conflicts are review signals. They do not establish that a rule is wrong.</p>
        {data.ambiguity_signals.length > 0 ? <ul className={styles.signalList}>{data.ambiguity_signals.map((signal) => <li key={signal.signal_id}><span className={styles.signalMarker} aria-hidden="true" /><div><strong>{humaniseInsightLabel(signal.label)}</strong><p>{signal.explanation}</p><small>{humaniseInsightLabel(signal.signal_type)} · {signal.rate === null ? "Explicit guideline conflict" : `${signal.count}/${signal.sample_size} review events (${formatInsightRate(signal.rate)})`}</small></div></li>)}</ul> : <p className={styles.empty}>No ambiguity threshold was met in this reporting window.</p>}
      </section>

      <section className={styles.proposals} aria-label="Suggested rule updates">
        <header><p className={styles.eyebrow}>Owner-reviewed proposals</p><h3>Suggested clearer wording</h3><p className={styles.subtitle}>AI-generated local templates, grounded in the observations above. Approval records a decision; activating a versioned rule is a separate explicit action.</p></header>
        {data.suggested_rule_updates.length > 0 ? <div className={styles.grid}>{data.suggested_rule_updates.map((proposal) => <RuleSuggestion key={proposal.proposal_id} proposal={proposal} role={role} onApprove={onApproveSuggestion} />)}</div> : <p className={styles.empty}>No suggested rule updates are available.</p>}
      </section>
    </section>
  );
}
