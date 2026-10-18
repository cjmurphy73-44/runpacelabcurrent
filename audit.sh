#!/usr/bin/env bash
set -e

BOLD="\033[1m"
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
NC="\033[0m"

TOTAL_STEPS=8
CURRENT_STEP=0

log_section() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  echo -e "\n${CYAN}[$CURRENT_STEP/$TOTAL_STEPS] ${1}...${NC}"
  echo -e "${CYAN}----------------------------------------------------------------------${NC}"
}

log_success() { echo -e "${GREEN}✔ ${1}${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ ${1}${NC}"; }
log_error() { echo -e "${RED}✖ ${1}${NC}"; }

echo -e "${BOLD}${CYAN}"
echo "======================================================================"
echo "          TRAINPACELAB AUTOMATED SYSTEM & CODEBASE AUDIT              "
echo "======================================================================"
echo -e "${NC}"

log_section "Auditing Development Toolchain & Runtime Environment"
NODE_VERSION=$(node -v 2>/dev/null || echo "MISSING")
NPM_VERSION=$(npm -v 2>/dev/null || echo "MISSING")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")

if [ "$NODE_VERSION" = "MISSING" ]; then
  log_error "Node.js is not installed."
  exit 1
fi
log_success "Node.js Version: $NODE_VERSION"
log_success "NPM Version: $NPM_VERSION"
log_success "Active Git Branch: $GIT_BRANCH"

log_section "Auditing Base44 App Manifest & Project Structure"
REQUIRED_DIRS=("src/science" "src/components" "src/services" "base44/functions")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    log_success "Directory found: $dir"
  else
    log_error "Missing critical directory: $dir"
    exit 1
  fi
done

log_section "Running Strict Type Diagnostics (Checking tsconfig files)"
# Find available tsconfig files or run tsc via project build
if [ -f "tsconfig.app.json" ]; then
  npx tsc -p tsconfig.app.json --noEmit
  log_success "TypeScript type check passed (tsconfig.app.json)."
elif [ -f "tsconfig.json" ]; then
  npx tsc --noEmit
  log_success "TypeScript type check passed (tsconfig.json)."
else
  # Fallback to vite build check if standard tsc config is split
  npm run build --if-present >/dev/null 2>&1 || npx tsc --noEmit
  log_success "Type check & build validation completed."
fi

log_section "Executing Unit Test Suite & Golden Case Assertions (Vitest)"
if npm run test -- --run; then
  log_success "All test suites passed."
else
  log_error "Test suite execution encountered failures."
  exit 1
fi

log_section "Auditing Science Namespace Barrel Exports (src/science/index.ts)"
BARREL_FILE="src/science/index.ts"
if [ -f "$BARREL_FILE" ]; then
  log_success "Science barrel export found."
else
  log_error "Science barrel export missing."
  exit 1
fi

log_section "Auditing Component Structure & Code Hygiene"
CONSOLE_LOGS=$(grep -rn "console.log" src/ --exclude-dir="__tests__" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  log_warn "Found $CONSOLE_LOGS 'console.log' statements in src/."
else
  log_success "Zero debug 'console.log' statements found in src/."
fi

log_section "Scanning Codebase for Hardcoded Credentials & Secrets"
SUSPICIOUS_PATTERNS=("sk_live" "sk_test" "bearer " "api_key" "secret_key")
SECRETS_FOUND=0
for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
  MATCHES=$(grep -rn "$pattern" src/ base44/ --exclude-dir="node_modules" --exclude="audit.sh" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    log_warn "Potential sensitive keyword '$pattern' found."
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
  fi
done
if [ "$SECRETS_FOUND" -eq 0 ]; then
  log_success "No hardcoded credentials or API key patterns detected."
fi

log_section "Audit Summary & Health Report"
echo -e "\n${BOLD}${GREEN}======================================================================${NC}"
echo -e "${BOLD}${GREEN}         TRAINPACELAB SYSTEM AUDIT PASSED ALL STAGES                  ${NC}"
echo -e "${BOLD}${GREEN}======================================================================${NC}\n"
