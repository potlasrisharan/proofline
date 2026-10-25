"""Local-only PII masking and instruction-like content detection."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .types import InstructionLikeSignal


# Deliberately conservative: these patterns mask common email and phone forms before
# a request leaves the process, while avoiding ordinary four-digit dates.
_EMAIL_RE = re.compile(
    r"(?<![\w.+-])[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?![\w.-])"
)
_PHONE_RE = re.compile(
    r"(?<!\w)(?:\+?\d{1,3}[\s.-]?)?"
    r"(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\w)"
)
_INTERNATIONAL_PHONE_RE = re.compile(
    r"(?<!\w)\+\d{1,3}(?:[\s.-]?\d{1,4}){2,5}(?!\w)"
)


@dataclass(frozen=True)
class PiiMaskResult:
    text: str
    email_count: int = 0
    phone_count: int = 0

    @property
    def masked(self) -> bool:
        return bool(self.email_count or self.phone_count)


_INSTRUCTION_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("ignore_previous_instructions", re.compile(r"\bignore\s+(?:all\s+)?previous\s+instructions?\b", re.I)),
    ("ignore_system_message", re.compile(r"\bignore\s+(?:the\s+)?system\s+(?:message|prompt)\b", re.I)),
    ("role_override", re.compile(r"\b(?:you are now|act as|role[- ]?play as)\b", re.I)),
    ("prompt_exfiltration", re.compile(r"\b(?:reveal|print|show|leak)\b.{0,80}\b(?:prompt|secret|system message|api key)\b", re.I | re.S)),
    ("instruction_delimiter", re.compile(r"(?:^|\n)\s*(?:system|assistant|developer)\s*:\s*", re.I)),
)


def mask_pii_with_metadata(text: str) -> PiiMaskResult:
    """Mask email addresses and phone numbers without logging the originals."""

    if not isinstance(text, str):
        raise TypeError("text must be a string")

    email_count = 0
    phone_count = 0

    def replace_email(_: re.Match[str]) -> str:
        nonlocal email_count
        email_count += 1
        return "[REDACTED_EMAIL]"

    def replace_phone(_: re.Match[str]) -> str:
        nonlocal phone_count
        phone_count += 1
        return "[REDACTED_PHONE]"

    masked = _EMAIL_RE.sub(replace_email, text)
    masked = _INTERNATIONAL_PHONE_RE.sub(replace_phone, masked)
    masked = _PHONE_RE.sub(replace_phone, masked)
    return PiiMaskResult(masked, email_count=email_count, phone_count=phone_count)


def mask_pii(text: str) -> str:
    """Return text safe to include in an external request."""

    return mask_pii_with_metadata(text).text


def mask_emails_and_phones(text: str) -> str:
    """Descriptive alias for :func:`mask_pii`."""

    return mask_pii(text)


def detect_instruction_like(text: str) -> InstructionLikeSignal:
    """Detect instruction-shaped text as data; never execute or follow it."""

    if not isinstance(text, str):
        raise TypeError("text must be a string")
    signals = tuple(name for name, pattern in _INSTRUCTION_PATTERNS if pattern.search(text))
    return InstructionLikeSignal(detected=bool(signals), signals=signals)


def contains_instruction_like(text: str) -> bool:
    """Return only the detector boolean for rules that need a simple predicate."""

    return detect_instruction_like(text).detected
