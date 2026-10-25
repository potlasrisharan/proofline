"""Offline-capable content ingestion adapters for Proofline.

The plain-text path is dependency-free.  Optional PDF, DOCX, Pillow, and
pytesseract integrations are discovered lazily at call time and expose explicit
``complete``, ``partial``, ``failed``, or ``unsupported`` extraction states.
"""

from .core import (
    DOCX_MIME,
    JPEG_MIME,
    PDF_MIME,
    PNG_MIME,
    TEXT_MIME,
    extract_docx,
    extract_document,
    extract_image,
    extract_pdf,
    ingest,
    ingest_document,
    ingest_text,
    normalize_document,
    normalise_document,
)
from .types import (
    DocumentSpan,
    FileMetadata,
    ImageOCRFallback,
    IngestionLimits,
    NormalizedDocument,
    OCRFallback,
    OCRFallbackResult,
)

__all__ = [
    "DOCX_MIME",
    "JPEG_MIME",
    "PDF_MIME",
    "PNG_MIME",
    "TEXT_MIME",
    "DocumentSpan",
    "FileMetadata",
    "ImageOCRFallback",
    "IngestionLimits",
    "NormalizedDocument",
    "OCRFallback",
    "OCRFallbackResult",
    "extract_docx",
    "extract_document",
    "extract_image",
    "extract_pdf",
    "ingest",
    "ingest_document",
    "ingest_text",
    "normalize_document",
    "normalise_document",
]
