#!/usr/bin/env python3
"""
Generate matching DOCX for Slide-by-Slide "WHAT IS PRESENT NOW vs. WHAT SHOULD BE THERE".
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from generate_slide_comparison_pdf import COMPARISON_SLIDES

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def build_comparison_docx(output_path):
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)

    # Title
    p_title = doc.add_paragraph()
    r_t = p_title.add_run("PROOFLINE — ROUND 3 SLIDE-BY-SLIDE PPT TRANSFORMATION GUIDE")
    r_t.font.name = "Arial"
    r_t.font.size = Pt(16)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(15, 23, 42)

    p_sub = doc.add_paragraph()
    r_s = p_sub.add_run("What Is Present Now (Round 2) vs. What Should Be There (Round 3) • Ordered Slide by Slide")
    r_s.font.name = "Arial"
    r_s.font.size = Pt(10)
    r_s.font.color.rgb = RGBColor(100, 116, 139)

    for slide in COMPARISON_SLIDES:
        # Header
        p_hdr = doc.add_paragraph()
        p_hdr.paragraph_format.space_before = Pt(14)
        p_hdr.paragraph_format.space_after = Pt(2)
        r_h = p_hdr.add_run(f"SLIDE {slide['slide_num']}: {slide['title'].upper()}  |  {slide['action']}")
        r_h.font.name = "Arial"
        r_h.font.size = Pt(12)
        r_h.font.bold = True
        r_h.font.color.rgb = RGBColor(15, 23, 42)

        p_rubric = doc.add_paragraph()
        p_rubric.paragraph_format.space_before = Pt(0)
        p_rubric.paragraph_format.space_after = Pt(4)
        r_rb = p_rubric.add_run(f"🎯 Rubric Target: {slide['rubric_target']}")
        r_rb.font.name = "Arial"
        r_rb.font.size = Pt(8.5)
        r_rb.font.bold = True
        r_rb.font.color.rgb = RGBColor(30, 64, 175)

        # 2-column table
        tbl = doc.add_table(rows=1, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(3.2)
        tbl.columns[1].width = Inches(3.9)

        # Col 1: Present Now
        c0 = tbl.cell(0, 0)
        set_cell_background(c0, "FEF2F2")
        set_cell_margins(c0)
        p0 = c0.paragraphs[0]
        # Clean HTML tags for docx text
        txt_present = slide["present_now"].replace("<b>", "").replace("</b>", "").replace("<br/>", "\n").replace("<i>", "").replace("</i>", "")
        r0 = p0.add_run(txt_present)
        r0.font.name = "Arial"
        r0.font.size = Pt(8.5)
        r0.font.color.rgb = RGBColor(127, 29, 29)

        # Col 2: Should Be There
        c1 = tbl.cell(0, 1)
        set_cell_background(c1, "F0FDF4")
        set_cell_margins(c1)
        p1 = c1.paragraphs[0]
        txt_should = slide["should_be_there"].replace("<b>", "").replace("</b>", "").replace("<br/>", "\n").replace("<i>", "").replace("</i>", "")
        r1 = p1.add_run(txt_should)
        r1.font.name = "Arial"
        r1.font.size = Pt(8.5)
        r1.font.color.rgb = RGBColor(20, 83, 45)

        # Why box
        p_why = doc.add_paragraph()
        p_why.paragraph_format.space_before = Pt(3)
        p_why.paragraph_format.space_after = Pt(8)
        r_wlbl = p_why.add_run("💡 Why this change scores in Round 3: ")
        r_wlbl.font.name = "Arial"
        r_wlbl.font.size = Pt(8.5)
        r_wlbl.font.bold = True
        r_wlbl.font.color.rgb = RGBColor(30, 64, 175)
        r_wtxt = p_why.add_run(slide["why_change"])
        r_wtxt.font.name = "Arial"
        r_wtxt.font.size = Pt(8.5)
        r_wtxt.font.italic = True
        r_wtxt.font.color.rgb = RGBColor(30, 58, 138)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    print(f"✅ Generated DOCX: {output_path}")

if __name__ == "__main__":
    build_comparison_docx("docs/Proofline_Round_3_PPT_Changes.docx")
    build_comparison_docx("docs/Proofline_Round_3_Slide_by_Slide_Changes.docx")
