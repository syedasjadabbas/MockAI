@echo off
setlocal
title MockAI Launcher
rem ==========================================================================
rem  MockAI one-click launcher (FYP demo)
rem
rem    start-mockai.bat          report AI profile: DistilBERT, BERT-CoLA,
rem                              DeepFace + FERPlus  (needs .venv311)
rem    start-mockai.bat lite     lite AI profile: MiniLM, rules, FERPlus
rem
rem  Opens two windows (backend on :8000, frontend on :5173), waits until the
rem  backend is healthy, then opens the app in your browser.
rem  Close everything with stop-mockai.bat.
rem ==========================================================================

rem Work from the script folder using relative paths only: the project path
rem may contain "&" (e.g. "WEBS & APPS"), which cmd mis-parses in commands.
cd /d "%~dp0"

set "PROFILE=report"
if /I "%~1"=="lite" set "PROFILE=lite"
if /I "%PROFILE%"=="report" (set "VENV=.venv311") else (set "VENV=.venv")
set "PY=%VENV%\Scripts\python.exe"

echo.
echo  MockAI - starting in "%PROFILE%" AI profile
echo  ------------------------------------------------

rem ---- Pre-flight checks -----------------------------------------------------
if not exist "%PY%" (
    echo  [ERROR] Python environment not found: %PY%  ^(in the project folder^)
    if /I "%PROFILE%"=="report" (
        echo          Create it with:  uv venv --python 3.11 .venv311
        echo          then:            uv pip install --python .venv311 -r backend/requirements-lock.txt
    )
    goto fail
)
if not exist "backend\.env" (
    echo  [ERROR] backend\.env is missing. Copy backend\.env.example to backend\.env and fill it in.
    goto fail
)
where npm >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js / npm is not installed or not on PATH.
    goto fail
)
if not exist "frontend\node_modules" (
    echo  Installing frontend packages - first run only...
    pushd frontend
    call npm ci
    popd
    if not exist "frontend\node_modules" (
        echo  [ERROR] npm ci failed - check your internet connection.
        goto fail
    )
)
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
if not errorlevel 1 (
    echo  [ERROR] Port 8000 is already in use - MockAI may already be running.
    echo          Run stop-mockai.bat first.
    goto fail
)
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 (
    echo  [ERROR] Port 5173 is already in use. Run stop-mockai.bat first.
    goto fail
)

rem ---- Environment shared by both windows ----------------------------------
set "AI_PROFILE=%PROFILE%"
set "PYTHONUTF8=1"
set "TF_CPP_MIN_LOG_LEVEL=2"
set "VITE_API_BASE=http://localhost:8000"
set "VITE_API_URL=http://localhost:8000/admin"

rem ---- Start servers -------------------------------------------------------
echo  Starting backend  (http://localhost:8000) ...
start "MockAI Backend" /D backend cmd /k "..\%VENV%\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo  Starting frontend (http://localhost:5173) ...
start "MockAI Frontend" /D frontend cmd /k "npm run dev"

rem ---- Wait for the backend (model loading takes about a minute) -----------
echo  Waiting for the backend to load the AI models (about 1 minute)...
set /a TRIES=0
:wait_backend
curl -s -f -o nul http://localhost:8000/health
if not errorlevel 1 goto backend_up
set /a TRIES+=1
if %TRIES% GEQ 80 (
    echo  [ERROR] Backend did not start within 4 minutes. Check the "MockAI Backend" window.
    goto fail
)
ping -n 4 127.0.0.1 >nul
goto wait_backend

:backend_up
echo  Backend is ready.
set /a TRIES=0
:wait_frontend
curl -s -o nul http://localhost:5173/
if not errorlevel 1 goto frontend_up
set /a TRIES+=1
if %TRIES% GEQ 40 (
    echo  [ERROR] Frontend did not start. Check the "MockAI Frontend" window.
    goto fail
)
ping -n 3 127.0.0.1 >nul
goto wait_frontend

:frontend_up
echo  Frontend is ready.
echo.
echo  MockAI is running.
echo    Candidate app : http://localhost:5173
echo    Admin panel   : http://localhost:5173/admin/login
echo    Backend API   : http://localhost:8000
echo.
if /I not "%~2"=="nobrowser" start "" "http://localhost:5173"
echo  Keep the two server windows open. Run stop-mockai.bat to shut down.
ping -n 9 127.0.0.1 >nul
exit /b 0

:fail
echo.
pause
exit /b 1
