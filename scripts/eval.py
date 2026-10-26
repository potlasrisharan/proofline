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
from difflib import unified_diff
import json
from pathlib import Path
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "backend/tests/fixtures/golden/generated/reliability_v1.json"
GENERATED_REPORT_START = "<!-- BEGIN PROOFLINE GENERATED RELIABILITY REPORT -->"
GENERATED_REPORT_END = "<!-- END PROOFLINE GENERATED RELIABILITY REPORT -->"
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
        "- The separate Phase 2 HTTP contract evaluator is maintained alongside this report. Its local VoltEdge results are not silently folded into this reliability measurement, and neither evaluation makes an external model request.",
        "",
        "## Reproduction",
        "",
        "```bash",
        "python3 scripts/generate_golden.py --check",
        "python3 scripts/eval.py --check-report docs/EVAL_REPORT.md",
        "python3 scripts/eval.py --report docs/EVAL_REPORT.md  # explicit regeneration",
        "python3 -m pytest -q backend/tests/test_reliability.py backend/tests/test_golden_fixtures.py",
        "```",
    ])
    return "\n".join(lines) + "\n"


def _resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def _secret_like_path(path: Path) -> bool:
    name = path.name.lower()
    suffix = path.suffix.lower()
    return (
        name == ".env"
        or name.startswith(".env.")
        or suffix in {".key", ".pem", ".p12", ".pfx"}
        or any(token in name for token in ("secret", "credential", "password", "token"))
    )


def _generated_section(content: str) -> str:
    """Return the generated portion of a report, preserving hand-maintained sections."""

    start = content.find(GENERATED_REPORT_START)
    end = content.find(GENERATED_REPORT_END, start + len(GENERATED_REPORT_START)) if start >= 0 else -1
    if start < 0 and end < 0:
        return content
    if start < 0 or end < 0:
        raise ValueError("report has an incomplete generated-section marker")
    section_start = start + len(GENERATED_REPORT_START)
    return content[section_start:end].lstrip("\n").rstrip("\n") + "\n"


def _replace_generated_section(content: str, report: str) -> str:
    """Replace only the generated report section and retain adjacent hand-written notes."""

    start = content.find(GENERATED_REPORT_START)
    end = content.find(GENERATED_REPORT_END, start + len(GENERATED_REPORT_START)) if start >= 0 else -1
    if start < 0 and end < 0:
        return report
    if start < 0 or end < 0:
        raise ValueError("report has an incomplete generated-section marker")
    prefix = content[:start]
    suffix = content[end + len(GENERATED_REPORT_END):]
    replacement = f"{GENERATED_REPORT_START}\n{report.rstrip()}\n{GENERATED_REPORT_END}"
    if suffix and not suffix.startswith("\n"):
        suffix = f"\n{suffix}"
    if not suffix:
        replacement += "\n"
    return f"{prefix}{replacement}{suffix}"


def _check_report(destination: Path, report: str) -> int:
    if not destination.is_file():
        print(f"Evaluation report is missing: {destination}", file=sys.stderr)
        return 1
    try:
        actual = _generated_section(destination.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, ValueError) as error:
        print(f"Could not read evaluation report {destination}: {error}", file=sys.stderr)
        return 1
    if actual != report:
        print(f"Evaluation report is stale: {destination}", file=sys.stderr)
        print("The check is read-only. To intentionally regenerate the generated section, run:", file=sys.stderr)
        print(f"  python3 scripts/eval.py --report {destination}", file=sys.stderr)
        diff = unified_diff(actual.splitlines(), report.splitlines(), fromfile="tracked", tofile="generated", n=1)
        for line in list(diff)[:80]:
            print(line, file=sys.stderr)
        return 1
    print(f"Evaluation report matches {destination} (read-only check).")
    return 0


def _write_report(destination: Path, report: str) -> None:
    if _secret_like_path(destination):
        raise ValueError(f"refusing to write an evaluation report to secret-like path: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file():
        current = destination.read_text(encoding="utf-8")
        rendered = _replace_generated_section(current, report)
    else:
        rendered = report
    destination.write_text(rendered, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DATASET)
    report_group = parser.add_mutually_exclusive_group()
    report_group.add_argument(
        "--report",
        type=Path,
        default=None,
        help="explicitly write the generated report section to PATH",
    )
    report_group.add_argument(
        "--check-report",
        type=Path,
        default=None,
        help="compare the generated report section with PATH without writing",
    )
    args = parser.parse_args()
    dataset = load_dataset(args.dataset)
    results = run_cases(dataset)
    report = render_report(dataset, results)
    if args.check_report is not None:
        return _check_report(_resolve_path(args.check_report), report)
    if args.report is not None:
        try:
            _write_report(_resolve_path(args.report), report)
        except (OSError, UnicodeDecodeError, ValueError) as error:
            print(f"Could not write evaluation report: {error}", file=sys.stderr)
            return 2
    print(report)
    # Evaluation is a measurement command. A case exception is visible in the
    # report but does not turn the output into a fabricated pass/fail claim.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
