import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_docx(dest_paths):
    doc = Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    run_title = title_p.add_run("PROOFLINE — ROUND 2 PPT REVISION INSTRUCTIONS")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(14)
    run_sub = sub_p.add_run("Team Binary Brains • Verified Slide-by-Slide Copy Changes (Slides 1 to 10)")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(11)
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    def add_slide_header(title, subtitle=None):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(16)
        h.paragraph_format.space_after = Pt(4)
        run_h = h.add_run(title)
        run_h.font.name = "Arial"
        run_h.font.size = Pt(13)
        run_h.font.bold = True
        run_h.font.color.rgb = RGBColor(30, 41, 59)
        
        if subtitle:
            sub = doc.add_paragraph()
            sub.paragraph_format.space_before = Pt(0)
            sub.paragraph_format.space_after = Pt(6)
            run_s = sub.add_run(subtitle)
            run_s.font.name = "Arial"
            run_s.font.size = Pt(10)
            run_s.font.italic = True
            run_s.font.color.rgb = RGBColor(100, 116, 139)

    def add_change_row(element_name, from_text, to_text):
        tbl = doc.add_table(rows=2, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(6.8)

        cell_from = tbl.cell(0, 0)
        set_cell_background(cell_from, "FEE2E2")
        set_cell_margins(cell_from, top=70, bottom=70, left=130, right=130)
        p1 = cell_from.paragraphs[0]
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(0)
        
        r_el = p1.add_run(f"[{element_name}]  ")
        r_el.font.name = "Arial"
        r_el.font.size = Pt(9)
        r_el.font.bold = True
        r_el.font.color.rgb = RGBColor(153, 27, 27)

        r_f_lbl = p1.add_run("FROM: ")
        r_f_lbl.font.name = "Arial"
        r_f_lbl.font.size = Pt(9.5)
        r_f_lbl.font.bold = True
        r_f_lbl.font.color.rgb = RGBColor(185, 28, 28)

        r_f_txt = p1.add_run(from_text)
        r_f_txt.font.name = "Arial"
        r_f_txt.font.size = Pt(9.5)
        r_f_txt.font.color.rgb = RGBColor(127, 29, 29)

        cell_to = tbl.cell(1, 0)
        set_cell_background(cell_to, "DCFCE7")
        set_cell_margins(cell_to, top=70, bottom=70, left=130, right=130)
        p2 = cell_to.paragraphs[0]
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(0)

        r_t_lbl = p2.add_run("➔ TO: ")
        r_t_lbl.font.name = "Arial"
        r_t_lbl.font.size = Pt(10)
        r_t_lbl.font.bold = True
        r_t_lbl.font.color.rgb = RGBColor(21, 128, 61)

        r_t_txt = p2.add_run(to_text)
        r_t_txt.font.name = "Arial"
        r_t_txt.font.size = Pt(10)
        r_t_txt.font.bold = True
        r_t_txt.font.color.rgb = RGBColor(20, 83, 45)

        spacer = doc.add_paragraph()
        spacer.paragraph_format.space_before = Pt(0)
        spacer.paragraph_format.space_after = Pt(4)

    def add_bullet_item(label, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
        r_lbl = p.add_run(label + ": ")
        r_lbl.font.name = "Arial"
        r_lbl.font.size = Pt(9.5)
        r_lbl.font.bold = True
        r_lbl.font.color.rgb = RGBColor(30, 41, 59)
        
        r_txt = p.add_run(text)
        r_txt.font.name = "Arial"
        r_txt.font.size = Pt(9.5)
        r_txt.font.color.rgb = RGBColor(51, 65, 85)

    # SLIDE 1
    add_slide_header("SLIDE 1: COVER / TITLE SLIDE")
    add_bullet_item("Title", "PROOFLINE")
    add_bullet_item("Subtitle", "Evidence-Backed Brand Governance — Verify Before You Publish")
    add_bullet_item("Presented By", "Binary Brains")
    add_bullet_item("Required Addition for Round 2", "Add Live Demo Link: [Insert Live URL]")
    add_bullet_item("Required Addition for Round 2", "Add GitHub Repository Link: [Insert Repo URL]")

    # SLIDE 2
    add_slide_header("SLIDE 2: PROBLEM STATEMENT")
    add_change_row("Sub-headline",
                   "AI-generated content is growing rapidly, but businesses still struggle to ensure that every claim follows their latest approved facts and brand guidelines.",
                   "Content creation scaled 10x with AI, but businesses still struggle to verify that every claim matches their latest approved facts.")
    add_change_row("Section Header", "WHY ARE WE DOING THIS?", "WHERE TRADITIONAL REVIEW BREAKS")
    add_change_row("Bullet 1", "Content Inconsistency: Multiple creators and teams may produce content that does not follow the same brand guidelines.",
                   "Disconnected Guidelines: Brand rules sit in static PDFs that creators and AI tools never check while drafting.")
    add_change_row("Bullet 2", "Incorrect Claims: Product specifications or promotional statements may conflict with approved information.",
                   "Contradicted Claims: Marketing copy frequently clashes with real specs (e.g., claiming 20h battery instead of approved 14h).")
    add_change_row("Bullet 3", "Outdated Information: Old product details and expired offers can remain in marketing content.",
                   "Expired Information: Deprecated pricing and lapsed offers slip into live campaigns without version checks.")
    add_change_row("Bullet 4", "Manual Verification: Teams must repeatedly check documents, product information, and brand guidelines before publishing.",
                   "Bottlenecked Manual Review: Reviewers waste hours repeatedly cross-checking docs instead of high-value work.")
    add_bullet_item("Bottom Callout (Add in empty space)", "The Core Gap: Content production scaled 10x with AI, but verification is still manual, unversioned, and reactive.")

    # SLIDE 3
    add_slide_header("SLIDE 3: TARGET USERS (WHO NEEDS PROOFLINE?)")
    add_change_row("Sub-headline 1", "WHO NEEDS PROOFLINE?", "WHO USES THE WORKFLOW?")
    add_change_row("Sub-headline 2", "Different teams. One shared need: trustworthy brand content.", "Different roles. One shared pre-publication quality gate.")
    add_change_row("Bullet 1 (Creators)", "CONTENT CREATORS: Verify claims and brand guidelines before submitting content.",
                   "CONTENT CREATORS: Catch contradicted specs and get instant, intent-preserving corrections before submission.")
    add_change_row("Bullet 2 (Marketing)", "MARKETING TEAMS: Maintain consistent messaging across campaigns and channels.",
                   "CAMPAIGN MANAGERS: Triage flagged drafts by risk score, compare revisions, and track approval status.")
    add_change_row("Bullet 3 (Reviewers)", "BRAND REVIEWERS: Check supporting evidence before approving content.",
                   "BRAND REVIEWERS: Inspect evidence-linked sources and log traceable approvals (no blind trust in AI).")
    add_change_row("Bullet 4 (Admins)", "BRAND ADMINISTRATORS: Manage approved facts, sources, and brand rules.",
                   "FACT & BRAND OWNERS: Maintain the single source of truth—versioning specs, validity dates, and brand rules.")
    add_bullet_item("Bottom Callout (Add in empty space)", "Target Setting: High-velocity mid-market brands, agencies, and consumer tech scaling multi-channel content.")

    # SLIDE 4
    add_slide_header("SLIDE 4: THE SOLUTION")
    add_change_row("Sub-headline", "Evidence-Backed AI for Brand Governance", "A Pre-Publication Quality Gate Powered by Source-Grounded AI")
    add_change_row("Box 1 Title", "Claim–Fact Ledger", "Brand Truth Registry + Claim Ledger")
    add_change_row("Box 1 Body", "Connects every detected content claim to approved brand facts, source versions, and applicable rules.",
                   "Centralises versioned brand specs and links every detected claim to its exact source document and validity date.")
    add_change_row("Box 2 Title", "Evidence-Based Verification", "Deterministic & Grounded AI Auditing")
    add_change_row("Box 2 Body", "Checks product specifications, promotional claims, brand terminology, and content against approved information.",
                   "Combines exact deterministic rules (numbers, pricing, banned terms) with source-grounded LLM context checks.")
    add_change_row("Box 3 Title", "Outdated & Unsupported Claim Detection", "Evidence-or-Abstain Reliability")
    add_change_row("Box 3 Body", "Flags expired information, contradictions, and claims that lack sufficient evidence instead of guessing.",
                   "Detects expired promos and contradicted specs; marks missing evidence as 'Needs Human Review' instead of hallucinating.")
    add_change_row("Box 4 Title", "Human Review & Correction", "Human-in-the-Loop Review & Audit Trail")
    add_change_row("Box 4 Body", "Suggests minimal corrections, supports rechecking revised content, and records reviewer decisions for accountability.",
                   "Suggests intent-preserving fixes, supports re-auditing revised drafts, and locks final sign-off to authorised humans.")

    # SLIDE 5
    add_slide_header("SLIDE 5: COMPLETE PRODUCT WORKFLOW")
    add_change_row("Step 1 Title", "Brand Knowledge Setup", "Brand Truth Setup")
    add_change_row("Step 1 Subtitle", "Upload approved facts, rules and source documents", "Register versioned specs, validity dates, and brand guidelines")
    add_change_row("Step 2 Title", "Content Input", "Multi-Format Intake")
    add_change_row("Step 2 Subtitle", "Submit draft content for verification", "Ingest marketing copy, PDFs, DOCX, or OCR image assets")
    add_change_row("Step 3 Title", "Claim Extraction & Analysis", "Claim Extraction")
    add_change_row("Step 3 Subtitle", "Identify claims and check against brand rules", "Isolate factual specs, pricing numbers, and marketing assertions")
    add_change_row("Step 4 Title", "Evidence Matching", "Source-Grounded Audit")
    add_change_row("Step 4 Subtitle", "Match claims with approved sources and flag issues", "Classify into Supported, Contradicted, Stale, or Unverified")
    add_change_row("Step 5 Title", "Corrections & Recheck", "Correction & Re-Scan")
    add_change_row("Step 5 Subtitle", "Suggest corrections and re-verify revised content", "Apply intent-preserving fixes and re-audit revised drafts")
    add_change_row("Step 6 Title", "Human Review & Approval", "Authorised Sign-off")
    add_change_row("Step 6 Subtitle", "Approve or request changes with recorded decision", "Review evidence diffs and lock decisions in the audit log")

    add_change_row("Section Header", "KEY WORKFLOW CAPABILITIES:", "CORE WORKFLOW GUARANTEES:")
    add_change_row("Bullet 1", "Versioned Brand Knowledge: Stores approved facts, source versions, and validity dates.", "Versioned Truth Registry: Tracks exact source citations, effective dates, and fact expiration windows.")
    add_change_row("Bullet 2", "Claim Verification: Combines deterministic rules with AI-assisted content analysis.", "Hybrid Audit Engine: Deterministic checks for numbers/dates + LLM checks for context and tone.")
    add_change_row("Bullet 3", "Evidence-Linked Findings: Connects detected issues to approved facts and applicable rules.", "Evidence-or-Abstain: Every flag cites an approved record; missing evidence flags 'Needs Review' instead of guessing.")
    add_change_row("Bullet 4", "Revision Tracking: Records content versions and reviewer decisions.", "Immutable Lineage: Preserves original drafts, accepted edits, and side-by-side revision comparisons.")
    add_change_row("Bullet 5", "Human Oversight: Keeps final approval with an authorised reviewer.", "Zero Auto-Publishing: Content is never published automatically; final authority stays with an authorised human.")

    # SLIDE 6
    add_slide_header("SLIDE 6: FEATURES & TECHNOLOGY STACK")
    add_change_row("Slide Subtitle", "Planned capabilities and implementation approach", "Implemented system architecture and verified build stack")
    add_change_row("Left Header", "CORE FEATURES", "CORE IMPLEMENTED CAPABILITIES")
    add_change_row("Card 01 Body", "Manage approved facts, brand rules, source versions, and validity dates.", "Stores versioned facts, source citations, validity windows, and brand guidelines.")
    add_change_row("Card 02 Title", "Evidence-Backed Auditing", "Claim Grounding & Audit Engine")
    add_change_row("Card 02 Body", "Detect contradicted, outdated, unsupported, and ambiguous claims.", "Extracts claims and audits them against sources: Supported, Contradicted, or Unverified.")
    add_change_row("Card 03 Title", "Correction & Recheck", "Intent-Preserving Correction & Re-audit")
    add_change_row("Card 03 Body", "Suggest minimal corrections and verify revised content again.", "Generates minimal diff-based fixes and re-audits revised drafts instantly.")
    add_change_row("Card 04 Title", "Review & Audit Trail", "Human-in-the-Loop Audit Trail")
    add_change_row("Card 04 Body", "Record approval decisions, content versions, and reviewer actions.", "Enforces role-based sign-off and records an immutable, timestamped review history.")

    add_change_row("Right Header", "PROPOSED TECHNOLOGY STACK", "VERIFIED BUILD STACK")
    add_change_row("Row 1 (Frontend)", "React, TypeScript, Tailwind CSS", "Next.js (App Router), TypeScript, Tailwind CSS")
    add_change_row("Row 2 (Backend)", "Python, FastAPI", "Python 3.12, FastAPI, Pydantic v2")
    add_change_row("Row 3 (Database & Auth)", "PostgreSQL / Supabase", "SQLite / D1 & Postgres schemas, scoped memory vault")
    add_change_row("Row 4 (AI Layer)", "Configurable LLM API with structured output validation", "Schema-enforced LLM adapter with strict JSON output validation")
    add_change_row("Row 5 (Verification Engine)", "Python rule-based checks + evidence retrieval", "Deterministic exact-match rules + source lexical retrieval")
    add_change_row("Row 6 (Document Processing)", "PDF/DOCX text extraction; bounded image OCR (planned)", "Local document extraction (PDF / DOCX) + bounded OCR parser")

    add_change_row("Bottom Callout 1", "Evidence first | Every claim backed by sources", "Evidence-or-Abstain | Missing evidence yields 'Needs Review', not hallucinations")
    add_change_row("Bottom Callout 2", "AI-assisted checks | Faster and more accurate verification", "Deterministic-First | Numbers, pricing, and dates validated by code, not LLM guesses")
    add_change_row("Bottom Callout 3", "Human-controlled approval | Final decision always with a reviewer", "Human Accountability | Zero auto-publishing; strict separation of creator and approver")

    # SLIDE 7 (Corrected Slide Number!)
    add_slide_header("SLIDE 7: RESPONSIBLE AI & DATA SECURITY")
    add_change_row("Bottom Banner (Typo Fix)", "OUR PRINCIPLE: Al assists verification. Humans remain accountable for final approval.", "OUR PRINCIPLE: AI assists verification. Humans remain accountable for final approval.")
    add_change_row("Card 01 Title", "PRIVACY BY DESIGN", "Tenant Isolation & Data Privacy")
    add_change_row("Card 01 Body", "Keep uploaded content private, isolate customer data, protect API keys, and define clear data-retention and deletion policies.", "Enforces strict organisation workspace boundaries, keeps API secrets strictly server-side, and stores zero client keys.")
    add_change_row("Card 02 Title", "EVIDENCE-BASED AI", "Evidence-or-Abstain Engine")
    add_change_row("Card 02 Body", "Link findings to approved sources and rules. When evidence is missing, conflicting, or outdated, flag the issue for review instead of guessing.", "Grounds every finding in a versioned source citation; flags missing or conflicting evidence as 'Needs Review' instead of hallucinating.")
    add_change_row("Card 03 Title", "HUMAN OVERSIGHT", "Accountable Human Sign-off")
    add_change_row("Card 03 Body", "Let authorised reviewers approve content, request changes, or override findings with a recorded reason.", "Enforces role separation (creators cannot approve own work), logs override reasons, and strictly blocks auto-publishing.")
    add_change_row("Card 04 Title", "TRANSPARENCY & LIMITATIONS", "Explicit Disclosure & Fail-Soft States")
    add_change_row("Card 04 Body", "Show the evidence behind each finding, disclose incomplete extraction or AI failures, and avoid claiming guaranteed accuracy or legal compliance.", "Dedicated /privacy disclosure route, transparent parsing-failure alerts, and clear disclaimers that Proofline is governance, not legal counsel.")

    # SLIDE 8 (Corrected Slide Number!)
    add_slide_header("SLIDE 8: DEVELOPMENT PLAN & EXPECTED IMPACT")
    add_change_row("Box 1 Subtitle", "PLAN & VALIDATE", "PLAN & VALIDATE (COMPLETED)")
    add_change_row("Box 2 Subtitle", "BUILD THE MVP", "CORE BUILD & BASELINES (DELIVERED)")
    add_change_row("Box 2 Bullet 1", "Develop the Brand Truth Registry and content intake.", "Delivered: Versioned Brand Truth Registry, validity dates, and multi-format intake.")
    add_change_row("Box 2 Bullet 2", "Implement claim extraction, rule-based checks, and evidence-linked findings.", "Delivered: Hybrid audit engine (deterministic spec rules + source-grounded findings).")
    add_change_row("Box 2 Bullet 3", "Add corrections, rechecking, and human review.", "Delivered: Intent-preserving diff fixes, re-audit pipeline, and role-based sign-off.")
    add_change_row("Box 2 Bullet 4", "Test and demonstrate the end-to-end workflow.", "Delivered Baselines: Claim–fact lineage, explicit abstain states, and review metrics.")

    add_change_row("Box 3 Subtitle", "IMPROVE & DEMONSTRATE", "EXPANDED CAPABILITIES (NEXT)")
    add_change_row("Box 3 Bullet 1", "Add the Fact-Change Impact Radar.", "Full Fact-Change Impact Radar: Automated re-audit queue when specs change.")
    add_change_row("Box 3 Bullet 2", "Strengthen Evidence-or-Abstain reliability.", "High-severity verifier pass and edge-case benchmark test corpus.")
    add_change_row("Box 3 Bullet 3", "Develop Governance Insights and a Guideline-Gap Detector.", "Guideline-Gap Detector: Proposes rule clarifications for recurring mistakes.")
    add_change_row("Box 3 Bullet 4", "Evaluate reliability, usability, and security.", "Structured user testing trials and live external provider integration.")

    add_change_row("Impact Pill 1", "Reduce time spent checking brand claims across content.", "Eliminates repetitive manual spec lookups, accelerating draft-to-review velocity.")
    add_change_row("Impact Pill 2", "Help find outdated or unsupported information before publication.", "Catches contradictory specs, expired promotions, and missing qualifiers pre-publication.")
    add_change_row("Impact Pill 3", "Maintain clear records of content reviews and approval decisions.", "Provides an immutable audit log of source versions, diffs, and reviewer sign-offs.")

    add_change_row("Scope Pill 1", "Connect with content-management and collaboration tools.", "CMS connectors (WordPress, Webflow), Google Docs add-on, and Slack notifications.")
    add_change_row("Scope Pill 2", "Add image, multilingual, and additional channel support.", "Multi-image visual asset matching, video transcripts, and multi-language audits.")
    add_change_row("Scope Pill 3", "Deeper governance insights and trend analysis.", "Cross-team compliance heatmaps and recurring mistake telemetry.")

    add_change_row("Bottom Note", "Impact goals will be validated through testing and user feedback; results are not yet measured.", "Validation Note: Impact targets will be measured in user trials; no fabricated production metrics claimed.")

    # SLIDE 9 (Corrected Slide Number!)
    add_slide_header("SLIDE 9: TEAM & RESPONSIBILITIES")
    add_change_row("Subtitle", "Clear ownership for building PROOFLINE", "Verified ownership & core engineering contributions")
    add_change_row("Card 01 Title", "Project Lead & Research", "[Insert Name] — Lead & Architecture")
    add_change_row("Card 01 Body", "Problem validation, scope management, and overall coordination.", "Problem validation, PRD governance specs, workflow architecture, and submission delivery.")
    add_change_row("Card 02 Title", "AI/ML & Verification", "[Insert Name] — AI & Verification Engine")
    add_change_row("Card 02 Body", "Claim extraction, evidence matching, and rule-based verification.", "Deterministic rule engine, claim extraction, schema validation, and Evidence-or-Abstain pipeline.")
    add_change_row("Card 03 Title", "Backend & Database", "[Insert Name] — Backend & Platform")
    add_change_row("Card 03 Body", "API development, Brand Truth Registry, data storage, and authentication.", "FastAPI services, in-memory vault, D1/Postgres schemas, and role-based permissions.")
    add_change_row("Card 04 Title", "Frontend & UI/UX", "[Insert Name] — Frontend & UX Engineering")
    add_change_row("Card 04 Body", "User interface, content submission, findings display, and review workflow.", "Next.js App Router, responsive audit queue, diff-based correction editor, and review portal.")
    add_change_row("Card 05 Title", "Testing & Documentation", "[Insert Name] — QA & Systems Transparency")
    add_change_row("Card 05 Body", "Workflow testing, reliability checks, documentation, and demo preparation.", "E2E/API test suites, fail-soft error handling, AI/Privacy disclosure docs, and live demo harness.")

    # SLIDE 10 (Thank You Slide!)
    add_slide_header("SLIDE 10: THANK YOU (CLOSING SLIDE)")
    add_bullet_item("Title", "THANK YOU")
    add_bullet_item("Brand Name", "PROOFLINE")
    add_bullet_item("Subtitle", "Evidence-Backed AI for Brand Governance")
    add_bullet_item("Tagline", "Every claim checked. Every finding traceable.")
    add_bullet_item("Recommended Addition for Round 2", "Live Demo Link: [Insert Live Demo URL]")
    add_bullet_item("Recommended Addition for Round 2", "GitHub Code Repository: [Insert GitHub Repo URL]")
    add_bullet_item("Recommended Addition for Round 2", "Team / Contact: Binary Brains (potlasrisharanchowdary@gmail.com)")

    for path in dest_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        doc.save(path)
        print(f"Saved DOCX: {path}")

def create_pdf(dest_paths):
    for path in dest_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        doc = SimpleDocTemplate(
            path,
            pagesize=letter,
            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
        )
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=4
        )
        sub_style = ParagraphStyle(
            'DocSub',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=12
        )
        slide_h_style = ParagraphStyle(
            'SlideH',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=15,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )
        cell_from_style = ParagraphStyle(
            'CellFrom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#7F1D1D')
        )
        cell_to_style = ParagraphStyle(
            'CellTo',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#14532D')
        )
        bullet_style = ParagraphStyle(
            'BulletTxt',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2
        )

        elements = []
        elements.append(Paragraph("PROOFLINE — ROUND 2 PPT REVISION INSTRUCTIONS", title_style))
        elements.append(Paragraph("Team Binary Brains • Verified Slide-by-Slide Copy Changes (Slides 1 to 10)", sub_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

        def add_pdf_slide_header(title):
            elements.append(Paragraph(title, slide_h_style))

        def add_pdf_row(el_name, from_txt, to_txt):
            data = [
                [Paragraph(f"<b>[{el_name}] FROM:</b> {from_txt}", cell_from_style)],
                [Paragraph(f"<b>➔ TO:</b> {to_txt}", cell_to_style)]
            ]
            t = Table(data, colWidths=[530])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#FEE2E2')),
                ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#DCFCE7')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#F87171')),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 4))

        def add_pdf_bullet(lbl, txt):
            elements.append(Paragraph(f"• <b>{lbl}:</b> {txt}", bullet_style))

        # Slide 1
        add_pdf_slide_header("SLIDE 1: COVER / TITLE SLIDE")
        add_pdf_bullet("Title", "PROOFLINE")
        add_pdf_bullet("Subtitle", "Evidence-Backed Brand Governance — Verify Before You Publish")
        add_pdf_bullet("Presented By", "Binary Brains")
        add_pdf_bullet("Required Addition", "Add Live Demo Link: [Insert Live URL]")
        add_pdf_bullet("Required Addition", "Add GitHub Repository Link: [Insert Repo URL]")
        elements.append(Spacer(1, 6))

        # Slide 2
        add_pdf_slide_header("SLIDE 2: PROBLEM STATEMENT")
        add_pdf_row("Sub-headline", 
                    "AI-generated content is growing rapidly, but businesses still struggle to ensure that every claim follows their latest approved facts and brand guidelines.",
                    "Content creation scaled 10x with AI, but businesses still struggle to verify that every claim matches their latest approved facts.")
        add_pdf_row("Section Header", "WHY ARE WE DOING THIS?", "WHERE TRADITIONAL REVIEW BREAKS")
        add_pdf_row("Bullet 1", 
                    "Content Inconsistency: Multiple creators and teams may produce content that does not follow the same brand guidelines.",
                    "Disconnected Guidelines: Brand rules sit in static PDFs that creators and AI tools never check while drafting.")
        add_pdf_row("Bullet 2", 
                    "Incorrect Claims: Product specifications or promotional statements may conflict with approved information.",
                    "Contradicted Claims: Marketing copy frequently clashes with real specs (e.g., claiming 20h battery instead of approved 14h).")
        add_pdf_row("Bullet 3", 
                    "Outdated Information: Old product details and expired offers can remain in marketing content.",
                    "Expired Information: Deprecated pricing and lapsed offers slip into live campaigns without version checks.")
        add_pdf_row("Bullet 4", 
                    "Manual Verification: Teams must repeatedly check documents, product information, and brand guidelines before publishing.",
                    "Bottlenecked Manual Review: Reviewers waste hours repeatedly cross-checking docs instead of high-value work.")
        add_pdf_bullet("Bottom Callout", "The Core Gap: Content production scaled 10x with AI, but verification is still manual, unversioned, and reactive.")
        elements.append(Spacer(1, 6))

        # Slide 3
        add_pdf_slide_header("SLIDE 3: TARGET USERS (WHO NEEDS PROOFLINE?)")
        add_pdf_row("Sub-headline 1", "WHO NEEDS PROOFLINE?", "WHO USES THE WORKFLOW?")
        add_pdf_row("Sub-headline 2", "Different teams. One shared need: trustworthy brand content.", "Different roles. One shared pre-publication quality gate.")
        add_pdf_row("Bullet 1 (Creators)", 
                    "CONTENT CREATORS: Verify claims and brand guidelines before submitting content.",
                    "CONTENT CREATORS: Catch contradicted specs and get instant, intent-preserving corrections before submission.")
        add_pdf_row("Bullet 2 (Marketing)", 
                    "MARKETING TEAMS: Maintain consistent messaging across campaigns and channels.",
                    "CAMPAIGN MANAGERS: Triage flagged drafts by risk score, compare revisions, and track approval status.")
        add_pdf_row("Bullet 3 (Reviewers)", 
                    "BRAND REVIEWERS: Check supporting evidence before approving content.",
                    "BRAND REVIEWERS: Inspect evidence-linked sources and log traceable approvals (no blind trust in AI).")
        add_pdf_row("Bullet 4 (Admins)", 
                    "BRAND ADMINISTRATORS: Manage approved facts, sources, and brand rules.",
                    "FACT & BRAND OWNERS: Maintain the single source of truth—versioning specs, validity dates, and brand rules.")
        add_pdf_bullet("Bottom Callout", "Target Setting: High-velocity mid-market brands, agencies, and consumer tech scaling multi-channel content.")
        elements.append(Spacer(1, 6))

        # Slide 4
        add_pdf_slide_header("SLIDE 4: THE SOLUTION")
        add_pdf_row("Sub-headline", "Evidence-Backed AI for Brand Governance", "A Pre-Publication Quality Gate Powered by Source-Grounded AI")
        add_pdf_row("Box 1 Title", "Claim–Fact Ledger", "Brand Truth Registry + Claim Ledger")
        add_pdf_row("Box 1 Body", "Connects every detected content claim to approved brand facts, source versions, and applicable rules.", "Centralises versioned brand specs and links every detected claim to its exact source document and validity date.")
        add_pdf_row("Box 2 Title", "Evidence-Based Verification", "Deterministic & Grounded AI Auditing")
        add_pdf_row("Box 2 Body", "Checks product specifications, promotional claims, brand terminology, and content against approved information.", "Combines exact deterministic rules (numbers, pricing, banned terms) with source-grounded LLM context checks.")
        add_pdf_row("Box 3 Title", "Outdated & Unsupported Claim Detection", "Evidence-or-Abstain Reliability")
        add_pdf_row("Box 3 Body", "Flags expired information, contradictions, and claims that lack sufficient evidence instead of guessing.", "Detects expired promos and contradicted specs; marks missing evidence as 'Needs Human Review' instead of hallucinating.")
        add_pdf_row("Box 4 Title", "Human Review & Correction", "Human-in-the-Loop Review & Audit Trail")
        add_pdf_row("Box 4 Body", "Suggests minimal corrections, supports rechecking revised content, and records reviewer decisions for accountability.", "Suggests intent-preserving fixes, supports re-auditing revised drafts, and locks final sign-off to authorised humans.")
        elements.append(Spacer(1, 6))

        # Slide 5
        add_pdf_slide_header("SLIDE 5: COMPLETE PRODUCT WORKFLOW")
        add_pdf_row("Step 1 Title", "Brand Knowledge Setup", "Brand Truth Setup")
        add_pdf_row("Step 1 Subtitle", "Upload approved facts, rules and source documents", "Register versioned specs, validity dates, and brand guidelines")
        add_pdf_row("Step 2 Title", "Content Input", "Multi-Format Intake")
        add_pdf_row("Step 2 Subtitle", "Submit draft content for verification", "Ingest marketing copy, PDFs, DOCX, or OCR image assets")
        add_pdf_row("Step 3 Title", "Claim Extraction & Analysis", "Claim Extraction")
        add_pdf_row("Step 3 Subtitle", "Identify claims and check against brand rules", "Isolate factual specs, pricing numbers, and marketing assertions")
        add_pdf_row("Step 4 Title", "Evidence Matching", "Source-Grounded Audit")
        add_pdf_row("Step 4 Subtitle", "Match claims with approved sources and flag issues", "Classify into Supported, Contradicted, Stale, or Unverified")
        add_pdf_row("Step 5 Title", "Corrections & Recheck", "Correction & Re-Scan")
        add_pdf_row("Step 5 Subtitle", "Suggest corrections and re-verify revised content", "Apply intent-preserving fixes and re-audit revised drafts")
        add_pdf_row("Step 6 Title", "Human Review & Approval", "Authorised Sign-off")
        add_pdf_row("Step 6 Subtitle", "Approve or request changes with recorded decision", "Review evidence diffs and lock decisions in the audit log")
        add_pdf_row("Section Header", "KEY WORKFLOW CAPABILITIES:", "CORE WORKFLOW GUARANTEES:")
        add_pdf_row("Bullet 1", "Versioned Brand Knowledge: Stores approved facts, source versions, and validity dates.", "Versioned Truth Registry: Tracks exact source citations, effective dates, and fact expiration windows.")
        add_pdf_row("Bullet 2", "Claim Verification: Combines deterministic rules with AI-assisted content analysis.", "Hybrid Audit Engine: Deterministic checks for numbers/dates + LLM checks for context and tone.")
        add_pdf_row("Bullet 3", "Evidence-Linked Findings: Connects detected issues to approved facts and applicable rules.", "Evidence-or-Abstain: Every flag cites an approved record; missing evidence flags 'Needs Review' instead of guessing.")
        add_pdf_row("Bullet 4", "Revision Tracking: Records content versions and reviewer decisions.", "Immutable Lineage: Preserves original drafts, accepted edits, and side-by-side revision comparisons.")
        add_pdf_row("Bullet 5", "Human Oversight: Keeps final approval with an authorised reviewer.", "Zero Auto-Publishing: Content is never published automatically; final authority stays with an authorised human.")
        elements.append(Spacer(1, 6))

        # Slide 6
        add_pdf_slide_header("SLIDE 6: FEATURES & TECHNOLOGY STACK")
        add_pdf_row("Slide Subtitle", "Planned capabilities and implementation approach", "Implemented system architecture and verified build stack")
        add_pdf_row("Left Header", "CORE FEATURES", "CORE IMPLEMENTED CAPABILITIES")
        add_pdf_row("Card 01 Body", "Manage approved facts, brand rules, source versions, and validity dates.", "Stores versioned facts, source citations, validity windows, and brand guidelines.")
        add_pdf_row("Card 02 Title", "Evidence-Backed Auditing", "Claim Grounding & Audit Engine")
        add_pdf_row("Card 02 Body", "Detect contradicted, outdated, unsupported, and ambiguous claims.", "Extracts claims and audits them against sources: Supported, Contradicted, or Unverified.")
        add_pdf_row("Card 03 Title", "Correction & Recheck", "Intent-Preserving Correction & Re-audit")
        add_pdf_row("Card 03 Body", "Suggest minimal corrections and verify revised content again.", "Generates minimal diff-based fixes and re-audits revised drafts instantly.")
        add_pdf_row("Card 04 Title", "Review & Audit Trail", "Human-in-the-Loop Audit Trail")
        add_pdf_row("Card 04 Body", "Record approval decisions, content versions, and reviewer actions.", "Enforces role-based sign-off and records an immutable, timestamped review history.")
        add_pdf_row("Right Header", "PROPOSED TECHNOLOGY STACK", "VERIFIED BUILD STACK")
        add_pdf_row("Row 1 (Frontend)", "React, TypeScript, Tailwind CSS", "Next.js (App Router), TypeScript, Tailwind CSS")
        add_pdf_row("Row 2 (Backend)", "Python, FastAPI", "Python 3.12, FastAPI, Pydantic v2")
        add_pdf_row("Row 3 (Database & Auth)", "PostgreSQL / Supabase", "SQLite / D1 & Postgres schemas, scoped memory vault")
        add_pdf_row("Row 4 (AI Layer)", "Configurable LLM API with structured output validation", "Schema-enforced LLM adapter with strict JSON output validation")
        add_pdf_row("Row 5 (Verification Engine)", "Python rule-based checks + evidence retrieval", "Deterministic exact-match rules + source lexical retrieval")
        add_pdf_row("Row 6 (Document Processing)", "PDF/DOCX text extraction; bounded image OCR (planned)", "Local document extraction (PDF / DOCX) + bounded OCR parser")
        add_pdf_row("Bottom Callout 1", "Evidence first | Every claim backed by sources", "Evidence-or-Abstain | Missing evidence yields 'Needs Review', not hallucinations")
        add_pdf_row("Bottom Callout 2", "AI-assisted checks | Faster and more accurate verification", "Deterministic-First | Numbers, pricing, and dates validated by code, not LLM guesses")
        add_pdf_row("Bottom Callout 3", "Human-controlled approval | Final decision always with a reviewer", "Human Accountability | Zero auto-publishing; strict separation of creator and approver")
        elements.append(Spacer(1, 6))

        # Slide 7 (Corrected Slide 7!)
        add_pdf_slide_header("SLIDE 7: RESPONSIBLE AI & DATA SECURITY")
        add_pdf_row("Bottom Banner (Typo Fix)", "OUR PRINCIPLE: Al assists verification. Humans remain accountable for final approval.", "OUR PRINCIPLE: AI assists verification. Humans remain accountable for final approval.")
        add_pdf_row("Card 01 Title", "PRIVACY BY DESIGN", "Tenant Isolation & Data Privacy")
        add_pdf_row("Card 01 Body", "Keep uploaded content private, isolate customer data, protect API keys, and define clear data-retention and deletion policies.", "Enforces strict organisation workspace boundaries, keeps API secrets strictly server-side, and stores zero client keys.")
        add_pdf_row("Card 02 Title", "EVIDENCE-BASED AI", "Evidence-or-Abstain Engine")
        add_pdf_row("Card 02 Body", "Link findings to approved sources and rules. When evidence is missing, conflicting, or outdated, flag the issue for review instead of guessing.", "Grounds every finding in a versioned source citation; flags missing or conflicting evidence as 'Needs Review' instead of hallucinating.")
        add_pdf_row("Card 03 Title", "HUMAN OVERSIGHT", "Accountable Human Sign-off")
        add_pdf_row("Card 03 Body", "Let authorised reviewers approve content, request changes, or override findings with a recorded reason.", "Enforces role separation (creators cannot approve own work), logs override reasons, and strictly blocks auto-publishing.")
        add_pdf_row("Card 04 Title", "TRANSPARENCY & LIMITATIONS", "Explicit Disclosure & Fail-Soft States")
        add_pdf_row("Card 04 Body", "Show the evidence behind each finding, disclose incomplete extraction or AI failures, and avoid claiming guaranteed accuracy or legal compliance.", "Dedicated /privacy disclosure route, transparent parsing-failure alerts, and clear disclaimers that Proofline is governance, not legal counsel.")
        elements.append(Spacer(1, 6))

        # Slide 8 (Corrected Slide 8!)
        add_pdf_slide_header("SLIDE 8: DEVELOPMENT PLAN & EXPECTED IMPACT")
        add_pdf_row("Box 1 Subtitle", "PLAN & VALIDATE", "PLAN & VALIDATE (COMPLETED)")
        add_pdf_row("Box 2 Subtitle", "BUILD THE MVP", "CORE BUILD & BASELINES (DELIVERED)")
        add_pdf_row("Box 2 Bullet 1", "Develop the Brand Truth Registry and content intake.", "Delivered: Versioned Brand Truth Registry, validity dates, and multi-format intake.")
        add_pdf_row("Box 2 Bullet 2", "Implement claim extraction, rule-based checks, and evidence-linked findings.", "Delivered: Hybrid audit engine (deterministic spec rules + source-grounded findings).")
        add_pdf_row("Box 2 Bullet 3", "Add corrections, rechecking, and human review.", "Delivered: Intent-preserving diff fixes, re-audit pipeline, and role-based sign-off.")
        add_pdf_row("Box 2 Bullet 4", "Test and demonstrate the end-to-end workflow.", "Delivered Baselines: Claim–fact lineage, explicit abstain states, and review metrics.")
        add_pdf_row("Box 3 Subtitle", "IMPROVE & DEMONSTRATE", "EXPANDED CAPABILITIES (NEXT)")
        add_pdf_row("Box 3 Bullet 1", "Add the Fact-Change Impact Radar.", "Full Fact-Change Impact Radar: Automated re-audit queue when specs change.")
        add_pdf_row("Box 3 Bullet 2", "Strengthen Evidence-or-Abstain reliability.", "High-severity verifier pass and edge-case benchmark test corpus.")
        add_pdf_row("Box 3 Bullet 3", "Develop Governance Insights and a Guideline-Gap Detector.", "Guideline-Gap Detector: Proposes rule clarifications for recurring mistakes.")
        add_pdf_row("Box 3 Bullet 4", "Evaluate reliability, usability, and security.", "Structured user testing trials and live external provider integration.")
        add_pdf_row("Impact Pill 1", "Reduce time spent checking brand claims across content.", "Eliminates repetitive manual spec lookups, accelerating draft-to-review velocity.")
        add_pdf_row("Impact Pill 2", "Help find outdated or unsupported information before publication.", "Catches contradictory specs, expired promotions, and missing qualifiers pre-publication.")
        add_pdf_row("Impact Pill 3", "Maintain clear records of content reviews and approval decisions.", "Provides an immutable audit log of source versions, diffs, and reviewer sign-offs.")
        add_pdf_row("Scope Pill 1", "Connect with content-management and collaboration tools.", "CMS connectors (WordPress, Webflow), Google Docs add-on, and Slack notifications.")
        add_pdf_row("Scope Pill 2", "Add image, multilingual, and additional channel support.", "Multi-image visual asset matching, video transcripts, and multi-language audits.")
        add_pdf_row("Scope Pill 3", "Deeper governance insights and trend analysis.", "Cross-team compliance heatmaps and recurring mistake telemetry.")
        add_pdf_row("Bottom Note", "Impact goals will be validated through testing and user feedback; results are not yet measured.", "Validation Note: Impact targets will be measured in user trials; no fabricated production metrics claimed.")
        elements.append(Spacer(1, 6))

        # Slide 9 (Corrected Slide 9!)
        add_pdf_slide_header("SLIDE 9: TEAM & RESPONSIBILITIES")
        add_pdf_row("Subtitle", "Clear ownership for building PROOFLINE", "Verified ownership & core engineering contributions")
        add_pdf_row("Card 01 Title", "Project Lead & Research", "[Insert Name] — Lead & Architecture")
        add_pdf_row("Card 01 Body", "Problem validation, scope management, and overall coordination.", "Problem validation, PRD governance specs, workflow architecture, and submission delivery.")
        add_pdf_row("Card 02 Title", "AI/ML & Verification", "[Insert Name] — AI & Verification Engine")
        add_pdf_row("Card 02 Body", "Claim extraction, evidence matching, and rule-based verification.", "Deterministic rule engine, claim extraction, schema validation, and Evidence-or-Abstain pipeline.")
        add_pdf_row("Card 03 Title", "Backend & Database", "[Insert Name] — Backend & Platform")
        add_pdf_row("Card 03 Body", "API development, Brand Truth Registry, data storage, and authentication.", "FastAPI services, in-memory vault, D1/Postgres schemas, and role-based permissions.")
        add_pdf_row("Card 04 Title", "Frontend & UI/UX", "[Insert Name] — Frontend & UX Engineering")
        add_pdf_row("Card 04 Body", "User interface, content submission, findings display, and review workflow.", "Next.js App Router, responsive audit queue, diff-based correction editor, and review portal.")
        add_pdf_row("Card 05 Title", "Testing & Documentation", "[Insert Name] — QA & Systems Transparency")
        add_pdf_row("Card 05 Body", "Workflow testing, reliability checks, documentation, and demo preparation.", "E2E/API test suites, fail-soft error handling, AI/Privacy disclosure docs, and live demo harness.")
        elements.append(Spacer(1, 6))

        # Slide 10 (Thank You Slide!)
        add_pdf_slide_header("SLIDE 10: THANK YOU (CLOSING SLIDE)")
        add_pdf_bullet("Title", "THANK YOU")
        add_pdf_bullet("Brand Name", "PROOFLINE")
        add_pdf_bullet("Subtitle", "Evidence-Backed AI for Brand Governance")
        add_pdf_bullet("Tagline", "Every claim checked. Every finding traceable.")
        add_pdf_bullet("Recommended Addition", "Live Demo Link: [Insert Live Demo URL]")
        add_pdf_bullet("Recommended Addition", "GitHub Code Repository: [Insert GitHub Repo URL]")
        add_pdf_bullet("Recommended Addition", "Team / Contact: Binary Brains (potlasrisharanchowdary@gmail.com)")

        doc.build(elements)
        print(f"Saved PDF: {path}")

if __name__ == "__main__":
    docx_paths = [
        os.path.expanduser("~/Downloads/Proofline_Round_2_PPT_Changes.docx"),
        os.path.abspath("docs/Proofline_Round_2_PPT_Changes.docx")
    ]
    pdf_paths = [
        os.path.expanduser("~/Downloads/Proofline_Round_2_PPT_Changes.pdf"),
        os.path.abspath("docs/Proofline_Round_2_PPT_Changes.pdf")
    ]
    create_docx(docx_paths)
    create_pdf(pdf_paths)
    print("Done regenerating updated document formats with exact 1-10 slide numbers!")
