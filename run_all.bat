@echo off
REM — Launch Frontend in a new window
start "" cmd /k "cd /d %~dp0\HMB-intake-form && npm start --verbose"

REM — Launch Backend (Azure Functions) in a new window
start "" cmd /k "cd /d %~dp0\HMB-backend && npm start --verbose"