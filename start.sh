#!/bin/bash

echo "========================================================"
echo "Starting Concurrent Banking System..."
echo "========================================================"

echo "[1/2] Starting Backend Server on port 3001..."
(cd backend && npm run dev) &
BACKEND_PID=$!

echo "[2/2] Starting Frontend Server on port 3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Both servers are spinning up in the background!"
echo "- Frontend is accessible at: http://localhost:3000"
echo "- Backend is accessible at: http://localhost:3001"
echo ""
echo "Press Ctrl+C at any time to stop both servers gracefully."

# Catch Ctrl+C and kill background processes
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Wait for processes to keep the script running
wait
