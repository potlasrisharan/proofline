#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'python3 is required for the FastAPI foundation.' >&2
  exit 1
fi

if ! python3 -c 'import fastapi, uvicorn' >/dev/null 2>&1; then
  printf '%s\n' 'FastAPI dependencies are missing. Install with: python3 -m pip install -r backend/requirements.txt' >&2
  exit 1
fi

backend_port="${BACKEND_PORT:-8000}"
frontend_port="${PORT:-3000}"

python3 -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port "$backend_port" &
backend_pid=$!
cleanup() {
  kill "$backend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

printf 'FastAPI foundation: http://127.0.0.1:%s/health\n' "$backend_port"
printf 'Next.js UI: http://127.0.0.1:%s\n' "$frontend_port"
npm run dev -- --hostname 127.0.0.1 --port "$frontend_port"
