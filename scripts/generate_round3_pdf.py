#!/usr/bin/env python3
"""
Generate publication-grade Round 3 Final Product Submission PDF for Proofline.
Uses ReportLab with high-fidelity formatting, tables, callout boxes, and official styling.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#5c7169"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "PROOFLINE — Round 3 Final Product Submission · Binary Brains")
            self.setStrokeColor(colors.HexColor("#d5deda"))
            self.setLineWidth(0.5)
            self.line(54, 744, letter[0] - 54, 744)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, footer_text)
        self.drawString(54, 36, "Confidential & Proprietary · Hackathon Round 3 Submission · https://proofline-4cz.pages.dev")
        self.setStrokeColor(colors.HexColor("#d5deda"))
        self.setLineWidth(0.5)
        self.line(54, 46, letter[0] - 54, 46)
        
        self.restoreState()

def build_pdf():
    pdf_path = "docs/Proofline_Round_3_Final_Product.pdf"
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0f2d26")
    accent_color = colors.HexColor("#1b4d3e")
    highlight_color = colors.HexColor("#2a7a63")
    dark_neutral = colors.HexColor("#1e2925")
    muted_neutral = colors.HexColor("#52665e")
    card_bg = colors.HexColor("#f4f7f5")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=highlight_color,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=dark_neutral,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=primary_color
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=dark_neutral
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.white
    )

    story = []

    # Title & Header
    logo_path = "public/logo.png"
    if os.path.exists(logo_path):
        header_table = Table(
            [[Image(logo_path, width=42, height=42), 
              [Paragraph("PROOFLINE", title_style), 
               Paragraph("Evidence-Backed Brand Governance — Final Product Submission", subtitle_style)]]],
            colWidths=[50, 454]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (1,0), (1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
    else:
        story.append(Paragraph("PROOFLINE", title_style))
        story.append(Paragraph("Evidence-Backed Brand Governance — Final Product Submission", subtitle_style))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=4, spaceAfter=10))

    # Submission Meta Table
    meta_data = [
        [Paragraph("Submission Item", table_header), Paragraph("Verified Detail / URL", table_header)],
        [Paragraph("Live Web Application", table_cell), Paragraph("<b>https://proofline-4cz.pages.dev</b> (Cloudflare Pages)", table_cell)],
        [Paragraph("Live Edge API Worker", table_cell), Paragraph("<b>https://proofline-api.potlasrisharanchowdary.workers.dev/health</b>", table_cell)],
        [Paragraph("Source Code Repository", table_cell), Paragraph("<b>https://github.com/potlasrisharan/proofline</b>", table_cell)],
        [Paragraph("Team Name & Lead", table_cell), Paragraph("<b>Binary Brains</b> · Potla Sri Sharan (potlasrisharanchowdary@gmail.com)", table_cell)],
        [Paragraph("Evaluation Window", table_cell), Paragraph("Round 3: Oct 31, 11:59 PM – Nov 3, 11:59 PM (72 Hours)", table_cell)],
        [Paragraph("Event Form", table_cell), Paragraph("https://forms.gle/FxhT5Z1NupvGTGSw6", table_cell)],
    ]
    meta_table = Table(meta_data, colWidths=[140, 364])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [card_bg, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d5deda")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Section 1: Executive Summary & Real-World Need
    story.append(Paragraph("1. Executive Summary & Problem Formulation", h1_style))
    story.append(Paragraph(
        "Generative AI has increased marketing content production velocity by 10x, but brand safety and spec accuracy "
        "remain bottlenecks. Marketing teams frequently draft content with contradicted specs (e.g. 20h battery instead of "
        "approved 12h), expired discounts, unverified superlatives ('our most reliable laptop'), and missing legal qualifiers. "
        "Traditional brand guidelines sit in static PDFs that creators and AI tools never check.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Proofline</b> is an evidence-first brand governance workspace operating as an automated pre-publication quality gate. "
        "Every claim is extracted, cross-checked against a versioned Brand Truth Registry, and linked to exact source evidence. "
        "Unlike generative tools that hallucinate confidence, Proofline operates on an <b>Evidence-or-Abstain</b> philosophy: "
        "if approved evidence does not exist, Proofline explicitly flags the claim as <i>Needs Human Review</i> rather than inventing facts.",
        body_style
    ))

    # Section 2: The Three Delivered Improvements
    story.append(Spacer(1, 8))
    story.append(Paragraph("2. The Three Improvements Delivered (Round 2 Commitments)", h1_style))
    story.append(Paragraph(
        "In Round 2, Team Binary Brains committed to delivering three exact improvements in Round 3. All three are fully built, tested, and demonstrated:",
        body_style
    ))

    # Improvement 1
    story.append(Paragraph("⚡ Improvement 1: Full Fact-Change Impact Radar (/impact)", h2_style))
    story.append(Paragraph(
        "• <b>Problem Solved:</b> When a product spec changes or a seasonal promotion ends, previously approved content drafts become outdated silently.<br/>"
        "• <b>Delivered Solution:</b> An automated impact queue that maps claim-to-fact lineage across all registered content. When a spec changes, the Radar immediately identifies affected drafts, highlights old vs. new values (e.g. 10h → 12h battery life), flags records as <code>re_review_required</code>, and executes 1-click batch re-auditing with auditable task receipts.<br/>"
        "• <b>Interactive Showcase:</b> The judge can simulate real-time spec updates directly on <code>/impact</code> and watch the queue dynamically revalidate.",
        body_style
    ))

    # Improvement 2
    story.append(Paragraph("⚡ Improvement 2: Evidence-or-Abstain Reliability Layer (/findings, API Verifier, Eval Suite)", h2_style))
    story.append(Paragraph(
        "• <b>Problem Solved:</b> AI verification tools lose enterprise trust when they hallucinate sources or claim an unverified statement is false.<br/>"
        "• <b>Delivered Solution:</b> A strict tri-state verification engine distinguishing <b>Contradicted</b> (direct spec conflict), <b>Unsupported / Gap</b> (unsubstantiated claims where Proofline strictly abstains from guessing), and <b>Needs Human Review</b> (subjective tone). Backed by a high-severity deterministic verifier for exact units, currencies, and dates.<br/>"
        "• <b>Benchmark Test Corpus:</b> 194-case VoltEdge evaluation dataset achieving <b>100% precision</b> on legal, offer, and promotional categories (tracked in <code>docs/EVAL_REPORT.md</code>).",
        body_style
    ))

    # Improvement 3
    story.append(Paragraph("⚡ Improvement 3: Governance Insights & Guideline-Gap Detector (/insights)", h2_style))
    story.append(Paragraph(
        "• <b>Problem Solved:</b> Repeated mistakes in marketing copy indicate ambiguous guidelines or training gaps, which corrections alone do not resolve.<br/>"
        "• <b>Delivered Solution:</b> Telemetry dashboard tracking recurring mistake patterns by category, rule frequency, UTC weekly trends, and team/agency breakdowns (excluding toxic individual rankings).<br/>"
        "• <b>Guideline-Gap Detector:</b> Analyzes frequent reviewer overrides to propose clearer guideline wording. Authorised brand owners can approve proposed wording updates with 1-click directly in the UI.",
        body_style
    ))

    story.append(PageBreak())

    # Section 3: Technical Architecture & Implementation
    story.append(Paragraph("3. Technical Architecture & Implementation Summary", h1_style))
    story.append(Paragraph(
        "Proofline is built on modern, edge-native, decoupled infrastructure designed for high throughput, sub-50ms latency, and absolute data integrity:",
        body_style
    ))

    arch_data = [
        [Paragraph("Layer", table_header), Paragraph("Technology Stack", table_header), Paragraph("Implementation Details & Scope", table_header)],
        [Paragraph("Frontend UI", table_cell), Paragraph("Next.js 16 (App Router)<br/>React 19 + TypeScript (Strict)", table_cell), Paragraph("Responsive dashboard, side-by-side visual diffs, 1-click correction editor, theme contrast (WCAG AA), zero hydration errors.", table_cell)],
        [Paragraph("Edge Deployment", table_cell), Paragraph("Cloudflare Pages<br/>(Global CDN)", table_cell), Paragraph("Static HTML export deployed to 300+ edge cities. High availability, asset caching, sub-50ms TTFB worldwide.", table_cell)],
        [Paragraph("Backend Edge API", table_cell), Paragraph("Cloudflare Python Workers<br/>(FastAPI ASGI Handler)", table_cell), Paragraph("Deterministic verification engine, claim extractor, impact routes, and CORS middleware running edge compute.", table_cell)],
        [Paragraph("Persistence & DB", table_cell), Paragraph("Cloudflare D1 Database<br/>(Remote SQLite)", table_cell), Paragraph("Schema-versioned tables for Brand Truth Registry, claim links, content versions, and SHA-256 audit events.", table_cell)],
        [Paragraph("Cross-Lingual AI", table_cell), Paragraph("Sarvam AI Integration<br/>(Telugu & Hindi)", table_cell), Paragraph("Prompt-engineered Indic translation and terminology consistency auditor for Indian regional campaigns.", table_cell)],
        [Paragraph("Gated Dispatch", table_cell), Paragraph("Zernio Sandbox Mock<br/>(Multi-Platform)", table_cell), Paragraph("Simulated publishing to LinkedIn, Instagram, X, and Webflow unlocked only after human compliance approval.", table_cell)],
        [Paragraph("Audit Integrity", table_cell), Paragraph("SHA-256 Hash Chain", table_cell), Paragraph("Cryptographic tamper-evident ledger validating sequential edits, suggestions, dismissals, and approvals.", table_cell)],
    ]
    arch_table = Table(arch_data, colWidths=[90, 130, 284])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [card_bg, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d5deda")),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    # Architecture Tenets Callout
    callout_data = [[
        Paragraph(
            "<b>Architectural Discipline:</b> Proofline strictly preserves system boundaries. The app provides a visible <b>Engine Switcher</b>: judges can execute against the live Cloudflare Python Worker & D1 database or test client-side via the Local Demo Engine with zero external network dependencies.",
            callout_style
        )
    ]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eaf3f0")),
        ('BOX', (0,0), (-1,-1), 1, highlight_color),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(callout_table)

    # Section 4: Reliability & Testing Details
    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Testing & Reliability Details ('Holds Up Without You')", h1_style))
    story.append(Paragraph(
        "Proofline has been stress-tested across edge cases so any judge can explore without encountering broken states, crashes, or hangs:",
        body_style
    ))

    test_metrics = [
        [Paragraph("Test Category", table_header), Paragraph("Count & Status", table_header), Paragraph("Verified Criteria & Failure-Mode Prevention", table_header)],
        [Paragraph("Playwright E2E Tests", table_cell), Paragraph("<b>49 Tests Passed</b><br/>(1 skipped, 50 total)", table_cell), Paragraph("Chromium/WebKit verification of judge 1-click flows, intake, diff rendering, Sarvam AI modal, role login, and engine switching.", table_cell)],
        [Paragraph("Backend Pytest Suite", table_cell), Paragraph("<b>159 Tests Passed</b><br/>(0 failures)", table_cell), Paragraph("Complete coverage of FastAPI routes, role RBAC, ingestion parsers (PDF, DOCX, images), impact controllers, and Groq/Sarvam fallbacks.", table_cell)],
        [Paragraph("VoltEdge Golden Dataset", table_cell), Paragraph("<b>194 Cases Checked</b><br/>(100% precision)", table_cell), Paragraph("154/154 factual precision, unit conversions, currency parsing (USD/EUR/GBP/INR), prompt injection defence.", table_cell)],
        [Paragraph("Type & Code Quality", table_cell), Paragraph("<b>0 Errors / 0 Warnings</b>", table_cell), Paragraph("TypeScript strict mode (tsc --noEmit) and ESLint 9 pass clean across all client and worker code.", table_cell)],
    ]
    test_table = Table(test_metrics, colWidths=[120, 110, 274])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [card_bg, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d5deda")),
    ]))
    story.append(test_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Defensive UX & Fault Tolerance:", h2_style))
    story.append(Paragraph("• <b>Empty Inputs:</b> Submitting blank or whitespace drafts produces clean inline alerts without 500 errors.<br/>"
                           "• <b>Direct Visit & Refresh:</b> Navigating directly to <code>/findings</code> with no active draft shows a friendly empty state with an instant <b>'⚡ Load Sample NovaBook S1 Review'</b> button.<br/>"
                           "• <b>Double-Submit Prevention:</b> All action buttons disable during processing (<code>disabled={busy}</code>) to eliminate race conditions.", body_style))

    story.append(PageBreak())

    # Section 5: Usability & Real-World Fit
    story.append(Paragraph("5. Usability & Real-World Fit (Judge Walkthrough-Free Experience)", h1_style))
    story.append(Paragraph(
        "Proofline features an eye-catching <b>Judge Quick-Demo Header</b> right at the top of the workspace. Any judge can evaluate every major capability and all three Round 2 commitments in under 2 minutes:",
        body_style
    ))

    demo_buttons = [
        [Paragraph("Preset Scenario", table_header), Paragraph("Target Route", table_header), Paragraph("What the Judge Experiences", table_header)],
        [Paragraph("<b>① [IMP-1] Impact Radar</b>", table_cell), Paragraph("<code>/impact</code>", table_cell), Paragraph("Opens cascading impact queue, shows old vs new spec values, and runs 1-click batch re-audit.", table_cell)],
        [Paragraph("<b>② [IMP-2] Evidence-or-Abstain</b>", table_cell), Paragraph("<code>/?view=reviews</code>", table_cell), Paragraph("Highlights unverified claim ('our most reliable laptop') abstaining from guessing vs hard contradiction on battery.", table_cell)],
        [Paragraph("<b>③ [IMP-3] Guideline-Gap</b>", table_cell), Paragraph("<code>/insights</code>", table_cell), Paragraph("Displays recurring mistake telemetry and allows 1-click Brand Owner approval of clearer rule wording.", table_cell)],
        [Paragraph("<b>④ Claim Audit & Visual Diff</b>", table_cell), Paragraph("<code>/?view=reviews</code>", table_cell), Paragraph("Shows inline red strike-through flagged text and bold green suggested fix with 1-click apply.", table_cell)],
        [Paragraph("<b>⑤ Indic Verification (Sarvam)</b>", table_cell), Paragraph("Modal", table_cell), Paragraph("Cross-lingual Indian campaign brand checks across Telugu and Hindi powered by Sarvam AI.", table_cell)],
        [Paragraph("<b>⑥ 1-Click Gated Dispatch</b>", table_cell), Paragraph("Modal", table_cell), Paragraph("Multi-platform publishing sandbox (LinkedIn, Instagram, X) unlocked only after review sign-off.", table_cell)],
        [Paragraph("<b>⑦ Cryptographic Audit Chain</b>", table_cell), Paragraph("<code>/?view=audit-log</code>", table_cell), Paragraph("Inspects SHA-256 tamper-evident hash ledger verifying sequential action integrity.", table_cell)],
    ]
    demo_table = Table(demo_buttons, colWidths=[140, 90, 274])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [card_bg, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d5deda")),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 12))

    # Section 6: Product Roadmap & Future Plan
    story.append(Paragraph("6. Product Roadmap & Future Development Plan", h1_style))
    story.append(Paragraph("Proofline has a concrete, phased path from this event MVP to an enterprise SaaS platform:", body_style))

    roadmap_data = [
        [Paragraph("Quarter", table_header), Paragraph("Focus Area", table_header), Paragraph("Key Deliverables & Milestones", table_header)],
        [Paragraph("<b>Q1 2027</b>", table_cell), Paragraph("Ecosystem Plugins", table_cell), Paragraph("• WordPress & Webflow native plugins for real-time claim validation in CMS editors.<br/>• Google Docs Add-on & Figma plugin for pre-submission checks during drafting.<br/>• Slack & MS Teams notification webhooks for high-risk approvals.", table_cell)],
        [Paragraph("<b>Q2 2027</b>", table_cell), Paragraph("Multi-Modal & Vision", table_cell), Paragraph("• Multi-image brand palette distance, logo clearspace, and packaging compliance.<br/>• Video caption/SRT auditing for YouTube, TikTok, and Instagram Reels.<br/>• Cloudflare Workers AI OCR fallback for multi-language promotional posters.", table_cell)],
        [Paragraph("<b>Q3 2027</b>", table_cell), Paragraph("Regulatory Automation", table_cell), Paragraph("• Automated ingestion of FTC, ASA, and ASCI advertising compliance rules.<br/>• Multi-tenant workspace management for marketing agencies with 50+ clients.<br/>• Automated periodic re-crawling of published web URLs against updated registries.", table_cell)],
        [Paragraph("<b>Q4 2027</b>", table_cell), Paragraph("Enterprise Scale", table_cell), Paragraph("• SOC 2 Type II compliance & HIPAA-compliant redaction mode.<br/>• Fine-tuned small language models deployed on edge workers for ultra-low latency.<br/>• Enterprise SSO (Okta, Azure AD) with granular workspace role inheritance.", table_cell)],
    ]
    roadmap_table = Table(roadmap_data, colWidths=[60, 110, 334])
    roadmap_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [card_bg, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d5deda")),
    ]))
    story.append(roadmap_table)
    story.append(Spacer(1, 14))

    # Sign-off box
    signoff_data = [[
        Paragraph(
            "<b>Team Binary Brains Verification:</b> This document, the live application, and source repository represent the complete, verified Round 3 submission. Built and delivered within the official event window.<br/>"
            "<b>Lead:</b> Potla Sri Sharan · <b>Live App:</b> https://proofline-4cz.pages.dev · <b>Repo:</b> https://github.com/potlasrisharan/proofline",
            callout_style
        )
    ]]
    signoff_table = Table(signoff_data, colWidths=[504])
    signoff_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#edf4f1")),
        ('BOX', (0,0), (-1,-1), 1, primary_color),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(signoff_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Round 3 Final Product PDF at: {pdf_path}")

if __name__ == "__main__":
    build_pdf()
