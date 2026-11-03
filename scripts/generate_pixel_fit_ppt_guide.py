#!/usr/bin/env python3
"""
Generate a concise, presentation-friendly Slide-by-Slide PPT Guide.
Strictly limits text length to match actual slide text boxes (max 12-15 words per bullet).
Marks unchanged slides as 'LEAVE UNTOUCHED' to protect original slide layouts.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        if self._pageNumber > 1:
            self.drawString(36, 756, "PROOFLINE — SLIDE-FIT PPT TRANSFORMATION GUIDE")
            self.drawRightString(letter[0] - 36, 756, "Concise Drop-In Text · Binary Brains")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 750, letter[0] - 36, 750)

        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 36, 24, footer_text)
        self.drawString(36, 24, "Surgical Slide Edits · Live URL: https://proofline-4cz.pages.dev")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 34, letter[0] - 36, 34)
        self.restoreState()

SLIDES = [
    {
        "num": 1,
        "title": "Title & Cover Slide",
        "action": "SURGICAL EDIT — ADD 1 LINE ONLY",
        "badge_color": "#1E40AF",
        "status": "KEEP EXISTING DESIGN",
        "instructions": "Keep your title, logo, and 'Presented by Binary Brains' exactly as they are. Just add this single line at the bottom or below subtitle:",
        "boxes": [
            ("ADD AT BOTTOM", "Live App: https://proofline-4cz.pages.dev  |  GitHub: github.com/potlasrisharan/proofline")
        ]
    },
    {
        "num": 2,
        "title": "Problem Statement",
        "action": "NO CHANGES NEEDED — LEAVE 100% AS IS",
        "badge_color": "#166534",
        "status": "KEEP 100% UNTOUCHED",
        "instructions": "Do not touch this slide. Your 4 existing problem bullets (Disconnected Guidelines, Contradicted Claims, Expired Info, Bottlenecked Review) already fit the slide perfectly and tell the exact right story.",
        "boxes": []
    },
    {
        "num": 3,
        "title": "Target Users",
        "action": "NO CHANGES NEEDED — LEAVE 100% AS IS",
        "badge_color": "#166534",
        "status": "KEEP 100% UNTOUCHED",
        "instructions": "Do not touch this slide. Your 4 existing user roles (Content Creators, Campaign Managers, Brand Reviewers, Fact & Brand Owners) are concise and completely accurate.",
        "boxes": []
    },
    {
        "num": 4,
        "title": "The Solution",
        "action": "NO CHANGES NEEDED — LEAVE 100% AS IS",
        "badge_color": "#166534",
        "status": "KEEP 100% UNTOUCHED",
        "instructions": "Do not touch this slide. Your 4 solution cards (Truth Registry, Grounded AI, Evidence-or-Abstain, Human-in-the-Loop) represent our core product architecture.",
        "boxes": []
    },
    {
        "num": 5,
        "title": "Complete Product Workflow",
        "action": "NO CHANGES NEEDED — LEAVE 100% AS IS",
        "badge_color": "#166534",
        "status": "KEEP 100% UNTOUCHED",
        "instructions": "Do not touch this slide. Your workflow steps and 5 core guarantees already fit the slide and match the system behavior.",
        "boxes": []
    },
    {
        "num": 6,
        "title": "The 3 Delivered Improvements (Delivery Scorecard)",
        "action": "INSERT NEW SLIDE — 3 CLEAN COLUMNS",
        "badge_color": "#9333EA",
        "status": "BRAND NEW SLIDE (RUBRIC MANDATORY: 20 PTS)",
        "instructions": "Create a 3-column slide with 3 cards. Each card gets a bold title, 2 short bullets, and a route badge. Fits cleanly on any template:",
        "boxes": [
            ("HEADER", "Headline: The Three Delivered Improvements\nSub-headline: 100% delivery of our Round 2 commitments — verified in the live product."),
            ("CARD 1 (Left)", "Title: 1. Multimodal Vision\n• Audits claims & disclaimers in video frames and image carousels.\n• Flags FTC disclaimer font height < 2.5% with 1-click remediation.\n[Route: /multimodal]"),
            ("CARD 2 (Middle)", "Title: 2. Post-Publish Drift\n• 60s heartbeat radar monitors live posts on LinkedIn, Meta & X.\n• Flags retroactive drift when specs update; 1-click comment/takedown.\n[Route: /drift]"),
            ("CARD 3 (Right)", "Title: 3. Dynamic Truth Sync\n• Ingests live data from Notion wikis, Google Docs & Shopify.\n• Automatically benchmarks marketing claims against real-time specs.\n[Route: /sync]")
        ]
    },
    {
        "num": 7,
        "title": "Improvement 1: Multimodal Vision Engine",
        "action": "INSERT NEW SLIDE — 50/50 SPLIT (TEXT LEFT, SCREENSHOT RIGHT)",
        "badge_color": "#9333EA",
        "status": "BRAND NEW SLIDE (IMP-1 DEEP DIVE)",
        "instructions": "Left side has 3 short bullets. Right side has a screenshot of the /multimodal canvas and font gauge:",
        "boxes": [
            ("HEADER", "Headline: Improvement 1: Multimodal Vision Engine\nSub-headline: Eliminates manual frame-by-frame compliance audits for media creators."),
            ("LEFT COLUMN (Bullets)", "• Gemini 2.5 Flash Vision: Audits image carousels, Figma exports & video reels.\n• FTC § 255 Font Gauge: Detects disclaimers smaller than 2.5% frame height.\n• ⚡ 1-Click Frame Fix: Automatically resizes disclaimers and fixes contradictory specs."),
            ("RIGHT COLUMN (Visual)", "[PASTE SCREENSHOT OF /multimodal PAGE: Canvas scrubber + FTC gauge]")
        ]
    },
    {
        "num": 8,
        "title": "Improvement 2: Post-Publish Drift Radar",
        "action": "INSERT NEW SLIDE — 50/50 SPLIT (TEXT LEFT, SCREENSHOT RIGHT)",
        "badge_color": "#9333EA",
        "status": "BRAND NEW SLIDE (IMP-2 DEEP DIVE)",
        "instructions": "Left side has 3 short bullets. Right side has a screenshot of the /drift radar heartbeat and drift alerts:",
        "boxes": [
            ("HEADER", "Headline: Improvement 2: Post-Publish Drift Radar\nSub-headline: Continuous live monitoring alerting brand owners when active posts drift from updated specs."),
            ("LEFT COLUMN (Bullets)", "• 60s Heartbeat Radar: Continuously scans live social posts against active truth.\n• Retroactive Drift Alert: Flags active posts when promo codes expire or specs change.\n• ⚡ 1-Click Action: Dispatches public clarification comment or emergency takedown."),
            ("RIGHT COLUMN (Visual)", "[PASTE SCREENSHOT OF /drift PAGE: Active heartbeat radar + drift cards]")
        ]
    },
    {
        "num": 9,
        "title": "Improvement 3: Dynamic Brand Truth Sync",
        "action": "INSERT NEW SLIDE — 50/50 SPLIT (TEXT LEFT, SCREENSHOT RIGHT)",
        "badge_color": "#9333EA",
        "status": "BRAND NEW SLIDE (IMP-3 DEEP DIVE)",
        "instructions": "Left side has 3 short bullets. Right side has a screenshot of the /sync connected Notion & Google Docs sources:",
        "boxes": [
            ("HEADER", "Headline: Improvement 3: Dynamic Brand Truth Sync\nSub-headline: Automated brand truth ingestion from Notion, Google Docs, and Shopify inventory."),
            ("LEFT COLUMN (Bullets)", "• Live Enterprise Sync: Connects Notion databases, legal Docs & Shopify inventory.\n• Real-Time Stock Guard: Prevents advertising out-of-stock items or wrong prices.\n• ⚡ 1-Click Pull Blocks: Ingests live spec clauses directly into versioned truth records."),
            ("RIGHT COLUMN (Visual)", "[PASTE SCREENSHOT OF /sync PAGE: Connected data sources + telemetry]")
        ]
    },
    {
        "num": 10,
        "title": "Battle-Tested Reliability & Testing",
        "action": "INSERT NEW SLIDE — 3 STAT CARDS",
        "badge_color": "#0284C7",
        "status": "BRAND NEW SLIDE (RELIABILITY: 20 PTS)",
        "instructions": "Create 3 stat boxes. Directly targets the judge's prompt: 'Bad input, empty state, refresh, double action — nothing breaks':",
        "boxes": [
            ("HEADER", "Headline: Battle-Tested Enterprise Reliability\nSub-headline: Proven under stress: zero hangs, zero crashes, complete idempotency."),
            ("CARD 1 (Left)", "Stat: 49 E2E Tests Passed\n100% passing Playwright browser tests across all core judge journeys."),
            ("CARD 2 (Middle)", "Stat: 159 Backend Tests Passed\n100% passing pytest suite covering claim parsers, D1 SQL, and hash chains."),
            ("CARD 3 (Right)", "Stat: Zero-Crash Architecture\nRefresh-safe empty states, debounced buttons, and fail-soft model fallbacks.")
        ]
    },
    {
        "num": 11,
        "title": "Production Edge Architecture",
        "action": "INSERT NEW SLIDE — 3-TIER FLOW DIAGRAM",
        "badge_color": "#0284C7",
        "status": "BRAND NEW SLIDE (ARCHITECTURE)",
        "instructions": "Replace old planned tech slide with 4 clean architecture blocks:",
        "boxes": [
            ("HEADER", "Headline: Production Edge Architecture & Security\nSub-headline: Serverless global edge deployment with zero secrets exposed to client builds."),
            ("TIER 1 (Frontend)", "Client: Next.js 16 (App Router) + React 19 deployed globally on Cloudflare Pages."),
            ("TIER 2 (Edge API)", "Backend: Cloudflare Python Worker running FastAPI with sub-50ms latency."),
            ("TIER 3 (Database)", "Database: Cloudflare D1 distributed SQL with immutable SHA-256 audit ledger."),
            ("TIER 4 (AI Gateway)", "AI Gateway: Gemini 1.5 primary with automatic Groq & Sarvam fail-soft fallbacks.")
        ]
    },
    {
        "num": 12,
        "title": "Post-Hackathon Product Roadmap",
        "action": "INSERT NEW SLIDE — 3 HORIZONTAL PHASES",
        "badge_color": "#B45309",
        "status": "BRAND NEW SLIDE (ROADMAP: 15 PTS)",
        "instructions": "Create 3 timeline cards. Satisfies the roadmap requirement with concrete timelines:",
        "boxes": [
            ("HEADER", "Headline: Post-Hackathon Product Roadmap\nSub-headline: A structured, phased expansion from hackathon MVP to enterprise SaaS."),
            ("PHASE 1 (Months 1–3)", "Native In-Editor Sidebars\n• Drafting extensions for Google Docs, Notion & Figma.\n• Live publishing plugins for WordPress VIP and Webflow."),
            ("PHASE 2 (Months 4–6)", "Enterprise Federation & SSO\n• Multi-brand agency federation managing 50+ brand registries.\n• SAML 2.0 / Okta SSO and SOC2 Type II compliance controls."),
            ("PHASE 3 (Months 7–12)", "Regulatory Crawlers & Ad Sync\n• Automated crawlers ingesting FTC, ASA & FDA advertising rules.\n• Real-time webhooks pausing Google & Meta ad campaigns on spec changes.")
        ]
    },
    {
        "num": 13,
        "title": "Closing Slide / Judge Evaluation Hub",
        "action": "SURGICAL EDIT — UPDATE OLD SLIDE 10",
        "badge_color": "#1E40AF",
        "status": "UPDATE EXISTING SLIDE 10",
        "instructions": "In your existing Thank You slide, replace the placeholder text with these real links and QR code:",
        "boxes": [
            ("MAIN TEXT", "Headline: Proofline: Verify Before You Publish\nSub-headline: Every claim checked. Every finding traceable."),
            ("LINK 1", "Live App: https://proofline-4cz.pages.dev  (1-click role logins on home screen)"),
            ("LINK 2", "Backend Health: https://proofline-api.potlasrisharanchowdary.workers.dev/health"),
            ("LINK 3", "GitHub Repository: https://github.com/potlasrisharan/proofline  (67 commits)"),
            ("CONTACT", "Team: Binary Brains — Potla Sri Sharan (potlasrisharanchowdary@gmail.com)")
        ]
    }
]

def build_pdf(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=42
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=15, leading=18,
        textColor=colors.HexColor('#0F172A'), spaceAfter=2
    )
    sub_style = ParagraphStyle(
        'DocSub', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9.5, leading=12,
        textColor=colors.HexColor('#64748B'), spaceAfter=8
    )
    slide_hdr_style = ParagraphStyle(
        'SlideHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=14,
        textColor=colors.HexColor('#0F172A'), spaceBefore=8, spaceAfter=2,
        keepWithNext=True
    )
    badge_style = ParagraphStyle(
        'Badge', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=9.5,
        textColor=colors.HexColor('#1E3A8A'), spaceAfter=3
    )
    instr_style = ParagraphStyle(
        'Instr', parent=styles['Normal'],
        fontName='Helvetica-Oblique', fontSize=7.5, leading=10,
        textColor=colors.HexColor('#334155'), spaceAfter=4
    )
    box_lbl_style = ParagraphStyle(
        'BoxLbl', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=9.5,
        textColor=colors.HexColor('#0F172A')
    )
    box_txt_style = ParagraphStyle(
        'BoxTxt', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10,
        textColor=colors.HexColor('#1E293B')
    )

    elements = []
    elements.append(Paragraph("PROOFLINE — SURGICAL SLIDE-FIT PPT TRANSFORMATION GUIDE", title_style))
    elements.append(Paragraph("Surgical 1:1 Text Replacements · Max 12–15 Words Per Bullet · Zero Text Overflow", sub_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=6))

    # Philosophy Box
    philosophy_text = (
        "<b>WHY THIS GUIDE IS DIFFERENT & GUARANTEES A CLEAN FIT:</b><br/>"
        "• <b>Slides 2, 3, 4, 5:</b> <b>LEAVE 100% UNTOUCHED!</b> Your existing slides are already solid. Touching them risks breaking text boxes and wastes precious submission time.<br/>"
        "• <b>Slide 1 & Slide 13:</b> Only 1–2 lines of clean URLs added in existing footers.<br/>"
        "• <b>Slides 6 to 12 (New):</b> Built with punchy 3-card or 50/50 layouts where every single bullet is strictly <b>10–14 words max</b>.<br/>"
        "You can literally copy-paste each box below directly into PowerPoint, Canva, or Google Slides without resizing fonts or overflowing text boxes."
    )
    t_phil = Table([[Paragraph(philosophy_text, ParagraphStyle('Phil', parent=styles['Normal'], fontSize=7.5, leading=10, textColor=colors.HexColor('#1E3A8A')))]], colWidths=[540])
    t_phil.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#93C5FD')),
        ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_phil)
    elements.append(Spacer(1, 6))

    for s in SLIDES:
        slide_block = []
        slide_block.append(Paragraph(f"<b>SLIDE {s['num']}: {s['title'].upper()}</b>", slide_hdr_style))
        slide_block.append(Paragraph(f"<b>ACTION:</b> <font color='{s['badge_color']}'><b>{s['action']}</b></font>  |  Status: <b>{s['status']}</b>", badge_style))
        slide_block.append(Paragraph(s['instructions'], instr_style))

        if s['boxes']:
            table_rows = []
            for b_lbl, b_txt in s['boxes']:
                p_l = Paragraph(f"<b>{b_lbl}</b>", box_lbl_style)
                # Format line breaks in text
                formatted_txt = b_txt.replace("\n", "<br/>")
                p_t = Paragraph(formatted_txt, box_txt_style)
                table_rows.append([p_l, p_t])

            t_boxes = Table(table_rows, colWidths=[120, 420])
            t_boxes.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
                ('BACKGROUND', (1,0), (1,-1), colors.HexColor('#F0FDF4')),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            slide_block.append(t_boxes)

        slide_block.append(Spacer(1, 4))
        slide_block.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=4))
        elements.append(KeepTogether(slide_block))

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Slide-Fit PDF: {output_path}")

def build_docx(output_path):
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)

    p_t = doc.add_paragraph()
    r_t = p_t.add_run("PROOFLINE — SURGICAL SLIDE-FIT PPT TRANSFORMATION GUIDE")
    r_t.font.name = "Arial"
    r_t.font.size = Pt(15)
    r_t.font.bold = True

    p_s = doc.add_paragraph()
    r_s = p_s.add_run("Surgical 1:1 Text Replacements • Max 12–15 Words Per Bullet • Zero Text Overflow")
    r_s.font.name = "Arial"
    r_s.font.size = Pt(9.5)
    r_s.font.color.rgb = RGBColor(100, 116, 139)

    for s in SLIDES:
        p_h = doc.add_paragraph()
        p_h.paragraph_format.space_before = Pt(12)
        p_h.paragraph_format.space_after = Pt(2)
        r_h = p_h.add_run(f"SLIDE {s['num']}: {s['title'].upper()}  |  {s['action']}")
        r_h.font.name = "Arial"
        r_h.font.size = Pt(11.5)
        r_h.font.bold = True

        p_i = doc.add_paragraph()
        p_i.paragraph_format.space_before = Pt(0)
        p_i.paragraph_format.space_after = Pt(4)
        r_i = p_i.add_run(s['instructions'])
        r_i.font.name = "Arial"
        r_i.font.size = Pt(8.5)
        r_i.font.italic = True

        if s['boxes']:
            tbl = doc.add_table(rows=len(s['boxes']), cols=2)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            tbl.autofit = False
            tbl.columns[0].width = Inches(2.0)
            tbl.columns[1].width = Inches(5.1)

            for idx, (b_lbl, b_txt) in enumerate(s['boxes']):
                c0 = tbl.cell(idx, 0)
                c1 = tbl.cell(idx, 1)
                
                # Background
                tcPr0 = c0._tc.get_or_add_tcPr()
                tcPr0.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
                tcPr1 = c1._tc.get_or_add_tcPr()
                tcPr1.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F0FDF4"/>'))

                p0 = c0.paragraphs[0]
                p0.paragraph_format.space_before = Pt(0)
                p0.paragraph_format.space_after = Pt(0)
                r0 = p0.add_run(b_lbl)
                r0.font.name = "Arial"
                r0.font.size = Pt(8.5)
                r0.font.bold = True

                p1 = c1.paragraphs[0]
                p1.paragraph_format.space_before = Pt(0)
                p1.paragraph_format.space_after = Pt(0)
                r1 = p1.add_run(b_txt)
                r1.font.name = "Arial"
                r1.font.size = Pt(8.5)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    print(f"✅ Generated Slide-Fit DOCX: {output_path}")

if __name__ == "__main__":
    pdf_out = "docs/Proofline_Round_3_Surgical_PPT_Guide.pdf"
    docx_out = "docs/Proofline_Round_3_Surgical_PPT_Guide.docx"
    build_pdf(pdf_out)
    build_docx(docx_out)
    # Also overwrite the primary PDF and DOCX so Sharan has the exact slide-fit version everywhere
    build_pdf("docs/Proofline_Round_3_Slide_by_Slide_Changes.pdf")
    build_pdf("docs/Proofline_Round_3_PPT_Changes.pdf")
    build_docx("docs/Proofline_Round_3_Slide_by_Slide_Changes.docx")
    build_docx("docs/Proofline_Round_3_PPT_Changes.docx")
