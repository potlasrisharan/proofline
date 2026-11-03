"use client";

import React from "react";

export function SkeletonBox({
  width = "100%",
  height = "20px",
  borderRadius = "4px",
  className = "",
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-shimmer-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonTextLine({
  width = "100%",
  height = "14px",
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-shimmer-box skeleton-text-line ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({
  height = "160px",
  className = "",
}: {
  height?: string | number;
  className?: string;
}) {
  return (
    <div className={`skeleton-card-wrap ${className}`} style={{ minHeight: height }} aria-hidden="true">
      <div className="skeleton-card-header">
        <SkeletonBox width="40%" height="16px" />
        <SkeletonBox width="20%" height="16px" borderRadius="12px" />
      </div>
      <div className="skeleton-card-body">
        <SkeletonBox width="90%" height="12px" />
        <SkeletonBox width="75%" height="12px" />
        <SkeletonBox width="50%" height="12px" />
      </div>
      <div className="skeleton-card-footer">
        <SkeletonBox width="30%" height="10px" />
        <SkeletonBox width="25%" height="24px" borderRadius="4px" />
      </div>
    </div>
  );
}

export function SkeletonKpiCard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`skeleton-kpi-card ${className}`} aria-hidden="true">
      <SkeletonBox width="50%" height="11px" />
      <SkeletonBox width="70%" height="28px" style={{ margin: "8px 0" }} />
      <SkeletonBox width="85%" height="10px" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="skeleton-table-wrap" aria-hidden="true">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBox key={i} width={`${85 / columns}%`} height="14px" />
        ))}
      </div>
      <div className="skeleton-table-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="skeleton-table-row">
            {Array.from({ length: columns }).map((_, c) => (
              <SkeletonBox key={c} width={`${c === 0 ? 90 : 70}%`} height="12px" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonWorkspaceView({
  title = "Loading workspace...",
}: {
  title?: string;
}) {
  return (
    <div className="skeleton-workspace-container" role="status" aria-live="polite">
      <span className="sr-only">{title}</span>
      <div className="skeleton-workspace-topbar">
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <SkeletonBox width="140px" height="18px" />
          <SkeletonBox width="80px" height="14px" />
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <SkeletonBox width="90px" height="28px" borderRadius="4px" />
          <SkeletonBox width="28px" height="28px" borderRadius="9999px" />
        </div>
      </div>

      <div className="skeleton-workspace-grid">
        <div className="skeleton-kpi-row">
          <SkeletonKpiCard />
          <SkeletonKpiCard />
          <SkeletonKpiCard />
          <SkeletonKpiCard />
        </div>

        <div className="skeleton-main-split">
          <div className="skeleton-split-left">
            <SkeletonCard height="240px" />
            <SkeletonCard height="180px" />
          </div>
          <div className="skeleton-split-right">
            <SkeletonTable rows={4} columns={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
