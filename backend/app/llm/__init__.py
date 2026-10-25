"""Provider-neutral, fail-soft language-model boundary for Proofline.

The package is deliberately independent from the API and audit orchestration layers.
It can be imported and exercised without a Gemini SDK, a database driver, or any
provider credentials.  External model use is opt-in and always returns an explicit
review-required state when it cannot be completed safely.
"""

from .backoff import RetryPolicy, call_with_backoff
from .cache import ResponseCache
from .gemini import GeminiConfig, GeminiProvider
from .evidence import (
    eligible_records,
    find_evidence_record,
    normalise_records,
    record_scope,
    record_text,
    validate_findings,
)
from .pii import (
    PiiMaskResult,
    contains_instruction_like,
    detect_instruction_like,
    mask_emails_and_phones,
    mask_pii,
    mask_pii_with_metadata,
)
from .retrieval import (
    InMemoryRetriever,
    PgVectorRetriever,
    PostgresFullTextRetriever,
    RetrievalResult,
    RetrievalStatus,
    RetrievalRouter,
    Retriever,
)
from .schemas import (
    CandidateOutput,
    CandidateValidationError,
    candidate_json_schema,
    VerifierOutput,
    parse_candidate_output,
    parse_verifier_output,
    verifier_json_schema,
)
from .provider import (
    SYSTEM_INSTRUCTION,
    ConfidentialContentError,
    LLMProvider,
    ProviderError,
    ProviderMalformedResponseError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    invoke_provider,
    provider_status,
    request_validated,
)
from .service import LLMService
from .suggestions import (
    IntentPreservingSuggestionGenerator,
    generate_intent_preserving_suggestion,
)
from .types import (
    ApprovedFact,
    CandidateFinding,
    CandidateSuggestion,
    EvidenceRef,
    FindingSpan,
    InstructionLikeSignal,
    LLMReviewResult,
    LLMRunStatus,
    ProviderAvailability,
    ProviderStatus,
)
from .verifier import HighSeverityVerifier, VerificationResult

GeminiAdapter = GeminiProvider

__all__ = [
    "ApprovedFact",
    "CandidateFinding",
    "CandidateOutput",
    "CandidateSuggestion",
    "CandidateValidationError",
    "candidate_json_schema",
    "EvidenceRef",
    "FindingSpan",
    "GeminiConfig",
    "GeminiProvider",
    "GeminiAdapter",
    "HighSeverityVerifier",
    "InMemoryRetriever",
    "InstructionLikeSignal",
    "IntentPreservingSuggestionGenerator",
    "LLMReviewResult",
    "LLMRunStatus",
    "LLMService",
    "PgVectorRetriever",
    "PiiMaskResult",
    "PostgresFullTextRetriever",
    "RetrievalStatus",
    "ProviderAvailability",
    "ProviderError",
    "ProviderMalformedResponseError",
    "ProviderRateLimitError",
    "ProviderStatus",
    "ProviderUnavailableError",
    "LLMProvider",
    "ResponseCache",
    "RetrievalResult",
    "RetrievalRouter",
    "RetryPolicy",
    "Retriever",
    "SYSTEM_INSTRUCTION",
    "VerifierOutput",
    "verifier_json_schema",
    "VerificationResult",
    "call_with_backoff",
    "contains_instruction_like",
    "detect_instruction_like",
    "generate_intent_preserving_suggestion",
    "mask_emails_and_phones",
    "mask_pii",
    "mask_pii_with_metadata",
    "parse_candidate_output",
    "parse_verifier_output",
    "invoke_provider",
    "provider_status",
    "request_validated",
    "eligible_records",
    "find_evidence_record",
    "normalise_records",
    "record_scope",
    "record_text",
    "validate_findings",
    "ConfidentialContentError",
]
