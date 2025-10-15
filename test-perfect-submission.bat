@echo off
echo ========================================
echo Java Portfolio Grader - Test Script
echo ========================================
echo.

echo Starting the Java Grader System...
echo.

REM Start the server in background
start /B npm start

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo Server is now running!
echo ========================================
echo.
echo Student Interface: http://localhost:5000
echo Admin Login: http://localhost:5000/login
echo Admin Dashboard: http://localhost:5000/admin
echo.
echo Default Admin Credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo ========================================
echo Test Instructions:
echo ========================================
echo.
echo 1. Go to: http://localhost:5000
echo 2. Upload the sample Java files from the 'sample' folder
echo 3. Check the grading results
echo 4. Login to admin dashboard to view analytics
echo.
echo Sample files are located in: sample/
echo   - TransactionHistory.java
echo   - PortfolioManager.java
echo.
echo Press any key to stop the server...
pause > nul

REM Kill the server
taskkill /f /im node.exe > nul 2>&1
echo.
echo Server stopped.