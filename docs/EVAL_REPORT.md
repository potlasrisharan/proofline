# Evidence-or-Abstain local reliability evaluation

**Status:** IMPLEMENTED local deterministic measurement. This report contains no external-model call and makes no model-accuracy claim.

## Dataset

- Dataset file: `backend/tests/fixtures/golden/generated/reliability_v1.json`
- Dataset schema: `golden-reliability-v1`
- Generated cases: **194**
- Reference time: `2026-10-25T12:00:00Z`
- Tenant/content examples: fictional VoltEdge only.
- Result statuses: completed=103, review_required=91.
- Cases with exact expected `(category, verdict)` set: **190/194** (0.979381).

## Methodology

1. `scripts/generate_golden.py` creates deterministic template cases with explicit expected checks. It does not import the reliability implementation and does not use random data or observed outputs.
2. `scripts/eval.py` validates each case through `ReliabilityRequest` and executes `LocalReliabilityEngine`, which is local-only and reports `external_calls=0`.
3. Category precision and recall are case-level detection metrics. A category is present at most once per case for scoring, even if the engine emits several spans.
4. A true positive means the expected category is present and the engine predicted that category. False positives and false negatives are counted against all cases in the generated set.
5. Verdict agreement is shown separately because category detection and the choice between `supported`, `contradicted`, `unsupported`, and `needs_human` are different questions.
6. No rounding-up, smoothing, confidence calibration, or external baseline is applied. Decimal values below are formatted to six places; the integer fractions are the exact counts.

## Category results

| Category | TP | FP | FN | Expected + | Predicted + | Precision (exact fraction; decimal) | Recall (exact fraction; decimal) | Cases with expected verdict agreement |
|---|---:|---:|---:|---:|---:|---|---|---:|
| `factual` | 154 | 0 | 4 | 158 | 154 | 154/154 (1.000000) | 154/158 (0.974684) | 154 |
| `legal` | 4 | 0 | 0 | 4 | 4 | 4/4 (1.000000) | 4/4 (1.000000) | 4 |
| `offer_date` | 12 | 0 | 0 | 12 | 12 | 12/12 (1.000000) | 12/12 (1.000000) | 12 |
| `promotional` | 8 | 0 | 0 | 8 | 8 | 8/8 (1.000000) | 8/8 (1.000000) | 8 |
| `security` | 16 | 0 | 0 | 16 | 16 | 16/16 (1.000000) | 16/16 (1.000000) | 16 |
| `terminology` | 5 | 0 | 0 | 5 | 5 | 5/5 (1.000000) | 5/5 (1.000000) | 5 |

## Expected and predicted verdict-pair counts

| Category | Verdict | Expected | Predicted |
|---|---|---:|---:|
| `factual` | `contradicted` | 23 | 23 |
| `factual` | `needs_human` | 55 | 51 |
| `factual` | `supported` | 60 | 60 |
| `factual` | `unsupported` | 20 | 20 |
| `legal` | `contradicted` | 4 | 4 |
| `offer_date` | `outdated` | 4 | 4 |
| `offer_date` | `supported` | 8 | 8 |
| `promotional` | `supported` | 4 | 4 |
| `promotional` | `unsupported` | 4 | 4 |
| `security` | `needs_human` | 16 | 16 |
| `terminology` | `contradicted` | 5 | 5 |

## Failures and limitations

- No per-case exceptions occurred during this run.
- This is a synthetic, template-generated, in-sample set. It demonstrates deterministic behavior and adversarial coverage; it is not a representative production benchmark or a human-labelled customer corpus.
- The local library intentionally abstains on approximate wording without an approved tolerance, incompatible units/currencies, missing/scoped/conflicting evidence, incomplete candidate output, malformed candidate output, and prompt-injection text.
- Unit conversions use explicit local factors only. No exchange rates, semantic guesses, OCR, PDF/DOCX extraction, retrieval, model provider, network, or durable persistence are exercised by this report.
- Word-number and fraction challenge cases are expected to route to `needs_human`; they measure graceful degradation rather than broad natural-language numeric coverage.
- A high precision/recall result here does not establish model accuracy, real-world truth, legal compliance, accessibility certification, or production reliability.
- The original 52-case API evaluator remains a separate contract/integration artifact. Its current baseline records failures when the local snapshot lacks `/contents` and seeds vault records as a creator; those failures are not silently folded into this local report.

## Reproduction

```bash
python3 scripts/generate_golden.py --check
python3 scripts/eval.py --report docs/EVAL_REPORT.md
python3 -m pytest -q backend/tests/test_reliability.py backend/tests/test_golden_fixtures.py
```
