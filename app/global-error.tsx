"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Proofline GlobalError Caught]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "#EBEBE8",
          color: "#18181B",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 500,
            width: "90%",
            background: "#FFFFFF",
            border: "1px solid #D4D4D8",
            borderRadius: 8,
            padding: 32,
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Application Error
          </h1>
          <p style={{ fontSize: 13, color: "#71717A", margin: "0 0 20px" }}>
            An unexpected error interrupted the Proofline application shell.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "8px 16px",
                background: "#18181B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                padding: "8px 16px",
                background: "#F4F4F5",
                color: "#18181B",
                border: "1px solid #D4D4D8",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Reload Cockpit
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
