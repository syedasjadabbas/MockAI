@echo off
setlocal
rem ==========================================================================
rem  Stops everything start-mockai.bat started: backend (:8000), frontend
rem  (:5173) and, in local mode, the local MongoDB - and closes their windows
rem  / Windows Terminal tabs.
rem ==========================================================================
echo Stopping MockAI...

rem 1. The cmd shells start-mockai.bat opened (matched by the command they
rem    run, so this also works when they are Windows Terminal tabs). /T also
rem    ends the python / node / mongod processes running inside them.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name='cmd.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn main:app|npm run dev|dbpath local-db' } | ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null }"

rem 2. Classic console windows, by title
taskkill /FI "WINDOWTITLE eq MockAI Backend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq MockAI Frontend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq MockAI Database*" /T /F >nul 2>nul

rem 3. Anything still listening on the app ports (e.g. started another way)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8000 .*LISTENING"') do taskkill /PID %%P /T /F >nul 2>nul
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do taskkill /PID %%P /T /F >nul 2>nul

rem 4. The local MongoDB started for MockAI (only the one using local-db)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name='mongod.exe'\" | Where-Object { $_.CommandLine -match 'local-db' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

echo MockAI stopped.
ping -n 4 127.0.0.1 >nul
