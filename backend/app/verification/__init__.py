"""Offline claim extraction, evidence matching, and deterministic checks.

The verification package deliberately has no dependency on the API, persistence, or
LLM layers.  It accepts simple mappings or objects with the expected attributes and
returns dataclasses that the audit pipeline can adapt to its public models.
"""

from .claims import (
    DEFAULT_REGULATED_KEYWORDS,
    extract_claims,
    extract_regulated_keywords,
    extract_security_candidates,
)
from .coordinator import (
    AuditOptions,
    VerificationResult,
    coordinate_verification,
    run_verification,
)
from .matching import (
    FactMatch,
    RecordView,
    link_claims_to_facts,
    match_claim_to_fact,
    normalise_record,
    normalize_record,
)
from .normalization import (
    DateRange,
    NormalizedQuantity,
    normalize_date,
    normalize_key,
    normalize_money,
    normalize_quantity,
    parse_date_range,
)
from .rules import (
    check_comparative_claims,
    check_contrast,
    check_hashtag_readability,
    check_missing_alt_text,
    check_numeric_mismatches,
    check_offer_validity,
    check_palette_colours,
    check_required_disclaimers,
    check_terms,
    detect_prompt_injection,
    run_deterministic_rules,
)
from .types import (
    Claim,
    ClaimFactLink,
    Evidence,
    Finding,
    FindingSeverity,
    FindingVerdict,
    Span,
    Suggestion,
)

__all__ = [
    "AuditOptions",
    "Claim",
    "ClaimFactLink",
    "DateRange",
    "DEFAULT_REGULATED_KEYWORDS",
    "Evidence",
    "FactMatch",
    "Finding",
    "FindingSeverity",
    "FindingVerdict",
    "NormalizedQuantity",
    "RecordView",
    "Span",
    "Suggestion",
    "VerificationResult",
    "check_comparative_claims",
    "check_contrast",
    "check_hashtag_readability",
    "check_missing_alt_text",
    "check_numeric_mismatches",
    "check_offer_validity",
    "check_palette_colours",
    "check_required_disclaimers",
    "check_terms",
    "coordinate_verification",
    "detect_prompt_injection",
    "extract_claims",
    "extract_regulated_keywords",
    "extract_security_candidates",
    "link_claims_to_facts",
    "match_claim_to_fact",
    "normalise_record",
    "normalize_record",
    "normalize_date",
    "normalize_key",
    "normalize_money",
    "normalize_quantity",
    "parse_date_range",
    "run_deterministic_rules",
    "run_verification",
]
