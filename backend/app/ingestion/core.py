"""Dependency-tolerant document ingestion for Proofline.

The text path uses only the Python standard library.  PDF, DOCX, and OCR
dependencies are imported inside their adapters so the backend can still ingest
plain text in an offline/minimal environment.  Adapters return explicit failure
or unsupported states instead of silently turning missing/empty extraction into
successful content.
"""

from __future__ import annotations

import importlib
import io
import math
import struct
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, BinaryIO, Callable, Iterable, Mapping, Sequence, cast

from .types import (
    DocumentSpan,
    FileMetadata,
    ImageOCRFallback,
    IngestionLimits,
    NormalizedDocument,
    SourceType,
    SpanSource,
)


PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
TEXT_MIME = "text/plain"
PNG_MIME = "image/png"
JPEG_MIME = "image/jpeg"

_DOCX_MIME_ALIASES = {DOCX_MIME}
_TEXT_MIME_PREFIXES = ("text/",)
_IMAGE_MIMES = {PNG_MIME, JPEG_MIME, "image/jpg"}
_MIME_BY_EXTENSION = {
    ".pdf": PDF_MIME,
    ".docx": DOCX_MIME,
    ".txt": TEXT_MIME,
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".png": PNG_MIME,
    ".jpg": JPEG_MIME,
    ".jpeg": JPEG_MIME,
}


@dataclass(slots=True)
class _RawSpan:
    text: str
    source: SpanSource
    page: int | None = None
    bbox: tuple[float, float, float, float] | None = None
    paragraph: int | None = None
    separator_before: str = "\n"


@dataclass(slots=True)
class _ParserAttempt:
    name: str
    available: bool
    spans: list[_RawSpan]
    errors: list[str]
    truncated: bool = False

    @property
    def extracted_characters(self) -> int:
        return sum(len(span.text.strip()) for span in self.spans)


def _normalise_text(value: str) -> str:
    """Normalise only line endings so character offsets remain unsurprising."""

    return value.replace("\r\n", "\n").replace("\r", "\n")


def _safe_filename(filename: str | None) -> str | None:
    if filename is None:
        return None
    value = "".join(character for character in str(filename) if ord(character) >= 32 and ord(character) != 127)
    # Handle both POSIX and Windows separators without retaining a path.
    value = value.replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not value:
        return None
    return value[:255]


def _normalise_mime(mime_type: str | None) -> str | None:
    if not mime_type:
        return None
    value = mime_type.split(";", 1)[0].strip().lower()
    if value == "image/jpg":
        return JPEG_MIME
    return value or None


def _sniff_mime(data: bytes) -> str | None:
    if data.startswith(b"%PDF-"):
        return PDF_MIME
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return PNG_MIME
    if data.startswith(b"\xff\xd8\xff"):
        return JPEG_MIME
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                names = set(archive.namelist())
            if "word/document.xml" in names:
                return DOCX_MIME
        except (OSError, ValueError, zipfile.BadZipFile):
            return None
    if data:
        try:
            decoded = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            return None
        if "\x00" not in decoded:
            return TEXT_MIME
    return None


def _resolve_mime(data: bytes, declared_mime: str | None, filename: str | None) -> str | None:
    declared = _normalise_mime(declared_mime)
    sniffed = _sniff_mime(data)
    extension_mime = _MIME_BY_EXTENSION.get(Path(filename).suffix.lower()) if filename else None
    if sniffed in {PDF_MIME, DOCX_MIME, PNG_MIME, JPEG_MIME}:
        return sniffed
    if declared:
        return declared
    if extension_mime:
        return extension_mime
    return sniffed


def _source_type_for_mime(mime_type: str | None) -> SourceType:
    if mime_type == PDF_MIME:
        return "pdf"
    if mime_type in _DOCX_MIME_ALIASES:
        return "docx"
    if mime_type in _IMAGE_MIMES:
        return "image"
    return "text"


def _safe_error(context: str, error: BaseException, filename: str | None = None) -> str:
    """Capture a parser error safely without copying its arbitrary source data.

    Parser exception strings can include document excerpts, full paths, or
    decoded upload bytes.  Retain the stage and exception type, and only a small
    allowlist of content-free diagnostics; do not log the exception itself.
    """

    safe_messages = {
        "File is not a zip file": "not a valid DOCX archive",
        "Tesseract process timeout": "OCR timeout reached",
        "cannot open broken document": "document is malformed",
        "cannot open empty document": "document is empty",
    }
    detail = safe_messages.get(str(error))
    suffix = f": {detail}" if detail else ""
    return f"{context} ({error.__class__.__name__}){suffix}"


def _combine_messages(messages: Iterable[str]) -> str | None:
    unique: list[str] = []
    for message in messages:
        if message and message not in unique:
            unique.append(message)
    if not unique:
        return None
    return "; ".join(unique)[:900]


def _dimensions_from_headers(data: bytes, mime_type: str) -> tuple[int, int, str] | None:
    if mime_type == PNG_MIME and data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        width, height = struct.unpack(">II", data[16:24])
        if width > 0 and height > 0:
            return width, height, "PNG"
        return None

    if mime_type != JPEG_MIME or not data.startswith(b"\xff\xd8"):
        return None
    index = 2
    sof_markers = {
        *range(0xC0, 0xC4),
        *range(0xC5, 0xC8),
        *range(0xC9, 0xCC),
        *range(0xCD, 0xD0),
    }
    while index + 3 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        while index < len(data) and data[index] == 0xFF:
            index += 1
        if index >= len(data):
            break
        marker = data[index]
        index += 1
        if marker in {0xD8, 0xD9} or 0xD0 <= marker <= 0xD7:
            continue
        if index + 2 > len(data):
            break
        segment_length = struct.unpack(">H", data[index : index + 2])[0]
        if segment_length < 2 or index + segment_length > len(data):
            break
        if marker in sof_markers and segment_length >= 7:
            height, width = struct.unpack(">HH", data[index + 3 : index + 7])
            if width > 0 and height > 0:
                return width, height, "JPEG"
        index += segment_length
    return None


def _image_metadata(
    *,
    filename: str | None,
    mime_type: str | None,
    size_bytes: int,
    dimensions: tuple[int, int, str] | None,
) -> tuple[FileMetadata, list[dict[str, object]]]:
    metadata: FileMetadata = {
        "filename": filename,
        "mime_type": mime_type,
        "size_bytes": size_bytes,
    }
    image_entries: list[dict[str, object]] = []
    if dimensions:
        width, height, image_format = dimensions
        metadata.update({"width": width, "height": height, "format": image_format})
        image_entries.append(
            {
                "filename": filename,
                "mime_type": mime_type,
                "size_bytes": size_bytes,
                "width": width,
                "height": height,
                "format": image_format,
            }
        )
    return metadata, image_entries


def _empty_document(
    *,
    source_type: SourceType,
    status: str,
    message: str | None,
    filename: str | None,
    mime_type: str | None,
    size_bytes: int,
    confidential: bool,
    dimensions: tuple[int, int, str] | None = None,
) -> NormalizedDocument:
    file_metadata, image_metadata = _image_metadata(
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        dimensions=dimensions,
    )
    return cast(
        NormalizedDocument,
        {
            "text": "",
            "spans": [],
            "source_type": source_type,
            "extraction_status": status,
            "extraction_message": message,
            "image_metadata": image_metadata,
            "original_filename": filename,
            "mime_type": mime_type,
            "confidential": confidential,
            "file_metadata": file_metadata,
        },
    )


def _assemble(
    raw_spans: Sequence[_RawSpan],
    *,
    source_type: SourceType,
    status: str,
    message: str | None,
    filename: str | None,
    mime_type: str | None,
    size_bytes: int,
    confidential: bool,
    dimensions: tuple[int, int, str] | None = None,
) -> NormalizedDocument:
    pieces: list[str] = []
    spans: list[DocumentSpan] = []
    cursor = 0
    first = True
    for raw_span in raw_spans:
        chunk = _normalise_text(raw_span.text)
        if not chunk or not chunk.strip():
            continue
        separator = "" if first else _normalise_text(raw_span.separator_before)
        if separator:
            pieces.append(separator)
            cursor += len(separator)
        start = cursor
        pieces.append(chunk)
        cursor += len(chunk)
        span = cast(
            DocumentSpan,
            {
                "start": start,
                "end": cursor,
                "text": chunk,
                "page": raw_span.page,
                "source": raw_span.source,
                "bbox": raw_span.bbox,
            },
        )
        if raw_span.paragraph is not None:
            span["paragraph"] = raw_span.paragraph
        spans.append(span)
        first = False

    text = "".join(pieces)
    if not text.strip():
        # Empty or whitespace-only extraction is never a successful result.
        if status in {"complete", "partial"}:
            status = "failed"
        if not message:
            message = "no text was extracted"
        spans = []

    file_metadata, image_metadata = _image_metadata(
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        dimensions=dimensions,
    )
    return cast(
        NormalizedDocument,
        {
            "text": text,
            "spans": spans,
            "source_type": source_type,
            "extraction_status": cast(Any, status),
            "extraction_message": message,
            "image_metadata": image_metadata,
            "original_filename": filename,
            "mime_type": mime_type,
            "confidential": confidential,
            "file_metadata": file_metadata,
        },
    )


def ingest_text(
    text: str,
    *,
    filename: str | None = None,
    mime_type: str | None = TEXT_MIME,
    confidential: bool = False,
    limits: IngestionLimits | None = None,
) -> NormalizedDocument:
    """Normalise UTF-8-compatible text and provide one exact source span."""

    if not isinstance(text, str):
        raise TypeError("text input must be a string")
    safe_name = _safe_filename(filename)
    normalised_mime = _normalise_mime(mime_type) or TEXT_MIME
    size_bytes = len(text.encode("utf-8", errors="replace"))
    active_limits = limits or IngestionLimits()
    if size_bytes > active_limits.max_bytes:
        return _empty_document(
            source_type="text",
            status="failed",
            message=f"input exceeds the configured size limit ({active_limits.max_bytes} bytes)",
            filename=safe_name,
            mime_type=normalised_mime,
            size_bytes=size_bytes,
            confidential=bool(confidential),
        )
    if "\x00" in text or any(0xD800 <= ord(character) <= 0xDFFF for character in text):
        return _empty_document(
            source_type="text",
            status="failed",
            message="text contains invalid Unicode or null characters",
            filename=safe_name,
            mime_type=normalised_mime,
            size_bytes=size_bytes,
            confidential=bool(confidential),
        )
    return _assemble(
        [_RawSpan(text=text, source="text", separator_before="")],
        source_type="text",
        status="complete",
        message=None,
        filename=safe_name,
        mime_type=normalised_mime,
        size_bytes=size_bytes,
        confidential=bool(confidential),
    )


def _parser_import(module_name: str) -> tuple[Any | None, str | None]:
    try:
        return importlib.import_module(module_name), None
    except (ImportError, ModuleNotFoundError):
        return None, None
    except Exception as error:  # pragma: no cover - defensive import boundary
        return None, f"{module_name} import failed: {error.__class__.__name__}"


def _extract_pdf_with_pymupdf(data: bytes, limits: IngestionLimits, filename: str | None) -> _ParserAttempt:
    module, import_error = _parser_import("pymupdf")
    if module is None:
        module, legacy_import_error = _parser_import("fitz")
        import_error = import_error or legacy_import_error
    if module is None:
        return _ParserAttempt("PyMuPDF", False, [], [import_error] if import_error else [])
    spans: list[_RawSpan] = []
    errors: list[str] = []
    truncated = False
    document: Any = None
    try:
        document = module.open(stream=data, filetype="pdf")
        total_pages = len(document)
        page_count = min(total_pages, limits.max_pdf_pages)
        truncated = total_pages > page_count
        for index in range(page_count):
            try:
                text = document[index].get_text("text")
                if text and text.strip():
                    spans.append(
                        _RawSpan(
                            text=text,
                            source="pdf",
                            page=index + 1,
                            separator_before="\n",
                        )
                    )
                else:
                    errors.append(f"PDF page {index + 1} returned no text; blank or image-only pages require review")
            except Exception as error:
                errors.append(_safe_error(f"PyMuPDF page {index + 1} extraction failed", error, filename))
    except Exception as error:
        errors.append(_safe_error("PyMuPDF extraction failed", error, filename))
    finally:
        if document is not None:
            try:
                document.close()
            except Exception:
                pass
    if truncated:
        errors.append(f"PDF page limit reached ({limits.max_pdf_pages})")
    return _ParserAttempt("PyMuPDF", True, spans, errors, truncated)


def _extract_pdf_with_pdfplumber(data: bytes, limits: IngestionLimits, filename: str | None) -> _ParserAttempt:
    module, import_error = _parser_import("pdfplumber")
    if module is None:
        return _ParserAttempt("pdfplumber", False, [], [import_error] if import_error else [])
    spans: list[_RawSpan] = []
    errors: list[str] = []
    truncated = False
    try:
        with module.open(io.BytesIO(data)) as document:
            total_pages = len(document.pages)
            page_count = min(total_pages, limits.max_pdf_pages)
            truncated = total_pages > page_count
            for index in range(page_count):
                try:
                    text = document.pages[index].extract_text() or ""
                    if text.strip():
                        spans.append(
                            _RawSpan(
                                text=text,
                                source="pdf",
                                page=index + 1,
                                separator_before="\n",
                            )
                        )
                    else:
                        errors.append(f"PDF page {index + 1} returned no text; blank or image-only pages require review")
                except Exception as error:
                    errors.append(_safe_error(f"pdfplumber page {index + 1} extraction failed", error, filename))
    except Exception as error:
        errors.append(_safe_error("pdfplumber extraction failed", error, filename))
    if truncated:
        errors.append(f"PDF page limit reached ({limits.max_pdf_pages})")
    return _ParserAttempt("pdfplumber", True, spans, errors, truncated)


def _select_parser_attempt(attempts: Sequence[_ParserAttempt]) -> _ParserAttempt | None:
    available = [attempt for attempt in attempts if attempt.available]
    with_text = [attempt for attempt in available if attempt.extracted_characters > 0]
    if with_text:
        return max(
            with_text,
            key=lambda attempt: (not attempt.errors and not attempt.truncated, attempt.extracted_characters),
        )
    return available[0] if available else None


def _extract_pdf(
    data: bytes,
    *,
    filename: str | None,
    mime_type: str,
    confidential: bool,
    limits: IngestionLimits,
) -> NormalizedDocument:
    attempts = [_extract_pdf_with_pymupdf(data, limits, filename)]
    first_attempt = attempts[0]
    if not first_attempt.extracted_characters or first_attempt.errors:
        attempts.append(_extract_pdf_with_pdfplumber(data, limits, filename))
    attempt = _select_parser_attempt(attempts)
    if attempt is None:
        return _empty_document(
            source_type="pdf",
            status="unsupported",
            message=_combine_messages(
                ["PDF extraction is unavailable; install PyMuPDF or pdfplumber"]
                + [error for item in attempts for error in item.errors]
            ),
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(data),
            confidential=confidential,
        )
    status = "partial" if attempt.errors or attempt.truncated else "complete"
    message = _combine_messages(attempt.errors)
    if not attempt.spans:
        status = "failed"
        message = message or "PDF parser returned no extractable text"
    return _assemble(
        attempt.spans,
        source_type="pdf",
        status=status,
        message=message,
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(data),
        confidential=confidential,
    )


def _docx_body_spans(document: Any, filename: str | None) -> tuple[list[_RawSpan], list[str]]:
    spans: list[_RawSpan] = []
    errors: list[str] = []
    paragraph_number = 0
    try:
        from docx.text.paragraph import Paragraph  # type: ignore[import-not-found]
    except ImportError as error:  # pragma: no cover - python-docx import boundary
        return [], [_safe_error("DOCX paragraph adapter unavailable", error, filename)]

    def visit(container: Any, parent: Any) -> None:
        nonlocal paragraph_number
        for child in container.iterchildren():
            tag = str(getattr(child, "tag", "")).rsplit("}", 1)[-1]
            if tag == "p":
                paragraph_number += 1
                try:
                    paragraph = Paragraph(child, parent)
                    spans.append(
                        _RawSpan(
                            text=paragraph.text,
                            source="docx",
                            paragraph=paragraph_number,
                            separator_before="\n",
                        )
                    )
                    if any(str(node.tag).rsplit("}", 1)[-1] in {"txbxContent", "sdt"} for node in child.iter()):
                        errors.append("DOCX contains inline text boxes/content controls that require review")
                except Exception as error:
                    errors.append(_safe_error(f"DOCX paragraph {paragraph_number} extraction failed", error, filename))
            elif tag in {"tbl", "tr", "tc", "sdt", "sdtContent", "customXml"}:
                # Walking physical XML cells avoids repeating merged table-cell
                # content and preserves paragraph/table order, including nesting.
                visit(child, parent)

    try:
        visit(document.element.body, document)
    except Exception as error:
        errors.append(_safe_error("DOCX body extraction failed", error, filename))
    seen_parts: set[str] = set()
    try:
        for section in document.sections:
            for name in ("header", "first_page_header", "even_page_header", "footer", "first_page_footer", "even_page_footer"):
                part = getattr(section, name)
                if part.is_linked_to_previous or str(part.part.partname) in seen_parts:
                    continue
                seen_parts.add(str(part.part.partname))
                visit(part._element, part)
    except Exception as error:
        errors.append(_safe_error("DOCX header/footer extraction failed", error, filename))
    return spans, errors


def _extract_docx(
    data: bytes,
    *,
    filename: str | None,
    mime_type: str,
    confidential: bool,
    limits: IngestionLimits,
) -> NormalizedDocument:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            members = archive.infolist()
            if sum(member.file_size for member in members) > limits.max_docx_expanded_bytes:
                return _empty_document(
                    source_type="docx",
                    status="failed",
                    message=f"DOCX expanded size exceeds the configured limit ({limits.max_docx_expanded_bytes} bytes)",
                    filename=filename,
                    mime_type=mime_type,
                    size_bytes=len(data),
                    confidential=confidential,
                )
            archive_names = {member.filename for member in members}
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        return _empty_document(
            source_type="docx",
            status="failed",
            message=_safe_error("DOCX archive is invalid", error, filename),
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(data),
            confidential=confidential,
        )
    module, import_error = _parser_import("docx")
    if module is None:
        return _empty_document(
            source_type="docx",
            status="unsupported",
            message=_combine_messages(
                ["DOCX extraction is unavailable; install python-docx"]
                + ([import_error] if import_error else [])
            ),
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(data),
            confidential=confidential,
        )
    try:
        document = module.Document(io.BytesIO(data))
    except Exception as error:
        return _empty_document(
            source_type="docx",
            status="failed",
            message=_safe_error("DOCX parser failed", error, filename),
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(data),
            confidential=confidential,
        )
    spans, errors = _docx_body_spans(document, filename)
    if any(name.startswith("word/media/") for name in archive_names):
        errors.append("DOCX contains embedded media; its text/visual content requires review")
    if archive_names.intersection({"word/footnotes.xml", "word/endnotes.xml"}):
        errors.append("DOCX contains footnotes/endnotes that require review")
    status = "partial" if errors else "complete"
    if not any(span.text.strip() for span in spans):
        status = "failed"
        errors.append("DOCX contained no extractable text")
    return _assemble(
        spans,
        source_type="docx",
        status=status,
        message=_combine_messages(errors),
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(data),
        confidential=confidential,
    )


def _parse_bbox(value: object) -> tuple[float, float, float, float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return None
    try:
        left, top, right, bottom = (float(part) for part in value)
    except (TypeError, ValueError, OverflowError):
        return None
    if not all(math.isfinite(part) for part in (left, top, right, bottom)):
        return None
    if left < 0 or top < 0 or right <= left or bottom <= top:
        return None
    return left, top, right, bottom


def _ocr_words_to_spans(ocr_data: Mapping[str, Any]) -> list[_RawSpan]:
    texts = list(ocr_data.get("text", []))
    count = len(texts)
    block_values = list(ocr_data.get("block_num", []))
    paragraph_values = list(ocr_data.get("par_num", []))
    line_values = list(ocr_data.get("line_num", []))
    left_values = list(ocr_data.get("left", []))
    top_values = list(ocr_data.get("top", []))
    width_values = list(ocr_data.get("width", []))
    height_values = list(ocr_data.get("height", []))
    spans: list[_RawSpan] = []
    previous_line: tuple[object, ...] | None = None
    for index in range(count):
        text = str(texts[index]).strip()
        if not text:
            continue
        line_key = (
            block_values[index] if index < len(block_values) else 0,
            paragraph_values[index] if index < len(paragraph_values) else 0,
            line_values[index] if index < len(line_values) else index,
        )
        bbox = None
        try:
            left, top = float(left_values[index]), float(top_values[index])
            width, height = float(width_values[index]), float(height_values[index])
            bbox = _parse_bbox((left, top, left + width, top + height))
        except (IndexError, TypeError, ValueError, OverflowError):
            pass
        spans.append(
            _RawSpan(
                text=text,
                source="ocr",
                page=1,
                bbox=bbox,
                separator_before=" " if previous_line == line_key else "\n",
            )
        )
        previous_line = line_key
    return spans


def _truncate_document(document: NormalizedDocument, max_characters: int) -> NormalizedDocument:
    if len(document["text"]) <= max_characters:
        return document
    text = document["text"][:max_characters]
    spans: list[DocumentSpan] = []
    for span in document["spans"]:
        if span["start"] >= max_characters:
            continue
        end = min(span["end"], max_characters)
        copied = dict(span)
        copied["end"] = end
        copied["text"] = text[span["start"] : end]
        spans.append(cast(DocumentSpan, copied))
    document["text"] = text
    document["spans"] = spans
    if document["extraction_status"] == "complete":
        document["extraction_status"] = "partial"
    existing = document.get("extraction_message")
    suffix = f"OCR output truncated at {max_characters} characters"
    document["extraction_message"] = f"{existing}; {suffix}" if existing else suffix
    return document


def _fallback_document(
    value: object,
    *,
    filename: str | None,
    mime_type: str,
    size_bytes: int,
    confidential: bool,
    dimensions: tuple[int, int, str] | None,
    local_message: str | None,
) -> NormalizedDocument | None:
    if isinstance(value, str):
        text = value
        supplied_spans: list[DocumentSpan] = []
        supplied_status = "complete"
        supplied_message = None
    elif isinstance(value, Mapping):
        text = value.get("text", "")
        supplied_spans = list(value.get("spans", [])) if isinstance(value.get("spans", []), list) else []
        supplied_status = str(value.get("extraction_status", "complete"))
        supplied_message = value.get("extraction_message")
        if not isinstance(text, str):
            return None
        if supplied_message is not None and not isinstance(supplied_message, str):
            supplied_message = str(supplied_message)
    else:
        return None

    normalised_text = _normalise_text(text)
    # Map every raw boundary to its normalised offset.  This preserves boxes
    # even when an adapter returns CRLF text with source offsets into that text.
    boundaries = [0]
    cursor = 0
    previous_cr = False
    for character in text:
        if not (character == "\n" and previous_cr):
            cursor += 1
        boundaries.append(cursor)
        previous_cr = character == "\r"
    valid_spans: list[DocumentSpan] = []
    invalid_provenance = False
    if supplied_spans:
        for item in supplied_spans:
            if not isinstance(item, Mapping):
                invalid_provenance = True
                continue
            try:
                raw_start, raw_end = item["start"], item["end"]
                if type(raw_start) is not int or type(raw_end) is not int:
                    raise ValueError("invalid range")
                if raw_start < 0 or raw_end <= raw_start or raw_end > len(text) or text[raw_start:raw_end] != item["text"]:
                    raise ValueError("span does not match OCR text")
                start, end = boundaries[raw_start], boundaries[raw_end]
                span_text = normalised_text[start:end]
                bbox_value = item.get("bbox")
                bbox = _parse_bbox(bbox_value)
                if bbox_value is not None and bbox is None:
                    invalid_provenance = True
                if bbox and dimensions and (bbox[2] > dimensions[0] or bbox[3] > dimensions[1]):
                    bbox = None
                    invalid_provenance = True
                page = item.get("page")
                if page is not None and (type(page) is not int or page <= 0):
                    raise ValueError("invalid page")
                valid = cast(
                    DocumentSpan,
                    {
                        "start": start,
                        "end": end,
                        "text": span_text,
                        "page": page,
                        "source": "ocr",
                        "bbox": bbox,
                    },
                )
                paragraph_value = item.get("paragraph")
                if paragraph_value is not None:
                    if type(paragraph_value) is not int or paragraph_value <= 0:
                        raise ValueError("invalid paragraph")
                    valid["paragraph"] = paragraph_value
                valid_spans.append(valid)
            except (KeyError, TypeError, ValueError, IndexError):
                invalid_provenance = True
                continue
    valid_spans.sort(key=lambda span: (span["start"], span["end"]))
    ordered: list[DocumentSpan] = []
    for span in valid_spans:
        if ordered and span["start"] < ordered[-1]["end"]:
            invalid_provenance = True
            continue
        ordered.append(span)
    valid_spans = ordered
    if not valid_spans and normalised_text.strip():
        valid_spans = [
            cast(
                DocumentSpan,
                {
                    "start": 0,
                    "end": len(normalised_text),
                    "text": normalised_text,
                    "page": None,
                    "source": "ocr",
                    "bbox": None,
                },
            )
        ]
    status = supplied_status if supplied_status in {"complete", "partial", "failed", "unsupported"} else "failed"
    if status in {"failed", "unsupported"} and not supplied_message:
        supplied_message = f"OCR fallback reported {status} extraction"
    if not normalised_text.strip():
        status = "failed"
        supplied_message = supplied_message or "OCR fallback returned no text"
        valid_spans = []
    elif invalid_provenance and status == "complete":
        status = "partial"
        supplied_message = "OCR fallback returned invalid provenance; text needs human review"
    message = _combine_messages(
        [message for message in (local_message, supplied_message) if isinstance(message, str)]
    )
    file_metadata, image_metadata = _image_metadata(
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        dimensions=dimensions,
    )
    return cast(
        NormalizedDocument,
        {
            "text": normalised_text,
            "spans": valid_spans,
            "source_type": "image",
            "extraction_status": cast(Any, status),
            "extraction_message": message,
            "image_metadata": image_metadata,
            "original_filename": filename,
            "mime_type": mime_type,
            "confidential": confidential,
            "file_metadata": file_metadata,
        },
    )


def _call_ocr_fallback(
    fallback: ImageOCRFallback | Callable[..., object],
    data: bytes,
    *,
    mime_type: str,
    filename: str | None,
    confidential: bool,
    metadata: Mapping[str, object],
) -> tuple[object | None, str | None]:
    try:
        if confidential and getattr(fallback, "is_external", True) is not False:
            return None, "confidential input bypassed the external/unknown OCR fallback"
        extractor = getattr(fallback, "extract", None)
        if callable(extractor):
            return (
                extractor(
                    data,
                    mime_type=mime_type,
                    filename=filename,
                    confidential=confidential,
                    metadata=metadata,
                ),
                None,
            )
        if callable(fallback):
            return (
                fallback(
                    data,
                    mime_type=mime_type,
                    filename=filename,
                    confidential=confidential,
                    metadata=metadata,
                ),
                None,
            )
    except Exception as error:
        return None, _safe_error("OCR fallback failed", error, filename)
    return None, "OCR fallback does not expose extract(...) or a callable interface"


def _extract_image(
    data: bytes,
    *,
    filename: str | None,
    mime_type: str,
    confidential: bool,
    limits: IngestionLimits,
    ocr_fallback: ImageOCRFallback | Callable[..., object] | None,
) -> NormalizedDocument:
    dimensions = _dimensions_from_headers(data, mime_type)
    if dimensions is None:
        return _empty_document(
            source_type="image",
            status="failed",
            message="invalid PNG/JPEG signature or image dimensions could not be read",
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(data),
            confidential=confidential,
        )
    else:
        width, height, _ = dimensions
        if width > limits.max_image_dimension or height > limits.max_image_dimension:
            return _empty_document(
                source_type="image",
                status="failed",
                message=f"image dimensions exceed the configured limit ({limits.max_image_dimension}px)",
                filename=filename,
                mime_type=mime_type,
                size_bytes=len(data),
                confidential=confidential,
                dimensions=dimensions,
            )
        if width * height > limits.max_image_pixels:
            return _empty_document(
                source_type="image",
                status="failed",
                message=f"image exceeds the configured pixel limit ({limits.max_image_pixels})",
                filename=filename,
                mime_type=mime_type,
                size_bytes=len(data),
                confidential=confidential,
                dimensions=dimensions,
            )

    local_errors: list[str] = []
    pil_module, pil_import_error = _parser_import("PIL.Image")
    if pil_module is None:
        local_errors.append("local OCR unavailable: install Pillow")
    else:
        try:
            with pil_module.open(io.BytesIO(data)) as image:
                if image.format not in {"PNG", "JPEG"} or image.size != dimensions[:2]:
                    raise ValueError("invalid image format/dimensions")
                if getattr(image, "n_frames", 1) != 1:
                    raise ValueError("animated images are not supported")
                image.verify()
        except Exception as error:
            return _empty_document(
                source_type="image",
                status="failed",
                message=_safe_error("image validation failed", error, filename),
                filename=filename,
                mime_type=mime_type,
                size_bytes=len(data),
                confidential=confidential,
                dimensions=dimensions,
            )
    pytesseract, tesseract_import_error = _parser_import("pytesseract")
    if pytesseract is None:
        local_errors.append("local OCR unavailable: install pytesseract and Tesseract")

    if pil_module is not None and pytesseract is not None:
        try:
            with pil_module.open(io.BytesIO(data)) as image:
                image.load()
                output_type = getattr(getattr(pytesseract, "Output", None), "DICT", None)
                if output_type is not None:
                    ocr_data = pytesseract.image_to_data(
                        image,
                        output_type=output_type,
                        timeout=limits.ocr_timeout_seconds,
                    )
                else:
                    ocr_data = pytesseract.image_to_data(image, timeout=limits.ocr_timeout_seconds)
            if isinstance(ocr_data, Mapping):
                spans = _ocr_words_to_spans(ocr_data)
                if spans:
                    document = _assemble(
                        spans,
                        source_type="image",
                        status="complete",
                        message=None,
                        filename=filename,
                        mime_type=mime_type,
                        size_bytes=len(data),
                        confidential=confidential,
                        dimensions=dimensions,
                    )
                    return _truncate_document(document, limits.max_ocr_characters)
                local_errors.append("local OCR returned no text")
            else:
                local_errors.append("local OCR returned an invalid result")
        except Exception as error:
            local_errors.append(_safe_error("local OCR failed", error, filename))

    if ocr_fallback is not None:
        metadata: dict[str, object] = {
            "mime_type": mime_type,
            "filename": filename,
            "size_bytes": len(data),
            "timeout_seconds": limits.ocr_timeout_seconds,
            "max_characters": limits.max_ocr_characters,
        }
        if dimensions:
            metadata.update({"width": dimensions[0], "height": dimensions[1], "format": dimensions[2]})
        fallback_value, fallback_error = _call_ocr_fallback(
            ocr_fallback,
            data,
            mime_type=mime_type,
            filename=filename,
            confidential=confidential,
            metadata=metadata,
        )
        if fallback_value is not None:
            document = _fallback_document(
                fallback_value,
                filename=filename,
                mime_type=mime_type,
                size_bytes=len(data),
                confidential=confidential,
                dimensions=dimensions,
                local_message=_combine_messages(local_errors),
            )
            if document is not None:
                return _truncate_document(document, limits.max_ocr_characters)
        if fallback_error:
            local_errors.append(fallback_error)

    local_errors.extend(error for error in (pil_import_error, tesseract_import_error) if error)
    return _empty_document(
        source_type="image",
        status="unsupported" if pil_module is None or pytesseract is None else "failed",
        message=_combine_messages(local_errors)
        or "image OCR did not produce extractable text",
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(data),
        confidential=confidential,
        dimensions=dimensions,
    )


def _read_content(content: object, filename: str | None, max_bytes: int) -> tuple[str | bytes, str | None]:
    if isinstance(content, str):
        return content, filename
    if isinstance(content, bytes):
        return content, filename
    if isinstance(content, (bytearray, memoryview)):
        return bytes(content), filename
    if isinstance(content, Path):
        with content.open("rb") as handle:
            return handle.read(max_bytes + 1), filename or content.name
    if hasattr(content, "read"):
        stream = cast(BinaryIO, content)
        value = stream.read(max_bytes + 1)
        stream_name = getattr(stream, "name", None)
        effective_filename = filename or (str(stream_name) if stream_name else None)
        if isinstance(value, str):
            return value, effective_filename
        if isinstance(value, (bytes, bytearray, memoryview)):
            return bytes(value), effective_filename
        raise TypeError("file-like input must return text or bytes")
    raise TypeError("content must be text, bytes, a path, or a readable file-like object")


def ingest_document(
    content: object,
    *,
    mime_type: str | None = None,
    filename: str | None = None,
    confidential: bool = False,
    limits: IngestionLimits | None = None,
    ocr_fallback: ImageOCRFallback | Callable[..., object] | None = None,
) -> NormalizedDocument:
    """Ingest text or a supported file into the contract representation.

    ``content`` may be a string, bytes, a ``Path``, or a readable binary/text
    stream.  Strings are intentionally treated as submitted text rather than as
    paths; callers that want file ingestion should pass a ``Path`` or bytes.
    """

    active_limits = limits or IngestionLimits()
    try:
        value, inferred_filename = _read_content(content, filename, active_limits.max_bytes)
    except OSError as error:
        return _empty_document(
            source_type=_source_type_for_mime(_normalise_mime(mime_type)),
            status="failed",
            message=_safe_error("input could not be read", error),
            filename=_safe_filename(filename or (content.name if isinstance(content, Path) else None)),
            mime_type=_normalise_mime(mime_type),
            size_bytes=0,
            confidential=bool(confidential),
        )
    safe_name = _safe_filename(inferred_filename)
    if isinstance(value, str):
        return ingest_text(
            value,
            filename=safe_name,
            mime_type=_normalise_mime(mime_type) or TEXT_MIME,
            confidential=confidential,
            limits=active_limits,
        )

    data = value
    if len(data) > active_limits.max_bytes:
        declared_mime = _normalise_mime(mime_type)
        return _empty_document(
            source_type=_source_type_for_mime(declared_mime),
            status="failed",
            message=f"input exceeds the configured size limit ({active_limits.max_bytes} bytes)",
            filename=safe_name,
            mime_type=declared_mime,
            size_bytes=len(data),
            confidential=bool(confidential),
        )
    resolved_mime = _resolve_mime(data, mime_type, safe_name)
    source_type = _source_type_for_mime(resolved_mime)
    if not data:
        return _empty_document(
            source_type=source_type,
            status="failed",
            message="input is empty; no text was extracted",
            filename=safe_name,
            mime_type=resolved_mime,
            size_bytes=0,
            confidential=bool(confidential),
        )

    if resolved_mime is None:
        return _empty_document(
            source_type="text",
            status="unsupported",
            message="could not determine the input MIME type",
            filename=safe_name,
            mime_type=None,
            size_bytes=len(data),
            confidential=bool(confidential),
        )
    if resolved_mime.startswith(_TEXT_MIME_PREFIXES):
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            return _empty_document(
                source_type="text",
                status="failed",
                message=_safe_error("text decoding failed", error, safe_name),
                filename=safe_name,
                mime_type=resolved_mime,
                size_bytes=len(data),
                confidential=bool(confidential),
            )
        result = ingest_text(
            text,
            filename=safe_name,
            mime_type=resolved_mime,
            confidential=confidential,
            limits=active_limits,
        )
        result.setdefault("file_metadata", {})["size_bytes"] = len(data)
        return result
    if resolved_mime == PDF_MIME:
        return _extract_pdf(
            data,
            filename=safe_name,
            mime_type=resolved_mime,
            confidential=bool(confidential),
            limits=active_limits,
        )
    if resolved_mime in _DOCX_MIME_ALIASES:
        return _extract_docx(
            data,
            filename=safe_name,
            mime_type=resolved_mime,
            confidential=bool(confidential),
            limits=active_limits,
        )
    if resolved_mime in _IMAGE_MIMES:
        return _extract_image(
            data,
            filename=safe_name,
            mime_type=resolved_mime,
            confidential=bool(confidential),
            limits=active_limits,
            ocr_fallback=ocr_fallback,
        )
    return _empty_document(
        source_type=source_type,
        status="unsupported",
        message=f"unsupported MIME type: {resolved_mime}",
        filename=safe_name,
        mime_type=resolved_mime,
        size_bytes=len(data),
        confidential=bool(confidential),
    )


def normalize_document(
    content: object | None = None,
    *,
    text: str | None = None,
    mime_type: str | None = None,
    filename: str | None = None,
    confidential: bool = False,
    limits: IngestionLimits | None = None,
    ocr_fallback: ImageOCRFallback | Callable[..., object] | None = None,
) -> NormalizedDocument:
    """Friendly normalisation entry point supporting ``content`` or ``text``."""

    if content is None:
        if text is None:
            raise TypeError("normalize_document requires content or text")
        content = text
    return ingest_document(
        content,
        mime_type=mime_type,
        filename=filename,
        confidential=confidential,
        limits=limits,
        ocr_fallback=ocr_fallback,
    )


normalise_document = normalize_document
extract_document = ingest_document
ingest = ingest_document


def extract_pdf(
    data: bytes,
    *,
    filename: str | None = None,
    confidential: bool = False,
    limits: IngestionLimits | None = None,
) -> NormalizedDocument:
    """Explicit PDF adapter entry point for pipeline callers."""

    return ingest_document(
        data,
        mime_type=PDF_MIME,
        filename=filename,
        confidential=confidential,
        limits=limits,
    )


def extract_docx(
    data: bytes,
    *,
    filename: str | None = None,
    confidential: bool = False,
) -> NormalizedDocument:
    """Explicit DOCX adapter entry point for pipeline callers."""

    return ingest_document(
        data,
        mime_type=DOCX_MIME,
        filename=filename,
        confidential=confidential,
    )


def extract_image(
    data: bytes,
    *,
    filename: str | None = None,
    mime_type: str | None = None,
    confidential: bool = False,
    limits: IngestionLimits | None = None,
    ocr_fallback: ImageOCRFallback | Callable[..., object] | None = None,
) -> NormalizedDocument:
    """Explicit image/OCR adapter entry point for pipeline callers."""

    return ingest_document(
        data,
        mime_type=mime_type,
        filename=filename,
        confidential=confidential,
        limits=limits,
        ocr_fallback=ocr_fallback,
    )
