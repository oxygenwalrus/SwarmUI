# SwarmUI React Launcher
# Starts the Electron desktop wrapper (which also starts the SwarmUI backend).
# If your system blocks local scripts, launch via:
# powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-SwarmUI-React.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
    $Host.UI.RawUI.WindowTitle = "SwarmUI React Launcher"
    Set-Location -Path $PSScriptRoot

    if (-not (Test-Path -Path "package.json")) {
        throw "package.json was not found in $PSScriptRoot."
    }

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js is not installed or not on PATH."
    }

    $npmCmd = if ($env:OS -eq "Windows_NT") { "npm.cmd" } else { "npm" }
    if (-not (Get-Command $npmCmd -ErrorAction SilentlyContinue)) {
        throw "$npmCmd is not installed or not on PATH."
    }

    if (-not (Test-Path -Path "node_modules")) {
        Write-Host "Installing dependencies (first-time setup)..." -ForegroundColor Yellow
        & $npmCmd install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE."
        }
    }

    if (-not (Test-Path -Path "start-electron.bat")) {
        throw "start-electron.bat not found in $PSScriptRoot."
    }

    Write-Host "Launching Electron wrapper..." -ForegroundColor Green
    & cmd.exe /c "start-electron.bat"
    if ($LASTEXITCODE -ne 0) {
        throw "start-electron.bat exited with code $LASTEXITCODE."
    }
}
catch {
    Write-Host ""
    Write-Host "Launcher failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
