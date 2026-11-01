"use client";

import { useMemo } from "react";
import type { ProoflineRole } from "../lib/proofline-api";

export type DemoPersona = {
  role: ProoflineRole;
  name: string;
  email: string;
  initials: string;
  title: string;
  department: string;
  focus: string;
  description: string;
  primaryView: "overview" | "reviews" | "registry" | "insights" | "audit-log";
  permissionsSummary: string;
  badgeTone: "coral" | "amber" | "blue" | "mint" | "teal";
  coreCapabilities: string[];
};

export const demoPersonas: Record<ProoflineRole, DemoPersona> = {
  creator: {
    role: "creator",
    name: "Aisha Rahman",
    email: "aisha.rahman@voltedge.io",
    initials: "AR",
    title: "Content Lead",
    department: "Product Marketing",
    focus: "Drafting & Spec Corrections",
    description: "Creates launch emails and announcements. Inspects highlighted spec contradictions, applies 1-click lab fixes, and submits for editorial review.",
    primaryView: "reviews",
    permissionsSummary: "Can edit drafts, apply suggestions, comment, and submit. Self-approval blocked.",
    badgeTone: "coral",
    coreCapabilities: [
      "Submit marketing drafts via text or document upload",
      "Inspect side-by-side visual diffs on contradicted claims",
      "Apply 1-click fixes with approved lab specifications",
      "Re-scan draft and send to management for review",
    ],
  },
  manager: {
    role: "manager",
    name: "Marcus Vance",
    email: "marcus.vance@voltedge.io",
    initials: "MV",
    title: "Editorial & Campaign Manager",
    department: "Marketing Operations",
    focus: "Queue Triage & Change Requests",
    description: "Prioritizes submissions by calculated risk score (0–100), reviews span comments, requests copy changes with context, and routes clean drafts for legal clearance.",
    primaryView: "reviews",
    permissionsSummary: "Can request changes, leave decision notes, triage risk queue, and submit for legal sign-off.",
    badgeTone: "amber",
    coreCapabilities: [
      "Prioritize review queue by risk score and publication date",
      "Request revisions with mandatory contextual change notes",
      "Audit decision activity trail and reviewer comments",
      "Route verified drafts to legal ops for final clearance",
    ],
  },
  legal_reviewer: {
    role: "legal_reviewer",
    name: "Maya Chen",
    email: "maya.chen@voltedge.io",
    initials: "MC",
    title: "Authorised Legal Reviewer",
    department: "Legal & Regulatory Ops",
    focus: "Regulatory Clearance & Quality Gate",
    description: "Audits FTC §5 and Lanham Act §43(a) compliance, verifies evidence against the VoltEdge Truth Registry, and signs off on cryptographic compliance certificates.",
    primaryView: "reviews",
    permissionsSummary: "Full regulatory sign-off: can approve revisions, unlock publishing gate, and sign certificates.",
    badgeTone: "blue",
    coreCapabilities: [
      "4-Pillar Acrolinx Quality Scorecard evaluation (Accuracy, Legal, Brand, A11y)",
      "Red Marker statutory rulebook check (FTC §5 & Lanham Act §43(a))",
      "PerformLine high-risk superlative scanner with safe-harbor rewrites",
      "Sign & export tamper-proof cryptographic compliance certificates",
    ],
  },
  brand_owner: {
    role: "brand_owner",
    name: "Lena Ortiz",
    email: "lena.ortiz@voltedge.io",
    initials: "LO",
    title: "VP Brand & Product Truth",
    department: "Executive Brand Leadership",
    focus: "Truth Registry & Multi-Channel Dispatch",
    description: "Governs registered brand sources, approves guideline gap clarifications based on recurring trends, and authorizes 1-click multi-channel dispatch via Zernio.",
    primaryView: "registry",
    permissionsSummary: "Executive authority: manage truth registry records, approve guideline updates, and dispatch.",
    badgeTone: "mint",
    coreCapabilities: [
      "Add, version, and scope official brand truth records",
      "Approve guideline updates identified by the Guideline-Gap Detector",
      "Monitor workspace registry coverage (86% active sources)",
      "1-Click Gated Multi-Channel Dispatch across LinkedIn, X, Instagram via Zernio",
    ],
  },
  agency: {
    role: "agency",
    name: "Carlos Mendez",
    email: "carlos.mendez@agency-partner.com",
    initials: "CM",
    title: "Agency Partner / Copywriter",
    department: "Apex Creative Agency",
    focus: "Sandboxed Partner Review",
    description: "Restricted partner environment. External freelancers review and refine assigned campaigns only, with internal company telemetry and confidential records strictly masked.",
    primaryView: "reviews",
    permissionsSummary: "Sandboxed: can comment and apply suggestions to assigned campaigns only.",
    badgeTone: "teal",
    coreCapabilities: [
      "Sandboxed access isolated to assigned client campaigns",
      "Check drafts against client specification baseline",
      "Collaborate via span comments without internal operational noise",
      "Strict data protection: internal telemetry & governance charts masked",
    ],
  },
};

export function RoleDashboardShowcase({
  currentRole,
  onSelectRole,
}: {
  currentRole: ProoflineRole;
  onSelectRole: (role: ProoflineRole) => void;
}) {
  const personas = useMemo(() => Object.values(demoPersonas), []);

  return (
    <section className="role-showcase-container" aria-label="Role-based dashboards and demo login">
      <div className="role-showcase-header">
        <div className="role-showcase-title-row">
          <span className="role-showcase-kicker">ENTERPRISE ROLE-BASED WORKSPACES</span>
          <span className="separation-badge">✓ Strict Separation of Duties Enforced</span>
        </div>
        <h2 className="role-showcase-heading">Role Dashboards &amp; 1-Click Demo Login</h2>
        <p className="role-showcase-lede">
          Proofline separates drafting, editorial coordination, legal compliance, and executive publishing.
          Select any role below to launch their customized workspace with realistic fictional credentials:
        </p>
      </div>

      <div className="role-cards-grid">
        {personas.map((p) => {
          const isActive = currentRole === p.role;
          return (
            <article
              key={p.role}
              className={`role-persona-card ${p.badgeTone} ${isActive ? "active-session" : ""}`}
            >
              <div className="persona-card-top">
                <div className={`persona-avatar ${p.badgeTone}`}>{p.initials}</div>
                <div className="persona-info-col">
                  <div className="persona-name-row">
                    <h3 className="persona-name">{p.name}</h3>
                    {isActive ? (
                      <span className="active-role-tag">● Active Session</span>
                    ) : null}
                  </div>
                  <span className="persona-title">{p.title}</span>
                  <span className="persona-dept">{p.department}</span>
                </div>
              </div>

              {/* Demo Credentials Box */}
              <div className="persona-credentials-box">
                <span className="cred-label">Demo Credentials:</span>
                <code className="cred-email">{p.email}</code>
                <span className="cred-role-tag">Role: {p.role}</span>
              </div>

              <div className="persona-focus-row">
                <span className="focus-label">Primary Dashboard:</span>
                <strong>{p.focus}</strong>
              </div>

              <p className="persona-description">{p.description}</p>

              <div className="persona-capabilities-list">
                <span className="caps-label">Key Capabilities:</span>
                <ul>
                  {p.coreCapabilities.map((cap, i) => (
                    <li key={i}>{cap}</li>
                  ))}
                </ul>
              </div>

              <div className="persona-footer">
                <span className="persona-permissions-note">{p.permissionsSummary}</span>
                <button
                  type="button"
                  className={`persona-launch-btn ${isActive ? "current" : ""}`}
                  onClick={() => onSelectRole(p.role)}
                >
                  {isActive ? "✓ Currently Active Dashboard" : `⚡ Launch as ${p.name.split(" ")[0]} (${p.role}) →`}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ActiveRoleWorkflowBanner({
  currentRole,
  onOpenSwitchRole,
  onOpenCreatorStudio,
}: {
  currentRole: ProoflineRole;
  onOpenSwitchRole: () => void;
  onOpenCreatorStudio?: () => void;
}) {
  const persona = demoPersonas[currentRole];

  return (
    <div className={`active-role-workflow-banner ${persona.badgeTone}`} role="region" aria-label="Active role workflow context">
      <div className="role-banner-left">
        <div className={`role-banner-avatar ${persona.badgeTone}`}>{persona.initials}</div>
        <div className="role-banner-text">
          <div className="role-banner-title-row">
            <strong>Logged in as {persona.name}</strong>
            <span className="role-banner-pill">{persona.title}</span>
            <code className="role-banner-email">{persona.email}</code>
          </div>
          <p className="role-banner-guidance">
            <strong>Active Workflow:</strong> {persona.description}
          </p>
        </div>
      </div>
      <div className="role-banner-right">
        {currentRole === "creator" && onOpenCreatorStudio ? (
          <button
            type="button"
            className="creator-studio-trigger-btn"
            onClick={onOpenCreatorStudio}
            title="Open Creator Multi-Platform Studio with Groq & Sarvam AI"
            style={{
              background: "#143e33",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "6px 11px",
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginRight: 6,
            }}
          >
            <span>✨</span> Creator Studio (Groq + Sarvam)
          </button>
        ) : null}
        <button
          type="button"
          className="role-switch-trigger-btn"
          onClick={onOpenSwitchRole}
          title="Switch to another persona / dashboard"
        >
          ⇄ Switch Demo Role
        </button>
      </div>
    </div>
  );
}

export function DemoRoleModal({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentRole: ProoflineRole;
  onSelectRole: (role: ProoflineRole) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="modal-card demo-role-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-role-modal-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close role modal"
          onClick={onClose}
        >
          ×
        </button>

        <p className="eyebrow">Enterprise Identity &amp; Access</p>
        <h2 id="demo-role-modal-title">Switch Demo Persona &amp; Dashboard</h2>
        <p className="modal-copy">
          Select any of the 5 organizational personas below to experience their dedicated workflow, permissions, and dashboards:
        </p>

        <div className="demo-role-modal-list">
          {Object.values(demoPersonas).map((p) => {
            const isActive = currentRole === p.role;
            return (
              <button
                key={p.role}
                type="button"
                className={`demo-role-modal-item ${p.badgeTone} ${isActive ? "active" : ""}`}
                onClick={() => {
                  onSelectRole(p.role);
                  onClose();
                }}
              >
                <div className={`persona-avatar ${p.badgeTone}`}>{p.initials}</div>
                <div className="modal-role-info">
                  <div className="modal-role-top">
                    <strong>{p.name}</strong>
                    <span className="modal-role-tag">{p.title}</span>
                    {isActive ? <span className="active-dot-tag">● Active</span> : null}
                  </div>
                  <div className="modal-role-email">{p.email}</div>
                  <p className="modal-role-focus">
                    <strong>Focus:</strong> {p.focus} · {p.permissionsSummary}
                  </p>
                </div>
                <span className="modal-role-arrow">→</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
