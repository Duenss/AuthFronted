@echo off
setlocal
set "NODEJS=C:\Program Files\nodejs"
set "PATH=%NODEJS%;%PATH%"

call "%NODEJS%\npm.cmd" run build
if errorlevel 1 pause
