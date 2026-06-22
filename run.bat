@echo off
echo.
echo  ==============================
echo    A · Mission
echo  ==============================
echo.

:: Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo  ERROR: Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: Install dependencies if needed
echo  Installing / checking dependencies...
pip install flask werkzeug --quiet --break-system-packages 2>nul
pip install flask werkzeug --quiet 2>nul

echo  Starting Luminara on http://127.0.0.1:5000
echo  Press Ctrl+C to stop.
echo.

:: Open browser automatically after 1.5 seconds
start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:5000"

python app.py

pause
