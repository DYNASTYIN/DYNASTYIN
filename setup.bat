@echo off
echo.
echo 🎨 DynastyIN Portfolio Setup
echo ================================
echo.

REM Check if we're in the right directory
if not exist "index.html" (
    echo ❌ Error: index.html not found
    echo Please run this script from the dynastyin-portfolio directory
    pause
    exit /b 1
)

REM Create directories
echo 📁 Creating directories...
if not exist "libs" mkdir libs
if not exist "assets" mkdir assets

echo.
echo ✨ Setup Complete!
echo.
echo Next steps:
echo 1. Open index.html in your browser
echo 2. Use Ctrl+Shift+Alt+Z to reveal admin access
echo 3. Enter passphrase: DynastyIN2000
echo.
echo Happy painting! 🎨
echo.
pause