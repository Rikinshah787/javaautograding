@echo off
echo Starting Java Grader Admin Dashboard...
echo.

cd /d "E:\Java Automated\AdminDashboard"

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.
echo Installing dependencies...
call npm install

echo.
echo Starting Admin Dashboard server...
echo Dashboard will be available at: http://localhost:5001
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start

pause
