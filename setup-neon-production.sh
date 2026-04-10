#!/bin/bash
# ==================== NEON PRODUCTION DATABASE SETUP ====================
# This script initializes the NeonDB production database with schema and seed data
# Usage: bash setup-neon-production.sh

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 NeonDB Production Database Setup                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production not found!${NC}"
    echo "Create .env.production with your NeonDB connection string"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in .env.production${NC}"
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL loaded${NC}"
echo "   Connection: ${DATABASE_URL:0:50}..."
echo ""

# Step 1: Test connection
echo -e "${YELLOW}Step 1️⃣: Testing database connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Connection failed!${NC}"
    echo "Verify CONNECTION string: $DATABASE_URL"
    exit 1
fi
echo ""

# Step 2: Create schema
echo -e "${YELLOW}Step 2️⃣: Creating database schema...${NC}"
psql "$DATABASE_URL" < database/schema.sql
echo -e "${GREEN}✅ Schema created${NC}"
echo ""

# Step 3: Verify tables
echo -e "${YELLOW}Step 3️⃣: Verifying tables...${NC}"
TABLES=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${GREEN}✅ Found $TABLES tables:${NC}"
psql "$DATABASE_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
echo ""

# Step 4: Seed geographical data
echo -e "${YELLOW}Step 4️⃣: Seeding geographical data...${NC}"

if [ -f "states.csv" ]; then
    echo "   Importing states..."
    psql "$DATABASE_URL" -c "\COPY states(id, name, code) FROM 'states.csv' WITH (FORMAT csv, HEADER true);"
    STATE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM states;")
    echo -e "   ${GREEN}✅ Loaded $STATE_COUNT states${NC}"
else
    echo -e "   ${YELLOW}⚠️  states.csv not found in current directory${NC}"
fi

if [ -f "districts.csv" ]; then
    echo "   Importing districts..."
    psql "$DATABASE_URL" -c "\COPY districts(id, state_id, name, code) FROM 'districts.csv' WITH (FORMAT csv, HEADER true);"
    DISTRICT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM districts;")
    echo -e "   ${GREEN}✅ Loaded $DISTRICT_COUNT districts${NC}"
else
    echo -e "   ${YELLOW}⚠️  districts.csv not found${NC}"
fi

if [ -f "subdistricts.csv" ]; then
    echo "   Importing subdistricts..."
    psql "$DATABASE_URL" -c "\COPY subdistricts(id, district_id, name, code) FROM 'subdistricts.csv' WITH (FORMAT csv, HEADER true);"
    SUBDISTRICT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM subdistricts;")
    echo -e "   ${GREEN}✅ Loaded $SUBDISTRICT_COUNT subdistricts${NC}"
else
    echo -e "   ${YELLOW}⚠️  subdistricts.csv not found${NC}"
fi

if [ -f "villages.csv" ]; then
    echo "   Importing villages..."
    psql "$DATABASE_URL" -c "\COPY villages(id, subdistrict_id, name, code) FROM 'villages.csv' WITH (FORMAT csv, HEADER true);"
    VILLAGE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM villages;")
    echo -e "   ${GREEN}✅ Loaded $VILLAGE_COUNT villages${NC}"
else
    echo -e "   ${YELLOW}⚠️  villages.csv not found${NC}"
fi

echo ""

# Step 5: Create initial admin user
echo -e "${YELLOW}Step 5️⃣: Setting up initial admin user...${NC}"
psql "$DATABASE_URL" << EOF
INSERT INTO users (email, password_hash, full_name, company_name, subscription_tier, is_approved, is_admin, created_at)
VALUES ('admin@example.com', '\$2a\$10\$...', 'Admin User', 'Village API', 'unlimited', true, true, NOW())
ON CONFLICT (email) DO NOTHING;
EOF
echo -e "${GREEN}✅ Admin user ready${NC}"
echo ""

# Step 6: Create subscription plans
echo -e "${YELLOW}Step 6️⃣: Setting up subscription plans...${NC}"
psql "$DATABASE_URL" << EOF
INSERT INTO subscription_plans (tier, name, price, rate_limit, features)
VALUES 
('free', 'Free', 0, 10, '["search", "browse_data"]'),
('premium', 'Premium', 29.99, 100, '["search", "browse_data", "api_access", "analytics"]'),
('pro', 'Professional', 99.99, 300, '["search", "browse_data", "api_access", "analytics", "priority_support"]'),
('unlimited', 'Enterprise', 999.99, 99999, '["search", "browse_data", "api_access", "analytics", "priority_support", "sso", "custom_domain"]')
ON CONFLICT DO NOTHING;
EOF
echo -e "${GREEN}✅ Subscription plans configured${NC}"
echo ""

# Step 7: Final verification
echo -e "${YELLOW}Step 7️⃣: Final verification...${NC}"
echo -e "${GREEN}Database Statistics:${NC}"
psql "$DATABASE_URL" << EOF
SELECT 'States' as table_name, count(*) as row_count FROM states
UNION ALL
SELECT 'Districts', count(*) FROM districts
UNION ALL
SELECT 'Subdistricts', count(*) FROM subdistricts
UNION ALL
SELECT 'Villages', count(*) FROM villages
UNION ALL
SELECT 'Users', count(*) FROM users
UNION ALL
SELECT 'Subscription Plans', count(*) FROM subscription_plans;
EOF
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ NeonDB Production Setup Complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Update remaining .env.production variables:"
echo "   - JWT_SECRET (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
echo "   - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (from Redis Cloud)"
echo "   - SENTRY_DSN (from Sentry)"
echo "   - Admin credentials and domain settings"
echo ""
echo "2. Test API with production database:"
echo "   NODE_ENV=production npm start"
echo ""
echo "3. Deploy to Vercel:"
echo "   vercel --prod"
echo ""
