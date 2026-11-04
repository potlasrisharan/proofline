"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "./portal.module.css";
import { demoPersonas, type DemoPersona } from "../components/role-dashboard-showcase";
import { WorkflowStepper } from "../components/workflow-stepper";
import type { ProoflineRole } from "../lib/proofline-api";
import {
  getStoredContentReview,
  saveStoredContentReview,
  subscribeContentReview,
  latestAudit,
  latestRevision,
  riskBreakdown,
  channelLabels,
  type ContentReview,
} from "../lib/content-review";

function getInitialPortalRole(): ProoflineRole | null {
  if (typeof window === "undefined") return null;
  try {
    const urlRole = new URLSearchParams(window.location.search).get("role") as ProoflineRole | null;
    if (urlRole && demoPersonas[urlRole]) return urlRole;
    const storedRole = window.sessionStorage.getItem("proofline:portal-active-role") as ProoflineRole | null;
    if (storedRole && demoPersonas[storedRole]) return storedRole;
  } catch {
    return null;
  }
  return null;
}

const portalListeners = new Set<() => void>();
function subscribePortal(callback: () => void) {
  portalListeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    portalListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

export type PortalPageProps = {
  activeRole?: ProoflineRole;
  onRoleChange?: (role: ProoflineRole) => void;
  isEmbedded?: boolean;
};

export default function PortalPage({
  activeRole,
  onRoleChange,
  isEmbedded = false,
}: PortalPageProps = {}) {
  const router = useRouter();
  const [localRole, setLocalRole] = useState<ProoflineRole | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const storedRole = useSyncExternalStore(subscribePortal, getInitialPortalRole, () => null);
  const selectedRole = activeRole ?? localRole ?? (mounted ? storedRole : null);

  const handleLogin = (role: ProoflineRole) => {
    setLocalRole(role);
    if (onRoleChange) {
      onRoleChange(role);
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("proofline:portal-active-role", role);
      window.sessionStorage.setItem("proofline:active-role", role);
      window.localStorage.setItem("proofline:active-role", role);
      window.dispatchEvent(new CustomEvent("proofline:role-change", { detail: role }));
      const url = new URL(window.location.href);
      url.searchParams.set("role", role);
      window.history.pushState({}, "", url.toString());
    }
    portalListeners.forEach((l) => l());
  };

  const handleLogout = () => {
    setLocalRole(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("proofline:portal-active-role");
      const url = new URL(window.location.href);
      url.searchParams.delete("role");
      window.history.pushState({}, "", url.toString());
    }
    portalListeners.forEach((l) => l());
  };

  const handleOpenWorkspace = (targetRole?: ProoflineRole) => {
    const roleToUse = targetRole || selectedRole || "legal_reviewer";
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("proofline:active-role", roleToUse);
      window.localStorage.setItem("proofline:active-role", roleToUse);
      window.dispatchEvent(new CustomEvent("proofline:role-change", { detail: roleToUse }));
    }
    router.push("/");
  };

  return (
    <div className={`${styles.portalWrapper} ${isEmbedded ? styles.embeddedWrapper : ""}`} suppressHydrationWarning>
      {/* Background and Header ONLY if standalone (not embedded in workspace) */}
      {!isEmbedded && (
        <>
          <div className="industrial-noise-overlay" aria-hidden="true" />
          <div className="industrial-grid-bg" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="industrial-grid-col" />
            ))}
          </div>

          <header className={styles.portalHeader}>
            <Link href="/" className={styles.brandLockup}>
              <Image
                src="/logo.png"
                alt="Proofline Logo"
                width={34}
                height={34}
                className={styles.brandLogo}
                priority
              />
              <div className={styles.brandText}>
                <span className={styles.brandName}>Proofline Enterprise</span>
                <span className={styles.brandSub}>Brand truth, before publish.</span>
              </div>
            </Link>

            <div className={styles.headerPills}>
              <span className={styles.systemBadge}>
                <span className={styles.statusDot} />
                Cloudflare Edge API Active
              </span>
              <span className={styles.systemBadge}>
                RLS Enforcement Active
              </span>
              <button
                type="button"
                className={styles.workspaceLink}
                onClick={() => handleOpenWorkspace()}
                title="Open unified multi-role workspace"
              >
                ⇥ Open Full Workspace
              </button>
            </div>
          </header>
        </>
      )}

      {/* Main Body: Portal Login Screen OR Dedicated Dashboard */}
      <main className={styles.portalMain}>
        {selectedRole === null ? (
          <PortalMainLoginView onSelectRole={handleLogin} onOpenJudgeCockpit={() => router.push("/?view=reviews")} />
        ) : (
          <RoleDedicatedDashboard
            role={selectedRole}
            persona={demoPersonas[selectedRole]}
            onSwitchRole={handleLogin}
            onLogout={handleLogout}
            onOpenWorkspace={() => router.push("/?view=reviews")}
            isEmbedded={isEmbedded}
          />
        )}
      </main>

      {!isEmbedded && (
        <footer className={styles.portalFooter}>
          <span>Proofline Enterprise Portal · Novacore Production Workspace · Tamper-Proof Verification Engine</span>
          <span>
            <Link href="/privacy">AI &amp; Data Disclosure</Link> · Novacore Brand Safety Standards
          </span>
        </footer>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// STREAMLINED ROLE PORTAL SELECTION (Clean & Minimal)
// -------------------------------------------------------------
function PortalMainLoginView({
  onSelectRole,
  onOpenJudgeCockpit,
}: {
  onSelectRole: (role: ProoflineRole) => void;
  onOpenJudgeCockpit: () => void;
}) {
  const personas = useMemo(() => Object.values(demoPersonas), []);

  return (
    <>
      <div className={styles.portalHero} style={{ marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "#FFFFFF", border: "1px solid var(--ind-border, #D4D4D8)", borderRadius: 9999, fontSize: 10, fontFamily: "var(--ind-font-mono)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
          <span className="industrial-status-pulse" />
          <span>5 Dedicated Team Workspaces + 1 Unified Review Cockpit</span>
        </div>
        <h1 className={styles.heroTitle} style={{ fontSize: 26, margin: "0 0 8px" }}>
          Select Your Role to Access Your Dedicated Dashboard
        </h1>
        <p className={styles.heroSubtitle} style={{ fontSize: 13, margin: "0 auto 16px", maxWidth: 760, lineHeight: 1.6 }}>
          Choose a team role below to see their tailored dashboard. Or, launch the <strong>Unified Review Cockpit</strong> to test all 4 stages of the workflow together in one screen.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            className={styles.workspaceLink}
            onClick={onOpenJudgeCockpit}
            style={{ padding: "8px 18px", fontSize: 11, fontWeight: 700 }}
            title="Open unified review cockpit across all 4 lifecycle stages"
          >
            ⚖️ Launch Common Judge Review Cockpit (All 4 Stages) →
          </button>
          <Link
            href="/"
            className={styles.backBtn}
            style={{ padding: "8px 16px", fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            title="Return to Welcome Landing Page"
          >
            🏠 Return to Landing Page
          </Link>
        </div>
      </div>

      {/* 5 COMPACT ROLE LOGINS */}
      <section className={styles.loginCardsSection} aria-label="Separate Role Logins">
        <div className={styles.loginCardsGrid}>
          {personas.map((persona) => {
            return (
              <article
                key={persona.role}
                className={`${styles.loginCard} ${styles[persona.badgeTone]}`}
                aria-label={`${persona.title} Login`}
                onClick={() => onSelectRole(persona.role)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.loginCardHeader}>
                  <div className={`${styles.roleAvatar} ${styles[persona.badgeTone]}`}>
                    {persona.initials}
                  </div>
                  <div className={styles.roleMeta}>
                    <h2 className={styles.roleName}>{persona.name}</h2>
                    <div className={styles.roleTitle}>{persona.title}</div>
                  </div>
                </div>

                <div className={styles.loginCardAction} style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className={`${styles.loginLaunchBtn} ${styles[persona.badgeTone]}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRole(persona.role);
                    }}
                  >
                    <span>Sign In to {persona.name.split(" ")[0]}&apos;s Dashboard</span>
                    <span>→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

// -------------------------------------------------------------
// SEPARATE DASHBOARDS PER ROLE
// -------------------------------------------------------------
function RoleDedicatedDashboard({
  role,
  persona,
  onSwitchRole,
  onLogout,
  onOpenWorkspace,
  isEmbedded = false,
}: {
  role: ProoflineRole;
  persona: DemoPersona;
  onSwitchRole: (role: ProoflineRole) => void;
  onLogout: () => void;
  onOpenWorkspace: () => void;
  isEmbedded?: boolean;
}) {
  return (
    <div className={styles.dashboardContainer}>
      {/* Top Navigation */}
      <div className={styles.dashboardNav}>
        <div className={styles.navLeft}>
          <button type="button" className={styles.backBtn} onClick={onLogout} title="Return to Role Logins screen">
            ← Switch Login / All Roles
          </button>
          <Link href="/" className={styles.backBtn} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} title="Return to Landing Page">
            🏠 Home
          </Link>
          <div className={styles.roleQuickTabs} role="tablist" aria-label="Switch Role Dashboard">
            {Object.values(demoPersonas).map((p) => {
              const isActive = p.role === role;
              return (
                <button
                  key={p.role}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.roleTabPill} ${isActive ? styles.roleTabPillActive : ""}`}
                  onClick={() => onSwitchRole(p.role)}
                  title={`Switch to ${p.name} (${p.title})`}
                >
                  <span className={`${styles.tabDot} ${styles[p.badgeTone]}`} />
                  <span>{p.name.split(" ")[0]}</span>
                  <span className={styles.tabRoleShort}>· {p.title}</span>
                </button>
              );
            })}
            <button
              type="button"
              className={styles.roleTabPill}
              style={{ background: "#18181B", color: "#FFFFFF", borderColor: "#18181B" }}
              onClick={onOpenWorkspace}
              title="Open unified 4-stage evaluation cockpit for judges"
            >
              <span>⚖️ Judge Review Cockpit ↗</span>
            </button>
          </div>
        </div>

        <div className={styles.navRight}>
          <label style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ind-fg, #18181B)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>Dashboard:</span>
            <select
              className={styles.roleSelectDropdown}
              value={role}
              onChange={(e) => onSwitchRole(e.target.value as ProoflineRole)}
              aria-label="Switch to another role dashboard"
            >
              {Object.values(demoPersonas).map((p) => (
                <option key={p.role} value={p.role}>
                  {p.title} ({p.name.split(" ")[0]})
                </option>
              ))}
            </select>
          </label>
          {!isEmbedded && (
            <button
              type="button"
              className={styles.workspaceLink}
              onClick={onOpenWorkspace}
              title="Open comprehensive review cockpit for judges"
            >
              ⚖️ Open Judge Cockpit ↗
            </button>
          )}
        </div>
      </div>

      {/* Universal 4-Stage Enterprise Pipeline Stepper */}
      <WorkflowStepper activeRole={role} />

      {/* Role Banner */}
      <section className={`${styles.dashboardBanner} ${styles[persona.badgeTone]}`}>
        <div className={styles.bannerEyebrow}>
          {persona.department} · {persona.focus}
        </div>
        <h1 className={styles.bannerTitle}>
          {persona.name.split(" ")[0]}&apos;s {persona.title} Dashboard
        </h1>
        <p className={styles.bannerDescription}>
          {persona.description}
        </p>
      </section>

      {/* Dynamic Role Dashboard Content */}
      {role === "creator" && <CreatorDashboard onOpenWorkspace={onOpenWorkspace} />}
      {role === "manager" && <ManagerDashboard onOpenWorkspace={onOpenWorkspace} />}
      {role === "legal_reviewer" && <LegalDashboard onOpenWorkspace={onOpenWorkspace} />}
      {role === "brand_owner" && <BrandOwnerDashboard onOpenWorkspace={onOpenWorkspace} />}
      {role === "agency" && <AgencyDashboard onOpenWorkspace={onOpenWorkspace} />}
    </div>
  );
}

// -------------------------------------------------------------
// 1. CREATOR DASHBOARD
// -------------------------------------------------------------
function CreatorDashboard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [batteryFixed, setBatteryFixed] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<"en" | "te" | "hi">("en");
  const [submittedToTriage, setSubmittedToTriage] = useState(false);
  const [activeDraftKey, setActiveDraftKey] = useState<"novabook" | "teaser" | "charger">("novabook");
  const storedReview = useSyncExternalStore(subscribeContentReview, getStoredContentReview, () => null);

  const customReviewScore = useMemo(() => {
    if (!storedReview) return null;
    const audit = latestAudit(storedReview);
    return riskBreakdown(audit.findings, storedReview.scope.channel).score;
  }, [storedReview]);

  const handleApplyFix = () => {
    setBatteryFixed(true);
    setScanStatus("Approved lab benchmark applied: battery claim aligned to 12 hours.");
  };

  const handleRescan = () => {
    setScanStatus("Scanning draft against Novacore Truth Registry...");
    setTimeout(() => {
      setScanStatus(
        batteryFixed
          ? "✓ Re-scan complete: 0 contradictions found. Ready for editorial review."
          : "⚠️ Re-scan complete: 1 spec contradiction (claimed 20h vs lab 12h)."
      );
    }, 350);
  };

  const handleSubmitToManager = () => {
    setSubmittedToTriage(true);
    setScanStatus("✓ Draft submitted to Marcus Vance (Editorial Manager) with risk score 24 (LOW, ready for sign-off).");
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Drafts in Progress</div>
          <div className={styles.metricValue}>{storedReview ? "5" : "4"} <span className={styles.metricChange}>Active</span></div>
          <div className={styles.metricSubtext}>{submittedToTriage ? "3 submitted for editorial review" : "2 submitted for editorial review"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Contradictions Highlighted</div>
          <div className={styles.metricValue}>
            {batteryFixed ? "0" : "1"}
            <span className={styles.metricChange} style={{ color: batteryFixed ? "#22C55E" : "#EF4444" }}>
              {batteryFixed ? "Resolved" : "Needs Fix"}
            </span>
          </div>
          <div className={styles.metricSubtext}>NovaBook S1 battery claim</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>1-Click Lab Fixes Applied</div>
          <div className={styles.metricValue}>
            {batteryFixed ? "3" : "2"}
            <span className={styles.metricChange}>+1 today</span>
          </div>
          <div className={styles.metricSubtext}>Backed by IEEE Wi-Fi 6 lab test</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Sarvam Indic Verification</div>
          <div className={styles.metricValue}>100% <span className={styles.metricChange}>Verified</span></div>
          <div className={styles.metricSubtext}>Telugu and Hindi accuracy verified</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: Interactive Spec Contradiction Inspector */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Interactive Claims &amp; Spec Inspector</h2>
          <p className={styles.panelSub}>
            Draft: <strong>{activeDraftKey === "novabook" ? "NovaBook S1 Launch Email" : activeDraftKey === "teaser" ? "Q4 Spring Laptop Teaser" : "UltraSpeed Charger Social Post"}</strong> (Channel: Email campaign)
          </p>

          <div className={styles.diffInspectorBox}>
            <div className={styles.diffHeader}>
              <span className={`${styles.diffTag} ${batteryFixed ? styles.verified : styles.contradiction}`}>
                {batteryFixed ? "✓ Verified Spec Alignment" : "⚠️ Hard Specification Mismatch"}
              </span>
              <span style={{ fontSize: 11, fontFamily: "var(--ind-font-mono, monospace)", color: "#71717A" }}>
                Source: Hardware Spec v2.1
              </span>
            </div>

            <div className={styles.draftTextBox}>
              &ldquo;Meet the Novacore NovaBook S1. It delivers{" "}
              {batteryFixed ? (
                <span className={styles.highlightApproved}>up to 12 hours of battery life</span>
              ) : (
                <span className={styles.highlightMismatch}>up to 20 hours of battery life</span>
              )}{" "}
              and is our most reliable laptop yet. Pre-order today and be among the first to experience it.&rdquo;
            </div>

            <div className={styles.evidenceComparisonRow}>
              <div className={styles.evidenceCompareCard}>
                <div className={styles.evidenceCompareTitle}>Drafted Claim</div>
                <div style={{ color: batteryFixed ? "#22C55E" : "#EF4444", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>
                  {batteryFixed ? "12 hours (Lab Benchmark)" : "20 hours (Unverified)"}
                </div>
              </div>
              <div className={styles.evidenceCompareCard}>
                <div className={styles.evidenceCompareTitle}>Official Approved Spec</div>
                <div style={{ color: "#22C55E", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>
                  12 hours (Wi-Fi test)
                </div>
              </div>
            </div>

            <button
              type="button"
              className={`${styles.applyFixButton} ${batteryFixed ? styles.applied : ""}`}
              onClick={handleApplyFix}
              disabled={batteryFixed}
            >
              {batteryFixed ? "✓ Approved Lab Spec (12h) Applied" : "⚡ 1-Click Fix: Replace with 12h Lab Spec"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={styles.ssoSubmitBtn}
              onClick={handleRescan}
            >
              Re-scan Draft
            </button>
            <button
              type="button"
              className={styles.ssoSubmitBtn}
              onClick={handleSubmitToManager}
              style={{ background: submittedToTriage ? "#22C55E" : "#18181B" }}
            >
              {submittedToTriage ? "✓ Submitted to Editorial" : "Submit for Manager Review →"}
            </button>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onOpenWorkspace}
            >
              Open Full Review Workspace →
            </button>
          </div>

          {scanStatus ? (
            <div className={styles.actionFeedback}>
              {scanStatus}
            </div>
          ) : null}
        </section>

        {/* Right: Indic Multi-Lingual Verification & Submissions */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Sarvam Indic Multi-Lingual Studio</h2>
          <p className={styles.panelSub}>Check consistent specs across regional languages</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={`${styles.langTabBtn} ${selectedLang === "en" ? styles.langTabBtnActive : ""}`}
              onClick={() => setSelectedLang("en")}
            >
              English (US)
            </button>
            <button
              type="button"
              className={`${styles.langTabBtn} ${selectedLang === "te" ? styles.langTabBtnActive : ""}`}
              onClick={() => setSelectedLang("te")}
            >
              Telugu (తెలుగు)
            </button>
            <button
              type="button"
              className={`${styles.langTabBtn} ${selectedLang === "hi" ? styles.langTabBtnActive : ""}`}
              onClick={() => setSelectedLang("hi")}
            >
              Hindi (हिन्दी)
            </button>
          </div>

          <div className={styles.draftTextBox} style={{ minHeight: 90 }}>
            {selectedLang === "en" && (
              <p style={{ margin: 0 }}>
                &ldquo;Novacore NovaBook S1 delivers 12 hours of verified battery life under IEEE lab standards.&rdquo;
              </p>
            )}
            {selectedLang === "te" && (
              <p style={{ margin: 0 }}>
                &ldquo;Novacore NovaBook S1 ల్యాప్‌టాప్ IEEE ల్యాబ్ ప్రమాణాల ప్రకారం 12 గంటల ధృవీకరించబడిన బ్యాటరీ లైఫ్‌ను అందిస్తుంది.&rdquo;
              </p>
            )}
            {selectedLang === "hi" && (
              <p style={{ margin: 0 }}>
                &ldquo;Novacore NovaBook S1 लैपटॉप IEEE लैब मानकों के तहत 12 घंटे की प्रमाणित बैटरी लाइफ प्रदान करता है।&rdquo;
              </p>
            )}
          </div>

          <div className={styles.subtleCard}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#18181B", marginBottom: 8, fontFamily: "var(--ind-font-sans, sans-serif)" }}>
              Recent Creator Submissions (Click to Inspect)
            </div>
            {storedReview && (
              <button
                type="button"
                className={styles.interactiveRow}
                onClick={onOpenWorkspace}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid #0066FF",
                  background: "rgba(0, 102, 255, 0.08)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#0066FF" }}>
                  ⚡ {storedReview.scope.title || "Custom Submitted Draft"} (Latest)
                </span>
                <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                  Risk {customReviewScore} · Open in Workspace →
                </span>
              </button>
            )}
            <button
              type="button"
              className={styles.interactiveRow}
              onClick={() => setActiveDraftKey("novabook")}
              style={{ width: "100%", textAlign: "left", border: "none", background: activeDraftKey === "novabook" ? "rgba(0, 102, 255, 0.08)" : undefined }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>NovaBook S1 Launch Email</span>
              <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                {submittedToTriage ? "In Review (Risk 24)" : "In Review (Risk 78)"}
              </span>
            </button>
            <button
              type="button"
              className={styles.interactiveRow}
              onClick={() => setActiveDraftKey("teaser")}
              style={{ width: "100%", textAlign: "left", border: "none", background: activeDraftKey === "teaser" ? "rgba(0, 102, 255, 0.08)" : undefined }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>Q4 Spring Laptop Teaser</span>
              <span style={{ color: "#22C55E", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                Approved
              </span>
            </button>
            <button
              type="button"
              className={styles.interactiveRow}
              onClick={() => setActiveDraftKey("charger")}
              style={{ width: "100%", textAlign: "left", border: "none", background: activeDraftKey === "charger" ? "rgba(0, 102, 255, 0.08)" : undefined }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>UltraSpeed Charger Social Post</span>
              <span style={{ color: "#0066FF", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                Submitted
              </span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 2. MANAGER DASHBOARD
// -------------------------------------------------------------
function ManagerDashboard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const storedReview = useSyncExternalStore(subscribeContentReview, getStoredContentReview, () => null);
  const [selectedQueueId, setSelectedQueueId] = useState<string>("novabook-launch");
  const [queueRows, setQueueRows] = useState([
    {
      id: "novabook-launch",
      title: "NovaBook S1 launch email",
      author: "Aisha Rahman",
      channel: "Email",
      riskScore: 78,
      riskLevel: "high" as const,
      status: "In Review",
      notes: "Battery claim contradicts hardware spec v2.1 (20h vs 12h lab benchmark).",
    },
    {
      id: "ultradock-spec",
      title: "Enterprise UltraDock Spec Sheet",
      author: "Carlos Mendez",
      channel: "Web",
      riskScore: 52,
      riskLevel: "medium" as const,
      status: "In Review",
      notes: "Claims like 'most reliable' need test proof before partner release.",
    },
    {
      id: "sustainability-whitepaper",
      title: "Q4 Sustainability Whitepaper",
      author: "Aisha Rahman",
      channel: "PR / Web",
      riskScore: 24,
      riskLevel: "low" as const,
      status: "Approved",
      notes: "Clean compliance check; carbon offset claims verified with official certs.",
    },
  ]);

  const customManagerRow = useMemo(() => {
    if (!storedReview) return null;
    const audit = latestAudit(storedReview);
    const breakdown = riskBreakdown(audit.findings, storedReview.scope.channel);
    const score = breakdown.score;
    const isApproved = audit.status === "checked";
    return {
      id: storedReview.id,
      title: storedReview.scope.title || "Custom Submitted Draft",
      author: "Aisha Rahman (You)",
      channel: channelLabels[storedReview.scope.channel] || storedReview.scope.channel,
      riskScore: score,
      riskLevel: (score >= 75 ? "high" : score >= 40 ? "medium" : "low") as "high" | "medium" | "low",
      status: isApproved ? "Approved" : "In Review",
      notes: audit.findings.length > 0
        ? `${audit.findings.length} findings flagged by audit engine (${audit.findings[0]?.reason || "Needs review"}).`
        : "Automated checks passed · Zero specification contradictions.",
    };
  }, [storedReview]);

  const allQueueRows = useMemo(() => {
    if (customManagerRow) {
      return [customManagerRow, ...queueRows.filter((r) => r.id !== customManagerRow.id)];
    }
    return queueRows;
  }, [customManagerRow, queueRows]);

  const selectedItem = allQueueRows.find((r) => r.id === selectedQueueId) ?? allQueueRows[0];

  const handleRouteToLegal = () => {
    if (storedReview && selectedItem.id === storedReview.id) {
      const nextReview: ContentReview = {
        ...storedReview,
        events: [
          ...storedReview.events,
          {
            id: `evt-${Date.now()}`,
            content_version_id: latestRevision(storedReview).id,
            actor: "Marcus Vance (Editorial Manager)",
            action: "submitted",
            timestamp: new Date().toISOString(),
            before: null,
            after: null,
            finding_id: null,
            reason: "Editorial review passed. Routed to Maya Chen (Legal Reviewer) for final clearance.",
          },
        ],
      };
      saveStoredContentReview(nextReview);
      setActionMessage(`✓ ${selectedItem.title} routed to Maya Chen (Legal Reviewer) for final approval.`);
      return;
    }
    setQueueRows((prev) =>
      prev.map((r) =>
        r.id === "novabook-launch"
          ? { ...r, status: "Routed to Legal (Maya Chen)", riskScore: 38, riskLevel: "medium" as const }
          : r
      )
    );
    setActionMessage("✓ NovaBook S1 launch email routed to Maya Chen (Legal Reviewer) for final approval.");
  };

  const handleRequestChanges = () => {
    if (storedReview && selectedItem.id === storedReview.id) {
      setActionMessage(`✓ Change request sent to Aisha Rahman for ${selectedItem.title}: 'Ensure highlighted specifications match approved truth registry.'`);
      return;
    }
    setQueueRows((prev) =>
      prev.map((r) =>
        r.id === "novabook-launch"
          ? { ...r, status: "Changes Requested (Aisha Rahman)" }
          : r
      )
    );
    setActionMessage("✓ Change request sent to Aisha Rahman: 'Ensure 12h lab benchmark is applied before re-submission.'");
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending Review Queue</div>
          <div className={styles.metricValue}>{allQueueRows.length} <span className={styles.metricChange}>Items</span></div>
          <div className={styles.metricSubtext}>Highest risk items sorted first</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Average Risk Score</div>
          <div className={styles.metricValue}>68 <span className={styles.metricChange}>/ 100</span></div>
          <div className={styles.metricSubtext}>Calculated on claims &amp; audience</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Change Requests</div>
          <div className={styles.metricValue}>2 <span className={styles.metricChange}>Open</span></div>
          <div className={styles.metricSubtext}>Contextual notes attached</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Ready for Legal Sign-off</div>
          <div className={styles.metricValue}>
            {queueRows[0].status.includes("Legal") ? "2" : "1"}
            <span className={styles.metricChange} style={{ color: "#0066FF" }}>
              {queueRows[0].status.includes("Legal") ? "Dispatched" : "Pending"}
            </span>
          </div>
          <div className={styles.metricSubtext}>Editorial review passed</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: Risk Review Queue */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Editorial Review Queue (Highest Priority First)</h2>
          <p className={styles.panelSub}>Review incoming drafts and route to legal clearance</p>

          <table className={styles.queueTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Channel</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allQueueRows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select campaign ${row.title}`}
                  style={{
                    background: selectedQueueId === row.id ? "rgba(0, 102, 255, 0.04)" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedQueueId(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedQueueId(row.id);
                    }
                  }}
                >
                  <td><strong>{row.title}</strong></td>
                  <td>{row.author}</td>
                  <td>{row.channel}</td>
                  <td>
                    <span className={`${styles.riskBadge} ${styles[row.riskLevel]}`}>
                      {row.riskScore} {row.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      color: row.status.includes("Approved") ? "#22C55E" : row.status.includes("Legal") ? "#0066FF" : "#F59E0B",
                      fontWeight: 700,
                      fontFamily: "var(--ind-font-mono, monospace)",
                      fontSize: 10,
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.tableActionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQueueId(row.id);
                      }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={styles.ssoSubmitBtn}
              onClick={handleRouteToLegal}
            >
              Route {selectedItem.title} to Legal Sign-off →
            </button>
            <button
              type="button"
              className={styles.backBtn}
              onClick={handleRequestChanges}
            >
              Request Changes from Author
            </button>
          </div>

          {actionMessage ? (
            <div className={styles.actionFeedback}>
              {actionMessage}
            </div>
          ) : null}
        </section>

        {/* Right: Channel Breakdown & Team Workload */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Active Inspection: {selectedItem.title}</h2>
          <p className={styles.panelSub}>Review details, claims breakdown, and reviewer notes</p>

          <div className={styles.subtleCard} style={{ marginTop: 0, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#71717A", marginBottom: 6 }}>
              Reviewer Assessment &amp; Context
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#18181B", lineHeight: 1.55 }}>
              {selectedItem.notes}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>Email Campaigns (Highest Exposure)</span>
                <span>45% of queue</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "45%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>Social &amp; Influencer Copy</span>
                <span>35% of queue</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "35%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>Website &amp; Product Pages</span>
                <span>20% of queue</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "20%" }} />
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.backBtn}
            onClick={onOpenWorkspace}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Open Manager Full Workspace →
          </button>
        </section>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 3. LEGAL REVIEWER DASHBOARD
// -------------------------------------------------------------
function LegalDashboard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [certSigned, setCertSigned] = useState(false);
  const [safeHarborApplied, setSafeHarborApplied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopyHash = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
      setCopyFeedback("✓ SHA-256 Hash copied to clipboard.");
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Advertising Truth (FTC)</div>
          <div className={styles.metricValue}>100% <span className={styles.metricChange}>Clear</span></div>
          <div className={styles.metricSubtext}>Clear &amp; verified claims</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Unverified Comparisons</div>
          <div className={styles.metricValue}>
            {safeHarborApplied ? "0" : "1"}
            <span className={styles.metricChange} style={{ color: safeHarborApplied ? "#22C55E" : "#EF4444" }}>
              {safeHarborApplied ? "Mitigated" : "Needs proof"}
            </span>
          </div>
          <div className={styles.metricSubtext}>&ldquo;most reliable&rdquo; claim</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Overall Quality Score</div>
          <div className={styles.metricValue}>
            {safeHarborApplied ? "98.4" : "95.2"}
            <span className={styles.metricChange}>/ 100</span>
          </div>
          <div className={styles.metricSubtext}>Accuracy + Legal + Clear Text</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Approved Certificates</div>
          <div className={styles.metricValue}>
            {certSigned ? "15" : "14"}
            <span className={styles.metricChange}>Issued</span>
          </div>
          <div className={styles.metricSubtext}>Permanent audit record</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: 4-Pillar Quality Scorecard */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>4-Pillar Regulatory &amp; Brand Scorecard</h2>
          <p className={styles.panelSub}>Automated quality and truth check for marketing copy</p>

          <div className={styles.scorecardPillars}>
            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>1. Product Spec Accuracy</span>
                <span style={{ color: "#22C55E", fontWeight: 800 }}>96% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "96%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>2. Advertising &amp; Legal Rules</span>
                <span style={{ color: safeHarborApplied ? "#22C55E" : "#F59E0B", fontWeight: 800 }}>
                  {safeHarborApplied ? "98% (CLEARED)" : "92% (REVIEW)"}
                </span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: safeHarborApplied ? "98%" : "92%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>3. Novacore Brand Guidelines Voice</span>
                <span style={{ color: "#22C55E", fontWeight: 800 }}>95% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "95%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>4. Clear Text &amp; Pricing Transparency</span>
                <span style={{ color: "#22C55E", fontWeight: 800 }}>98% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "98%" }} />
              </div>
            </div>
          </div>

          <div className={styles.subtleCard}>
            <div style={{ fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#18181B", marginBottom: 6 }}>
              Unverified Claims &amp; Hype Scanner
            </div>
            <p style={{ fontSize: 12, margin: 0, color: "#52525B", lineHeight: 1.55 }}>
              Claim flagged: <em>&ldquo;our most reliable laptop yet&rdquo;</em> (Unverified comparative claim that requires lab test proof or safe phrasing).
            </p>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className={styles.ssoSubmitBtn}
                style={{ background: safeHarborApplied ? "#22C55E" : "#18181B" }}
                onClick={() => setSafeHarborApplied(true)}
              >
                {safeHarborApplied
                  ? "✓ Safe Rewrite Applied (Lab Benchmark Attached)"
                  : "⚡ Apply Safe Rewrite with Lab Benchmark"}
              </button>
            </div>
          </div>
        </section>

        {/* Right: Verified Compliance Certificate Signer */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Compliance Approval Certificate</h2>
          <p className={styles.panelSub}>Tamper-proof audit record for publication</p>

          <div className={styles.cryptoCertCard}>
            <div>CERTIFICATE STATUS: {certSigned ? "SIGNED & ISSUED (LOCKED)" : "PENDING LEGAL AUTHORISATION"}</div>
            <div>DOCUMENT ID: DOC-2026-VOLT-0091</div>
            <div>AUTHORITY: Maya Chen (Authorised Legal Reviewer)</div>
            <div>ALGORITHM: SHA-256 Hash + RSA-4096 Signature</div>
            <div className={styles.cryptoCertHash}>
              HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={styles.signCertBtn}
              onClick={() => setCertSigned(true)}
              style={{ flex: 1 }}
            >
              {certSigned ? "✓ Certificate Signed & Exported" : "✍ Sign & Export Compliance Certificate"}
            </button>
            {certSigned ? (
              <button
                type="button"
                className={styles.backBtn}
                onClick={handleCopyHash}
              >
                Copy Hash
              </button>
            ) : null}
          </div>

          {copyFeedback ? (
            <div className={styles.actionFeedback}>
              {copyFeedback}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onOpenWorkspace}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Open Legal Clearance Workspace →
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 4. BRAND OWNER DASHBOARD
// -------------------------------------------------------------
function BrandOwnerDashboard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [gapApproved, setGapApproved] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [dispatchReceipts, setDispatchReceipts] = useState<Array<{ channel: string; id: string; status: string }>>([]);

  const handleDispatch = () => {
    setDispatched(true);
    setDispatchReceipts([
      { channel: "LinkedIn Business Page (@NovacoreLabs)", id: "urn:li:share:712984102941", status: "LIVE · 100% Verified Grounding" },
      { channel: "X / Twitter Corporate (@Novacore)", id: "tweet_id:18492049102941", status: "LIVE · Spec Matched" },
      { channel: "Instagram Product Studio (@novacore_tech)", id: "media_id:18029419402941", status: "LIVE · Legal Cleared" },
    ]);
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Truth Registry Coverage</div>
          <div className={styles.metricValue}>
            {gapApproved ? "90%" : "86%"}
            <span className={styles.metricChange}>{gapApproved ? "19/21 Active" : "18/21 Active"}</span>
          </div>
          <div className={styles.metricSubtext}>Hardware, battery &amp; speed specs</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Guideline Gaps Detected</div>
          <div className={styles.metricValue}>
            {gapApproved ? "0" : "1"}
            <span className={styles.metricChange} style={{ color: gapApproved ? "#22C55E" : "#EF4444" }}>
              {gapApproved ? "Approved" : "Needs Review"}
            </span>
          </div>
          <div className={styles.metricSubtext}>AI-discovered guideline update</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Verified Claims on File</div>
          <div className={styles.metricValue}>142 <span className={styles.metricChange}>Verified</span></div>
          <div className={styles.metricSubtext}>Backed by lab test reports</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Multi-Channel Dispatch</div>
          <div className={styles.metricValue}>
            {dispatched ? "9" : "8"}
            <span className={styles.metricChange}>Channels Active</span>
          </div>
          <div className={styles.metricSubtext}>LinkedIn, X, Instagram</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: Guideline-Gap Approval */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Guideline-Gap Detector (AI Discovery)</h2>
          <p className={styles.panelSub}>Automatically flags recurring ambiguities in marketing drafts</p>

          <div className={styles.subtleCard} style={{ marginTop: 0, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0066FF", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "var(--ind-font-mono, monospace)", marginBottom: 4 }}>
              Recurring Pattern: Comparative Reliability Claims
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18181B", marginBottom: 6 }}>
              Rule Clarification: &ldquo;Most reliable&rdquo; requires IEEE benchmark citation.
            </div>
            <p style={{ fontSize: 12, color: "#52525B", lineHeight: 1.55, margin: 0 }}>
              Flagged in 3 recent drafts across Marketing and PR. Approving this rule automatically updates the Truth Registry and informs creators during text input.
            </p>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className={styles.ssoSubmitBtn}
                style={{ background: gapApproved ? "#22C55E" : "#18181B" }}
                onClick={() => setGapApproved(true)}
              >
                {gapApproved ? "✓ Guideline Rule Approved & Registered" : "✓ Approve Proposed Guideline Update"}
              </button>
            </div>
          </div>

          <button type="button" className={styles.backBtn} onClick={onOpenWorkspace}>
            Manage All Registry Records in Workspace →
          </button>
        </section>

        {/* Right: Multi-Channel Dispatch Console */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>1-Click Gated Multi-Channel Dispatch</h2>
          <p className={styles.panelSub}>Connected social integration (Unlocked only after legal approval)</p>

          <div className={styles.channelRow}>
            <span><strong>LinkedIn Business Page</strong> (@NovacoreLabs)</span>
            <span style={{ color: "#22C55E", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>✓ Ready</span>
          </div>
          <div className={styles.channelRow}>
            <span><strong>X / Twitter Corporate</strong> (@Novacore)</span>
            <span style={{ color: "#22C55E", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>✓ Ready</span>
          </div>
          <div className={styles.channelRow}>
            <span><strong>Instagram Product Studio</strong> (@novacore_tech)</span>
            <span style={{ color: "#22C55E", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>✓ Ready</span>
          </div>

          <button
            type="button"
            className={styles.dispatchBtn}
            onClick={handleDispatch}
          >
            {dispatched ? "✓ Content Dispatched to All Channels (Live)" : "🚀 1-Click Dispatch to Social Channels"}
          </button>

          {dispatched ? (
            <div className={styles.receiptCard}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#22C55E" }}>
                ✓ DISPATCH RECEIPTS VERIFIED:
              </div>
              {dispatchReceipts.map((r, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <strong>{r.channel}</strong>: {r.id} ({r.status})
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 5. AGENCY PARTNER DASHBOARD
// -------------------------------------------------------------
function AgencyDashboard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [commentInput, setCommentInput] = useState("");
  const [feedbackList, setFeedbackList] = useState<string[]>([
    "Battery claim verified against client spec v2.1.",
    "Superlative phrasing excluded from hero copy.",
    "#NovacorePartner tag verified in all deliverables.",
  ]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setFeedbackList((prev) => [...prev, commentInput.trim()]);
    setCommentInput("");
    setFeedbackSubmitted(true);
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Assigned Client Campaigns</div>
          <div className={styles.metricValue}>2 <span className={styles.metricChange}>Novacore</span></div>
          <div className={styles.metricSubtext}>NovaBook S1 Partner Promo</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Specification Compliance</div>
          <div className={styles.metricValue}>88% <span className={styles.metricChange}>Aligned</span></div>
          <div className={styles.metricSubtext}>Checked against client baseline</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Internal Company Logs</div>
          <div className={styles.metricValue}>🔒 <span className={styles.metricChange} style={{ color: "#F59E0B" }}>Masked</span></div>
          <div className={styles.metricSubtext}>Protected client data boundary</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Collaborative Notes</div>
          <div className={styles.metricValue}>
            {feedbackList.length}
            <span className={styles.metricChange}>Threads</span>
          </div>
          <div className={styles.metricSubtext}>Collaborative span comments</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: Sandboxed Campaign Workspace */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Sandboxed Client Campaign View</h2>
          <p className={styles.panelSub}>External agency sandbox for Apex Creative</p>

          <div className={styles.subtleCard} style={{ marginTop: 0, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18181B", marginBottom: 8 }}>
              Campaign: Novacore NovaBook S1 Freelancer Promo
            </div>
            <ul style={{ paddingLeft: 18, margin: "0 0 14px", fontSize: 12, color: "#52525B", lineHeight: 1.6 }}>
              <li>Battery claim must not exceed 12 hours under any test scenario.</li>
              <li>Superlatives (&ldquo;best&rdquo;, &ldquo;most reliable&rdquo;) strictly barred in agency copy.</li>
              <li>Include #NovacorePartner tag as mandated by FTC 16 CFR § 255.</li>
            </ul>

            <form onSubmit={handleAddComment} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                placeholder="Add feedback comment for client team..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className={styles.ssoInput}
                style={{ width: "100%" }}
              />
              <button
                type="submit"
                className={styles.ssoSubmitBtn}
                style={{ alignSelf: "flex-start" }}
              >
                ＋ Submit Feedback Comment
              </button>
            </form>

            {feedbackSubmitted ? (
              <div className={styles.actionFeedback} style={{ marginTop: 10 }}>
                ✓ Comment logged to Novacore review thread ({feedbackList.length} total notes).
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 14 }}>
            <button type="button" className={styles.backBtn} onClick={onOpenWorkspace}>
              Open Sandboxed Review Queue →
            </button>
          </div>
        </section>

        {/* Right: Data Protection & Masking */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Data Protection &amp; Confidentiality Barrier</h2>
          <p className={styles.panelSub}>Confidential data protection for external partners</p>

          <div className={styles.maskedNoticeBox}>
            <strong>Enterprise Privacy Boundary:</strong> In compliance with Novacore security policies, internal financial margins and confidential roadmap notes are securely hidden in this guest partner view.
            <div className={styles.maskedItem}>
              <span>Internal Margin Data</span>
              <span>🔒 PROTECTED</span>
            </div>
            <div className={styles.maskedItem}>
              <span>Executive Slack / Email Threads</span>
              <span>🔒 MASKED</span>
            </div>
            <div className={styles.maskedItem}>
              <span>Customer Personal Information</span>
              <span>🔒 ANONYMIZED</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
