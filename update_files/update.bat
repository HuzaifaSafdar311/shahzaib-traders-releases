@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Shahzaib Traders - Application Update Utility
echo ===================================================
echo.

:: 1. Check for update package
if not exist "update_files\app.asar" (
    echo [ERROR] update_files\app.asar not found!
    echo Please make sure this script is run from the application root directory
    echo and the 'update_files' folder exists.
    pause
    exit /b 1
)

:: 2. Target path determination
set "TARGET_ASAR="
if exist "resources\app.asar" (
    set "TARGET_ASAR=resources\app.asar"
) else if exist "dist\win-unpacked\resources\app.asar" (
    set "TARGET_ASAR=dist\win-unpacked\resources\app.asar"
)

if "%TARGET_ASAR%"=="" (
    echo [WARNING] Default installation resources\app.asar not detected.
    echo Defaulting target to: resources\app.asar
    set "TARGET_ASAR=resources\app.asar"
)

:: 3. Close running application instances
echo [1/4] Closing any running instances of Shahzaib Traders...
taskkill /F /IM "Shahzaib Traders.exe" >nul 2>&1
taskkill /F /IM "electron.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

:: 4. Safety Database Backup
echo [2/4] Creating safety backup of database...
if not exist "backups" mkdir "backups"
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set "TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

if exist "inventory.db" (
    copy /Y "inventory.db" "backups\inventory_backup_before_update_%TIMESTAMP%.db" >nul
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to backup inventory.db! Aborting update to protect data.
        pause
        exit /b 1
    )
    echo       Backed up inventory.db to backups\inventory_backup_before_update_%TIMESTAMP%.db
) else (
    echo       No existing inventory.db found in current folder (will be created on first launch).
)

:: 5. Backup previous app.asar if present
echo [3/4] Updating application core (app.asar)...
if exist "%TARGET_ASAR%" (
    copy /Y "%TARGET_ASAR%" "%TARGET_ASAR%.bak_%TIMESTAMP%" >nul
)

:: Create resources folder if it doesn't exist yet
for %%F in ("%TARGET_ASAR%") do if not exist "%%~dpF" mkdir "%%~dpF"

copy /Y "update_files\app.asar" "%TARGET_ASAR%" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy update_files\app.asar to %TARGET_ASAR%!
    pause
    exit /b 1
)

echo.
echo [4/4] Update completed successfully!
echo ===================================================
echo   Updated Target : %TARGET_ASAR%
echo   Backup Created : backups\inventory_backup_before_update_%TIMESTAMP%.db
echo ===================================================
echo.
pause

