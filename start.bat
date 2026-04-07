@echo off
echo ========================================================
echo Starting Concurrent Banking System...
echo ========================================================

echo [1/2] Starting Backend Server on port 3001...
start "Banking Backend" cmd /c "cd backend && npm run dev"

echo [2/2] Starting Frontend Server on port 3000...
start "Banking Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo - Frontend is accessible at: http://localhost:3000
echo - Backend is accessible at: http://localhost:3001
echo.
echo To stop the servers, just close the newly opened command windows.
pause
