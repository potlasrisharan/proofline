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
      {/* Enterprise Header */}
      <header className={styles.portalHeader}>
        <div className={styles.brandLockup}>
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
        </div>

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
          <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "#196855", marginTop: 4 }}>
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
          <label style={{ fontSize: 11, fontWeight: 700, color: "#194a3d", display: "flex", alignItems: "center", gap: 6 }}>
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
    }, 400);
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Drafts in Progress</div>
          <div className={styles.metricValue}>4 <span className={styles.metricChange}>Active</span></div>
          <div className={styles.metricSubtext}>2 submitted for editorial review</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Contradictions Highlighted</div>
          <div className={styles.metricValue}>{batteryFixed ? "0" : "1"} <span className={styles.metricChange} style={{ color: batteryFixed ? "#1e8369" : "#dc7968" }}>{batteryFixed ? "Resolved" : "Needs Fix"}</span></div>
          <div className={styles.metricSubtext}>NovaBook S1 battery claim</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>1-Click Lab Fixes Applied</div>
          <div className={styles.metricValue}>{batteryFixed ? "3" : "2"} <span className={styles.metricChange}>+1 today</span></div>
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
            Draft: <strong>NovaBook S1 Launch Email</strong> (Channel: Email campaign)
          </p>

          <div className={styles.diffInspectorBox}>
            <div className={styles.diffHeader}>
              <span className={`${styles.diffTag} ${batteryFixed ? styles.verified : styles.contradiction}`}>
                {batteryFixed ? "✓ Verified Spec Alignment" : "⚠️ Hard Specification Mismatch"}
              </span>
              <span style={{ fontSize: 11, color: "#69897f" }}>Source: Hardware Spec v2.1</span>
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
                <div style={{ color: batteryFixed ? "#176d54" : "#bc3b27", fontWeight: 700 }}>
                  {batteryFixed ? "12 hours (Lab Benchmark)" : "20 hours (Unverified)"}
                </div>
              </div>
              <div className={styles.evidenceCompareCard}>
                <div className={styles.evidenceCompareTitle}>Official Approved Spec</div>
                <div style={{ color: "#176d54", fontWeight: 700 }}>12 hours (Wi-Fi test)</div>
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

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className={styles.ssoSubmitBtn}
              onClick={handleRescan}
              style={{ background: "#176450" }}
            >
              Re-scan Draft
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
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#f0f8f4", border: "1px solid #cce8dc", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#165e4d" }}>
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
              className={styles.backBtn}
              style={{ background: selectedLang === "en" ? "#143e33" : "#edf5f1", color: selectedLang === "en" ? "#fff" : "#194a3d" }}
              onClick={() => setSelectedLang("en")}
            >
              English (US)
            </button>
            <button
              type="button"
              className={styles.backBtn}
              style={{ background: selectedLang === "te" ? "#143e33" : "#edf5f1", color: selectedLang === "te" ? "#fff" : "#194a3d" }}
              onClick={() => setSelectedLang("te")}
            >
              Telugu (తెలుగు)
            </button>
            <button
              type="button"
              className={styles.backBtn}
              style={{ background: selectedLang === "hi" ? "#143e33" : "#edf5f1", color: selectedLang === "hi" ? "#fff" : "#194a3d" }}
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

          <div style={{ marginTop: 14, background: "#fafdfb", border: "1px solid #dcece4", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#143d32", marginBottom: 6 }}>Recent Creator Submissions</div>
            <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef5f1" }}>
              <span>NovaBook S1 Launch Email</span>
              <span style={{ color: "#bd8338", fontWeight: 700 }}>In Review (Risk 78)</span>
            </div>
            <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eef5f1" }}>
              <span>Q4 Spring Laptop Teaser</span>
              <span style={{ color: "#1e8369", fontWeight: 700 }}>Approved</span>
            </div>
            <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>UltraSpeed Charger Social Post</span>
              <span style={{ color: "#5579d7", fontWeight: 700 }}>Submitted</span>
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

  const handleRouteToLegal = () => {
    setActionMessage("✓ NovaBook S1 launch email routed to Maya Chen (Legal Ops) for regulatory clearance.");
  };

  const handleRequestChanges = () => {
    setActionMessage("✓ Change request sent to Aisha Rahman: 'Ensure 12h lab benchmark is applied before re-submission.'");
  };

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
          <div className={styles.metricValue}>1 <span className={styles.metricChange} style={{ color: "#5579d7" }}>Pending</span></div>
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
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>NovaBook S1 launch email</strong></td>
                <td>Aisha Rahman</td>
                <td>Email</td>
                <td><span className={`${styles.riskBadge} ${styles.high}`}>78 High</span></td>
                <td><span style={{ color: "#bd8338", fontWeight: 700 }}>In Review</span></td>
              </tr>
              <tr>
                <td><strong>Enterprise UltraDock Spec Sheet</strong></td>
                <td>Carlos Mendez</td>
                <td>Web</td>
                <td><span className={`${styles.riskBadge} ${styles.medium}`}>52 Med</span></td>
                <td><span style={{ color: "#bd8338", fontWeight: 700 }}>In Review</span></td>
              </tr>
              <tr>
                <td><strong>Q4 Sustainability Whitepaper</strong></td>
                <td>Aisha Rahman</td>
                <td>PR / Web</td>
                <td><span className={`${styles.riskBadge} ${styles.low}`}>24 Low</span></td>
                <td><span style={{ color: "#1e8369", fontWeight: 700 }}>Approved</span></td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
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
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#f0f8f4", border: "1px solid #cce8dc", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#165e4d" }}>
              {actionMessage}
            </div>
          ) : null}
        </section>

        {/* Right: Channel Breakdown & Team Workload */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Campaign Operations &amp; Workload</h2>
          <p className={styles.panelSub}>Review distribution across publishing surfaces</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>Email Campaigns (Highest Exposure)</span>
                <span>45% of queue</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.amber}`} style={{ width: "45%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>Social &amp; Influencer Copy</span>
                <span>35% of queue</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.amber}`} style={{ width: "35%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>Website &amp; Product Pages</span>
                <span>20% of queue</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.amber}`} style={{ width: "20%" }} />
              </div>
            </div>
          </div>

          <div style={{ background: "#fafdfb", border: "1px solid #dcece4", borderRadius: 8, padding: 12, fontSize: 11 }}>
            <div style={{ fontWeight: 800, color: "#10352c", marginBottom: 4 }}>Manager Decision Log</div>
            <p style={{ margin: 0, color: "#486a60", lineHeight: 1.5 }}>
              Marcus Vance flagged superlative phrase &ldquo;our most reliable laptop yet&rdquo; for statutory review by Maya Chen under Lanham Act §43(a).
            </p>
          </div>

          <div style={{ marginTop: 14 }}>
            <button type="button" className={styles.backBtn} onClick={onOpenWorkspace} style={{ width: "100%", justifyContent: "center" }}>
              Open Manager Full Workspace →
            </button>
          </div>
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
          <div className={styles.metricValue}>{safeHarborApplied ? "0" : "1"} <span className={styles.metricChange} style={{ color: safeHarborApplied ? "#1e8369" : "#dc7968" }}>{safeHarborApplied ? "Mitigated" : "Superlative"}</span></div>
          <div className={styles.metricSubtext}>&ldquo;most reliable&rdquo; claim</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Quality Score Index</div>
          <div className={styles.metricValue}>95.2 <span className={styles.metricChange}>/ 100</span></div>
          <div className={styles.metricSubtext}>Accuracy + Legal + A11y</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Signed Certificates</div>
          <div className={styles.metricValue}>{certSigned ? "15" : "14"} <span className={styles.metricChange}>SHA-256</span></div>
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
                <span style={{ color: "#176d54", fontWeight: 800 }}>96% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "96%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>2. Statutory Legal Rules (FTC §5 &amp; Lanham Act)</span>
                <span style={{ color: safeHarborApplied ? "#176d54" : "#bd8338", fontWeight: 800 }}>{safeHarborApplied ? "98% (CLEARED)" : "92% (REVIEW)"}</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: safeHarborApplied ? "98%" : "92%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>3. VoltEdge Brand Guidelines Voice</span>
                <span style={{ color: "#176d54", fontWeight: 800 }}>95% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "95%" }} />
              </div>
            </div>

            <div className={styles.pillarRow}>
              <div className={styles.pillarMeta}>
                <span>4. Accessibility &amp; Non-Deceptive Pricing</span>
                <span style={{ color: "#176d54", fontWeight: 800 }}>98% (PASS)</span>
              </div>
              <div className={styles.pillarBarBg}>
                <div className={`${styles.pillarBarFill} ${styles.blue}`} style={{ width: "98%" }} />
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fbfd", border: "1px solid #d3e4f3", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#154278", marginBottom: 6 }}>
              Superlative &amp; Comparative Claim Scanner
            </div>
            <p style={{ fontSize: 11, margin: 0, color: "#2d5483", lineHeight: 1.5 }}>
              Claim flagged: <em>&ldquo;our most reliable laptop yet&rdquo;</em> (High-risk comparative claim under Lanham Act §43(a)).
            </p>
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className={styles.ssoSubmitBtn}
                style={{ background: safeHarborApplied ? "#176450" : "#5579d7" }}
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

          <button
            type="button"
            className={styles.signCertBtn}
            onClick={() => setCertSigned(true)}
          >
            {certSigned ? "✓ Certificate Signed & Exported" : "✍ Sign & Export Compliance Certificate"}
          </button>

          <div style={{ marginTop: 14 }}>
            <button type="button" className={styles.backBtn} onClick={onOpenWorkspace} style={{ width: "100%", justifyContent: "center" }}>
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

  return (
    <>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Truth Registry Coverage</div>
          <div className={styles.metricValue}>86% <span className={styles.metricChange}>18/21 Active</span></div>
          <div className={styles.metricSubtext}>Hardware, battery &amp; speed specs</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Guideline Gaps Detected</div>
          <div className={styles.metricValue}>{gapApproved ? "0" : "1"} <span className={styles.metricChange} style={{ color: gapApproved ? "#1e8369" : "#dc7968" }}>{gapApproved ? "Approved" : "Needs Review"}</span></div>
          <div className={styles.metricSubtext}>AI-discovered guideline update</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Verified Claims on File</div>
          <div className={styles.metricValue}>142 <span className={styles.metricChange}>Verified</span></div>
          <div className={styles.metricSubtext}>Backed by lab test reports</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Multi-Channel Dispatch</div>
          <div className={styles.metricValue}>{dispatched ? "9" : "8"} <span className={styles.metricChange}>Channels Active</span></div>
          <div className={styles.metricSubtext}>LinkedIn, X, Instagram</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: Guideline-Gap Approval */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Guideline-Gap Detector (AI Discovery)</h2>
          <p className={styles.panelSub}>Automatically flags recurring ambiguities in marketing drafts</p>

          <div style={{ background: "#f8fbf9", border: "1px solid #dbeae2", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#196855", textTransform: "uppercase", marginBottom: 4 }}>
              Recurring Pattern: Comparative Reliability Claims
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0e3127", marginBottom: 6 }}>
              Rule Clarification: &ldquo;Most reliable&rdquo; requires IEEE benchmark citation.
            </div>
            <p style={{ fontSize: 11, color: "#486a60", lineHeight: 1.5, margin: 0 }}>
              Flagged in 3 recent drafts across Marketing and PR. Approving this rule automatically updates the Truth Registry and informs creators during text input.
            </p>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className={styles.ssoSubmitBtn}
                style={{ background: gapApproved ? "#176450" : "#3e9a82" }}
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
            <span style={{ color: "#176d54", fontWeight: 700 }}>✓ Ready</span>
          </div>
          <div className={styles.channelRow}>
            <span><strong>X / Twitter Corporate</strong> (@VoltEdge)</span>
            <span style={{ color: "#176d54", fontWeight: 700 }}>✓ Ready</span>
          </div>
          <div className={styles.channelRow}>
            <span><strong>Instagram Product Studio</strong> (@voltedge_tech)</span>
            <span style={{ color: "#176d54", fontWeight: 700 }}>✓ Ready</span>
          </div>

          <button
            type="button"
            className={styles.dispatchBtn}
            onClick={() => setDispatched(true)}
          >
            {dispatched ? "✓ Content Dispatched to All Channels (Live)" : "🚀 1-Click Dispatch to Social Channels"}
          </button>
        </section>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 5. AGENCY PARTNER DASHBOARD
// -------------------------------------------------------------
function AgencyDashboard({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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
          <div className={styles.metricValue}>🔒 <span className={styles.metricChange} style={{ color: "#bd8338" }}>Masked</span></div>
          <div className={styles.metricSubtext}>Protected client data boundary</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending Notes</div>
          <div className={styles.metricValue}>{feedbackSubmitted ? "4" : "3"} <span className={styles.metricChange}>Threads</span></div>
          <div className={styles.metricSubtext}>Collaborative span comments</div>
        </div>
      </div>

      <div className={styles.dashboardWorkbench}>
        {/* Left: Sandboxed Campaign Workspace */}
        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Sandboxed Client Campaign View</h2>
          <p className={styles.panelSub}>External agency sandbox for Apex Creative</p>

          <div style={{ background: "#f8fbf9", border: "1px solid #dcece4", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#10352c", marginBottom: 6 }}>
              Campaign: VoltEdge NovaBook S1 Freelancer Promo
            </div>
            <ul style={{ paddingLeft: 18, margin: "0 0 10px", fontSize: 11, color: "#486a60", lineHeight: 1.6 }}>
              <li>Battery claim must not exceed 12 hours under any test scenario.</li>
              <li>Superlatives (&ldquo;best&rdquo;, &ldquo;most reliable&rdquo;) strictly barred in agency copy.</li>
              <li>Include #VoltEdgePartner tag as mandated by FTC 16 CFR § 255.</li>
            </ul>
            <button
              type="button"
              className={styles.ssoSubmitBtn}
              onClick={() => setFeedbackSubmitted(true)}
            >
              {feedbackSubmitted ? "✓ Comment Submitted to VoltEdge Team" : "＋ Add Span Feedback Comment"}
            </button>
          </div>

          <button type="button" className={styles.backBtn} onClick={onOpenWorkspace}>
            Open Sandboxed Review Queue →
          </button>
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
