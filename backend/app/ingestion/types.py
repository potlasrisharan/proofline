"""Public types for Proofline document ingestion.

The wire-shaped ``TypedDict`` definitions in this module intentionally mirror the
Phase 2 contract in ``docs/CONTRACT.md``.  The optional extension fields carry
safe upload metadata and paragraph provenance without changing the required
contract keys consumed by the verification pipeline.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal, Mapping, NotRequired, Protocol, TypedDict


ExtractionStatus = Literal["complete", "partial", "failed", "unsupported"]
SourceType = Literal["text", "pdf", "docx", "image"]
SpanSource = Literal["text", "pdf", "docx", "ocr"]


class DocumentSpan(TypedDict):
    """A source-backed range in the final normalised document text.

    ``start`` and ``end`` are always offsets into ``NormalizedDocument["text"]``
    (Python's half-open range convention).  ``paragraph`` is an optional
    compatibility extension used for DOCX blocks; the core contract only
    requires page/source/bounding-box provenance.
    """

    start: int
    end: int
    text: str
    page: int | None
    source: SpanSource
    bbox: tuple[float, float, float, float] | None
    paragraph: NotRequired[int | None]


class FileMetadata(TypedDict, total=False):
    """Safe, non-content upload metadata.

    This deliberately has no raw bytes, extracted text, or parser object.  It is
    suitable for retaining alongside an ingestion result and for returning to a
    caller that needs to display upload details.
    """

    filename: str | None
    mime_type: str | None
    size_bytes: int
    width: int
    height: int
    format: str


class NormalizedDocument(TypedDict):
    """The stable ingestion result consumed by later audit stages."""

    text: str
    spans: list[DocumentSpan]
    source_type: SourceType
    extraction_status: ExtractionStatus
    extraction_message: str | None
    image_metadata: list[dict[str, object]]
    original_filename: str | None
    mime_type: str | None
    confidential: bool
    # Extensions are optional for consumers written against the contract above.
    file_metadata: NotRequired[FileMetadata]


class OCRFallbackResult(TypedDict, total=False):
    """Result shape accepted from a future image/OCR adapter.

    A fallback may provide already-normalised spans, or just text.  The ingestion
    package validates and re-bases supplied spans before returning them.
    """

    text: str
    spans: list[DocumentSpan]
    extraction_status: ExtractionStatus
    extraction_message: str | None


class ImageOCRFallback(Protocol):
    """Protocol for a later local/service OCR or vision adapter.

    This is only an interface.  It does not select Gemini or any other provider,
    and no external call is made unless a caller explicitly supplies an adapter.
    Confidential inputs are never passed to an external/unknown adapter.  A
    genuinely local adapter must declare ``is_external = False``.
    """

    is_external: bool

    def extract(
        self,
        image_bytes: bytes,
        *,
        mime_type: str,
        filename: str | None,
        confidential: bool,
        metadata: Mapping[str, object],
    ) -> OCRFallbackResult | NormalizedDocument | str:
        ...


@dataclass(frozen=True, slots=True)
class IngestionLimits:
    """Boundaries applied before optional parsers/OCR are invoked."""

    max_bytes: int = 10 * 1024 * 1024
    max_pdf_pages: int = 100
    max_image_pixels: int = 20_000_000
    max_image_dimension: int = 10_000
    max_ocr_characters: int = 200_000
    ocr_timeout_seconds: float = 15.0
    max_docx_expanded_bytes: int = 50 * 1024 * 1024

    def __post_init__(self) -> None:
        if self.max_bytes <= 0:
            raise ValueError("max_bytes must be positive")
        if self.max_pdf_pages <= 0:
            raise ValueError("max_pdf_pages must be positive")
        if self.max_image_pixels <= 0:
            raise ValueError("max_image_pixels must be positive")
        if self.max_image_dimension <= 0:
            raise ValueError("max_image_dimension must be positive")
        if self.max_ocr_characters <= 0:
            raise ValueError("max_ocr_characters must be positive")
        if self.ocr_timeout_seconds <= 0 or not math.isfinite(self.ocr_timeout_seconds):
            raise ValueError("ocr_timeout_seconds must be positive and finite")
        if self.max_docx_expanded_bytes <= 0:
            raise ValueError("max_docx_expanded_bytes must be positive")


# A callable adapter is convenient in small pipelines; the implementation also
# accepts an object implementing ``ImageOCRFallback.extract``.
OCRFallback = ImageOCRFallback
