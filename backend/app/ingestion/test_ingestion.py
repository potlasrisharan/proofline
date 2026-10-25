from __future__ import annotations

import base64
from io import BytesIO

import pytest

from .core import ingest_document
from .types import IngestionLimits


# A 1x1 white PNG generated for this test; it contains no customer or product data.
_ONE_PIXEL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def test_text_offsets_are_exact_after_line_ending_normalisation() -> None:
    document = ingest_document(
        "VoltEdge NovaBook\r\nBattery: up to 12 hours",
        filename="nested\\voltedge.txt",
        confidential=True,
    )

    assert document["extraction_status"] == "complete"
    assert document["source_type"] == "text"
    assert document["original_filename"] == "voltedge.txt"
    assert document["confidential"] is True
    assert document["text"] == "VoltEdge NovaBook\nBattery: up to 12 hours"
    for span in document["spans"]:
        assert document["text"][span["start"] : span["end"]] == span["text"]


def test_empty_and_unsupported_inputs_are_not_successes() -> None:
    empty = ingest_document(b"", filename="empty.txt", mime_type="text/plain")
    unsupported = ingest_document(b"\x00\x01", filename="voltedge.bin", mime_type="application/octet-stream")

    assert empty["extraction_status"] == "failed"
    assert empty["text"] == ""
    assert unsupported["extraction_status"] == "unsupported"
    assert unsupported["text"] == ""


def test_ocr_fallback_spans_rebase_offsets_and_preserve_boxes() -> None:
    def fallback(_data: bytes, **_kwargs: object) -> dict[str, object]:
        return {
            "text": "VoltEdge\r\nOCR copy",
            "spans": [
                {
                    "start": 10,
                    "end": 18,
                    "text": "OCR copy",
                    "page": 1,
                    "source": "ocr",
                    "bbox": [0, 0, 1, 1],
                }
            ],
        }

    document = ingest_document(
        _ONE_PIXEL_PNG,
        filename="voltedge.png",
        mime_type="image/png",
        ocr_fallback=fallback,
    )

    assert document["extraction_status"] == "complete"
    assert document["text"] == "VoltEdge\nOCR copy"
    assert document["image_metadata"][0]["width"] == 1
    assert document["image_metadata"][0]["height"] == 1
    span = document["spans"][0]
    assert span["start"] == 9
    assert span["end"] == len(document["text"])
    assert span["bbox"] == (0.0, 0.0, 1.0, 1.0)
    assert document["text"][span["start"] : span["end"]] == span["text"]


def test_confidential_input_bypasses_unknown_ocr_fallback() -> None:
    called = False

    def fallback(_data: bytes, **_kwargs: object) -> str:
        nonlocal called
        called = True
        return "VoltEdge OCR"

    document = ingest_document(
        _ONE_PIXEL_PNG,
        filename="voltedge.png",
        mime_type="image/png",
        confidential=True,
        ocr_fallback=fallback,
    )

    assert called is False
    assert document["extraction_status"] != "complete"
    assert "confidential" in (document["extraction_message"] or "")


def test_size_limit_is_applied_before_optional_parsers() -> None:
    document = ingest_document(
        b"VoltEdge text",
        filename="voltedge.txt",
        mime_type="text/plain",
        limits=IngestionLimits(max_bytes=4),
    )

    assert document["extraction_status"] == "failed"
    assert "size limit" in (document["extraction_message"] or "")


def test_pdf_extraction_keeps_page_provenance_when_available() -> None:
    fitz = pytest.importorskip("fitz")
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((72, 72), "VoltEdge PDF page one")
    data = pdf.tobytes()
    pdf.close()

    document = ingest_document(data, filename="voltedge.pdf")

    assert document["source_type"] == "pdf"
    assert document["extraction_status"] == "complete"
    assert document["spans"][0]["page"] == 1
    assert document["text"][document["spans"][0]["start"] : document["spans"][0]["end"]] == document["spans"][0]["text"]


def test_docx_extraction_keeps_paragraph_provenance_when_available() -> None:
    docx = pytest.importorskip("docx")
    document = docx.Document()
    document.add_paragraph("VoltEdge paragraph one")
    document.add_paragraph("VoltEdge paragraph two")
    output = BytesIO()
    document.save(output)

    result = ingest_document(output.getvalue(), filename="voltedge.docx")

    assert result["source_type"] == "docx"
    assert result["extraction_status"] == "complete"
    assert [span.get("paragraph") for span in result["spans"]] == [1, 2]
    for span in result["spans"]:
        assert result["text"][span["start"] : span["end"]] == span["text"]
