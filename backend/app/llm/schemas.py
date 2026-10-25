"""Parsing and validation for untrusted model responses."""

from __future__ import annotations

import json
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from .types import CandidateOutput, VerifierOutput


class CandidateValidationError(ValueError):
    """Raised when a model response is not valid Proofline JSON."""


T = TypeVar("T", bound=BaseModel)


def _decode_json(raw: Any) -> Any:
    if isinstance(raw, BaseModel):
        return raw.model_dump()
    if isinstance(raw, bytes):
        try:
            raw = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise CandidateValidationError("model response was not UTF-8 JSON") from None
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        raise CandidateValidationError("model response was not JSON text")
    if len(raw) > 131072:
        raise CandidateValidationError("model response exceeded the validation limit")
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].lstrip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text, object_pairs_hook=_unique_keys, parse_constant=_reject_constant)
    except (json.JSONDecodeError, ValueError, RecursionError):
        raise CandidateValidationError("model response was not one valid JSON object") from None


def _unique_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def _reject_constant(_: str) -> Any:
    raise ValueError("non-finite JSON number")


def _validate(model: type[T], raw: Any) -> T:
    try:
        value = _decode_json(raw)
        return model.model_validate(value)
    except CandidateValidationError:
        raise
    except (ValidationError, TypeError, ValueError):
        raise CandidateValidationError("model response failed schema validation") from None


def parse_candidate_output(raw: Any) -> CandidateOutput:
    return _validate(CandidateOutput, raw)


def parse_verifier_output(raw: Any) -> VerifierOutput:
    return _validate(VerifierOutput, raw)


def candidate_json_schema() -> dict[str, Any]:
    """Return the JSON Schema supplied to a provider, when supported."""

    return CandidateOutput.model_json_schema()


def verifier_json_schema() -> dict[str, Any]:
    return VerifierOutput.model_json_schema()
