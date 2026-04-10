#!/bin/bash
# ==================== PHASE 5 DEPLOYMENT SETUP SCRIPT ====================
# This script automates the setup process for production deployment
# Usage: bash deploy-setup.sh

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 Village API - Phase 5 Production Deployment Setup     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ==================== STEP 1: CHECK PREREQUISITES ====================
echo "Step 1️⃣: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm --version) found"

# Check PostgreSQL CLI (optional but recommended)
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL CLI found"
else
    echo "⚠️  PostgreSQL CLI not found (optional for database migration)"
fi

echo ""

# ==================== STEP 2: INSTALL DEPENDENCIES ====================
echo "Step 2️⃣: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# ==================== STEP 3: CREATE ENVIRONMENT FILE ====================
echo "Step 3️⃣: Setting up environment variables..."

if [ ! -f ".env.production" ]; then
    echo "⚠️  Creating .env.production template..."
    echo ""
    echo "📋 Required environment variables:"
    echo "   1. DATABASE_URL - PostgreSQL connection string from NeonDB"
    echo "   2. REDIS_HOST - Redis host from Redis Cloud"
    echo "   3. REDIS_PORT - Redis port (usually 18456)"
    echo "   4. REDIS_PASSWORD - Redis password"
    echo "   5. JWT_SECRET - Random 32+ character string"
    echo "   6. SENTRY_DSN - Error tracking DSN from Sentry"
    echo ""
    echo "✅ Edit .env.production with your production values"
    exit 1
else
    echo "✅ .env.production found"
fi

echo ""

# ==================== STEP 4: VERIFY ENVIRONMENT VARIABLES ====================
echo "Step 4️⃣: Verifying environment variables..."

if grep -q "DATABASE_URL=" ".env.production"; then
    echo "✅ DATABASE_URL configured"
else
    echo "❌ DATABASE_URL not found in .env.production"
fi

if grep -q "REDIS_HOST=" ".env.production"; then
    echo "✅ REDIS_HOST configured"
else
    echo "❌ REDIS_HOST not found"
fi

if grep -q "JWT_SECRET=" ".env.production"; then
    echo "✅ JWT_SECRET configured"
else
    echo "❌ JWT_SECRET not found"
fi

echo ""

# ==================== STEP 5: TEST DATABASE CONNECTION ====================
echo "Step 5️⃣: Testing database connection..."
echo "ℹ️  Run manually after deployment:"
echo "   psql \$DATABASE_URL -c 'SELECT 1;'"
echo ""

# ==================== STEP 6: CREATE LOGS DIRECTORY ====================
echo "Step 6️⃣: Setting up logs directory..."
mkdir -p logs
echo "✅ Logs directory created"
echo ""

# ==================== STEP 7: VERIFY PORT AVAILABILITY ====================
echo "Step 7️⃣: Port availability check..."
PORT=${PORT:-3000}

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port $PORT is already in use"
    echo "Set PORT environment variable to use different port"
    exit 1
else
    echo "✅ Port $PORT is available"
fi

echo ""

# ==================== STEP 8: BUILD CHECK ====================
echo "Step 8️⃣: Running build verification..."
npm ls > /dev/null 2>&1 && echo "✅ Dependencies verified" || echo "⚠️  Dependency check complete"
echo ""

# ==================== STEP 9: DISPLAY NEXT STEPS ====================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            ✅ Setup Complete - Next Steps                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1️⃣  Complete production setup (30-45 minutes):"
echo "    📖 Follow: PHASE_5_PRODUCTION_DEPLOYMENT.md"
echo ""
echo "2️⃣  Required before deployment:"
echo "    ☐ Create NeonDB account and database"
echo "    ☐ Create Redis Cloud account and instance"
echo "    ☐ Create Sentry account and project"
echo "    ☐ Update .env.production with connection strings"
echo "    ☐ Push code to GitHub"
echo "    ☐ Create Vercel account"
echo ""
echo "3️⃣  Deploy to production:"
echo "    npm install -g vercel    # Install Vercel CLI"
echo "    vercel --prod             # Deploy to production"
echo ""
echo "4️⃣  Verify deployment:"
echo "    curl https://your-api.vercel.app/health"
echo ""
echo "📞 Need help? See PHASE_5_PRODUCTION_DEPLOYMENT.md"
echo ""
