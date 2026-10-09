@echo off
echo ========================================================
echo Pushing JobsPlanet to https://github.com/Mamtasahu2005/job-portal.git
echo ========================================================
"C:\Users\Hp\.gemini\antigravity\scratch\mingit\cmd\git.exe" remote set-url origin https://github.com/Mamtasahu2005/job-portal.git
"C:\Users\Hp\.gemini\antigravity\scratch\mingit\cmd\git.exe" push -u origin main
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Code successfully pushed to GitHub!
) else (
    echo.
    echo [NOTICE] If you received a 403 error, please ensure your GitHub token has
    echo access to 'job-portal' at: https://github.com/settings/tokens
)
pause
