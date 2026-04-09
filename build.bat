@echo off
REM Build script for monolithic deployment (Windows)
REM Run this from the project root to build and prepare for deployment

setlocal enabledelayedexpansion

echo.
echo ======================================
echo CricAnalytics Production Build (Windows)
echo ======================================

REM Step 1: Build Frontend
echo.
echo [1/3] Building Frontend...
cd frontend
call npm install
call npm run build
if !errorlevel! neq 0 (
    echo Error building frontend!
    exit /b 1
)
echo Completed: Frontend built successfully

REM Step 2: Prepare backend
echo.
echo [2/3] Preparing Backend...
cd ..\backend
if not exist "static" mkdir static
echo Completed: Backend static directory ready

REM Step 3: Collect static files
echo.
echo [3/3] Collecting Django Static Files...
python manage.py collectstatic --noinput
if !errorlevel! neq 0 (
    echo Error collecting static files!
    exit /b 1
)
echo Completed: Static files collected

echo.
echo ======================================
echo Build Complete!
echo ======================================
echo Frontend build output: backend\static\dist\
echo Static files output: backend\staticfiles\
echo.
echo To deploy:
echo   1. cd backend
echo   2. python manage.py migrate
echo   3. pip install gunicorn
echo   4. gunicorn CricAnalytics.wsgi:application
echo ======================================
echo.

endlocal
