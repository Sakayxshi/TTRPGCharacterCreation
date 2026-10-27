@echo off
REM ====================================================================
REM TTRPG Forge - rebuild the whole database on Windows
REM Run it from the "Command Prompt (MariaDB 13.1)" window:
REM     C:\Users\you\TTRPGCharacterCreation\setup.bat
REM Runs sql\01 ... sql\05 in order, asking for the root password once.
REM WARNING: deletes and recreates the ttrpg_forge database.
REM ====================================================================

REM Switch to the folder this script lives in, wherever it is called from
cd /d "%~dp0"

REM Glue the five files together and feed them to MariaDB in one go
type sql\01_schema.sql sql\02_seed.sql sql\03_accounts.sql sql\04_views.sql sql\05_procedures.sql 2>nul | mariadb -u root -p

if errorlevel 1 (
    echo.
    echo SETUP FAILED - read the error above.
) else (
    echo.
    echo Done: ttrpg_forge rebuilt from sql\01 to sql\05.
)
