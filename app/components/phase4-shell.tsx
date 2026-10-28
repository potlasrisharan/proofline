import Link from "next/link";
import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

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
      <AppSidebar activeKey={current} />
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
