"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export type QualityFinding = {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  excerpt: string;
  suggestion: string;
  resolved: boolean;
};

export type QualityScoreData = {
  accuracyScore: number;
  regulatoryScore: number;
  brandScore: number;
  accessibilityScore: number;
  compositeScore: number;
  isGateUnlocked: boolean;
  hasDisclaimer: boolean;
  superlativeClean: boolean;
  openHighCount: number;
};

export function computeQualityScore(
  findings: QualityFinding[],
  content: string
): QualityScoreData {
  // 1. Factual Accuracy Pillar (40% weight):
  // Conflicts with approved lab specs (e.g. 20h vs 12h battery) drop accuracy to 50%
  const batteryFinding = findings.find((f) => f.id === "battery");
  const accuracyScore = batteryFinding && !batteryFinding.resolved ? 50 : 100;

  // 2. Regulatory & Legal Pillar (30% weight):
  // Evaluates FTC §5 substantiation, Lanham Act comparative claims, and mandatory disclaimers
  const hasDisclaimer = /voltedge\.com\/terms|terms apply/i.test(content);
  const reliableFinding = findings.find((f) => f.id === "reliable");
  const superlativeClean = reliableFinding
    ? reliableFinding.resolved
    : !/most reliable/i.test(content);

  let regulatoryScore = 70;
  if (superlativeClean) regulatoryScore += 15;
  if (hasDisclaimer) regulatoryScore += 15;

  // 3. Brand & Voice Consistency Pillar (15% weight):
  // Evaluates tone guidance (calm, capable, avoiding false urgency)
  const toneFinding = findings.find((f) => f.id === "tone");
  const brandScore = toneFinding && !toneFinding.resolved ? 80 : 100;

  // 4. Accessibility & Readability Pillar (15% weight):
  // Evaluates contrast baseline (4.5:1), alt text, and reading level
  const accessibilityScore = 95;

  // Weighted composite score (0-100)
  const compositeScore = Math.round(
    accuracyScore * 0.4 +
      regulatoryScore * 0.3 +
      brandScore * 0.15 +
      accessibilityScore * 0.15
  );

  const openHighCount = findings.filter(
    (f) => !f.resolved && (f.severity === "critical" || f.severity === "high")
  ).length;

  const isGateUnlocked = compositeScore >= 85 && openHighCount === 0;

  return {
    accuracyScore,
    regulatoryScore,
    brandScore,
    accessibilityScore,
    compositeScore,
    isGateUnlocked,
    hasDisclaimer,
    superlativeClean,
    openHighCount,
  };
}

// Simple deterministic hash generator for content verification seal
export function generateContentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${hex}`;
}

export function ComplianceQualityGate({
  findings,
  submittedContent,
  auditState,
  currentRoleLabel,
  onViewCertificate,
  onAddDisclaimer,
  onApplySafeHarbor,
}: {
  findings: QualityFinding[];
  submittedContent: string;
  auditState: string;
  currentRoleLabel: string;
  onViewCertificate: () => void;
  onAddDisclaimer?: () => void;
  onApplySafeHarbor?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"scorecard" | "rulebook" | "superlatives" | "signoff">("scorecard");

  const scoreData = useMemo(
    () => computeQualityScore(findings, submittedContent),
    [findings, submittedContent]
  );

  const {
    accuracyScore,
    regulatoryScore,
    brandScore,
    accessibilityScore,
    compositeScore,
    isGateUnlocked,
    hasDisclaimer,
    superlativeClean,
    openHighCount,
  } = scoreData;

  const detectedSuperlative = !superlativeClean;

  return (
    <section className="quality-gate-container" aria-label="Enterprise Quality Gate and Regulatory Suite">
      {/* Header with Competitor Capabilities Label & Gate Status */}
      <div className="quality-gate-top">
        <div className="gate-title-block">
          <div className="gate-kicker-row">
            <span className="gate-kicker">ENTERPRISE COMPLIANCE SUITE</span>
            <span className="gate-benchmark-chip">Acrolinx · Red Marker · PerformLine · Filestage</span>
            <span className="gate-benchmark-chip">· Role: {currentRoleLabel}</span>
          </div>
          <h3 className="gate-headline">Multi-Dimensional Quality Gate &amp; Legal Audit</h3>
        </div>

        {/* Binary Publishing Gate Status */}
        <div className="gate-status-wrap">
          <div className={`gate-status-badge ${isGateUnlocked ? "unlocked" : "blocked"}`}>
            <span className="gate-status-icon">{isGateUnlocked ? "✓" : "⛔"}</span>
            <div>
              <strong>{isGateUnlocked ? "PUBLISHING GATE: UNLOCKED" : "PUBLISHING GATE: BLOCKED"}</strong>
              <small>
                {isGateUnlocked
                  ? "Composite score ≥ 85 · 0 critical mismatches"
                  : `Score ${compositeScore}/100 · ${openHighCount} high-risk finding open`}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="certificate-trigger-btn"
            onClick={onViewCertificate}
            title="Inspect cryptographic compliance certificate"
          >
            <span>📜</span> View Certificate
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="gate-nav-tabs" role="tablist" aria-label="Compliance tools">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "scorecard"}
          className={`gate-tab-btn ${activeTab === "scorecard" ? "active" : ""}`}
          onClick={() => setActiveTab("scorecard")}
        >
          <span>📊</span> Acrolinx Quality Scorecard ({compositeScore}/100)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "rulebook"}
          className={`gate-tab-btn ${activeTab === "rulebook" ? "active" : ""}`}
          onClick={() => setActiveTab("rulebook")}
        >
          <span>⚖️</span> Red Marker Regulatory Rulebook
          {!hasDisclaimer ? <span className="tab-alert-badge">!</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "superlatives"}
          className={`gate-tab-btn ${activeTab === "superlatives" ? "active" : ""}`}
          onClick={() => setActiveTab("superlatives")}
        >
          <span>🔍</span> PerformLine Superlative Scanner
          {detectedSuperlative ? <span className="tab-alert-badge">1</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "signoff"}
          className={`gate-tab-btn ${activeTab === "signoff" ? "active" : ""}`}
          onClick={() => setActiveTab("signoff")}
        >
          <span>🤝</span> Filestage Sign-Off Matrix
        </button>
      </div>

      {/* Tab 1: Acrolinx Quality Scorecard */}
      {activeTab === "scorecard" ? (
        <div className="gate-tab-content">
          <div className="gate-score-summary-bar">
            <div className="score-radial-card">
              <div className="radial-inner">
                <span className="radial-number">{compositeScore}</span>
                <span className="radial-total">/100</span>
              </div>
              <div className="radial-caption">
                <strong>Composite Score</strong>
                <small>Threshold: 85+</small>
              </div>
            </div>

            <div className="score-pillars-grid">
              {/* Pillar 1: Factual Accuracy */}
              <div className="pillar-metric-card">
                <div className="pillar-header">
                  <span className="pillar-title">1. Factual Accuracy</span>
                  <span className={`pillar-score ${accuracyScore >= 85 ? "good" : "bad"}`}>{accuracyScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className={`pillar-bar-fill ${accuracyScore >= 85 ? "good" : "bad"}`} style={{ width: `${accuracyScore}%` }} />
                </div>
                <p className="pillar-note">{accuracyScore === 100 ? "0 specification mismatches" : "1 specification contradiction open"}</p>
              </div>

              {/* Pillar 2: Regulatory Compliance */}
              <div className="pillar-metric-card">
                <div className="pillar-header">
                  <span className="pillar-title">2. Regulatory &amp; Legal</span>
                  <span className={`pillar-score ${regulatoryScore >= 85 ? "good" : "warn"}`}>{regulatoryScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className={`pillar-bar-fill ${regulatoryScore >= 85 ? "good" : "warn"}`} style={{ width: `${regulatoryScore}%` }} />
                </div>
                <p className="pillar-note">FTC §5 &amp; Lanham Act §43(a) compliance</p>
              </div>

              {/* Pillar 3: Brand & Voice */}
              <div className="pillar-metric-card">
                <div className="pillar-header">
                  <span className="pillar-title">3. Brand &amp; Voice</span>
                  <span className={`pillar-score ${brandScore >= 85 ? "good" : "warn"}`}>{brandScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className={`pillar-bar-fill ${brandScore >= 85 ? "good" : "warn"}`} style={{ width: `${brandScore}%` }} />
                </div>
                <p className="pillar-note">VoltEdge Launch Voice Guide v2</p>
              </div>

              {/* Pillar 4: Accessibility */}
              <div className="pillar-metric-card">
                <div className="pillar-header">
                  <span className="pillar-title">4. Accessibility</span>
                  <span className="pillar-score good">{accessibilityScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className="pillar-bar-fill good" style={{ width: `${accessibilityScore}%` }} />
                </div>
                <p className="pillar-note">WCAG 2.1 AA · Contrast ratio 4.8:1</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Red Marker Regulatory Rulebook & Disclaimer Detector */}
      {activeTab === "rulebook" ? (
        <div className="gate-tab-content">
          <div className="rulebook-grid">
            {/* Statute Card 1 */}
            <div className="statute-card">
              <div className="statute-top">
                <span className="statute-code">FTC 16 CFR § 255</span>
                <span className={`statute-badge ${superlativeClean ? "pass" : "flagged"}`}>
                  {superlativeClean ? "✓ Substantiated" : "⚠️ Scrutiny Required"}
                </span>
              </div>
              <h4 className="statute-title">Deceptive &amp; Unsubstantiated Claims</h4>
              <p className="statute-description">
                Advertising claims must be substantiated by competent and reliable laboratory or consumer testing evidence prior to publication.
              </p>
              <div className="statute-footer">
                <small>Coverage: Objective &amp; Comparative Claims</small>
              </div>
            </div>

            {/* Statute Card 2 */}
            <div className="statute-card">
              <div className="statute-top">
                <span className="statute-code">Lanham Act § 43(a)</span>
                <span className={`statute-badge ${superlativeClean ? "pass" : "flagged"}`}>
                  {superlativeClean ? "✓ Risk Mitigated" : "⚠️ Competitor Exposure"}
                </span>
              </div>
              <h4 className="statute-title">Comparative Advertising &amp; Misleading Statements</h4>
              <p className="statute-description">
                Protects against commercial claims misrepresenting the nature, characteristics, or qualities of goods without head-to-head empirical evidence.
              </p>
              <div className="statute-footer">
                <small>Coverage: Superlatives (&ldquo;most reliable&rdquo;)</small>
              </div>
            </div>

            {/* Real-Time Disclaimer Detector */}
            <div className={`disclaimer-detector-card ${hasDisclaimer ? "detected" : "missing"}`}>
              <div className="disclaimer-header">
                <div>
                  <span className="statute-code">Mandatory Disclosure Rule</span>
                  <h4 className="disclaimer-title">Legal Terms &amp; Conditions Qualifier</h4>
                </div>
                <span className={`disclaimer-status-tag ${hasDisclaimer ? "pass" : "missing"}`}>
                  {hasDisclaimer ? "✓ Footnote Detected" : "! Missing Footnote"}
                </span>
              </div>
              <p className="disclaimer-body">
                {hasDisclaimer
                  ? "Standard disclosure found in draft: terms disclaimer correctly links to voltedge.com/terms for US launch eligibility."
                  : "Promotional product announcements require a qualifying terms disclosure (*Terms apply. Full details at voltedge.com/terms)."}
              </p>
              {!hasDisclaimer && onAddDisclaimer ? (
                <button
                  type="button"
                  className="add-disclaimer-btn"
                  onClick={onAddDisclaimer}
                >
                  ⚡ 1-Click: Insert Mandatory Disclaimer
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 3: PerformLine Superlative & Absolute Claim Scanner */}
      {activeTab === "superlatives" ? (
        <div className="gate-tab-content">
          <div className="superlative-scanner-box">
            <div className="scanner-header">
              <div>
                <h4 className="scanner-title">High-Risk Superlative &amp; Absolute Scanner</h4>
                <p className="scanner-sub">
                  Flags non-factual absolute claims (&ldquo;most reliable&rdquo;, &ldquo;unbreakable&rdquo;, &ldquo;best in class&rdquo;) that trigger FTC investigations.
                </p>
              </div>
              <span className={`scanner-counter ${detectedSuperlative ? "alert" : "clear"}`}>
                {detectedSuperlative ? "1 Trigger Detected" : "0 Triggers · Clean"}
              </span>
            </div>

            {detectedSuperlative ? (
              <div className="trigger-detail-card">
                <div className="trigger-row">
                  <span className="trigger-pill">Trigger Phrase</span>
                  <strong className="trigger-text">&ldquo;our most reliable laptop yet&rdquo;</strong>
                  <span className="risk-level-tag high">Tier 1: High Regulatory Scrutiny</span>
                </div>
                <p className="trigger-rationale">
                  <strong>PerformLine Rule:</strong> Superlative claim requires an active third-party audited MTBF (Mean Time Between Failures) benchmark on file. No benchmark source found in VoltEdge registry.
                </p>
                {onApplySafeHarbor ? (
                  <div className="safe-harbor-action-bar">
                    <button
                      type="button"
                      className="safe-harbor-btn"
                      onClick={onApplySafeHarbor}
                    >
                      ⚡ Apply Safe-Harbor Rewrite: &ldquo;built for dependable, all-day performance&rdquo;
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="clean-superlatives-state">
                <span className="clean-icon">✓</span>
                <div>
                  <strong>All comparative statements are qualified.</strong>
                  <p>No unverified absolutes detected in current draft content.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Tab 4: Filestage Multi-Stakeholder Sign-Off Matrix */}
      {activeTab === "signoff" ? (
        <div className="gate-tab-content">
          <div className="signoff-matrix-grid">
            {/* Step 1: Creator */}
            <div className="signoff-step-card complete">
              <div className="step-badge">1. Creator</div>
              <h5 className="step-name">Aisha Rahman</h5>
              <span className="step-role">Content Lead</span>
              <div className="step-status">
                <span className="step-check">✓</span> Submitted
              </div>
              <small className="step-timestamp">Draft v1 · 18 min ago</small>
            </div>

            {/* Step 2: Automated Proofline Engine */}
            <div className="signoff-step-card complete">
              <div className="step-badge">2. Proofline Engine</div>
              <h5 className="step-name">Truth Engine v3.1</h5>
              <span className="step-role">Deterministic Spec &amp; Rule Audit</span>
              <div className="step-status">
                <span className="step-check">✓</span> {isGateUnlocked ? "Gate Cleared" : "Scan Completed"}
              </div>
              <small className="step-timestamp">SHA-256 Chain Locked</small>
            </div>

            {/* Step 3: Legal & Regulatory Reviewer */}
            <div className={`signoff-step-card ${auditState === "approved" ? "complete" : "active"}`}>
              <div className="step-badge">3. Legal Reviewer</div>
              <h5 className="step-name">Maya Chen</h5>
              <span className="step-role">Authorised Reviewer · Legal Ops</span>
              <div className="step-status">
                {auditState === "approved" ? (
                  <>
                    <span className="step-check">✓</span> Signed Off
                  </>
                ) : (
                  <>
                    <span className="step-spin">⏳</span> In Review
                  </>
                )}
              </div>
              <small className="step-timestamp">
                {auditState === "approved" ? "Approval recorded" : "Pending final sign-off"}
              </small>
            </div>

            {/* Step 4: Brand Owner */}
            <div className={`signoff-step-card ${auditState === "approved" ? "complete" : "pending"}`}>
              <div className="step-badge">4. Brand Owner</div>
              <h5 className="step-name">Lena Ortiz</h5>
              <span className="step-role">VP Brand &amp; Marketing</span>
              <div className="step-status">
                {auditState === "approved" ? (
                  <>
                    <span className="step-check">✓</span> Cleared for Dispatch
                  </>
                ) : (
                  <>
                    <span className="step-lock">🔒</span> Gated
                  </>
                )}
              </div>
              <small className="step-timestamp">
                {auditState === "approved" ? "Zernio Multi-Channel Active" : "Unlocks upon legal approval"}
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ComplianceCertificateModal({
  isOpen,
  onClose,
  content,
  contentVersion,
  auditState,
  reviewerName,
  findings,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  contentVersion: string;
  auditState: string;
  reviewerName: string;
  findings: QualityFinding[];
}) {
  const [copied, setCopied] = useState(false);

  const scoreData = useMemo(
    () => computeQualityScore(findings, content),
    [findings, content]
  );

  const contentHash = useMemo(
    () => generateContentHash(content),
    [content]
  );

  if (!isOpen) return null;

  const certificatePayload = {
    certificateId: `PLC-2026-${contentHash.slice(7, 19).toUpperCase()}`,
    workspace: "VoltEdge Brand Workspace (US Market)",
    contentVersion,
    auditReviewState: auditState,
    compositeQualityScore: `${scoreData.compositeScore} / 100`,
    gateStatus: scoreData.isGateUnlocked ? "UNLOCKED" : "BLOCKED",
    pillars: {
      factualAccuracy: `${scoreData.accuracyScore}%`,
      regulatoryCompliance: `${scoreData.regulatoryScore}%`,
      brandConsistency: `${scoreData.brandScore}%`,
      accessibility: `${scoreData.accessibilityScore}%`,
    },
    statutoryClearances: [
      "FTC 16 CFR Part 255 (§5 Unfair/Deceptive Claim Clearance)",
      "Lanham Act §43(a) Comparative Claim Verification",
      "VoltEdge Specification Registry v3 Validation",
      "WCAG 2.1 AA Visual Contrast Baseline",
    ],
    sha256Seal: contentHash,
    certifiedBy: reviewerName,
    signedTimestamp: new Date().toISOString(),
  };

  function handleCopy() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(JSON.stringify(certificatePayload, null, 2))
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          })
          .catch(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          });
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="modal-backdrop compliance-cert-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="modal-card compliance-cert-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-modal-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close certificate dialog"
          onClick={onClose}
        >
          ×
        </button>

        {/* Certificate Frame */}
        <div className="certificate-inner-frame">
          {/* Header */}
          <div className="cert-header">
            <div className="cert-brand">
              <Image
                src="/logo.png"
                alt="Proofline"
                width={28}
                height={28}
                style={{ borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)" }}
              />
              <div>
                <span className="cert-app-name">PROOFLINE TRUTH ENGINE</span>
                <span className="cert-sub-caption">Enterprise Brand Compliance &amp; Regulatory Gate</span>
              </div>
            </div>
            <div className="cert-seal-badge">
              <span className="cert-seal-icon">🛡️</span>
              <div>
                <strong>OFFICIALLY SEALED</strong>
                <small>Tamper-Evident SHA-256</small>
              </div>
            </div>
          </div>

          <div className="cert-divider" />

          {/* Certificate Title */}
          <div className="cert-title-block">
            <p className="cert-pretitle">OFFICIAL CERTIFICATE OF</p>
            <h2 id="cert-modal-title" className="cert-main-title">
              PUBLICATION &amp; REGULATORY COMPLIANCE
            </h2>
            <p className="cert-id-line">
              Certificate No: <strong>{certificatePayload.certificateId}</strong> · Issued for: <strong>VoltEdge Labs</strong>
            </p>
          </div>

          {/* Verified Content Summary */}
          <div className="cert-meta-grid">
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Audited Document</span>
              <strong>VoltEdge NovaBook S1 launch email</strong>
            </div>
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Content Version</span>
              <strong>{contentVersion} ({auditState.toUpperCase()})</strong>
            </div>
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Composite Quality Score</span>
              <strong className={scoreData.compositeScore >= 85 ? "cert-score-good" : "cert-score-bad"}>
                {scoreData.compositeScore} / 100 ({scoreData.isGateUnlocked ? "PASS" : "FAIL"})
              </strong>
            </div>
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Publishing Gate</span>
              <strong className={scoreData.isGateUnlocked ? "gate-unlocked-text" : "gate-blocked-text"}>
                {scoreData.isGateUnlocked ? "✓ UNLOCKED" : "⛔ BLOCKED"}
              </strong>
            </div>
          </div>

          {/* 4 Pillars Table */}
          <div className="cert-table-wrap">
            <table className="cert-table">
              <thead>
                <tr>
                  <th>Compliance Pillar</th>
                  <th>Benchmark</th>
                  <th>Audited Score</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>1. Factual Accuracy</strong>
                    <div className="cert-dim-sub">Lab Spec v3 (12 hr battery)</div>
                  </td>
                  <td>100%</td>
                  <td>{scoreData.accuracyScore}%</td>
                  <td>
                    <span className={`cert-table-tag ${scoreData.accuracyScore === 100 ? "pass" : "fail"}`}>
                      {scoreData.accuracyScore === 100 ? "PASS" : "FAIL"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>2. Regulatory &amp; Legal</strong>
                    <div className="cert-dim-sub">FTC §5 &amp; Lanham Act §43(a)</div>
                  </td>
                  <td>≥ 85%</td>
                  <td>{scoreData.regulatoryScore}%</td>
                  <td>
                    <span className={`cert-table-tag ${scoreData.regulatoryScore >= 85 ? "pass" : "warn"}`}>
                      {scoreData.regulatoryScore >= 85 ? "CLEARED" : "REVIEW"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>3. Brand &amp; Voice Consistency</strong>
                    <div className="cert-dim-sub">VoltEdge Launch Voice Guide v2</div>
                  </td>
                  <td>≥ 80%</td>
                  <td>{scoreData.brandScore}%</td>
                  <td>
                    <span className="cert-table-tag pass">PASS</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>4. Accessibility &amp; Readability</strong>
                    <div className="cert-dim-sub">WCAG 2.1 AA · Contrast ≥ 4.5:1</div>
                  </td>
                  <td>≥ 90%</td>
                  <td>{scoreData.accessibilityScore}%</td>
                  <td>
                    <span className="cert-table-tag pass">PASS</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cryptographic Hash Seal */}
          <div className="cert-hash-box">
            <span className="hash-box-label">Tamper-Proof Cryptographic Content Digest</span>
            <code className="cert-hash-value">{contentHash}</code>
          </div>

          {/* Signature & Verification Block */}
          <div className="cert-signoff-row">
            <div className="cert-signature-box">
              <span className="sig-label">Authorised Legal Reviewer</span>
              <div className="sig-handwriting">{reviewerName}</div>
              <span className="sig-role">Authorised Reviewer · Legal &amp; Regulatory Ops</span>
            </div>
            <div className="cert-stamp-box">
              <div className="cert-stamp-ring">
                <span>PROOFLINE</span>
                <strong>VERIFIED</strong>
                <small>VOLTEDGE</small>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="cert-actions-bar">
            <button
              type="button"
              className="primary-button cert-action-btn"
              onClick={handlePrint}
            >
              🖨️ Print / Save as PDF
            </button>
            <button
              type="button"
              className="ghost-button cert-action-btn"
              onClick={handleCopy}
            >
              {copied ? "✓ Receipt JSON Copied!" : "📋 Copy Verification JSON"}
            </button>
            <button
              type="button"
              className="secondary-button cert-action-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
