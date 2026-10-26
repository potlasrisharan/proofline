import Link from "next/link";
import type { ReactNode } from "react";

type Phase4Page = "impact" | "insights";

type Phase4ShellProps = {
  current: Phase4Page;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Shared navigation shell for the local Phase 4 improvement pages. */
export function Phase4Shell({ current, eyebrow, title, description, children }: Phase4ShellProps) {
  return (
    <main className="app-shell pl-workspace">
      <a className="pl-skip-link" href="#phase4-main">Skip to content</a>
      <aside className="sidebar" aria-label="VoltEdge workspace navigation">
        <Link className="brand-lockup pl-brand-link" href="/">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>
            <span className="brand-name">Proofline</span>
            <span className="brand-caption">Brand truth, before publish.</span>
          </span>
        </Link>
        <div className="workspace-switcher" role="status">
          <span className="workspace-dot" />
          <span>VoltEdge workspace</span>
        </div>
        <nav className="nav-list" aria-label="Primary">
          <Link className="nav-item" href="/"><span aria-hidden="true">◈</span>Overview</Link>
          <Link className="nav-item" href="/?view=reviews"><span aria-hidden="true">◇</span>Review queue</Link>
          <Link className="nav-item" href="/submit"><span aria-hidden="true">＋</span>Submit content</Link>
          <Link className="nav-item" href="/?view=registry"><span aria-hidden="true">▦</span>Truth registry</Link>
          <Link className={`nav-item ${current === "impact" ? "active" : ""}`} href="/impact" aria-current={current === "impact" ? "page" : undefined}><span aria-hidden="true">!</span>Impact radar</Link>
          <Link className={`nav-item ${current === "insights" ? "active" : ""}`} href="/insights" aria-current={current === "insights" ? "page" : undefined}><span aria-hidden="true">⌁</span>Governance insights</Link>
          <Link className="nav-item" href="/?view=audit-log"><span aria-hidden="true">≋</span>Audit log</Link>
          <Link className="nav-item" href="/privacy"><span aria-hidden="true">◌</span>Privacy &amp; AI disclosure</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="registry-health"><span className="health-dot" /><div><strong>Local improvement demo</strong><small>Fictional VoltEdge · no backend sync</small></div></div>
          <div className="profile-card"><span className="avatar">BO</span><div><strong>VoltEdge brand owner</strong><small>Explicit approval required</small></div></div>
        </div>
      </aside>
      <section className="main-content" id="phase4-main" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb"><span>VoltEdge Labs</span><i>/</i><strong>{title}</strong></div>
          <span className="pl-demo-label">IMPLEMENTED · local synthetic demo</span>
        </header>
        <div className="content-wrap">
          <div className="page-heading compact-heading">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p className="lede">{description}</p>
            </div>
            <span className="review-summary-chip"><span className="status-dot blue" /> VoltEdge demo state</span>
          </div>
          {children}
          <footer className="footer"><span>Proofline · local Phase 4 improvement demo · fictional data</span><span><Link href="/privacy">Privacy and AI disclosure</Link> · No automatic approval or publication.</span></footer>
        </div>
      </section>
    </main>
  );
}
