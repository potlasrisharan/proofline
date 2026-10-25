"""Transparent policy triage scores; these numbers are never probabilities."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any


SEVERITY_POINTS = {"critical": 5, "high": 4, "medium": 3, "review_required": 3, "low": 1}
MAX_RAW_SCORE = 5 * 1 * 3 * 1.5


def finding_risk(
    finding: Mapping[str, Any], *, exposure: int = 1, regulated: bool = False
) -> dict[str, Any]:
    if not 1 <= exposure <= 3:
        raise ValueError("exposure must be between 1 and 3")
    severity = SEVERITY_POINTS.get(str(finding.get("severity", "review_required")), 3)
    confidence = max(0.0, min(1.0, float(finding.get("confidence", 0.0))))
    regulatory_weight = 1.5 if regulated else 1.0
    raw_score = severity * confidence * exposure * regulatory_weight
    basis = (
        f"severity={severity} x confidence={confidence:g} x exposure={exposure} "
        f"x regulatory_weight={regulatory_weight:g}"
    )
    return {
        "value": round(100 * raw_score / MAX_RAW_SCORE),
        "basis": basis,
        "is_probability": False,
        "breakdown": {
            "severity_points": severity,
            "confidence": confidence,
            "exposure": exposure,
            "regulatory_weight": regulatory_weight,
            "raw_score": round(raw_score, 6),
        },
    }


def calculate_risk(
    findings: Sequence[Mapping[str, Any]], *, exposure: int = 1, regulated: bool = False
) -> dict[str, Any]:
    breakdown: list[dict[str, Any]] = []
    for finding in findings:
        scored = finding_risk(finding, exposure=exposure, regulated=regulated)
        breakdown.append({"finding_id": finding.get("id"), **scored})
    value = max((item["value"] for item in breakdown), default=0)
    forced_high = any(str(finding.get("severity")) == "critical" for finding in findings)
    label = "high" if forced_high or value >= 65 else "medium" if value >= 30 else "low"
    return {
        "label": label,
        "value": value,
        "score": value,
        "is_probability": False,
        "forced_high": forced_high,
        "basis": (
            "Maximum finding triage score; severity (1–5) x confidence x exposure (1–3) "
            "x regulatory weight (1.0 or 1.5), scaled by 100/22.5. "
            "Any critical finding forces high content risk. This is not a truth probability."
        ),
        "breakdown": breakdown,
    }
