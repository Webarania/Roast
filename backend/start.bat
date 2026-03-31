@echo off
echo Starting Dev Roast AI Backend...
cd /d %~dp0

if not exist .env (
    echo ERROR: .env file not found!
    echo Copy .env.example to .env and add your API keys.
    pause
    exit /b 1
)

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo ===============================================
echo  Dev Roast AI Backend
echo  Running at: http://localhost:8000
echo  API Docs:   http://localhost:8000/docs
echo ===============================================
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000
