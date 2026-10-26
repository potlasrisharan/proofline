#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run lint
npm run typecheck
npm run build
npm run test:frontend

if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'python3 is required for backend tests.' >&2
  exit 1
fi
python3 -m pytest -q backend/tests scripts/test_eval_report.py
python3 scripts/generate_golden.py --check
python3 scripts/eval.py --check-report docs/EVAL_REPORT.md
