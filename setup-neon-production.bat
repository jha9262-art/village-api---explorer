@echo off
REM ==================== NEON PRODUCTION DATABASE SETUP (WINDOWS) ====================
REM This script initializes the NeonDB production database with schema and seed data
REM Usage: setup-neon-production.bat

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  🚀 NeonDB Production Database Setup (Windows)             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if .env.production exists
if not exist ".env.production" (
    echo ❌ .env.production not found!
    echo Create .env.production with your NeonDB connection string
    pause
    exit /b 1
)

REM Get DATABASE_URL from .env.production
for /f "tokens=2 delims==" %%A in ('findstr "DATABASE_URL" .env.production') do set DATABASE_URL=%%A

if "!DATABASE_URL!"=="" (
    echo ❌ DATABASE_URL not set in .env.production
    pause
    exit /b 1
)

echo ✅ DATABASE_URL loaded
echo    Connection: !DATABASE_URL:~0,50!...
echo.

REM Step 1: Test connection
echo Step 1: Testing database connection...
psql "!DATABASE_URL!" -c "SELECT 1;" >nul 2>nul

if %ERRORLEVEL% equ 0 (
    echo ✅ Connection successful!
) else (
    echo ❌ Connection failed!
    echo Verify CONNECTION string: !DATABASE_URL!
    pause
    exit /b 1
)
echo.

REM Step 2: Create schema
echo Step 2: Creating database schema...
psql "!DATABASE_URL!" < database\schema.sql
if %ERRORLEVEL% equ 0 (
    echo ✅ Schema created
) else (
    echo ❌ Schema creation failed
    pause
    exit /b 1
)
echo.

REM Step 3: Verify tables
echo Step 3: Verifying tables...
for /f %%F in ('psql "!DATABASE_URL!" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"') do set TABLE_COUNT=%%F
echo ✅ Found !TABLE_COUNT! tables
echo.

REM Step 4: Seed data (if CSV files exist)
echo Step 4: Seeding geographical data...

if exist "states.csv" (
    echo    Importing states...
    psql "!DATABASE_URL!" -c "\COPY states(id, name, code) FROM STDIN WITH (FORMAT csv, HEADER true);" < states.csv
    echo    ✅ States imported
) else (
    echo    ⚠️  states.csv not found
)

if exist "districts.csv" (
    echo    Importing districts...
    psql "!DATABASE_URL!" -c "\COPY districts(id, state_id, name, code) FROM STDIN WITH (FORMAT csv, HEADER true);" < districts.csv
    echo    ✅ Districts imported
) else (
    echo    ⚠️  districts.csv not found
)

if exist "subdistricts.csv" (
    echo    Importing subdistricts...
    psql "!DATABASE_URL!" -c "\COPY subdistricts(id, district_id, name, code) FROM STDIN WITH (FORMAT csv, HEADER true);" < subdistricts.csv
    echo    ✅ Subdistricts imported
) else (
    echo    ⚠️  subdistricts.csv not found
)

if exist "villages.csv" (
    echo    Importing villages...
    psql "!DATABASE_URL!" -c "\COPY villages(id, subdistrict_id, name, code) FROM STDIN WITH (FORMAT csv, HEADER true);" < villages.csv
    echo    ✅ Villages imported
) else (
    echo    ⚠️  villages.csv not found
)

echo.

REM Step 5: Final verification
echo Step 5: Final verification...
echo Database Statistics:
psql "!DATABASE_URL!" -c "SELECT 'States' as table_name, count(*) as row_count FROM states UNION ALL SELECT 'Districts', count(*) FROM districts UNION ALL SELECT 'Subdistricts', count(*) FROM subdistricts UNION ALL SELECT 'Villages', count(*) FROM villages UNION ALL SELECT 'Users', count(*) FROM users;"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ NeonDB Production Setup Complete!                     ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Next Steps:
echo 1. Update remaining .env.production variables:
echo    - JWT_SECRET
echo    - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
echo    - SENTRY_DSN
echo.
echo 2. Test API locally:
echo    set NODE_ENV=production
echo    npm start
echo.
echo 3. Deploy to Vercel:
echo    vercel --prod
echo.
pause
