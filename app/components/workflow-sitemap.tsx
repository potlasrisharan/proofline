"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProoflineRole } from "../lib/proofline-api";
import { demoPersonas } from "./role-dashboard-showcase";

export type WorkflowStageId = "stage-01" | "stage-02" | "stage-03" | "stage-04";

export interface WorkflowModule {
  id: string;
  code: string;
  name: string;
  stage: WorkflowStageId;
  stageName: string;
  ownerRole: string;
  ownerPersona: string;
  statusText: string;
  statusVariant: "green" | "blue" | "amber" | "purple";
  badge: string;
  description: string;
  routeHref?: string;
  actionType?: "navigate" | "studio" | "start-review" | "portal" | "external" | "actionTarget" | "dispatchModal";
  actionTarget?: string;
  keyOutputs: string[];
}

export const WORKFLOW_MODULES: WorkflowModule[] = [
  // STAGE 01: TRUTH FOUNDATION & INGESTION
  {
    id: "dynamic-sync",
    code: "MOD 01",
    name: "Live Document Sync",
    stage: "stage-01",
    stageName: "Stage 01 · Approved Facts & Specs",
    ownerRole: "Fact Owner & Brand Lead",
    ownerPersona: "Carlos Mendez & Lena Ortiz",
    statusText: "CONNECTED · NOTION & DOCS",
    statusVariant: "green",
    badge: "INPUT",
    description: "Automatically syncs product specs from Notion workspaces, Google Docs, and Shopify inventory into approved facts.",
    routeHref: "/sync",
    actionType: "navigate",
    actionTarget: "/sync",
    keyOutputs: ["Live Notion Specs", "Google Docs Policies", "Inventory & Pricing"],
  },
  {
    id: "truth-registry",
    code: "MOD 02",
    name: "Approved Fact Registry",
    stage: "stage-01",
    stageName: "Stage 01 · Approved Facts & Specs",
    ownerRole: "Brand Owner",
    ownerPersona: "Lena Ortiz",
    statusText: "APPROVED · VERSIONED",
    statusVariant: "blue",
    badge: "OFFICIAL FACTS",
    description: "The official catalog of product specifications, verified battery benchmarks, pricing rules, and offer dates.",
    routeHref: "/#registry",
    actionType: "actionTarget",
    actionTarget: "registry",
    keyOutputs: ["12h Battery Benchmark", "Official Specs", "Offer Expiry Dates"],
  },
  {
    id: "impact-radar",
    code: "MOD 03",
    name: "Spec Change Radar",
    stage: "stage-01",
    stageName: "Stage 01 · Approved Facts & Specs",
    ownerRole: "Team Governance",
    ownerPersona: "All Team Roles",
    statusText: "ACTIVE · 3 AFFECTED DRAFTS",
    statusVariant: "amber",
    badge: "SPEC UPDATES",
    description: "Detects when a product spec updates (e.g. 12h → 14h) and shows every draft or ad that needs to be updated.",
    routeHref: "/impact",
    actionType: "navigate",
    actionTarget: "/impact",
    keyOutputs: ["Affected Drafts List", "1-Click Re-Check", "Instant Update Alerts"],
  },

  // STAGE 02: CONTENT CREATION & MULTIMODAL CAPTURE
  {
    id: "creator-studio",
    code: "MOD 04",
    name: "Creator Writing Studio",
    stage: "stage-02",
    stageName: "Stage 02 · Drafting & Visual Checks",
    ownerRole: "Content Creator Lead",
    ownerPersona: "Aisha Rahman",
    statusText: "READY · INSTANT AI CHECKS",
    statusVariant: "green",
    badge: "WRITING STUDIO",
    description: "Write marketing copy with real-time fact checks, 1-click fixes for wrong claims, and a readiness score.",
    routeHref: "/submit",
    actionType: "studio",
    actionTarget: "studio",
    keyOutputs: ["Instant Fact Checks", "1-Click Fixes (20h → 12h)", "Readiness Score"],
  },
  {
    id: "indic-engine",
    code: "MOD 05",
    name: "Multi-Language Checks",
    stage: "stage-02",
    stageName: "Stage 02 · Drafting & Visual Checks",
    ownerRole: "Regional Marketing Lead",
    ownerPersona: "Aisha Rahman",
    statusText: "ONLINE · SARVAM AI",
    statusVariant: "purple",
    badge: "HINDI & TELUGU",
    description: "Ensures Hindi and Telugu translations preserve exact battery hours and technical specs using Sarvam AI.",
    routeHref: "/submit",
    actionType: "studio",
    actionTarget: "studio",
    keyOutputs: ["Accurate Hindi Specs", "Accurate Telugu Specs", "Zero Spec Distortion"],
  },
  {
    id: "multimodal-radar",
    code: "MOD 06",
    name: "Video & Visual Scanner",
    stage: "stage-02",
    stageName: "Stage 02 · Drafting & Visual Checks",
    ownerRole: "Creative & Video Lead",
    ownerPersona: "Aisha Rahman & Marcus Vance",
    statusText: "ACTIVE · VISUAL OCR",
    statusVariant: "blue",
    badge: "VIDEO & CAROUSEL",
    description: "Scans video frames (Reels/Shorts) and image carousels to verify on-screen claims and readable disclaimer fonts.",
    routeHref: "/multimodal",
    actionType: "navigate",
    actionTarget: "/multimodal",
    keyOutputs: ["Video Frame Scanner", "Readable Disclaimer Test", "1-Click Visual Fixes"],
  },

  // STAGE 03: DETERMINISTIC & LEGAL AUDIT GATE
  {
    id: "review-queue",
    code: "MOD 07",
    name: "Campaign Review Queue",
    stage: "stage-03",
    stageName: "Stage 03 · Review & Legal Quality Gate",
    ownerRole: "Editorial Manager",
    ownerPersona: "Marcus Vance",
    statusText: "LIVE QUEUE · 4 CAMPAIGNS",
    statusVariant: "amber",
    badge: "REVIEW QUEUE",
    description: "Organizes submissions by risk level, flags unverified claims, and lets editors assign reviews.",
    routeHref: "/#reviews",
    actionType: "actionTarget",
    actionTarget: "reviews",
    keyOutputs: ["Numbered Claim Flags", "Risk-Sorted Queue", "Source Evidence Links"],
  },
  {
    id: "regulatory-gate",
    code: "MOD 08",
    name: "Advertising & Legal Gate",
    stage: "stage-03",
    stageName: "Stage 03 · Review & Legal Quality Gate",
    ownerRole: "Authorised Legal Reviewer",
    ownerPersona: "Maya Chen",
    statusText: "ACTIVE · AD STANDARDS",
    statusVariant: "green",
    badge: "LEGAL & RULES",
    description: "Checks claims against FTC advertising rules, catches unverified superlatives ('most reliable'), and suggests safe rewrites.",
    routeHref: "/findings",
    actionType: "navigate",
    actionTarget: "/findings",
    keyOutputs: ["Truth in Advertising Check", "Unproven Hype Scanner", "Safe-Harbor Rewrites"],
  },
  {
    id: "audit-trail",
    code: "MOD 09",
    name: "Team Revision History",
    stage: "stage-03",
    stageName: "Stage 03 · Review & Legal Quality Gate",
    ownerRole: "Team & Legal Ops",
    ownerPersona: "All Stakeholders",
    statusText: "COMPLETE · SIDE-BY-SIDE",
    statusVariant: "blue",
    badge: "VERSION HISTORY",
    description: "Keeps a side-by-side history of every edit, comment, and sign-off so teams stay aligned.",
    routeHref: "/#audit-log",
    actionType: "actionTarget",
    actionTarget: "audit-log",
    keyOutputs: ["Side-by-Side Comparison", "Reviewer Comments", "Complete Change History"],
  },

  // STAGE 04: GOVERNANCE, DISPATCH & CONTINUOUS RADAR
  {
    id: "role-portal",
    code: "MOD 10",
    name: "Dedicated Role Workspaces",
    stage: "stage-04",
    stageName: "Stage 04 · Approvals, Publishing & Monitoring",
    ownerRole: "Team Admin",
    ownerPersona: "5 Verified Personas",
    statusText: "ENFORCED · 5 ROLES",
    statusVariant: "green",
    badge: "TEAM WORKSPACES",
    description: "Custom workspaces for Writers, Editors, Legal Reviewers, Brand Leads, and External Partners.",
    routeHref: "/dashboards",
    actionType: "navigate",
    actionTarget: "/dashboards",
    keyOutputs: ["5 Specialized Dashboards", "Role-Based Access", "No Unauthorized Approvals"],
  },
  {
    id: "gated-dispatch",
    code: "MOD 11",
    name: "Safe Multi-Channel Publishing",
    stage: "stage-04",
    stageName: "Stage 04 · Approvals, Publishing & Monitoring",
    ownerRole: "Authorized Reviewer",
    ownerPersona: "Maya Chen",
    statusText: "LIVE GATEWAY · ZERNIO",
    statusVariant: "purple",
    badge: "PUBLISH GATE",
    description: "Publishes approved posts to LinkedIn, X (Twitter), Meta, and Instagram with 1 click.",
    routeHref: "/#dispatch",
    actionType: "dispatchModal",
    actionTarget: "dispatch",
    keyOutputs: ["Publish to LinkedIn, X, Meta", "Approval Verification Check", "Delivery Confirmation"],
  },
  {
    id: "drift-radar",
    code: "MOD 12",
    name: "Live Post Monitor",
    stage: "stage-04",
    stageName: "Stage 04 · Approvals, Publishing & Monitoring",
    ownerRole: "Continuous Compliance",
    ownerPersona: "Marcus Vance & Maya Chen",
    statusText: "LIVE MONITOR · 24/7",
    statusVariant: "amber",
    badge: "POST MONITOR",
    description: "Monitors published posts 24/7 and alerts you if an expired promotion or changed spec makes a live post outdated.",
    routeHref: "/drift",
    actionType: "navigate",
    actionTarget: "/drift",
    keyOutputs: ["24/7 Live Monitoring", "1-Click Clarification Posts", "Quick Takedown Action"],
  },
  {
    id: "proof-vault",
    code: "MOD 13",
    name: "Compliance Proof Vault",
    stage: "stage-04",
    stageName: "Stage 04 · Approvals, Publishing & Monitoring",
    ownerRole: "Legal Counsel & Auditors",
    ownerPersona: "Maya Chen & Lena Ortiz",
    statusText: "PERMANENT · TAMPER-PROOF",
    statusVariant: "blue",
    badge: "APPROVAL ARCHIVE",
    description: "Stores a permanent, tamper-evident record of all approvals, ready to export for legal audits.",
    routeHref: "/vault",
    actionType: "navigate",
    actionTarget: "/vault",
    keyOutputs: ["Verified Approval History", "Downloadable Report (ZIP)", "Audit-Ready Records"],
  },
];

export const WORKFLOW_STAGES = [
  {
    id: "stage-01" as WorkflowStageId,
    num: "01",
    label: "STAGE 01 · APPROVED SPECS",
    sub: "Approved Facts & Specs",
    description: "Connects official product facts and specs from Notion, Google Docs & Shopify.",
    role: "Fact & Brand Owners",
    color: "#0066FF",
    count: 3,
  },
  {
    id: "stage-02" as WorkflowStageId,
    num: "02",
    label: "STAGE 02 · DRAFTING & VIDEO",
    sub: "Drafting & Visual Checks",
    description: "Creator studio with instant fact checking, multi-language support, and video reel scanning.",
    role: "Content Creators & Designers",
    color: "#22C55E",
    count: 3,
  },
  {
    id: "stage-03" as WorkflowStageId,
    num: "03",
    label: "STAGE 03 · REVIEW & QUALITY GATE",
    sub: "Fact Checks & Approvals",
    description: "Side-by-side draft reviews, advertising truth rules, and 1-click fixes.",
    role: "Managers & Legal Reviewers",
    color: "#F59E0B",
    count: 3,
  },
  {
    id: "stage-04" as WorkflowStageId,
    num: "04",
    label: "STAGE 04 · PUBLISHING & MONITORING",
    sub: "Publishing & Live Alerts",
    description: "1-click social posting, 24/7 post monitoring, and permanent approval records.",
    role: "Authorised Signers & Counsel",
    color: "#8B5CF6",
    count: 3,
  },
];

interface ProductWorkflowSitemapProps {
  onNavigateView: (view: "reviews" | "registry" | "audit-log" | "insights") => void;
  onOpenCreatorStudio: () => void;
  onOpenStartReview: () => void;
  onOpenDispatchModal?: () => void;
  onOpenIndicModal?: () => void;
  onOpenCertificateModal?: () => void;
  registryCount?: number;
  queueCount?: number;
  auditCount?: number;
  currentRole?: ProoflineRole;
}

export function ProductWorkflowSitemap({
  onNavigateView,
  onOpenCreatorStudio,
  onOpenStartReview,
  onOpenDispatchModal,
  onOpenIndicModal,
  onOpenCertificateModal,
  registryCount = 5,
  queueCount = 4,
  auditCount = 12,
  currentRole = "legal_reviewer",
}: ProductWorkflowSitemapProps) {
  const router = useRouter();
  const [activeStageFilter, setActiveStageFilter] = useState<WorkflowStageId | "all">("all");
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState<string>("all");
  const [driftCountdown, setDriftCountdown] = useState(58);

  useEffect(() => {
    const timer = setInterval(() => {
      setDriftCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activePersona = demoPersonas[currentRole] ?? demoPersonas.legal_reviewer;

  const dynamicModules = useMemo(() => {
    return WORKFLOW_MODULES.map((m) => {
      if (m.id === "truth-registry") {
        return {
          ...m,
          statusText: `IMMUTABLE · ${registryCount} SOURCES`,
        };
      }
      if (m.id === "review-queue") {
        return {
          ...m,
          statusText: `LIVE QUEUE · ${queueCount} CAMPAIGNS`,
        };
      }
      if (m.id === "audit-trail") {
        return {
          ...m,
          statusText: `IMMUTABLE · ${auditCount} EVENTS`,
        };
      }
      if (m.id === "role-portal") {
        return {
          ...m,
          statusText: `ACTIVE IDENTITY · ${activePersona.name.toUpperCase()}`,
          ownerPersona: `${activePersona.name} (${activePersona.title})`,
        };
      }
      if (m.id === "drift-radar") {
        return {
          ...m,
          statusText: `HEARTBEAT · ${driftCountdown}s INTERVAL`,
        };
      }
      return m;
    });
  }, [registryCount, queueCount, auditCount, activePersona, driftCountdown]);

  const filteredModules = useMemo(() => {
    return dynamicModules.filter((mod) => {
      if (activeStageFilter !== "all" && mod.stage !== activeStageFilter) {
        return false;
      }
      if (selectedPersonaFilter !== "all") {
        if (!mod.ownerPersona.toLowerCase().includes(selectedPersonaFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [dynamicModules, activeStageFilter, selectedPersonaFilter]);

  const vaultModule = useMemo(() => {
    return dynamicModules.find((m) => m.id === "proof-vault");
  }, [dynamicModules]);

  const handleModuleAction = (mod: WorkflowModule) => {
    if (mod.id === "indic-engine" && onOpenIndicModal) {
      onOpenIndicModal();
    } else if (mod.id === "proof-vault") {
      onNavigateView("audit-log");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (mod.actionType === "studio") {
      onOpenCreatorStudio();
    } else if (mod.actionType === "start-review") {
      onOpenStartReview();
    } else if (mod.actionType === "dispatchModal" && onOpenDispatchModal) {
      onOpenDispatchModal();
    } else if (mod.actionType === "actionTarget" && mod.actionTarget) {
      if (
        mod.actionTarget === "reviews" ||
        mod.actionTarget === "registry" ||
        mod.actionTarget === "audit-log" ||
        mod.actionTarget === "insights"
      ) {
        onNavigateView(mod.actionTarget);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (mod.routeHref) {
      router.push(mod.routeHref);
    }
  };

  return (
    <section id="workflow-sitemap" className="industrial-sitemap-section" aria-labelledby="sitemap-heading">
      {/* 1. Header Bar */}
      <div className="industrial-sitemap-header">
        <div>
          <div className="sitemap-eyebrow-row">
            <span className="industrial-status-pulse" />
            <span className="industrial-mono-10">01 // PRODUCT WORKFLOW OVERVIEW</span>
          </div>
          <h2 id="sitemap-heading" className="sitemap-main-title">
            How Proofline Works (The 4-Stage Workflow)
          </h2>
          <p className="sitemap-subtitle">
            Follow your content from first draft to safe publishing. Clear, simple steps for writers, editors, and legal teams.
          </p>
        </div>

        <div className="sitemap-legend-stats">
          <button
            type="button"
            className={`sitemap-stat-pill ${activeStageFilter !== "all" ? "active" : ""}`}
            onClick={() => setActiveStageFilter("all")}
            title="Reset to view all 4 lifecycle stages"
          >
            <span className="stat-num">{activeStageFilter === "all" ? 4 : 1}</span>
            <span className="stat-label">LIFECYCLE STAGES</span>
          </button>
          <div className="sitemap-stat-pill">
            <span className="stat-num">{filteredModules.length}</span>
            <span className="stat-label">
              {activeStageFilter === "all" && selectedPersonaFilter === "all" ? "FEATURE MODULES" : "ACTIVE MODULES"}
            </span>
          </div>
          <div className="sitemap-stat-pill">
            <span className="stat-num">5</span>
            <span className="stat-label">TEAM ROLES</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Pipeline Flow Ribbon */}
      <div className="sitemap-pipeline-flow" role="toolbar" aria-label="Interactive pipeline stage filters">
        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-01" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-01" ? "all" : "stage-01"))}
          aria-pressed={activeStageFilter === "stage-01"}
          title="Filter to Stage 01 · Approved Specs"
        >
          <div className="flow-badge">STEP 01</div>
          <span className="flow-title">Approved Specs</span>
          <span className="flow-sub">Notion, Docs &amp; Store</span>
        </button>
        <div className="flow-arrow" aria-hidden="true">⟶</div>

        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-02" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-02" ? "all" : "stage-02"))}
          aria-pressed={activeStageFilter === "stage-02"}
          title="Filter to Stage 02 · Writing & Video"
        >
          <div className="flow-badge">STEP 02</div>
          <span className="flow-title">Writing &amp; Video</span>
          <span className="flow-sub">Instant Check &amp; OCR</span>
        </button>
        <div className="flow-arrow" aria-hidden="true">⟶</div>

        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-03" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-03" ? "all" : "stage-03"))}
          aria-pressed={activeStageFilter === "stage-03"}
          title="Filter to Stage 03 · Review & Quality"
        >
          <div className="flow-badge">STEP 03</div>
          <span className="flow-title">Review &amp; Quality</span>
          <span className="flow-sub">Fact Check &amp; Approvals</span>
        </button>
        <div className="flow-arrow" aria-hidden="true">⟶</div>

        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-04" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-04" ? "all" : "stage-04"))}
          aria-pressed={activeStageFilter === "stage-04"}
          title="Filter to Stage 04 · Publish & Monitor"
        >
          <div className="flow-badge">STEP 04</div>
          <span className="flow-title">Publish &amp; Monitor</span>
          <span className="flow-sub">Social Post &amp; 24/7 Alerts</span>
        </button>
      </div>

      {/* 3. Stage & Persona Filter Bar */}
      <div className="sitemap-controls-bar">
        <div className="sitemap-filter-tabs">
          <button
            type="button"
            className={`sitemap-tab-btn ${activeStageFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveStageFilter("all")}
          >
            All 4 Stages (End-to-End)
          </button>
          {WORKFLOW_STAGES.map((st) => (
            <button
              key={st.id}
              type="button"
              className={`sitemap-tab-btn ${activeStageFilter === st.id ? "active" : ""}`}
              onClick={() => setActiveStageFilter(st.id)}
            >
              {st.label} ({st.count})
            </button>
          ))}
        </div>

        <div className="sitemap-persona-select-wrap">
          <label htmlFor="persona-filter" className="industrial-mono-10-muted" style={{ fontSize: 9 }}>
            FILTER BY PERSONA:
          </label>
          <select
            id="persona-filter"
            className="sitemap-persona-select"
            value={selectedPersonaFilter}
            onChange={(e) => setSelectedPersonaFilter(e.target.value)}
          >
            <option value="all">All Personas (Full Organization)</option>
            <option value="Aisha">Aisha Rahman · Content Creator Lead</option>
            <option value="Marcus">Marcus Vance · Editorial Manager</option>
            <option value="Maya">Maya Chen · Authorised Legal Reviewer</option>
            <option value="Lena">Lena Ortiz · Brand Owner</option>
            <option value="Carlos">Carlos Mendez · Fact Owner</option>
          </select>
        </div>
      </div>

      {/* 4. 4-Stage Architecture Grid (3 Cards Per Column = Perfect Symmetry) */}
      <div className="sitemap-stages-grid">
        {WORKFLOW_STAGES.filter((st) => activeStageFilter === "all" || activeStageFilter === st.id).map((st) => {
          const stageModules = filteredModules.filter((m) => m.stage === st.id && m.id !== "proof-vault");
          if (stageModules.length === 0 && selectedPersonaFilter !== "all") return null;

          return (
            <div key={st.id} className="sitemap-stage-column">
              {/* Stage Header */}
              <div className="stage-column-header">
                <div className="stage-header-top">
                  <span className="stage-code-pill" style={{ borderColor: st.color, color: st.color }}>
                    {st.num}
                  </span>
                  <span className="stage-role-tag">{st.role}</span>
                </div>
                <h3 className="stage-title">{st.label.split("·")[1]?.trim() || st.label}</h3>
                <p className="stage-desc">{st.description}</p>
              </div>

              {/* Module Cards */}
              <div className="stage-modules-stack">
                {stageModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="sitemap-module-card"
                    onClick={() => handleModuleAction(mod)}
                    style={{ cursor: "pointer" }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleModuleAction(mod);
                      }
                    }}
                  >
                    <div className="module-card-header">
                      <div className="module-id-group">
                        <span className="module-code">{mod.code}</span>
                        <span className={`module-status-pill status-${mod.statusVariant}`}>
                          <span className="status-dot" />
                          {mod.statusText}
                        </span>
                      </div>
                      <span className="module-badge-kicker">{mod.badge}</span>
                    </div>

                    <h4 className="module-name">{mod.name}</h4>
                    <p className="module-desc">{mod.description}</p>

                    <div className="module-outputs-list">
                      <span className="outputs-label">KEY CAPABILITIES:</span>
                      <div className="outputs-chips">
                        {mod.keyOutputs.map((out, i) => (
                          <span key={i} className="output-chip">
                            ✓ {out}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="module-card-footer">
                      <div className="module-owner-info">
                        <span className="owner-persona">{mod.ownerPersona}</span>
                        <span className="owner-role-title">{mod.ownerRole}</span>
                      </div>

                      <button
                        type="button"
                        className="module-launch-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleAction(mod);
                        }}
                        title={`Open ${mod.name}`}
                      >
                        Launch Module →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4b. Foundational Proof Vault (Organized Full-Width Panoramic Layer) */}
      {vaultModule && (activeStageFilter === "all" || activeStageFilter === "stage-04") ? (
        <div
          className="sitemap-vault-banner"
          role="region"
          aria-label="Proof Vault & Audit Trail Foundation"
        >
          <div className="sitemap-vault-left">
            <div className="sitemap-vault-header-row">
              <span className="module-code">{vaultModule.code}</span>
              <span className="module-status-pill status-blue">
                <span className="status-dot" />
                {vaultModule.statusText}
              </span>
              <span className="module-badge-kicker">ENTERPRISE FOUNDATION LAYER · PROVENANCE</span>
            </div>
            <h3 className="sitemap-vault-title">{vaultModule.name}</h3>
            <p className="sitemap-vault-desc">{vaultModule.description}</p>
            <div className="sitemap-vault-owner">
              <span className="owner-persona">{vaultModule.ownerPersona}</span>
              <span className="owner-role-title">· {vaultModule.ownerRole}</span>
            </div>
          </div>

          <div className="sitemap-vault-outputs">
            <span className="outputs-label">IMMUTABLE CAPABILITIES:</span>
            <div className="sitemap-vault-chips">
              {vaultModule.keyOutputs.map((out, i) => (
                <span key={i} className="output-chip">
                  ✓ {out}
                </span>
              ))}
            </div>
          </div>

          <div className="sitemap-vault-actions">
            <button
              type="button"
              className="module-launch-btn"
              onClick={() => handleModuleAction(vaultModule)}
              title="Open Proof Vault & Audit Ledger"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Launch Proof Vault (/vault) →
            </button>
            {onOpenCertificateModal ? (
              <button
                type="button"
                className="industrial-ghost-btn"
                style={{ padding: "8px 14px", fontSize: 10, width: "100%", justifyContent: "center" }}
                onClick={onOpenCertificateModal}
                title="Inspect Tamper-Proof Audit Certificate"
              >
                📜 Inspect Certificate
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 5. Sitemap Quick Jump Anchors */}
      <div className="sitemap-quick-anchors-bar">
        <span className="industrial-mono-10-muted" style={{ fontSize: 9 }}>DIRECT WORKFLOW JUMP:</span>
        <div className="quick-anchors-list">
          <Link href="/sync" className="sitemap-anchor-link">01 / Dynamic Truth Sync</Link>
          <span className="anchor-sep">·</span>
          <button type="button" onClick={() => onNavigateView("registry")} className="sitemap-anchor-btn">02 / Truth Registry</button>
          <span className="anchor-sep">·</span>
          <Link href="/impact" className="sitemap-anchor-link">03 / Blast Radius Tracing</Link>
          <span className="anchor-sep">·</span>
          <button type="button" onClick={onOpenCreatorStudio} className="sitemap-anchor-btn">04 / Creator Studio</button>
          <span className="anchor-sep">·</span>
          {onOpenIndicModal ? (
            <>
              <button type="button" onClick={onOpenIndicModal} className="sitemap-anchor-btn">05 / Indic Localization</button>
              <span className="anchor-sep">·</span>
            </>
          ) : null}
          <Link href="/multimodal" className="sitemap-anchor-link">06 / Multimodal Video</Link>
          <span className="anchor-sep">·</span>
          <button type="button" onClick={() => onNavigateView("reviews")} className="sitemap-anchor-btn">07 / Review Queue</button>
          <span className="anchor-sep">·</span>
          <Link href="/findings" className="sitemap-anchor-link">08 / Regulatory Gate</Link>
          <span className="anchor-sep">·</span>
          <button type="button" onClick={() => onNavigateView("audit-log")} className="sitemap-anchor-btn">09 / Revision Ledger</button>
          <span className="anchor-sep">·</span>
          <Link href="/portal" className="sitemap-anchor-link">10 / Enterprise Portal</Link>
          <span className="anchor-sep">·</span>
          {onOpenDispatchModal ? (
            <>
              <button type="button" onClick={onOpenDispatchModal} className="sitemap-anchor-btn">11 / Gated Dispatch</button>
              <span className="anchor-sep">·</span>
            </>
          ) : null}
          <Link href="/drift" className="sitemap-anchor-link">12 / Drift Radar</Link>
          <span className="anchor-sep">·</span>
          <Link href="/vault" className="sitemap-anchor-link">13 / Proof Vault</Link>
        </div>
      </div>
    </section>
  );
}
