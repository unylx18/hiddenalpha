@echo off

echo ========================================
echo Hiddenalpha Auto Candle Sync
echo ========================================
echo.

:loop

echo [%date% %time%] Syncing market candles...

curl.exe -X POST "http://localhost:3000/api/market/sync"

echo.
echo [%date% %time%] Waiting 60 seconds...
echo.

timeout /t 60 /nobreak >nul

goto loop