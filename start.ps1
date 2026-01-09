# Gacha Analyzer - Development Server Launcher
# UTF-8 Encoding

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Gacha Analyzer Development Server  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot
npm run dev

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
