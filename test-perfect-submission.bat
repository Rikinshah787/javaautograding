@echo off
echo ========================================
echo Java Portfolio Grader - Perfect Test
echo ========================================
echo.
echo This script will test the grading system with a perfect submission
echo that should score 100/100 points.
echo.

echo Starting the Java Grader System...
start "Java Grader" cmd /k "cd /d %~dp0 && npm start"

echo.
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo.
echo Opening the student interface...
start http://localhost:5000

echo.
echo ========================================
echo TEST INSTRUCTIONS:
echo ========================================
echo 1. The student interface should open in your browser
echo 2. Use these test credentials:
echo    - Full Name: Rikin Shah
echo    - Email: rshah88@asu.edu
echo 3. Upload the sample files:
echo    - TransactionHistory.java (from sample folder)
echo    - PortfolioManager.java (from sample folder)
echo 4. Click "Submit for Grading"
echo 5. You should see a score of 100/100!
echo.
echo ========================================
echo EXPECTED RESULTS:
echo ========================================
echo - TransactionHistory Class: 25/25 points
echo - PortfolioManager Class: 25/25 points  
echo - Display Requirements: 25/25 points
echo - Coding Standards: 25/25 points
echo - TOTAL: 100/100 points
echo.
echo The sample files include:
echo - All required private fields
echo - Default and overloaded constructors
echo - All getter and setter methods
echo - toString method
echo - ArrayList portfolioList
echo - Complete menu system (0-6)
echo - All transaction types (BUY/SELL/DEPOSIT/WITHDRAW)
echo - Student name display
echo - Proper formatting
echo - Error handling with try-catch
echo - Cash validation
echo - Stock validation
echo - Ticker capitalization
echo.
pause
