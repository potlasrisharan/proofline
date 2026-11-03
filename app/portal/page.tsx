"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./portal.module.css";
import { demoPersonas, type DemoPersona } from "../components/role-dashboard-showcase";
import type { ProoflineRole } from "../lib/proofline-api";

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

export default function PortalPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<ProoflineRole | null>(getInitialPortalRole);

  const handleLogin = (role: ProoflineRole) => {
    setSelectedRole(role);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("proofline:portal-active-role", role);
      window.sessionStorage.setItem("proofline:active-role", role);
      window.localStorage.setItem("proofline:active-role", role);
      const url = new URL(window.location.href);
      url.searchParams.set("role", role);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleLogout = () => {
    setSelectedRole(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("proofline:portal-active-role");
      const url = new URL(window.location.href);
      url.searchParams.delete("role");
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleOpenWorkspace = (targetRole?: ProoflineRole) => {
    const roleToUse = targetRole || selectedRole || "legal_reviewer";
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("proofline:active-role", roleToUse);
      window.localStorage.setItem("proofline:active-role", roleToUse);
    }
    router.push("/");
  };

  return (
    <div className={styles.portalWrapper}>
      {/* 1. Global Noise Texture Overlay */}
      <div className="industrial-noise-overlay" aria-hidden="true" />

      {/* 2. Structural 12-Column Persistent Grid */}
      <div className="industrial-grid-bg" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="industrial-grid-col" />
        ))}
      </div>

      {/* Enterprise Header */}
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

        {/* Absolute Centered Logo matching landing page */}
        <Link href="/" className={styles.logoCenter}>
          <span className={styles.logoSerif}>PROOF</span>
          <span className={styles.logoSans}>LINE</span>
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

      {/* Main Body: Portal Login Screen OR Dedicated Dashboard */}
      <main className={styles.portalMain}>
        {selectedRole === null ? (
          <PortalMainLoginView onSelectRole={handleLogin} />
        ) : (
          <RoleDedicatedDashboard
            role={selectedRole}
            persona={demoPersonas[selectedRole]}
            onSwitchRole={handleLogin}
            onLogout={handleLogout}
            onOpenWorkspace={() => handleOpenWorkspace(selectedRole)}
          />
        )}
      </main>

      {/* Enterprise Footer */}
      <footer className={styles.portalFooter}>
        <span>Proofline Enterprise Portal · VoltEdge Production Workspace · Cryptographic Evidence Engine</span>
        <span>
          <Link href="/privacy">AI &amp; Data Disclosure</Link> · VoltEdge Brand Safety Standards
        </span>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// SEPARATE MAIN SCREEN: 5 DEDICATED LOGINS & ENTERPRISE SSO
// -------------------------------------------------------------
function PortalMainLoginView({ onSelectRole }: { onSelectRole: (role: ProoflineRole) => void }) {
  const personas = useMemo(() => Object.values(demoPersonas), []);
  const [ssoEmail, setSsoEmail] = useState("");
  const [ssoPassword, setSsoPassword] = useState("");
  const [ssoFeedback, setSsoFeedback] = useState<string | null>(null);

  const handleSsoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ssoEmail.trim().toLowerCase();
    const match = personas.find((p) => p.email.toLowerCase() === clean);
    if (match) {
      setSsoFeedback(`Signing in as ${match.name}...`);
      setTimeout(() => onSelectRole(match.role), 250);
    } else {
      setSsoFeedback(`Signing in with enterprise identity (${clean})...`);
      setTimeout(() => onSelectRole("legal_reviewer"), 250);
    }
  };

  return (
    <>
      <div className={styles.portalHero}>
        <span className={styles.heroKicker}>VoltEdge Identity &amp; Role Gateways</span>
        <h1 className={styles.heroTitle}>Select Your Role to Access Your Dedicated Dashboard</h1>
        <p className={styles.heroSubtitle}>
          Each department in VoltEdge has separate responsibilities and governance tools. Sign in to your dedicated role portal below to access specialized workflows, automated checks, and audit controls.
        </p>
      </div>

      {/* Universal Enterprise SSO Quick Bar */}
      <form className={styles.ssoBar} onSubmit={handleSsoSubmit}>
        <div>
          <div className={styles.ssoBarTitle}>Enterprise Corporate SSO Sign In</div>
          <div className={styles.ssoBarSub}>Enter your VoltEdge corporate address to route to your specific dashboard</div>
        </div>
        <div className={styles.ssoInputs}>
          <input
            type="email"
            required
            placeholder="e.g. maya.chen@voltedge.io"
            value={ssoEmail}
            onChange={(e) => setSsoEmail(e.target.value)}
            className={styles.ssoInput}
          />
          <input
            type="password"
            placeholder="••••••••••••"
            value={ssoPassword}
            onChange={(e) => setSsoPassword(e.target.value)}
            className={styles.ssoInput}
          />
          <button type="submit" className={styles.ssoSubmitBtn}>
            Sign In with SSO →
          </button>
        </div>
        {ssoFeedback ? (
          <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "#22C55E", fontFamily: "var(--ind-font-mono, monospace)", marginTop: 8 }}>
            ✓ {ssoFeedback}
          </div>
        ) : null}
      </form>

      {/* 5 SEPARATE ROLE LOGINS */}
      <section className={styles.loginCardsSection} aria-label="Separate Role Logins">
        <div className={styles.loginCardsGrid}>
          {personas.map((persona) => {
            return (
              <article
                key={persona.role}
                className={`${styles.loginCard} ${styles[persona.badgeTone]}`}
                aria-label={`${persona.title} Login`}
              >
                <div className={styles.loginCardHeader}>
                  <div className={`${styles.roleAvatar} ${styles[persona.badgeTone]}`}>
                    {persona.initials}
                  </div>
                  <div className={styles.roleMeta}>
                    <h2 className={styles.roleName}>{persona.name}</h2>
                    <div className={styles.roleTitle}>{persona.title}</div>
                    <div className={styles.roleDepartment}>{persona.department}</div>
                  </div>
                </div>

                <div className={styles.roleEmailBadge}>{persona.email}</div>

                <div className={styles.roleFocusBox}>
                  <strong>Focus:</strong> {persona.focus}
                </div>

                <ul className={styles.capabilitiesList}>
                  {persona.coreCapabilities.slice(0, 3).map((cap, i) => (
                    <li key={i} className={styles.capabilityItem}>
                      <span className={styles.capabilityCheck}>✓</span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>

                <div className={styles.loginCardAction}>
                  <button
                    type="button"
                    className={`${styles.loginLaunchBtn} ${styles[persona.badgeTone]}`}
                    onClick={() => onSelectRole(persona.role)}
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
}: {
  role: ProoflineRole;
  persona: DemoPersona;
  onSwitchRole: (role: ProoflineRole) => void;
  onLogout: () => void;
  onOpenWorkspace: () => void;
}) {
  return (
    <div className={styles.dashboardContainer}>
      {/* Top Navigation */}
      <div className={styles.dashboardNav}>
        <div className={styles.navLeft}>
          <button type="button" className={styles.backBtn} onClick={onLogout} title="Return to Role Logins screen">
            ← Switch Login / All Roles
          </button>
          <div className={styles.activePersonaPill}>
            <div className={`${styles.pillAvatar} ${styles[persona.badgeTone]}`}>
              {persona.initials}
            </div>
            <div className={styles.pillDetails}>
              <span className={styles.pillName}>{persona.name}</span>
              <span className={styles.pillRoleTag}>{persona.title} · {persona.email}</span>
            </div>
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
          <button
            type="button"
            className={styles.workspaceLink}
            onClick={onOpenWorkspace}
            title="Open comprehensive workspace for this role"
          >
            Open Full Workspace ↗
          </button>
        </div>
      </div>

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

  const handleApplyFix = () => {
    setBatteryFixed(true);
    setScanStatus("Approved lab benchmark applied: battery claim aligned to 12 hours.");
  };

  const handleRescan = () => {
    setScanStatus("Scanning draft against VoltEdge Truth Registry...");
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
          <div className={styles.metricValue}>4 <span className={styles.metricChange}>Active</span></div>
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
          <div className={styles.metricSubtext}>Telugu and Hindi parity checked</div>
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
              &ldquo;Meet the VoltEdge NovaBook S1. It delivers{" "}
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
              {submittedToTriage ? "✓ Submitted to Editorial" : "Submit to Manager Triage →"}
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
          <p className={styles.panelSub}>Verify spec parity across regional campaigns</p>

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
                &ldquo;VoltEdge NovaBook S1 delivers 12 hours of verified battery life under IEEE lab standards.&rdquo;
              </p>
            )}
            {selectedLang === "te" && (
              <p style={{ margin: 0 }}>
                &ldquo;VoltEdge NovaBook S1 ల్యాప్‌టాప్ IEEE ల్యాబ్ ప్రమాణాల ప్రకారం 12 గంటల ధృవీకరించబడిన బ్యాటరీ లైఫ్‌ను అందిస్తుంది.&rdquo;
              </p>
            )}
            {selectedLang === "hi" && (
              <p style={{ margin: 0 }}>
                &ldquo;VoltEdge NovaBook S1 लैपटॉप IEEE लैब मानकों के तहत 12 घंटे की प्रमाणित बैटरी लाइफ प्रदान करता है।&rdquo;
              </p>
            )}
          </div>

          <div className={styles.subtleCard}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#18181B", marginBottom: 8, fontFamily: "var(--ind-font-sans, sans-serif)" }}>
              Recent Creator Submissions (Click to Inspect)
            </div>
            <div
              className={styles.interactiveRow}
              onClick={() => setActiveDraftKey("novabook")}
              style={{ background: activeDraftKey === "novabook" ? "rgba(0, 102, 255, 0.08)" : undefined }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>NovaBook S1 Launch Email</span>
              <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                {submittedToTriage ? "In Review (Risk 24)" : "In Review (Risk 78)"}
              </span>
            </div>
            <div
              className={styles.interactiveRow}
              onClick={() => setActiveDraftKey("teaser")}
              style={{ background: activeDraftKey === "teaser" ? "rgba(0, 102, 255, 0.08)" : undefined }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>Q4 Spring Laptop Teaser</span>
              <span style={{ color: "#22C55E", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                Approved
              </span>
            </div>
            <div
              className={styles.interactiveRow}
              onClick={() => setActiveDraftKey("charger")}
              style={{ background: activeDraftKey === "charger" ? "rgba(0, 102, 255, 0.08)" : undefined }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>UltraSpeed Charger Social Post</span>
              <span style={{ color: "#0066FF", fontWeight: 700, fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)" }}>
                Submitted
              </span>
            </div>
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
  const [selectedQueueId, setSelectedQueueId] = useState<string>("novabook-launch");
  const [queueRows, setQueueRows] = useState([
    {
      id: "novabook-launch",
      title: "NovaBook S1 launch email",
      author: "Aisha Rahman",
      channel: "Email",
      riskScore: 78,
      riskLevel: "high",
      status: "In Review",
      notes: "Battery claim contradicts hardware spec v2.1 (20h vs 12h lab benchmark).",
    },
    {
      id: "ultradock-spec",
      title: "Enterprise UltraDock Spec Sheet",
      author: "Carlos Mendez",
      channel: "Web",
      riskScore: 52,
      riskLevel: "medium",
      status: "In Review",
      notes: "Superlative phrase needs substantiation before client partner release.",
    },
    {
      id: "sustainability-whitepaper",
      title: "Q4 Sustainability Whitepaper",
      author: "Aisha Rahman",
      channel: "PR / Web",
      riskScore: 24,
      riskLevel: "low",
      status: "Approved",
      notes: "Clean statutory check; carbon offset claims grounded in ISO certs.",
    },
  ]);

  const handleRouteToLegal = () => {
    setQueueRows((prev) =>
      prev.map((r) =>
        r.id === "novabook-launch"
          ? { ...r, status: "Routed to Legal (Maya Chen)", riskScore: 38, riskLevel: "medium" }
          : r
      )
    );
    setActionMessage("✓ NovaBook S1 launch email routed to Maya Chen (Legal Ops) for statutory clearance.");
  };

  const handleRequestChanges = () => {
    setQueueRows((prev) =>
      prev.map((r) =>
        r.id === "novabook-launch"
          ? { ...r, status: "Changes Requested (Aisha Rahman)" }
          : r
      )
    );
    setActionMessage("✓ Change request sent to Aisha Rahman: 'Ensure 12h lab benchmark is applied before re-submission.'");
  };

  const selectedItem = queueRows.find((r) => r.id === selectedQueueId) ?? queueRows[0];

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending Triage Queue</div>
          <div className={styles.metricValue}>5 <span className={styles.metricChange}>Items</span></div>
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
        {/* Left: Risk Triage Queue */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Editorial Triage Queue (Highest Risk First)</h2>
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
              {queueRows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    background: selectedQueueId === row.id ? "rgba(0, 102, 255, 0.04)" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedQueueId(row.id)}
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
              Route NovaBook to Legal Sign-off →
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
          <p className={styles.panelSub}>Triage context, claims breakdown, and reviewer notes</p>

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
          <div className={styles.metricLabel}>FTC §5 Compliance</div>
          <div className={styles.metricValue}>100% <span className={styles.metricChange}>Clear</span></div>
          <div className={styles.metricSubtext}>16 CFR § 255 sponsorship rules</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Lanham Act §43(a) Risk</div>
          <div className={styles.metricValue}>
            {safeHarborApplied ? "0" : "1"}
            <span className={styles.metricChange} style={{ color: safeHarborApplied ? "#22C55E" : "#EF4444" }}>
              {safeHarborApplied ? "Mitigated" : "Superlative"}
            </span>
          </div>
          <div className={styles.metricSubtext}>&ldquo;most reliable&rdquo; claim</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Quality Score Index</div>
          <div className={styles.metricValue}>
            {safeHarborApplied ? "98.4" : "95.2"}
            <span className={styles.metricChange}>/ 100</span>
          </div>
          <div className={styles.metricSubtext}>Accuracy + Legal + A11y</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Signed Certificates</div>
          <div className={styles.metricValue}>
            {certSigned ? "15" : "14"}
            <span className={styles.metricChange}>SHA-256</span>
          </div>
          <div className={styles.metricSubtext}>Audit-proof legal gate</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: 4-Pillar Quality Scorecard */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>4-Pillar Regulatory &amp; Brand Scorecard</h2>
          <p className={styles.panelSub}>Statutory clearinghouse for VoltEdge marketing copy</p>

          <div className={styles.scorecardPillars}>
            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>1. Spec Accuracy &amp; Lab Benchmarking</span>
                <span style={{ color: "#22C55E", fontWeight: 800 }}>96% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "96%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>2. Statutory Legal Rules (FTC §5 &amp; Lanham Act)</span>
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
                <span>3. VoltEdge Brand Guidelines Voice</span>
                <span style={{ color: "#22C55E", fontWeight: 800 }}>95% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "95%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>4. Accessibility &amp; Non-Deceptive Pricing</span>
                <span style={{ color: "#22C55E", fontWeight: 800 }}>98% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "98%" }} />
              </div>
            </div>
          </div>

          <div className={styles.subtleCard}>
            <div style={{ fontSize: 10, fontFamily: "var(--ind-font-mono, monospace)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#18181B", marginBottom: 6 }}>
              Superlative &amp; Comparative Claim Scanner
            </div>
            <p style={{ fontSize: 12, margin: 0, color: "#52525B", lineHeight: 1.55 }}>
              Claim flagged: <em>&ldquo;our most reliable laptop yet&rdquo;</em> (High-risk comparative claim under Lanham Act §43(a)).
            </p>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className={styles.ssoSubmitBtn}
                style={{ background: safeHarborApplied ? "#22C55E" : "#18181B" }}
                onClick={() => setSafeHarborApplied(true)}
              >
                {safeHarborApplied
                  ? "✓ Safe-Harbor Clause Applied (IEEE Std 1621-2024)"
                  : "⚡ Apply Safe-Harbor Rewrite with IEEE Benchmark"}
              </button>
            </div>
          </div>
        </section>

        {/* Right: Cryptographic Compliance Certificate Signer */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Cryptographic Compliance Gate</h2>
          <p className={styles.panelSub}>Tamper-proof audit certificate for publication</p>

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
      { channel: "LinkedIn Business Page (@VoltEdgeLabs)", id: "urn:li:share:712984102941", status: "LIVE · 100% Verified Grounding" },
      { channel: "X / Twitter Corporate (@VoltEdge)", id: "tweet_id:18492049102941", status: "LIVE · Spec Matched" },
      { channel: "Instagram Product Studio (@voltedge_tech)", id: "media_id:18029419402941", status: "LIVE · Legal Cleared" },
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
            <span><strong>LinkedIn Business Page</strong> (@VoltEdgeLabs)</span>
            <span style={{ color: "#22C55E", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>✓ Ready</span>
          </div>
          <div className={styles.channelRow}>
            <span><strong>X / Twitter Corporate</strong> (@VoltEdge)</span>
            <span style={{ color: "#22C55E", fontWeight: 700, fontFamily: "var(--ind-font-mono, monospace)" }}>✓ Ready</span>
          </div>
          <div className={styles.channelRow}>
            <span><strong>Instagram Product Studio</strong> (@voltedge_tech)</span>
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
    "#VoltEdgePartner tag verified in all deliverables.",
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
          <div className={styles.metricValue}>2 <span className={styles.metricChange}>VoltEdge</span></div>
          <div className={styles.metricSubtext}>NovaBook S1 Partner Promo</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Specification Compliance</div>
          <div className={styles.metricValue}>88% <span className={styles.metricChange}>Aligned</span></div>
          <div className={styles.metricSubtext}>Checked against client baseline</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Internal Telemetry</div>
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
              Campaign: VoltEdge NovaBook S1 Freelancer Promo
            </div>
            <ul style={{ paddingLeft: 18, margin: "0 0 14px", fontSize: 12, color: "#52525B", lineHeight: 1.6 }}>
              <li>Battery claim must not exceed 12 hours under any test scenario.</li>
              <li>Superlatives (&ldquo;best&rdquo;, &ldquo;most reliable&rdquo;) strictly barred in agency copy.</li>
              <li>Include #VoltEdgePartner tag as mandated by FTC 16 CFR § 255.</li>
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
                ✓ Comment logged to VoltEdge review thread ({feedbackList.length} total notes).
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
          <p className={styles.panelSub}>Client telemetry isolation for third-party partners</p>

          <div className={styles.maskedNoticeBox}>
            <strong>Enterprise Privacy Boundary:</strong> In compliance with VoltEdge security policies, internal telemetry, financial margins, and confidential roadmap documents are cryptographically masked in this partner view.
            <div className={styles.maskedItem}>
              <span>Internal Margin Data</span>
              <span>🔒 PROTECTED</span>
            </div>
            <div className={styles.maskedItem}>
              <span>Executive Slack / Email Threads</span>
              <span>🔒 MASKED</span>
            </div>
            <div className={styles.maskedItem}>
              <span>Customer PII Telemetry</span>
              <span>🔒 ANONYMIZED</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
