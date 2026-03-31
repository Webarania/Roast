@echo off
echo Starting Dev Roast AI Frontend...
cd /d %~dp0

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo Installing npm packages...
    npm install
)

echo.
echo ===============================================
echo  Dev Roast AI Frontend
echo  Running at: https://roast-7n43.onrender.com
echo ===============================================
echo.

npm run dev
