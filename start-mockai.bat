@echo off
setlocal
title MockAI Launcher
rem ==========================================================================
rem  MockAI one-click launcher (FYP demo)
rem
rem    start-mockai.bat            report AI profile + MongoDB Atlas
rem    start-mockai.bat local      report AI profile + local MongoDB
rem                                (offline / networks that block Atlas)
rem    start-mockai.bat lite       lite AI profile (add "local" to combine)
rem    ... nobrowser               do not open the browser
rem
rem  Opens one window per server (database in local mode, backend :8000,
rem  frontend :5173), waits until they are ready, then opens the app.
rem  Close everything with stop-mockai.bat.
rem ==========================================================================

rem Work from the script folder using relative paths only: the project path
rem may contain "&" (e.g. "WEBS & APPS"), which cmd mis-parses in commands.
cd /d "%~dp0"

set "PROFILE=report"
set "DBMODE=atlas"
set "OPENBROWSER=1"
for %%A in (%*) do (
    if /I "%%~A"=="lite" set "PROFILE=lite"
    if /I "%%~A"=="local" set "DBMODE=local"
    if /I "%%~A"=="nobrowser" set "OPENBROWSER=0"
)
if /I "%PROFILE%"=="report" (set "VENV=.venv311") else (set "VENV=.venv")
set "PY=%VENV%\Scripts\python.exe"

echo.
echo  MockAI - "%PROFILE%" AI profile, "%DBMODE%" database
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

rem ---- Local MongoDB (local mode only) ---------------------------------------
if /I not "%DBMODE%"=="local" goto db_ready
netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if not errorlevel 1 (
    echo  Local MongoDB is already running on port 27017.
    goto db_ready
)
set "MONGOD="
for /f "delims=" %%M in ('where mongod 2^>nul') do if not defined MONGOD set "MONGOD=%%M"
if not defined MONGOD (
    for /d %%D in ("%ProgramFiles%\MongoDB\Server\*") do if exist "%%D\bin\mongod.exe" set "MONGOD=%%D\bin\mongod.exe"
)
if not defined MONGOD (
    echo  [ERROR] MongoDB Server is not installed. Install MongoDB Community Server, or run without "local".
    goto fail
)
if not exist "local-db\data" mkdir "local-db\data"
echo  Starting local MongoDB  (mongodb://127.0.0.1:27017) ...
start "MockAI Database" cmd /k ""%MONGOD%" --dbpath local-db\data --bind_ip 127.0.0.1 --port 27017"
set /a TRIES=0
:wait_db
netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if not errorlevel 1 goto db_ready
set /a TRIES+=1
if %TRIES% GEQ 20 (
    echo  [ERROR] Local MongoDB did not start. Check the "MockAI Database" window.
    goto fail
)
ping -n 2 127.0.0.1 >nul
goto wait_db
:db_ready

rem ---- Environment shared by the server windows ------------------------------
set "AI_PROFILE=%PROFILE%"
set "MONGO_TARGET=%DBMODE%"
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
    if /I "%DBMODE%"=="atlas" (
        echo          If it is stuck connecting to the database, this network may block
        echo          MongoDB Atlas ^(port 27017^). Try:  start-mockai.bat local
    )
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
echo  MockAI is running ("%DBMODE%" database).
echo    Candidate app : http://localhost:5173
echo    Admin panel   : http://localhost:5173/admin/login
echo    Backend API   : http://localhost:8000
echo.
if "%OPENBROWSER%"=="1" start "" "http://localhost:5173"
echo  Keep the server windows open. Run stop-mockai.bat to shut down.
ping -n 9 127.0.0.1 >nul
exit /b 0

:fail
echo.
pause
exit /b 1
