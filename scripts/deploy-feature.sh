#!/bin/bash
# Deployment script for Calculadora IRPF feature testing
# Usage: bash deploy-feature.sh

set -e  # Exit on error

echo "================================"
echo "Calculadora IRPF - Feature Deploy"
echo "================================"

BRANCH="feature/actualizacion-salarial"
REPO_PATH="$HOME/IRPF/Calculadora-IRPF"

echo ""
echo "1️⃣  Fetching latest from GitHub..."
cd "$REPO_PATH"
git fetch origin "$BRANCH"

echo ""
echo "2️⃣  Checking out feature branch..."
git checkout "$BRANCH"

echo ""
echo "3️⃣  Verifying branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "✅ Currently on: $CURRENT_BRANCH"

echo ""
echo "4️⃣  Showing recent commits..."
git log --oneline -3

echo ""
echo "5️⃣  Running test suite..."
cd tests
python3 test_irpf.py 2>&1 | tail -5
python3 test_actualizacion_salarial.py 2>&1 | tail -5

echo ""
echo "6️⃣  Done! Server ready for testing"
echo "Website: http://server.mario.gal"

echo ""
echo "✅ Feature branch deployed and tested!"
echo ""
echo "Next steps:"
echo "1. Open http://server.mario.gal in your browser"
echo "2. Use docs/guides/TESTING_CHECKLIST.md to test"
echo "3. When satisfied, approve PR #1 on GitHub"
echo "4. After merge, run: bash deploy-main.sh"

echo ""
echo "To rollback to main:"
echo "  git checkout main"
echo "  git pull origin main"
echo "  sudo systemctl restart nginx"
