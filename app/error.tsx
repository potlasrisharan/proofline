"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error for diagnostics
    console.error("[Proofline ErrorBoundary Caught]", error);
  }, [error]);

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
          maxWidth: 620,
          background: "#FFFFFF",
          border: "1px solid #D4D4D8",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
          padding: "36px 32px",
          textAlign: "center",
        }}
        role="alert"
        aria-live="assertive"
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
            SYSTEM ERROR
          </span>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 10,
            color: "#18181B",
          }}
        >
          Execution Interrupted
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#71717A",
            lineHeight: 1.5,
            maxWidth: 480,
            margin: "0 auto 20px",
          }}
        >
          An unexpected error occurred while processing this view. The state was isolated to prevent data loss.
        </p>

        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            padding: "12px 16px",
            textAlign: "left",
            margin: "0 0 24px",
            fontSize: 12,
            fontFamily: "var(--ind-font-mono, monospace)",
            color: "#475569",
            wordBreak: "break-all",
          }}
        >
          <div style={{ fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>
            Diagnostic Trace:
          </div>
          <div>{error.message || "Unknown runtime exception encountered."}</div>
          {error.digest ? (
            <div style={{ color: "#94A3B8", marginTop: 4, fontSize: 11 }}>
              Error Digest: {error.digest}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            className="primary-button"
            style={{
              padding: "10px 20px",
              background: "#18181B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ⚡ Try Again
          </button>
          <Link
            href="/"
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
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            ← Return to Cockpit
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
      </main>
    </div>
  );
}
