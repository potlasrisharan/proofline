"""Evaluate the bounded local Evidence-or-Abstain layer on VoltEdge fixtures.

This evaluator imports only the local reliability library. It never reaches a model,
network, API route, database, or external service. Precision/recall are case-level
category-detection metrics: one predicted category anywhere in a case counts once.
Verdict agreement is reported separately and is not silently folded into recall.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
import json
from pathlib import Path
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "backend/tests/fixtures/golden/generated/reliability_v1.json"
sys.path.insert(0, str(ROOT))

from backend.app.reliability import LocalReliabilityEngine, ReliabilityRequest  # noqa: E402


@dataclass(frozen=True)
class CaseResult:
    fixture_id: str
    family: str
    expected: frozenset[tuple[str, str]]
    actual: frozenset[tuple[str, str]]
    status: str
    reason_code: str | None
    error: str | None = None

    @property
    def expected_categories(self) -> frozenset[str]:
        return frozenset(category for category, _ in self.expected)

    @property
    def actual_categories(self) -> frozenset[str]:
        return frozenset(category for category, _ in self.actual)


def load_dataset(path: Path = DATASET) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("fixture_schema_version") != "golden-reliability-v1":
        raise ValueError("unsupported reliability fixture schema")
    cases = payload.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("dataset has no cases")
    return payload


def run_cases(dataset: dict[str, Any]) -> list[CaseResult]:
    engine = LocalReliabilityEngine()
    results: list[CaseResult] = []
    for case in dataset["cases"]:
        expected = frozenset((item["category"], item["verdict"]) for item in case["expected_checks"])
        try:
            result = engine.audit(ReliabilityRequest.model_validate(case["input"]))
            actual = frozenset((finding.category, finding.verdict) for finding in result.findings)
            results.append(CaseResult(case["fixture_id"], case["family"], expected, actual, result.status, result.reason_code))
        except Exception as error:  # report per-case failures rather than hiding them
            results.append(CaseResult(case["fixture_id"], case["family"], expected, frozenset(), "failed", None, type(error).__name__))
    return results


def _metric(numerator: int, denominator: int) -> str:
    """Return an exact fraction and a fixed decimal representation for readability."""

    decimal = numerator / denominator if denominator else 0.0
    return f"{numerator}/{denominator} ({decimal:.6f})"


def _category_metrics(results: list[CaseResult]) -> tuple[list[str], dict[str, dict[str, Any]]]:
    categories = sorted({category for result in results for category in result.expected_categories | result.actual_categories})
    metrics: dict[str, dict[str, Any]] = {}
    for category in categories:
        tp = sum(category in result.expected_categories and category in result.actual_categories for result in results)
        fp = sum(category not in result.expected_categories and category in result.actual_categories for result in results)
        fn = sum(category in result.expected_categories and category not in result.actual_categories for result in results)
        expected_positive = sum(category in result.expected_categories for result in results)
        predicted_positive = sum(category in result.actual_categories for result in results)
        exact_verdict = sum(
            any(item_category == category and any(
                actual_category == category and actual_verdict == expected_verdict
                for actual_category, actual_verdict in result.actual
            ) for item_category, expected_verdict in result.expected)
            for result in results
        )
        metrics[category] = {
            "true_positive": tp, "false_positive": fp, "false_negative": fn,
            "expected_positive": expected_positive, "predicted_positive": predicted_positive,
            "precision": _metric(tp, tp + fp), "recall": _metric(tp, tp + fn),
            "verdict_agreement_cases": exact_verdict,
        }
    return categories, metrics


def render_report(dataset: dict[str, Any], results: list[CaseResult]) -> str:
    categories, metrics = _category_metrics(results)
    failed = [result for result in results if result.error]
    status_counts = Counter(result.status for result in results)
    exact_case_matches = sum(result.expected == result.actual for result in results)
    expected_pairs = Counter(pair for result in results for pair in result.expected)
    actual_pairs = Counter(pair for result in results for pair in result.actual)
    lines = [
        "# Evidence-or-Abstain local reliability evaluation",
        "",
        "**Status:** IMPLEMENTED local deterministic measurement. This report contains no external-model call and makes no model-accuracy claim.",
        "",
        "## Dataset",
        "",
        f"- Dataset file: `{DATASET.relative_to(ROOT)}`",
        f"- Dataset schema: `{dataset['fixture_schema_version']}`",
        f"- Generated cases: **{len(results)}**",
        f"- Reference time: `{dataset.get('reference_time', 'not recorded')}`",
        "- Tenant/content examples: fictional VoltEdge only.",
        f"- Result statuses: {', '.join(f'{key}={value}' for key, value in sorted(status_counts.items()))}.",
        f"- Cases with exact expected `(category, verdict)` set: **{exact_case_matches}/{len(results)}** ({exact_case_matches / len(results):.6f}).",
        "",
        "## Methodology",
        "",
        "1. `scripts/generate_golden.py` creates deterministic template cases with explicit expected checks. It does not import the reliability implementation and does not use random data or observed outputs.",
        "2. `scripts/eval.py` validates each case through `ReliabilityRequest` and executes `LocalReliabilityEngine`, which is local-only and reports `external_calls=0`.",
        "3. Category precision and recall are case-level detection metrics. A category is present at most once per case for scoring, even if the engine emits several spans.",
        "4. A true positive means the expected category is present and the engine predicted that category. False positives and false negatives are counted against all cases in the generated set.",
        "5. Verdict agreement is shown separately because category detection and the choice between `supported`, `contradicted`, `unsupported`, and `needs_human` are different questions.",
        "6. No rounding-up, smoothing, confidence calibration, or external baseline is applied. Decimal values below are formatted to six places; the integer fractions are the exact counts.",
        "",
        "## Category results",
        "",
        "| Category | TP | FP | FN | Expected + | Predicted + | Precision (exact fraction; decimal) | Recall (exact fraction; decimal) | Cases with expected verdict agreement |",
        "|---|---:|---:|---:|---:|---:|---|---|---:|",
    ]
    for category in categories:
        item = metrics[category]
        lines.append(
            f"| `{category}` | {item['true_positive']} | {item['false_positive']} | {item['false_negative']} | {item['expected_positive']} | {item['predicted_positive']} | {item['precision']} | {item['recall']} | {item['verdict_agreement_cases']} |"
        )
    lines.extend(["", "## Expected and predicted verdict-pair counts", "", "| Category | Verdict | Expected | Predicted |", "|---|---|---:|---:|"])
    for category, verdict in sorted(set(expected_pairs) | set(actual_pairs)):
        lines.append(f"| `{category}` | `{verdict}` | {expected_pairs[(category, verdict)]} | {actual_pairs[(category, verdict)]} |")
    lines.extend(["", "## Failures and limitations", ""])
    if failed:
        lines.append(f"- **{len(failed)} case(s) raised an exception** and contributed no predicted categories:")
        lines.extend(f"  - `{result.fixture_id}`: `{result.error}`" for result in failed)
    else:
        lines.append("- No per-case exceptions occurred during this run.")
    lines.extend([
        "- This is a synthetic, template-generated, in-sample set. It demonstrates deterministic behavior and adversarial coverage; it is not a representative production benchmark or a human-labelled customer corpus.",
        "- The local library intentionally abstains on approximate wording without an approved tolerance, incompatible units/currencies, missing/scoped/conflicting evidence, incomplete candidate output, malformed candidate output, and prompt-injection text.",
        "- Unit conversions use explicit local factors only. No exchange rates, semantic guesses, OCR, PDF/DOCX extraction, retrieval, model provider, network, or durable persistence are exercised by this report.",
        "- Word-number and fraction challenge cases are expected to route to `needs_human`; they measure graceful degradation rather than broad natural-language numeric coverage.",
        "- A high precision/recall result here does not establish model accuracy, real-world truth, legal compliance, accessibility certification, or production reliability.",
        "- The original 52-case API evaluator remains a separate contract/integration artifact. Its current baseline records failures when the local snapshot lacks `/contents` and seeds vault records as a creator; those failures are not silently folded into this local report.",
        "",
        "## Reproduction",
        "",
        "```bash",
        "python3 scripts/generate_golden.py --check",
        "python3 scripts/eval.py --report docs/EVAL_REPORT.md",
        "python3 -m pytest -q backend/tests/test_reliability.py backend/tests/test_golden_fixtures.py",
        "```",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DATASET)
    parser.add_argument("--report", type=Path, default=None)
    args = parser.parse_args()
    dataset = load_dataset(args.dataset)
    results = run_cases(dataset)
    report = render_report(dataset, results)
    print(report)
    if args.report is not None:
        destination = args.report if args.report.is_absolute() else ROOT / args.report
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(report, encoding="utf-8")
    # Evaluation is a measurement command. A case exception is visible in the
    # report but does not turn the output into a fabricated pass/fail claim.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
