@echo off
title JS.QUIZZ launcher
cd /d "%~dp0"

rem ---- use the portable Node runtime installed with this project ----
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node not found at %LOCALAPPDATA%\Programs\nodejs
  echo Install Node.js, or re-run the project setup.
  pause
  exit /b 1
)

if not exist "JS.QUIZZ.html" (
  echo [INFO] JS.QUIZZ.html not found - building it now...
  call npm.cmd run standalone
)

echo [JS.QUIZZ] starting the backend on http://localhost:4000 ...
start "JS.QUIZZ SERVER" cmd /k "title JS.QUIZZ SERVER && node server/index.mjs"

rem ---- try to allow phone access on the local network (works when admin) ----
netsh advfirewall firewall add rule name="JS.QUIZZ server" dir=in action=allow protocol=TCP localport=4000 >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo  Check the "JS.QUIZZ SERVER" window:
echo    - on THIS PC       -^> http://localhost:4000
echo    - on your PHONE    -^> the http://192.168.x.x:4000 address shown there
echo      (phone + PC on the same Wi-Fi; also copy JS.QUIZZ.html to the phone).
echo  If the phone cannot connect, allow Node.js through Windows Firewall.
echo.

echo [JS.QUIZZ] opening JS.QUIZZ.html in your browser ...
start "" "%~dp0JS.QUIZZ.html"

echo.
echo  Done! The quiz is open in your browser.
echo  Close the "JS.QUIZZ SERVER" window to stop the backend.
echo.
pause
