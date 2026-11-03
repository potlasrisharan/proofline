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
    name: "Dynamic Brand Truth Sync",
    stage: "stage-01",
    stageName: "Stage 01 · Ingestion & Truth",
    ownerRole: "Fact Owner & Brand Lead",
    ownerPersona: "Carlos Mendez & Lena Ortiz",
    statusText: "CONNECTED · NOTION & DOCS",
    statusVariant: "green",
    badge: "INPUT LAYER",
    description: "Ingests and synchronizes live corporate documentation from Notion workspaces, Google Docs, and Shopify ERP into immutable truth records.",
    routeHref: "/sync",
    actionType: "navigate",
    actionTarget: "/sync",
    keyOutputs: ["Live Notion Blocks", "Google Docs Clauses", "ERP Inventory Tiers"],
  },
  {
    id: "truth-registry",
    code: "MOD 02",
    name: "Brand Truth Registry",
    stage: "stage-01",
    stageName: "Stage 01 · Ingestion & Truth",
    ownerRole: "Brand Owner",
    ownerPersona: "Lena Ortiz",
    statusText: "IMMUTABLE · VERSIONED",
    statusVariant: "blue",
    badge: "SPEC LEDGER",
    description: "The authoritative repository of versioned product specifications, 12h battery benchmarks, approved qualifiers, and validity windows.",
    routeHref: "/#registry",
    actionType: "actionTarget",
    actionTarget: "registry",
    keyOutputs: ["12h Battery Benchmarks", "IEEE Standard Hashes", "Validity Expiry Windows"],
  },
  {
    id: "impact-radar",
    code: "MOD 03",
    name: "Fact-Change Impact Radar",
    stage: "stage-01",
    stageName: "Stage 01 · Ingestion & Truth",
    ownerRole: "Enterprise Governance",
    ownerPersona: "All Stakeholders",
    statusText: "ACTIVE · 3 DOWNSTREAM DRIFTS",
    statusVariant: "amber",
    badge: "DEPENDENCY ENGINE",
    description: "Monitors specification revisions (e.g. 12h → 14h) and automatically traces and flags all marketing collateral affected downstream.",
    routeHref: "/impact",
    actionType: "navigate",
    actionTarget: "/impact",
    keyOutputs: ["Blast Radius Tracing", "Affected Draft Flagger", "1-Click Bulk Re-Audit"],
  },

  // STAGE 02: CONTENT CREATION & MULTIMODAL CAPTURE
  {
    id: "creator-studio",
    code: "MOD 04",
    name: "Creator Content Studio",
    stage: "stage-02",
    stageName: "Stage 02 · Creation & Vision",
    ownerRole: "Content Creator Lead",
    ownerPersona: "Aisha Rahman",
    statusText: "READY · GROQ & GEMINI",
    statusVariant: "green",
    badge: "PRE-FLIGHT DRAFT",
    description: "Authoring studio with real-time claim-diffing, 1-click lab spec replacement (e.g. 20h → 12h), and pre-submission compliance scores.",
    routeHref: "/submit",
    actionType: "studio",
    actionTarget: "studio",
    keyOutputs: ["Live Spec-Matching", "1-Click 12h Replacement", "100/100 Pre-Flight Score"],
  },
  {
    id: "indic-engine",
    code: "MOD 05",
    name: "Indic Multilingual Engine",
    stage: "stage-02",
    stageName: "Stage 02 · Creation & Vision",
    ownerRole: "Regional Marketing Lead",
    ownerPersona: "Aisha Rahman",
    statusText: "ONLINE · SARVAM AI",
    statusVariant: "purple",
    badge: "REGIONAL LOCALIZATION",
    description: "Guarantees factual integrity in Hindi and Telugu translations via Sarvam AI, ensuring localized claims never exceed technical truth specs.",
    routeHref: "/submit",
    actionType: "studio",
    actionTarget: "studio",
    keyOutputs: ["Sarvam-105b Hindi Translation", "Telugu Nuance Calibration", "Zero-Distortion Guarantee"],
  },
  {
    id: "multimodal-radar",
    code: "MOD 06",
    name: "Multimodal Video & Visual Radar",
    stage: "stage-02",
    stageName: "Stage 02 · Creation & Vision",
    ownerRole: "Creative & Video Lead",
    ownerPersona: "Aisha Rahman & Marcus Vance",
    statusText: "ACTIVE · GEMINI 2.5 FLASH",
    statusVariant: "blue",
    badge: "VIDEO & CAROUSEL",
    description: "Frame-by-frame multimodal OCR verifying claim truth in Instagram Reels, TikTok shorts, and carousels, with FTC mandatory font ratio calculation (≥ 2.5%).",
    routeHref: "/multimodal",
    actionType: "navigate",
    actionTarget: "/multimodal",
    keyOutputs: ["Frame Scrubber OCR", "FTC 2.5% Font Ratio Gauge", "1-Click Visual Remediation"],
  },

  // STAGE 03: DETERMINISTIC & LEGAL AUDIT GATE
  {
    id: "review-queue",
    code: "MOD 07",
    name: "Campaign Review Queue & Triage",
    stage: "stage-03",
    stageName: "Stage 03 · Quality Gate",
    ownerRole: "Editorial Manager",
    ownerPersona: "Marcus Vance",
    statusText: "LIVE QUEUE · 4 CAMPAIGNS",
    statusVariant: "amber",
    badge: "TRIAGE WORKBENCH",
    description: "Triages marketing submissions by risk score, inspects evidence-or-abstain span flags, and manages cross-functional reviewer assignment.",
    routeHref: "/#reviews",
    actionType: "actionTarget",
    actionTarget: "reviews",
    keyOutputs: ["Span-Level Citations", "Risk-Scored Queue", "Evidence-or-Abstain Flags"],
  },
  {
    id: "regulatory-gate",
    code: "MOD 08",
    name: "Regulatory Quality Gate",
    stage: "stage-03",
    stageName: "Stage 03 · Quality Gate",
    ownerRole: "Authorised Legal Reviewer",
    ownerPersona: "Maya Chen",
    statusText: "LOCKED · STATUTORY STANDARD",
    statusVariant: "green",
    badge: "STATUTORY COMPLIANCE",
    description: "Audits claims for FTC § 5 deceptive marketing, Lanham Act § 43(a) false advertising, and FTC 16 CFR § 255 influencer endorsement disclosures.",
    routeHref: "/findings",
    actionType: "navigate",
    actionTarget: "/findings",
    keyOutputs: ["FTC § 5 Deceptive Check", "Lanham Act Benchmark Audit", "Statutory Safe-Harbor Rewrites"],
  },
  {
    id: "audit-trail",
    code: "MOD 09",
    name: "Collaborative Revision Ledger",
    stage: "stage-03",
    stageName: "Stage 03 · Quality Gate",
    ownerRole: "Compliance & Governance",
    ownerPersona: "All Stakeholders",
    statusText: "IMMUTABLE · REDLINE DIFF",
    statusVariant: "blue",
    badge: "DECISION LINEAGE",
    description: "Retains full side-by-side revision history, span-level annotations, reviewer comments, and cryptographic actor sign-offs.",
    routeHref: "/#audit-log",
    actionType: "actionTarget",
    actionTarget: "audit-log",
    keyOutputs: ["Side-by-Side Redline Diff", "Span-Level Comment Threads", "Auditable Change Requests"],
  },

  // STAGE 04: GOVERNANCE, DISPATCH & CONTINUOUS RADAR
  {
    id: "role-portal",
    code: "MOD 10",
    name: "Enterprise Multi-Role Governance",
    stage: "stage-04",
    stageName: "Stage 04 · Dispatch & Ledger",
    ownerRole: "Enterprise Admin",
    ownerPersona: "5 Verified Personas",
    statusText: "ENFORCED · LEAST PRIVILEGE",
    statusVariant: "green",
    badge: "ACCESS CONTROL",
    description: "Strict deterministic role-based boundaries with 5 distinct stakeholder portals: Content Lead, Editorial Manager, Legal Counsel, Brand Owner, Fact Owner.",
    routeHref: "/portal",
    actionType: "navigate",
    actionTarget: "/portal",
    keyOutputs: ["5 Specialized Dashboards", "Role Privilege Scoping", "Zero Unauthorized Approvals"],
  },
  {
    id: "gated-dispatch",
    code: "MOD 11",
    name: "Gated Multi-Platform Dispatch",
    stage: "stage-04",
    stageName: "Stage 04 · Dispatch & Ledger",
    ownerRole: "Authorized Reviewer",
    ownerPersona: "Maya Chen",
    statusText: "LIVE GATEWAY · ZERNIO",
    statusVariant: "purple",
    badge: "OUTPUT GATE",
    description: "Dispatches approved revisions across LinkedIn, X (Twitter), Meta, and Facebook via Zernio multi-channel API with cryptographic verification tokens.",
    routeHref: "/#dispatch",
    actionType: "dispatchModal",
    actionTarget: "dispatch",
    keyOutputs: ["Multi-Channel Push (LinkedIn, X, Meta)", "Gated Sign-Off Check", "Receipt Payload Hashes"],
  },
  {
    id: "drift-radar",
    code: "MOD 12",
    name: "Post-Publish Drift Radar",
    stage: "stage-04",
    stageName: "Stage 04 · Dispatch & Ledger",
    ownerRole: "Continuous Compliance",
    ownerPersona: "Marcus Vance & Maya Chen",
    statusText: "HEARTBEAT · 60s INTERVAL",
    statusVariant: "amber",
    badge: "POST-PUBLISH MONITOR",
    description: "Actively monitors live published social posts, instantly raising drift alerts if an expired claim or revised specification makes a live post legally non-compliant.",
    routeHref: "/drift",
    actionType: "navigate",
    actionTarget: "/drift",
    keyOutputs: ["60s Background Heartbeat", "1-Click Clarification Tweets", "Emergency Post Takedown"],
  },
  {
    id: "proof-vault",
    code: "MOD 13",
    name: "Cryptographic Proof Vault",
    stage: "stage-04",
    stageName: "Stage 04 · Dispatch & Ledger",
    ownerRole: "Legal Counsel & Auditors",
    ownerPersona: "Maya Chen & Lena Ortiz",
    statusText: "ENCRYPTED · SHA-256 LEDGER",
    statusVariant: "blue",
    badge: "COURT-READY PROVENANCE",
    description: "Permanent vault maintaining SHA-256 hash chains of every source, rule, edit, and sign-off. Exports court-ready compliance verification packages.",
    routeHref: "/vault",
    actionType: "navigate",
    actionTarget: "/vault",
    keyOutputs: ["SHA-256 Hash Verification", "Tamper-Evident ZIP Export", "Court-Admissible Evidence"],
  },
];

export const WORKFLOW_STAGES = [
  {
    id: "stage-01" as WorkflowStageId,
    num: "01",
    label: "STAGE 01 · TRUTH INGESTION",
    sub: "Source Grounding & Specs",
    description: "Ingests raw benchmarks from Notion, Docs & ERP into versioned specifications.",
    role: "Fact & Brand Owners",
    color: "#0066FF",
    count: 3,
  },
  {
    id: "stage-02" as WorkflowStageId,
    num: "02",
    label: "STAGE 02 · CREATION & VISION",
    sub: "Drafting & Multimodal Radar",
    description: "Pre-flight creator studio with 12h battery diffing, Sarvam AI Indic, and Gemini frame OCR.",
    role: "Content Creators & Designers",
    color: "#22C55E",
    count: 3,
  },
  {
    id: "stage-03" as WorkflowStageId,
    num: "03",
    label: "STAGE 03 · AUDIT & LEGAL GATE",
    sub: "Deterministic Proof & Revisions",
    description: "Span-level claim audit, FTC §5 statutory checks, and side-by-side redline reviews.",
    role: "Managers & Legal Reviewers",
    color: "#F59E0B",
    count: 3,
  },
  {
    id: "stage-04" as WorkflowStageId,
    num: "04",
    label: "STAGE 04 · DISPATCH & DRIFT",
    sub: "Multi-Channel & Provenance",
    description: "Gated Zernio social publishing, 60s post-publish drift radar, and SHA-256 Proof Vault.",
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
            <span className="industrial-mono-10">01 // PRODUCT ARCHITECTURE &amp; LIFECYCLE SITEMAP</span>
          </div>
          <h2 id="sitemap-heading" className="sitemap-main-title">
            End-to-End Content Governance Workflow
          </h2>
          <p className="sitemap-subtitle">
            Every feature in Proofline has an exact place in the 4-stage lifecycle. No orphaned tools or random placements.
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
              {activeStageFilter === "all" && selectedPersonaFilter === "all" ? "GOVERNANCE MODULES" : "ACTIVE MODULES"}
            </span>
          </div>
          <div className="sitemap-stat-pill">
            <span className="stat-num">5</span>
            <span className="stat-label">ROLE BOUNDARIES</span>
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
          title="Filter to Stage 01 · Truth Ingestion"
        >
          <div className="flow-badge">INPUT 01</div>
          <span className="flow-title">Truth Ingestion</span>
          <span className="flow-sub">Notion, Docs &amp; ERP</span>
        </button>
        <div className="flow-arrow" aria-hidden="true">⟶</div>

        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-02" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-02" ? "all" : "stage-02"))}
          aria-pressed={activeStageFilter === "stage-02"}
          title="Filter to Stage 02 · Creator Studio"
        >
          <div className="flow-badge">CREATION 02</div>
          <span className="flow-title">Creator Studio</span>
          <span className="flow-sub">Spec-Diff &amp; Multimodal</span>
        </button>
        <div className="flow-arrow" aria-hidden="true">⟶</div>

        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-03" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-03" ? "all" : "stage-03"))}
          aria-pressed={activeStageFilter === "stage-03"}
          title="Filter to Stage 03 · Deterministic Audit"
        >
          <div className="flow-badge">QUALITY GATE 03</div>
          <span className="flow-title">Deterministic Audit</span>
          <span className="flow-sub">FTC §5 &amp; Citations</span>
        </button>
        <div className="flow-arrow" aria-hidden="true">⟶</div>

        <button
          type="button"
          className={`flow-step-node ${activeStageFilter === "stage-04" ? "active" : ""}`}
          onClick={() => setActiveStageFilter((prev) => (prev === "stage-04" ? "all" : "stage-04"))}
          aria-pressed={activeStageFilter === "stage-04"}
          title="Filter to Stage 04 · Dispatch &amp; Drift"
        >
          <div className="flow-badge">OUTPUT 04</div>
          <span className="flow-title">Dispatch &amp; Drift</span>
          <span className="flow-sub">Zernio &amp; 60s Radar</span>
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
          aria-label="Cryptographic Proof Vault Foundation"
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
              title="Open Cryptographic Proof Vault & Audit Ledger"
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
                title="Inspect Tamper-Proof Cryptographic Certificate"
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
          <Link href="/multimodal" className="sitemap-anchor-link">05 / Multimodal Video</Link>
          <span className="anchor-sep">·</span>
          <button type="button" onClick={() => onNavigateView("reviews")} className="sitemap-anchor-btn">06 / Review Queue</button>
          <span className="anchor-sep">·</span>
          <Link href="/findings" className="sitemap-anchor-link">07 / Regulatory Gate</Link>
          <span className="anchor-sep">·</span>
          <Link href="/portal" className="sitemap-anchor-link">08 / Enterprise Portal</Link>
          <span className="anchor-sep">·</span>
          <Link href="/drift" className="sitemap-anchor-link">09 / Drift Radar</Link>
          <span className="anchor-sep">·</span>
          <Link href="/vault" className="sitemap-anchor-link">10 / Proof Vault</Link>
        </div>
      </div>
    </section>
  );
}
