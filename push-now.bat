@echo off
setlocal enabledelayedexpansion
title Push JobsPlanet to GitHub

echo ======================================================================
echo           JobsPlanet -- Push to GitHub Repository
echo           Target: https://github.com/Mamtasahu2005/job-portal.git
echo ======================================================================
echo.

set GIT_EXE="C:\Users\Hp\.gemini\antigravity\scratch\mingit\cmd\git.exe"

echo [1/3] Checking Git Status...
%GIT_EXE% status --short
echo.

echo If your current token gives HTTP 403, you can paste a Personal Access Token
echo (Classic PAT with 'repo' scope from https://github.com/settings/tokens/new)
echo or press ENTER to try with your existing credentials.
echo.
set /p USER_TOKEN="Enter GitHub PAT (or press Enter for default): "

if "%USER_TOKEN%"=="" (
    echo.
    echo [2/3] Attempting push with default credentials...
    %GIT_EXE% push -u https://github.com/Mamtasahu2005/job-portal.git main
) else (
    echo.
    echo [2/3] Attempting push with provided token...
    %GIT_EXE% push -u https://x-access-token:%USER_TOKEN%@github.com/Mamtasahu2005/job-portal.git main
)

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo   [SUCCESS] Code successfully pushed to GitHub!
    echo   View your repository at: https://github.com/Mamtasahu2005/job-portal
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo   [FAILED] Push returned error 403 / permission denied.
    echo.
    echo   Quick fix:
    echo   1. Visit https://github.com/settings/tokens
    echo   2. Either click your fine-grained token and grant "Contents: Read & Write"
    echo      for 'job-portal', OR create a Classic Token with 'repo' scope.
    echo   3. Run this script again and paste the token when prompted.
    echo ======================================================================
)

echo.
pause
