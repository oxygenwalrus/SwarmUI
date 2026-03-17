@echo off
title SwarmUI React Launcher
cd /d "%~dp0"

echo.
echo ======================================
echo   SwarmUI React Launcher
echo ======================================
echo.

if not exist "start-electron.bat" (
    echo ERROR: start-electron.bat not found in "%~dp0"
    pause
    exit /b 1
)

echo Launching Electron wrapper...
echo.
call start-electron.bat
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo Launcher failed with exit code %EXIT_CODE%.
    pause
)
exit /b %EXIT_CODE%
