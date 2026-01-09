@echo off
chcp 65001 >nul
title Gacha Analyzer - Dev Server

echo ======================================
echo   Gacha Analyzer Development Server
echo ======================================
echo.
echo Starting development server...
echo.

cd /d "%~dp0"
npm run dev

pause
