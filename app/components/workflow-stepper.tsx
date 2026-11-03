"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ProoflineRole } from "../lib/proofline-api";

export type PipelineStageNumber = 1 | 2 | 3 | 4;

export interface PipelineStageConfig {
  number: PipelineStageNumber;
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  owner: string;
  primaryRoute: string;
  tools: Array<{
    label: string;
    href: string;
    badge?: string;
    description: string;
  }>;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    number: 1,
    id: "stage-1-truth",
    badge: "STAGE 01",
    title: "Truth & Specs",
    subtitle: "Establish approved product specs and sync live documentation",
    owner: "Brand Lead & Fact Owner",
    primaryRoute: "/?view=registry",
    tools: [
      { label: "Approved Facts", href: "/?view=registry", description: "Official specs & rules catalog" },
      { label: "Live Doc Sync", href: "/sync", badge: "Live", description: "Notion & Google Docs sync" },
      { label: "Spec Change Radar", href: "/impact", badge: "Alerts", description: "Detect affected drafts when specs change" },
    ],
  },
  {
    number: 2,
    id: "stage-2-draft",
    badge: "STAGE 02",
    title: "Draft & Visual Scan",
    subtitle: "Author compliant copy and audit video reels & image carousels",
    owner: "Content Creator & Visual Lead",
    primaryRoute: "/submit",
    tools: [
      { label: "Creator Studio", href: "/submit", badge: "Instant Check", description: "Live fact-checking writing environment" },
      { label: "Video & Visual Scan", href: "/multimodal", badge: "OCR + Vision", description: "Video reel & image disclaimer checker" },
    ],
  },
  {
    number: 3,
    id: "stage-3-review",
    badge: "STAGE 03",
    title: "Review & Legal Gate",
    subtitle: "Inspect claim discrepancies, apply 1-click fixes, and verify regulatory rules",
    owner: "Editorial Manager & Legal Reviewer",
    primaryRoute: "/?view=reviews",
    tools: [
      { label: "Review Cockpit", href: "/?view=reviews", badge: "Triage", description: "Unified queue & evidence inspector" },
      { label: "Claim Findings", href: "/findings", badge: "1-Click Fix", description: "Flagged claims & safe-harbor rewrites" },
      { label: "Team Insights", href: "/insights", description: "Common issue patterns & guideline health" },
    ],
  },
  {
    number: 4,
    id: "stage-4-publish",
    badge: "STAGE 04",
    title: "Publish & Monitor",
    subtitle: "Gated multi-platform dispatch, post-publish drift surveillance, and audit trail",
    owner: "Authorised Counsel & VP Marketing",
    primaryRoute: "/drift",
    tools: [
      { label: "Publish & Monitor", href: "/drift", badge: "24/7 Monitor", description: "Live social publishing & post-publish update alerts" },
      { label: "Role Dashboards", href: "/dashboards", badge: "5 Workspaces", description: "Dedicated stakeholder portals" },
      { label: "Audit Trail", href: "/?view=audit-log", badge: "Verified", description: "Permanent, tamper-proof decision history" },
      { label: "Privacy & AI Disclosure", href: "/privacy", description: "Transparency & data boundaries" },
    ],
  },
];

interface WorkflowStepperProps {
  currentStage?: PipelineStageNumber;
  activeRole?: ProoflineRole;
  compact?: boolean;
}

export function WorkflowStepper({
  currentStage: explicitStage,
  compact = false,
}: WorkflowStepperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine stage automatically from route if not provided
  const detectedStage: PipelineStageNumber = React.useMemo(() => {
    if (explicitStage) return explicitStage;

    const view = searchParams?.get("view");
    if (view === "registry") return 1;
    if (view === "reviews") return 3;
    if (view === "insights") return 3;
    if (view === "audit-log") return 4;
    if (view === "portal") return 4;

    if (pathname === "/sync" || pathname === "/impact") return 1;
    if (pathname === "/submit" || pathname === "/multimodal") return 2;
    if (pathname === "/findings") return 3;
    if (pathname === "/drift" || pathname === "/dashboards" || pathname === "/portal" || pathname === "/privacy") return 4;

    return 3; // Default to Review Cockpit
  }, [explicitStage, pathname, searchParams]);

  const stageConfig = PIPELINE_STAGES.find((s) => s.number === detectedStage) ?? PIPELINE_STAGES[2];
  const prevStage = detectedStage > 1 ? PIPELINE_STAGES[detectedStage - 2] : null;
  const nextStage = detectedStage < 4 ? PIPELINE_STAGES[detectedStage] : null;

  return (
    <div className={`workflow-stepper-container ${compact ? "compact" : ""}`} aria-label="End-to-End Enterprise Workflow Stepper">
      {/* Step Progress Bar */}
      <div className="stepper-header-bar">
        <div className="stepper-title-group">
          <span className="stepper-kicker">ENTERPRISE VERIFICATION PIPELINE</span>
          <span className="stepper-stage-indicator">
            STAGE 0{detectedStage} OF 04 · <strong>{stageConfig.title}</strong>
          </span>
        </div>

        {/* Previous & Next Quick Actions */}
        <div className="stepper-nav-controls">
          {prevStage ? (
            <button
              type="button"
              className="stepper-step-btn prev"
              onClick={() => router.push(prevStage.primaryRoute)}
              title={`Go back to Stage 0${prevStage.number}: ${prevStage.title}`}
            >
              <span>← Stage 0{prevStage.number}: {prevStage.title}</span>
            </button>
          ) : (
            <span className="stepper-step-placeholder">Pipeline Start</span>
          )}

          {nextStage ? (
            <button
              type="button"
              className="stepper-step-btn next"
              onClick={() => router.push(nextStage.primaryRoute)}
              title={`Advance to Stage 0${nextStage.number}: ${nextStage.title}`}
            >
              <span>Next: Stage 0{nextStage.number} ({nextStage.title}) →</span>
            </button>
          ) : (
            <span className="stepper-step-placeholder complete">✓ Pipeline Complete</span>
          )}
        </div>
      </div>

      {/* 4 Interactive Visual Stages */}
      <div className="stepper-track" role="tablist" aria-label="Pipeline Stages">
        {PIPELINE_STAGES.map((stage) => {
          const isActive = stage.number === detectedStage;
          const isPassed = stage.number < detectedStage;

          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`stepper-node ${isActive ? "active" : ""} ${isPassed ? "completed" : ""}`}
              onClick={() => router.push(stage.primaryRoute)}
              title={`Switch to Stage 0${stage.number}: ${stage.title} (${stage.owner})`}
            >
              <div className="node-number-badge">
                {isPassed ? "✓" : `0${stage.number}`}
              </div>
              <div className="node-content">
                <span className="node-title">{stage.title}</span>
                <span className="node-owner">{stage.owner}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Sub-tools Navigation */}
      <div className="stepper-tools-bar">
        <div className="stepper-tools-label">
          <span>Active Stage Tools:</span>
        </div>
        <div className="stepper-tools-list">
          {stageConfig.tools.map((tool) => {
            // Check if this tool matches current URL
            const isToolActive =
              (tool.href.startsWith("/?view=") && searchParams?.get("view") === tool.href.replace("/?view=", "")) ||
              (pathname === tool.href);

            return (
              <Link
                key={tool.label}
                href={tool.href}
                className={`stepper-tool-pill ${isToolActive ? "active" : ""}`}
                title={tool.description}
              >
                <span>{tool.label}</span>
                {tool.badge ? <span className="tool-pill-badge">{tool.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
