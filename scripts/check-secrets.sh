#!/usr/bin/env bash
set -euo pipefail

# scripts/check-secrets.sh
# Strict Zero-Leakage Environment Variable & Secret Scanner
# Modes:
#   --staged : checks git staged changes & staged files (for pre-commit)
#   --all    : checks all tracked files in git
#   --ci     : checks commits in PR/push against origin/main or HEAD~1

MODE="${1:---all}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "🔍 Running Strict Environment & Secret Leak Scanner (Mode: $MODE)..."

ERRORS=0

# 1. FORBIDDEN ENVIRONMENT FILES SCAN
# Permitted: only .env.example
# Forbidden: .env, .env.local, .env.*, *.env, *.env.* anywhere in repo
check_env_files() {
  local files=""
  if [ "$MODE" = "--staged" ]; then
    files=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '((^|/)\.env|\.env($|\.)|(\.env_))' | grep -v '\.env\.example$' || true)
  else
    files=$(git ls-files | grep -E '((^|/)\.env|\.env($|\.)|(\.env_))' | grep -v '\.env\.example$' || true)
  fi

  if [ -n "$files" ]; then
    echo -e "${RED}❌ FORBIDDEN ENVIRONMENT FILE(S) DETECTED IN GIT:${NC}"
    echo "$files" | while read -r line; do
      echo -e "${RED}   - $line${NC}"
    done
    echo -e "${YELLOW}👉 Environment variables must live exclusively in gitignored local files (.env.local).${NC}"
    echo -e "${YELLOW}👉 Only .env.example with redacted placeholder values may be committed.${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

# 2. RAW SECRET & CREDENTIAL PATTERNS SCAN
check_secret_patterns() {
  local pattern='\bAIza[0-9A-Za-z_-]{20,}\b|\bAQ\.[0-9A-Za-z_-]{20,}\b|\b(sk|gsk|ntn)_[A-Za-z0-9_]{16,}\b|\b(ghp|gho|ghu|ghs|ghr)_[0-9a-zA-Z]{36}\b|\bgithub_pat_[0-9a-zA-Z_]{50,}\b|\bAKIA[0-9A-Z]{16}\b|-----BEGIN[ A-Z0-9_-]*(KEY|CERTIFICATE)-----'
  
  local findings=""
  if [ "$MODE" = "--staged" ]; then
    findings=$(git diff --cached -U0 -- ':(exclude)scripts/check-secrets.sh' | grep '^+[^+]' | grep -E "$pattern" | grep -v -i "test_mock\|mock\|placeholder\|dummy\|redacted\|your_\|example" || true)
  elif [ "$MODE" = "--ci" ]; then
    local base_ref="HEAD~1"
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
      base_ref="origin/main"
    fi
    findings=$(git diff "$base_ref"...HEAD -U0 -- ':(exclude)scripts/check-secrets.sh' | grep '^+[^+]' | grep -E "$pattern" | grep -v -i "test_mock\|mock\|placeholder\|dummy\|redacted\|your_\|example" || true)
  else
    findings=$(git grep -E -I -n "$pattern" -- ':(exclude)scripts/check-secrets.sh' | grep -v -i "test_mock\|mock\|placeholder\|dummy\|redacted\|your_\|example" || true)
  fi

  if [ -n "$findings" ]; then
    echo -e "${RED}❌ LEAKED SECRETS OR HARDCODED CREDENTIALS DETECTED:${NC}"
    echo "$findings" | head -n 20 | while read -r line; do
      echo -e "${RED}   $line${NC}"
    done
    echo -e "${YELLOW}👉 Move all API keys, access tokens, and private keys to process.env / os.environ.${NC}"
    echo -e "${YELLOW}👉 NEVER commit raw tokens to repository history.${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

# 3. SCAN FOR EXPLICIT KEY ASSIGNMENTS (e.g. apiKey = "actual_secret" or GEMINI_API_KEY = "...")
check_key_assignments() {
  local assign_pattern='(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*["\x27][A-Za-z0-9_\.\-]{16,}["\x27]'
  local assign_findings=""
  if [ "$MODE" = "--staged" ]; then
    assign_findings=$(git diff --cached -U0 -- ':(exclude)scripts/check-secrets.sh' ':(exclude).env.example' | grep '^+[^+]' | grep -i -E "$assign_pattern" | grep -v -i "test_mock\|mock\|placeholder\|dummy\|redacted\|your_\|example" || true)
  elif [ "$MODE" = "--ci" ]; then
    local base_ref="HEAD~1"
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
      base_ref="origin/main"
    fi
    assign_findings=$(git diff "$base_ref"...HEAD -U0 -- ':(exclude)scripts/check-secrets.sh' ':(exclude).env.example' | grep '^+[^+]' | grep -i -E "$assign_pattern" | grep -v -i "test_mock\|mock\|placeholder\|dummy\|redacted\|your_\|example" || true)
  else
    assign_findings=$(git grep -i -E -I -n "$assign_pattern" -- ':(exclude)scripts/check-secrets.sh' ':(exclude).env.example' | grep -v -i "test_mock\|mock\|placeholder\|dummy\|redacted\|your_\|example" || true)
  fi

  if [ -n "$assign_findings" ]; then
    echo -e "${RED}❌ HARDCODED API KEY ASSIGNMENT DETECTED:${NC}"
    echo "$assign_findings" | head -n 20 | while read -r line; do
      echo -e "${RED}   $line${NC}"
    done
    ERRORS=$((ERRORS + 1))
  fi
}

check_env_files
check_secret_patterns
check_key_assignments

if [ "$ERRORS" -gt 0 ]; then
  echo -e "\n${RED}🛑 SCAN FAILED: $ERRORS security violation(s) detected. Push / Commit BLOCKED.${NC}\n"
  exit 1
fi

echo -e "${GREEN}✅ Zero Secret Leakage Check Passed: No .env files or hardcoded credentials found.${NC}"
exit 0
