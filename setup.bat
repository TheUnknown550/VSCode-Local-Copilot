@echo off
echo ========================================
echo Local AI Copilot - Setup Script
echo ========================================
echo.

echo Step 1: Installing Python dependencies...
cd server
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Python dependencies
    echo Please make sure Python and pip are installed
    pause
    exit /b 1
)
echo ✓ Python dependencies installed
echo.

echo Step 2: Installing Node.js dependencies...
cd ..\vscode-extension
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Node.js dependencies
    echo Please make sure Node.js and npm are installed
    pause
    exit /b 1
)
echo ✓ Node.js dependencies installed
echo.

echo Step 3: Compiling TypeScript...
call npm run compile
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile TypeScript
    pause
    exit /b 1
)
echo ✓ Extension compiled successfully
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure Ollama is installed (https://ollama.ai)
echo 2. Download models: ollama pull gemma3:4b
echo 3. Start the server: cd server ^&^& python server.py
echo 4. Press F5 in VS Code to run the extension
echo.
pause
