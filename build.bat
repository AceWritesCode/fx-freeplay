@echo off
echo Starting TradingView Clone build...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b %errorlevel%
)
echo.
echo [SUCCESS] Build completed successfully!
pause
