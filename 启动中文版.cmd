@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "release\win-unpacked\LOLPingYourAI.exe" (
  echo 未找到 Windows 程序，请先构建：npm run dist
  pause
  exit /b 1
)
start "" "%~dp0release\win-unpacked\LOLPingYourAI.exe"
