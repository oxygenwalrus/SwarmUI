@echo off
setlocal enabledelayedexpansion
echo ============================================
echo SwarmUI React Interface - Integration Tool
echo ============================================
echo.

echo This script will help you copy the React interface
echo to your main SwarmUI installation directory.
echo.

REM Get the current directory (where the React interface is)
set "SOURCE_DIR=%~dp0"
set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"

echo Current location (source):
echo %SOURCE_DIR%
echo.

REM Prompt for SwarmUI directory
echo Please enter the full path to your main SwarmUI directory
echo Example: C:\SwarmUI or D:\AI\SwarmUI
echo.
set /p "SWARMUI_DIR=SwarmUI Directory: "

if "%SWARMUI_DIR%"=="" (
    echo ERROR: No directory specified
    pause
    exit /b 1
)

REM Check if directory exists
if not exist "%SWARMUI_DIR%" (
    echo ERROR: Directory does not exist: %SWARMUI_DIR%
    echo Please check the path and try again.
    pause
    exit /b 1
)

REM Check if SwarmUI executable exists
if not exist "%SWARMUI_DIR%\launch-windows.bat" (
    echo WARNING: launch-windows.bat not found in %SWARMUI_DIR%
    echo This might not be a valid SwarmUI directory.
    echo.
    set /p "CONTINUE=Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" (
        echo Cancelled.
        pause
        exit /b 0
    )
)

set "TARGET_DIR=%SWARMUI_DIR%\swarmui-react"

echo.
echo Summary:
echo ========
echo Source: %SOURCE_DIR%
echo Target: %TARGET_DIR%
echo.

REM Check if target already exists
if exist "%TARGET_DIR%" (
    echo WARNING: Target directory already exists!
    echo This will overwrite existing files.
    echo.
    set /p "OVERWRITE=Overwrite? (y/n): "
    if /i not "!OVERWRITE!"=="y" (
        echo Cancelled.
        pause
        exit /b 0
    )
)

echo.
echo [1/3] Copying React interface files...
set "EXCLUDE_FILE=%SOURCE_DIR%\integrate-exclude.txt"
if exist "%EXCLUDE_FILE%" (
    xcopy "%SOURCE_DIR%" "%TARGET_DIR%" /E /I /H /Y /EXCLUDE:%EXCLUDE_FILE%
) else (
    echo Note: Exclude file not found, copying all files...
    xcopy "%SOURCE_DIR%" "%TARGET_DIR%" /E /I /H /Y
)
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to copy files
    pause
    exit /b 1
)
echo Done!

echo.
echo [2/3] Creating launch shortcuts in SwarmUI directory...

REM Create a launcher in the main SwarmUI directory
(
echo @echo off
echo cd /d "%%~dp0swarmui-react"
echo echo Starting SwarmUI React Interface...
echo npm run dev
) > "%SWARMUI_DIR%\start-react-ui.bat"

echo Created: %SWARMUI_DIR%\start-react-ui.bat
echo Done!

echo.
echo [3/3] Integration complete!
echo.
echo ============================================
echo NEXT STEPS:
echo ============================================
echo.
echo 1. Install dependencies:
echo    cd "%TARGET_DIR%"
echo    npm install
echo.
echo 2. Run the React interface:
echo    - Browser mode:   npm run dev
echo    - Desktop app:    npm run dev
echo.
echo 3. Or use the shortcut from your SwarmUI directory:
echo    "%SWARMUI_DIR%\start-react-ui.bat"
echo.
echo See INTEGRATION_GUIDE.md for complete documentation.
echo.

set /p "INSTALL_DEPS=Install dependencies now? (y/n): "
if /i "!INSTALL_DEPS!"=="y" (
    echo.
    echo Installing dependencies...
    cd /d "%TARGET_DIR%"
    call npm install
    if !ERRORLEVEL! equ 0 (
        echo.
        echo SUCCESS! Dependencies installed.
        echo.
        set /p "START_NOW=Start the React interface now? (y/n): "
        if /i "!START_NOW!"=="y" (
            echo.
            echo Starting Electron desktop app...
            call npm run dev
        )
    ) else (
        echo.
        echo ERROR: Failed to install dependencies.
        echo Try running 'npm install' manually in:
        echo !TARGET_DIR!
    )
)

echo.
echo Integration complete!
pause
