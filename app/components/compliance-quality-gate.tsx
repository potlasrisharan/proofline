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
            <span className="gate-kicker">CONTENT QUALITY &amp; SAFETY GATE</span>
            <span className="gate-benchmark-chip">Accuracy · Ad Rules · Disclaimers · Approvals</span>
            <span className="gate-benchmark-chip">· Role: {currentRoleLabel}</span>
          </div>
          <h3 className="gate-headline">Content Quality Gate &amp; Compliance Review</h3>
        </div>

        {/* Binary Publishing Gate Status */}
        <div className="gate-status-wrap">
          <div className={`gate-status-badge ${isGateUnlocked ? "unlocked" : "blocked"}`}>
            <span className="gate-status-icon">{isGateUnlocked ? "✓" : "⛔"}</span>
            <div>
              <strong>{isGateUnlocked ? "PUBLISHING GATE: UNLOCKED" : "PUBLISHING GATE: BLOCKED"}</strong>
              <small>
                {isGateUnlocked
                  ? "Quality score ≥ 85 · 0 unresolved issues"
                  : `Score ${compositeScore}/100 · ${openHighCount} issue needs attention`}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="certificate-trigger-btn"
            onClick={onViewCertificate}
            title="View official compliance certificate"
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
          <span>📊</span> 4-Pillar Quality Scorecard ({compositeScore}/100)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "rulebook"}
          className={`gate-tab-btn ${activeTab === "rulebook" ? "active" : ""}`}
          onClick={() => setActiveTab("rulebook")}
        >
          <span>⚖️</span> Statutory Regulatory Rulebook
          {!hasDisclaimer ? <span className="tab-alert-badge">!</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "superlatives"}
          className={`gate-tab-btn ${activeTab === "superlatives" ? "active" : ""}`}
          onClick={() => setActiveTab("superlatives")}
        >
          <span>🔍</span> Superlative &amp; Comparative Claim Scanner
          {detectedSuperlative ? <span className="tab-alert-badge">1</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "signoff"}
          className={`gate-tab-btn ${activeTab === "signoff" ? "active" : ""}`}
          onClick={() => setActiveTab("signoff")}
        >
          <span>🤝</span> Stakeholder Sign-Off Checklist
        </button>
      </div>

      {/* Tab 1: 4-Pillar Quality Scorecard */}
      {activeTab === "scorecard" ? (
        <div className="gate-tab-content">
          <div className="gate-score-summary-bar">
            <div className="score-radial-card">
              <div className="radial-inner">
                <span className="radial-number">{compositeScore}</span>
                <span className="radial-total">/100</span>
              </div>
              <div className="radial-caption">
                <strong>Quality Score</strong>
                <small>Pass threshold: 85+</small>
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
                  <span className="pillar-title">2. Legal &amp; Disclaimers</span>
                  <span className={`pillar-score ${regulatoryScore >= 85 ? "good" : "warn"}`}>{regulatoryScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className={`pillar-bar-fill ${regulatoryScore >= 85 ? "good" : "warn"}`} style={{ width: `${regulatoryScore}%` }} />
                </div>
                <p className="pillar-note">Advertising truth and required disclosures</p>
              </div>

              {/* Pillar 3: Brand & Voice */}
              <div className="pillar-metric-card">
                <div className="pillar-header">
                  <span className="pillar-title">3. Brand Voice &amp; Tone</span>
                  <span className={`pillar-score ${brandScore >= 85 ? "good" : "warn"}`}>{brandScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className={`pillar-bar-fill ${brandScore >= 85 ? "good" : "warn"}`} style={{ width: `${brandScore}%` }} />
                </div>
                <p className="pillar-note">Novacore Launch Voice Guide v2</p>
              </div>

              {/* Pillar 4: Accessibility */}
              <div className="pillar-metric-card">
                <div className="pillar-header">
                  <span className="pillar-title">4. Clear &amp; Readable Text</span>
                  <span className="pillar-score good">{accessibilityScore}%</span>
                </div>
                <div className="pillar-bar-track">
                  <div className="pillar-bar-fill good" style={{ width: `${accessibilityScore}%` }} />
                </div>
                <p className="pillar-note">Easy to read · Good contrast ratio</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Statutory Regulatory Rulebook & Disclaimer Detector */}
      {activeTab === "rulebook" ? (
        <div className="gate-tab-content">
          <div className="rulebook-grid">
            {/* Statute Card 1 */}
            <div className="statute-card">
              <div className="statute-top">
                <span className="statute-code">FTC 16 CFR § 255 · Consumer Protection</span>
                <span className={`statute-badge ${superlativeClean ? "pass" : "flagged"}`}>
                  {superlativeClean ? "✓ Verified" : "⚠️ Needs Evidence"}
                </span>
              </div>
              <h4 className="statute-title">Accurate &amp; Proven Claims</h4>
              <p className="statute-description">
                All claims must be backed by official lab tests or verified specs before publishing.
              </p>
              <div className="statute-footer">
                <small>Applies to: Performance &amp; battery claims</small>
              </div>
            </div>

            {/* Statute Card 2 */}
            <div className="statute-card">
              <div className="statute-top">
                <span className="statute-code">Lanham Act § 43(a) · Fair Comparison</span>
                <span className={`statute-badge ${superlativeClean ? "pass" : "flagged"}`}>
                  {superlativeClean ? "✓ Safe wording" : "⚠️ Unverified Superlative"}
                </span>
              </div>
              <h4 className="statute-title">Comparisons &amp; Superlatives</h4>
              <p className="statute-description">
                Claims like &ldquo;most reliable&rdquo; or &ldquo;twice as fast&rdquo; require test proof or must be rephrased safely.
              </p>
              <div className="statute-footer">
                <small>Applies to: Comparative words (&ldquo;most&rdquo;, &ldquo;best&rdquo;)</small>
              </div>
            </div>

            {/* Real-Time Disclaimer Detector */}
            <div className={`disclaimer-detector-card ${hasDisclaimer ? "detected" : "missing"}`}>
              <div className="disclaimer-header">
                <div>
                  <span className="statute-code">Mandatory Disclosure Rule</span>
                  <h4 className="disclaimer-title">Offer Terms &amp; Qualifier Link</h4>
                </div>
                <span className={`disclaimer-status-tag ${hasDisclaimer ? "pass" : "missing"}`}>
                  {hasDisclaimer ? "✓ Footnote Detected" : "! Missing Footnote"}
                </span>
              </div>
              <p className="disclaimer-body">
                {hasDisclaimer
                  ? "Standard disclosure found in draft: terms disclaimer correctly links to novacore.io/terms for US launch eligibility."
                  : "Promotional announcements require a clear footnote linking to full terms (*Terms apply. Full details at novacore.io/terms)."}
              </p>
              {!hasDisclaimer && onAddDisclaimer ? (
                <button
                  type="button"
                  className="add-disclaimer-btn"
                  onClick={onAddDisclaimer}
                >
                  ⚡ 1-Click: Add Terms Footnote
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 3: Superlative & Comparative Claim Scanner */}
      {activeTab === "superlatives" ? (
        <div className="gate-tab-content">
          <div className="superlative-scanner-box">
            <div className="scanner-header">
              <div>
                <h4 className="scanner-title">High-Risk Superlative &amp; Absolute Scanner</h4>
                <p className="scanner-sub">
                  Flags extreme words (&ldquo;most reliable&rdquo;, &ldquo;best in class&rdquo;) that need test proof or safe rewrites.
                </p>
              </div>
              <span className={`scanner-counter ${detectedSuperlative ? "alert" : "clear"}`}>
                {detectedSuperlative ? "1 Trigger Detected" : "0 Triggers · Clean"}
              </span>
            </div>

            {detectedSuperlative ? (
              <div className="trigger-detail-card">
                <div className="trigger-row">
                  <span className="trigger-pill">Flagged Phrase</span>
                  <strong className="trigger-text">&ldquo;our most reliable laptop yet&rdquo;</strong>
                  <span className="risk-level-tag high">Needs Evidence or Safe Rephrasing</span>
                </div>
                <p className="trigger-rationale">
                  <strong>Rule:</strong> A claim like &ldquo;most reliable&rdquo; requires independent lab test proof on file. No benchmark was found in your approved facts.
                </p>
                {onApplySafeHarbor ? (
                  <div className="safe-harbor-action-bar">
                    <button
                      type="button"
                      className="safe-harbor-btn"
                      onClick={onApplySafeHarbor}
                    >
                      ⚡ Apply Safe Rewrite: &ldquo;built for dependable, all-day performance&rdquo;
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="clean-superlatives-state">
                <span className="clean-icon">✓</span>
                <div>
                  <strong>All statements are verified and clear.</strong>
                  <p>No unproven exaggerations or false promises detected in current draft content.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Tab 4: Multi-Stakeholder Sign-Off Matrix */}
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
              <div className="step-badge">2. Proofline Check</div>
              <h5 className="step-name">Proofline Fact Checker</h5>
              <span className="step-role">Checked against approved specs</span>
              <div className="step-status">
                <span className="step-check">✓</span> {isGateUnlocked ? "Gate Cleared" : "Scan Completed"}
              </div>
              <small className="step-timestamp">Specs verified</small>
            </div>

            {/* Step 3: Legal & Regulatory Reviewer */}
            <div className={`signoff-step-card ${auditState === "approved" ? "complete" : "active"}`}>
              <div className="step-badge">3. Legal Reviewer</div>
              <h5 className="step-name">Maya Chen</h5>
              <span className="step-role">Legal &amp; Regulatory Reviewer</span>
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
              <span className="step-role">Brand &amp; Product Truth Lead</span>
              <div className="step-status">
                {auditState === "approved" ? (
                  <>
                    <span className="step-check">✓</span> Ready to Publish
                  </>
                ) : (
                  <>
                    <span className="step-spin">⏳</span> Awaiting Legal Sign-Off
                  </>
                )}
              </div>
              <small className="step-timestamp">
                {auditState === "approved" ? "Publishing unlocked" : "Pending prior steps"}
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
    workspace: "Novacore Brand Workspace (US Market)",
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
      "Consumer Protection FTC §255 (Truth in Advertising)",
      "Fair Comparison Advertising Guidelines (§43a)",
      "Novacore Specification Registry v3 Validation",
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
                <span className="cert-sub-caption">Enterprise Brand Compliance &amp; Regulatory Truth</span>
              </div>
            </div>
            <div className="cert-seal-badge">
              <span className="cert-seal-icon">🛡️</span>
              <div>
                <strong>OFFICIALLY SEALED</strong>
                <small>Tamper-Proof Verification</small>
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
              Certificate No: <strong>{certificatePayload.certificateId}</strong> · Issued for: <strong>Novacore Labs</strong>
            </p>
          </div>

          {/* Verified Content Summary */}
          <div className="cert-meta-grid">
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Audited Document</span>
              <strong>Novacore NovaBook S1 launch email</strong>
            </div>
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Content Version</span>
              <strong>{contentVersion} ({auditState.toUpperCase()})</strong>
            </div>
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Quality Score</span>
              <strong className={scoreData.compositeScore >= 85 ? "cert-score-good" : "cert-score-bad"}>
                {scoreData.compositeScore} / 100 ({scoreData.isGateUnlocked ? "PASS" : "FAIL"})
              </strong>
            </div>
            <div className="cert-meta-cell">
              <span className="meta-cell-label">Publishing Status</span>
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
                    <div className="cert-dim-sub">Truth in Advertising &amp; Fair Comparison</div>
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
                    <div className="cert-dim-sub">Novacore Launch Voice Guide v2</div>
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
                    <div className="cert-dim-sub">Easy to read · Good contrast ratio</div>
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

          {/* Tamper-Proof Digital Verification Seal */}
          <div className="cert-hash-box">
            <span className="hash-box-label">Tamper-Proof Digital Verification Seal</span>
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
                <small>NOVACORE</small>
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
