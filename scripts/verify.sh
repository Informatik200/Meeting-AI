#!/usr/bin/env bash
# Exit immediately if any command fails
set -e

# Set paths to point to project local tools first
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${REPO_ROOT}/.tools/node/bin:${REPO_ROOT}/backend/.venv/bin:$PATH"

echo "============================================="
echo "Meeting-AI Project Verification Script"
echo "============================================="

# ----------------- BACKEND -----------------
echo -e "\n---> Running Backend Checks..."
cd "${REPO_ROOT}/backend"

echo "1. Ruff Formatting Check..."
ruff format --check .

echo "2. Ruff Linting Check..."
ruff check .

echo "3. Pytest Unit & Integration Tests..."
pytest -v

echo "Backend Checks: PASS"

# ----------------- FRONTEND -----------------
echo -e "\n---> Running Frontend Checks..."
cd "${REPO_ROOT}/frontend"

echo "1. ESLint Check..."
npm run lint

echo "2. TypeScript Compilation Check..."
npm run typecheck

echo "3. Playwright E2E Tests..."
npm run test:e2e

echo "Frontend Checks: PASS"

echo -e "\n============================================="
echo "✅ ALL CHECKS PASSED SUCCESSFULLY!"
echo "============================================="
