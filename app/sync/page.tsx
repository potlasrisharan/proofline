import type { Metadata } from "next";
import Link from "next/link";
import { DynamicTruthSync } from "../components/dynamic-truth-sync";

export const metadata: Metadata = {
  title: "Dynamic Brand Truth Sync & Enterprise Doc Ingestion | Proofline",
  description:
    "Automates Brand Truth Registry ingestion by syncing with live corporate data sources (Notion, Google Docs, Shopify ERP, and product spec sheets).",
};

export default function DynamicSyncPage() {
  return (
    <div className="industrial-page-wrap">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {/* 1. Global Noise Overlay */}
      <div className="industrial-noise-overlay" aria-hidden="true" />

      {/* 2. Structural 12-Column Persistent Grid */}
      <div className="industrial-grid-bg" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="industrial-grid-col" />
        ))}
      </div>

      {/* 3. Sticky Industrial Header */}
      <header className="industrial-header">
        <div className="industrial-header-inner">
          <nav className="industrial-header-left">
            <Link href="/#services-section" className="industrial-nav-link">
              Services
            </Link>
            <Link href="/dashboards" className="industrial-nav-link">
              Dashboards
            </Link>
            <Link href="/impact" className="industrial-nav-link">
              Impact radar
            </Link>
            <Link href="/privacy" className="industrial-nav-link">
              Trust &amp; Privacy
            </Link>
            <Link href="/portal" className="industrial-nav-link">
              Role Portal
            </Link>
          </nav>

          <Link href="/" className="industrial-logo-center" aria-label="Proofline Home">
            <span className="industrial-logo-serif">PROOF</span>
            <span className="industrial-logo-sans">LINE</span>
          </Link>

          <div className="industrial-header-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/login"
              className="industrial-login-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "var(--ind-fg, #18181B)",
                color: "#FFFFFF",
                borderRadius: 9999,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--ind-font-sans, sans-serif)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              <span>🔒</span>
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 4. Sub-Header Breadcrumb & Status */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 32px 0 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontFamily: "var(--ind-font-mono, monospace)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--ind-muted, #71717A)",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to Proofline Overview
        </Link>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 10.5,
            fontFamily: "var(--ind-font-mono, monospace)",
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: "var(--ind-muted, #71717A)",
          }}
        >
          <span className="industrial-status-pulse" />
          <span>SYS.ONLINE // REALTIME NOTION &amp; DOCS INGESTION</span>
        </div>
      </div>

      {/* 5. Main Content Shell */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 32px 80px 32px",
          position: "relative",
          zIndex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <DynamicTruthSync />
      </main>
    </div>
  );
}
