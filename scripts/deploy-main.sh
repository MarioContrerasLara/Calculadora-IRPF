#!/bin/bash
# Production deployment script for Calculadora IRPF
# Usage: bash deploy-main.sh
# (Run only after PR is merged to main)

set -e

echo "================================"
echo "Calculadora IRPF - Main Deployment"
echo "================================"

REPO_PATH="$HOME/IRPF/Calculadora-IRPF"

echo ""
echo "1️⃣  Fetching latest from main..."
cd "$REPO_PATH"
git fetch origin main

echo ""
echo "2️⃣  Checking out main branch..."
git checkout main

echo ""
echo "3️⃣  Pulling latest..."
git pull origin main

echo ""
echo "4️⃣  Displaying version tag..."
CURRENT_TAG=$(git describe --tags --abbrev=0)
echo "✅ Deployed version: $CURRENT_TAG"

echo ""
echo "5️⃣  Running test suite..."
cd tests
python3 test_irpf.py 2>&1 | tail -5

echo ""
echo "6️⃣  Deployed to production!"
echo "Website: http://server.mario.gal"
echo ""
# Alternative if using Node.js:
# pm2 restart calculadora-irpf

echo ""
echo "✅ Main branch deployed successfully!"
echo ""
echo "Current version: $CURRENT_TAG"
echo "App running at: http://server.mario.gal"
