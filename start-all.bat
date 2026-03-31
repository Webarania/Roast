@echo off
echo ===============================================
echo  Dev Roast AI — Starting All Services
echo ===============================================
echo.

start "Dev Roast Backend" cmd /k "cd backend && start.bat"
timeout /t 3 /nobreak >nul
start "Dev Roast Frontend" cmd /k "cd frontend && start.bat"

echo.
echo Both services starting in separate windows.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
pause
