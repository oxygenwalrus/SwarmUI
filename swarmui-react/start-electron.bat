@echo off
echo ============================================
echo SwarmUI Electron Desktop App - Launcher
echo ============================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/3] Installing dependencies...
    call npm.cmd install
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/3] Dependencies already installed
    echo.
)

set "FORCE_BUILD=0"
if /I "%~1"=="--build" set "FORCE_BUILD=1"

if "%FORCE_BUILD%"=="1" (
    REM Optional production build (for troubleshooting only)
    echo [2/3] Building React application...
    call npm.cmd run build
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Failed to build React app
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/3] Skipping production build for faster dev startup
    echo         Tip: pass --build to force a build before launch
    echo.
)

REM Start Electron
echo [3/3] Starting Electron application...
echo.
echo The SwarmUI desktop app will launch shortly...
echo SwarmUI backend will start automatically.
echo.
REM Ensure Electron runs in normal app mode, not Node compatibility mode
set "ELECTRON_RUN_AS_NODE="
call npm.cmd run dev

pause
