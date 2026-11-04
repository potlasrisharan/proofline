import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found · Proofline",
  description: "The requested review, dashboard, or endpoint does not exist or has been relocated.",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EBEBE8",
        color: "#18181B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "var(--ind-font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 640,
          background: "#FFFFFF",
          border: "1px solid #D4D4D8",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
          padding: "36px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Image
            src="/logo.png"
            alt="Proofline logo"
            width={32}
            height={32}
            style={{ borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <strong style={{ fontSize: 18, letterSpacing: "-0.02em" }}>PROOFLINE</strong>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--ind-font-mono, monospace)",
              padding: "2px 7px",
              background: "#FEE2E2",
              color: "#DC2626",
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            404 NOT FOUND
          </span>
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 10,
            color: "#18181B",
          }}
        >
          Endpoint Not Located
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#71717A",
            lineHeight: 1.5,
            maxWidth: 480,
            margin: "0 auto 24px",
          }}
        >
          The requested route or dashboard view does not exist in this Proofline workspace.
          Navigate back to an active view or launch an authorized workflow.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <Link
            href="/"
            className="primary-button"
            style={{
              padding: "10px 20px",
              background: "#18181B",
              color: "#FFFFFF",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Return to Cockpit
          </Link>
          <Link
            href="/?view=reviews"
            className="secondary-button"
            style={{
              padding: "10px 18px",
              background: "#F4F4F5",
              color: "#18181B",
              border: "1px solid #D4D4D8",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Open Review Queue
          </Link>
          <Link
            href="/submit"
            className="secondary-button"
            style={{
              padding: "10px 18px",
              background: "#F4F4F5",
              color: "#18181B",
              border: "1px solid #D4D4D8",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Submit New Draft
          </Link>
        </div>

        <div
          style={{
            borderTop: "1px solid #E4E4E7",
            paddingTop: 20,
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontFamily: "var(--ind-font-mono, monospace)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#71717A",
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            Quick Workspace Navigation
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 8,
              fontSize: 12,
            }}
          >
            <Link
              href="/dashboards"
              style={{
                padding: "8px 10px",
                background: "#FAFAFA",
                border: "1px solid #E4E4E7",
                borderRadius: 5,
                color: "#18181B",
                textDecoration: "none",
                display: "block",
              }}
            >
              <strong>⊞ Role Dashboards</strong>
              <div style={{ color: "#71717A", fontSize: 11 }}>5 team views</div>
            </Link>
            <Link
              href="/multimodal"
              style={{
                padding: "8px 10px",
                background: "#FAFAFA",
                border: "1px solid #E4E4E7",
                borderRadius: 5,
                color: "#18181B",
                textDecoration: "none",
                display: "block",
              }}
            >
              <strong>👁 Video & Visual Scan</strong>
              <div style={{ color: "#71717A", fontSize: 11 }}>Reels & image check</div>
            </Link>
            <Link
              href="/drift"
              style={{
                padding: "8px 10px",
                background: "#FAFAFA",
                border: "1px solid #E4E4E7",
                borderRadius: 5,
                color: "#18181B",
                textDecoration: "none",
                display: "block",
              }}
            >
              <strong>📡 Publish & Monitor</strong>
              <div style={{ color: "#71717A", fontSize: 11 }}>24/7 post monitoring</div>
            </Link>
            <Link
              href="/sync"
              style={{
                padding: "8px 10px",
                background: "#FAFAFA",
                border: "1px solid #E4E4E7",
                borderRadius: 5,
                color: "#18181B",
                textDecoration: "none",
                display: "block",
              }}
            >
              <strong>🔄 Live Doc Sync</strong>
              <div style={{ color: "#71717A", fontSize: 11 }}>Notion & Google Docs</div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
