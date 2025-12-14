@echo off
setlocal
cd /d "%~dp0"

echo Loading environment variables...
if exist ".env" (
    for /f "tokens=*" %%a in (.env) do set %%a
)

if "%GH_TOKEN%"=="" (
    echo.
    echo [ERROR] GH_TOKEN is missing!
    echo Please create a .env file with your GitHub Token like this:
    echo GH_TOKEN=your_token_here
    echo.
    pause
    exit /b
)

echo Starting Release Manager...
node scripts/publish.cjs
pause
