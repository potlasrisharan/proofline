"use client";

import { useMemo, useState } from "react";
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
      "4-Pillar Quality Scorecard evaluation (Accuracy, Legal, Brand, A11y)",
      "Statutory rulebook check (FTC §5 & Lanham Act §43(a))",
      "High-risk superlative scanner with safe-harbor rewrites",
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
    description: "Governs registered brand sources, approves guideline gap clarifications based on recurring trends, and authorizes 1-click multi-channel dispatch across connected channels.",
    primaryView: "registry",
    permissionsSummary: "Executive authority: manage truth registry records, approve guideline updates, and dispatch.",
    badgeTone: "mint",
    coreCapabilities: [
      "Add, version, and scope official brand truth records",
      "Approve guideline updates identified by the Guideline-Gap Detector",
      "Monitor workspace registry coverage (86% active sources)",
      "1-Click Gated Multi-Channel Dispatch across LinkedIn, X, Instagram",
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

export function EnterpriseSingleLogin({
  currentRole,
  onSelectRole,
  compact = false,
  onSuccess,
}: {
  currentRole: ProoflineRole;
  onSelectRole: (role: ProoflineRole) => void;
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const personas = useMemo(() => Object.values(demoPersonas), []);
  const activePersona = demoPersonas[currentRole] ?? demoPersonas.legal_reviewer;
  const [emailInput, setEmailInput] = useState(activePersona.email);
  const [passwordInput, setPasswordInput] = useState("••••••••••••••••");
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    const matched = personas.find((p) => p.email.toLowerCase() === cleanEmail);
    if (matched) {
      onSelectRole(matched.role);
      setLoginMessage(`Signed in as ${matched.name} (${matched.title})`);
      onSuccess?.();
    } else {
      onSelectRole("legal_reviewer");
      setLoginMessage(`Signed in as Authorised Reviewer (${cleanEmail})`);
      onSuccess?.();
    }
  };

  const handleQuickLogin = (role: ProoflineRole) => {
    const p = demoPersonas[role];
    setEmailInput(p.email);
    setPasswordInput("••••••••••••••••");
    onSelectRole(role);
    setLoginMessage(`Switched session to ${p.name} (${p.title})`);
    onSuccess?.();
  };

  return (
    <section className={`single-login-container ${compact ? "compact" : ""}`} aria-label="Enterprise workspace single login">
      <div className="single-login-card">
        <div className="single-login-header">
          <div className="single-login-kicker-row">
            <span className="single-login-badge">ENTERPRISE IDENTITY &amp; ACCESS</span>
            <span className="single-login-active-tag">
              ● Currently Active: <strong>{activePersona.name}</strong> ({activePersona.role})
            </span>
          </div>
          <h2 className="single-login-title" id="single-login-modal-title">Sign In to VoltEdge Workspace</h2>
          <p className="single-login-sub">
            Access your role-governed workspace with corporate credentials, or click any account below to sign in instantly with tailored permissions and dashboard views.
          </p>
        </div>

        {/* Standard Corporate Login Form */}
        <form className="single-login-form" onSubmit={handleManualSubmit}>
          <div className="single-login-fields-row">
            <div className="login-field-group">
              <label htmlFor="login-email-input">Corporate Email</label>
              <input
                id="login-email-input"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@voltedge.io"
                className="login-input"
              />
            </div>
            <div className="login-field-group">
              <label htmlFor="login-pwd-input">Password</label>
              <input
                id="login-pwd-input"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="login-input"
              />
            </div>
            <button type="submit" className="login-submit-button">
              Sign In to Workspace →
            </button>
          </div>
          {loginMessage ? (
            <div className="login-success-feedback" role="status">
              ✓ {loginMessage}
            </div>
          ) : null}
        </form>

        {/* Divider */}
        <div className="single-login-divider">
          <span>Or sign in instantly with an enterprise role</span>
        </div>

        {/* Unified 1-Click Role Login Buttons Below Form */}
        <div className="single-login-role-buttons" role="region" aria-label="1-Click Enterprise Role Logins">
          {personas.map((p) => {
            const isActive = currentRole === p.role;
            return (
              <button
                key={p.role}
                type="button"
                className={`single-role-btn ${p.badgeTone} ${isActive ? "active" : ""}`}
                onClick={() => handleQuickLogin(p.role)}
                title={`Sign in as ${p.name} (${p.title})`}
                aria-label={`Sign in as ${p.name} (${p.title})`}
              >
                <div className={`single-role-avatar ${p.badgeTone}`}>{p.initials}</div>
                <div className="single-role-info">
                  <div className="single-role-top">
                    <span className="single-role-name">{p.name}</span>
                    <span className="single-role-tag">{p.title}</span>
                  </div>
                  <div className="single-role-email">{p.email}</div>
                  <div className="single-role-focus">
                    <strong>Focus:</strong> {p.focus}
                  </div>
                </div>
                <div className="single-role-action">
                  {isActive ? (
                    <span className="active-pill">✓ Active Session</span>
                  ) : (
                    <span className="login-arrow">Launch as {p.name.split(" ")[0]} →</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Backward-compatible alias for existing views
export const RoleDashboardShowcase = EnterpriseSingleLogin;

export function ActiveRoleWorkflowBanner({
  currentRole,
  onOpenSwitchRole,
  onOpenCreatorStudio,
}: {
  currentRole: ProoflineRole;
  onOpenSwitchRole: () => void;
  onOpenCreatorStudio?: () => void;
}) {
  const persona = demoPersonas[currentRole] ?? demoPersonas.legal_reviewer;

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
          title="Switch account / enterprise role"
        >
          ⇄ Switch Account / Role
        </button>
      </div>
    </div>
  );
}

export function SingleLoginModal({
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
        className="modal-card single-login-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="single-login-modal-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close login dialog"
          onClick={onClose}
        >
          ×
        </button>

        <EnterpriseSingleLogin
          currentRole={currentRole}
          onSelectRole={(role) => {
            onSelectRole(role);
            onClose();
          }}
          compact
          onSuccess={onClose}
        />
      </section>
    </div>
  );
}

// Backward-compatible alias for existing views
export const DemoRoleModal = SingleLoginModal;
