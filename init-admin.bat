@echo off
echo ========================================
echo Java Grader Admin Dashboard Setup
echo ========================================
echo.

cd /d "E:\Java Automated\AdminDashboard"

echo [1/4] Installing dependencies...
call npm install

echo.
echo [2/4] Creating default admin professor...
call node professor-manager.js init

echo.
echo [3/4] Starting admin dashboard...
echo.
echo ========================================
echo Admin Dashboard Ready!
echo ========================================
echo.
echo 🌐 Access URL: http://localhost:5001
echo.
echo 🔑 Default Admin Credentials:
echo    Professor ID: ADMIN001
echo    Password: admin123
echo    Email: admin@asu.edu
echo.
echo 📋 To add more professors:
echo    node professor-manager.js interactive
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start

pause
