@echo off
REM ==================== PHASE 5 DEPLOYMENT SETUP SCRIPT (WINDOWS) ====================
REM This script automates the setup process for production deployment
REM Usage: deploy-setup.bat

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   🚀 Village API - Phase 5 Production Deployment Setup     ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM ==================== STEP 1: CHECK PREREQUISITES ====================
echo Step 1: Checking prerequisites...

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js not found. Install from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm not found
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% found

echo.

REM ==================== STEP 2: INSTALL DEPENDENCIES ====================
echo Step 2: Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ npm install failed
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM ==================== STEP 3: CREATE ENVIRONMENT FILE ====================
echo Step 3: Setting up environment variables...

if not exist ".env.production" (
    echo ⚠️  .env.production not found
    echo.
    echo 📋 Required environment variables:
    echo    1. DATABASE_URL - PostgreSQL connection string from NeonDB
    echo    2. REDIS_HOST - Redis host from Redis Cloud
    echo    3. REDIS_PORT - Redis port (usually 18456)
    echo    4. REDIS_PASSWORD - Redis password
    echo    5. JWT_SECRET - Random 32+ character string
    echo    6. SENTRY_DSN - Error tracking DSN from Sentry
    echo.
    echo ✅ Edit .env.production with your production values
    echo ✅ Then run deploy-setup.bat again
    exit /b 1
) else (
    echo ✅ .env.production found
)

echo.

REM ==================== STEP 4: CREATE LOGS DIRECTORY ====================
echo Step 4: Setting up logs directory...
if not exist "logs" mkdir logs
echo ✅ Logs directory created
echo.

REM ==================== STEP 5: DISPLAY NEXT STEPS ====================
echo ╔════════════════════════════════════════════════════════════╗
echo ║            ✅ Setup Complete - Next Steps                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 1  Complete production setup (30-45 minutes):
echo    📖 Follow: PHASE_5_PRODUCTION_DEPLOYMENT.md
echo.
echo 2  Required before deployment:
echo    ☐ Create NeonDB account and database
echo    ☐ Create Redis Cloud account and instance
echo    ☐ Create Sentry account and project
echo    ☐ Update .env.production with connection strings
echo    ☐ Push code to GitHub
echo    ☐ Create Vercel account
echo.
echo 3  Deploy to production:
echo    npm install -g vercel
echo    vercel --prod
echo.
echo 4  Verify deployment:
echo    curl https://your-api.vercel.app/health
echo.
echo 📞 Need help? See PHASE_5_PRODUCTION_DEPLOYMENT.md
echo.
pause
