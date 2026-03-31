#!/bin/bash

echo "==============================================="
echo " Dev Roast AI — Starting All Services (Mac)"
echo "==============================================="
echo ""

# Start Backend
echo "Starting Backend on http://localhost:8000..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend on http://localhost:5173..."
cd frontend
npm install --quiet
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Both services are starting."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both."

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
