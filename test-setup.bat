@echo off
echo ========================================
echo Local AI Copilot - Setup Test
echo ========================================
echo.

echo [1/4] Testing Ollama Installation...
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ollama is not installed or not in PATH
    echo Please install from https://ollama.ai
    exit /b 1
)
echo [OK] Ollama is installed

echo.
echo [2/4] Checking Ollama models...
ollama list | findstr "gemma3:4b" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] gemma3:4b not found
    echo Run: ollama pull gemma3:4b
) else (
    echo [OK] gemma3:4b found
)

ollama list | findstr "gemma3:8b" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] gemma3:8b not found
    echo Run: ollama pull gemma3:8b
) else (
    echo [OK] gemma3:8b found
)

ollama list | findstr "deepseek-r1:8b" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] deepseek-r1:8b not found
    echo Run: ollama pull deepseek-r1:8b
) else (
    echo [OK] deepseek-r1:8b found
)

echo.
echo [3/4] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed
    exit /b 1
)
echo [OK] Python is installed

echo.
echo [4/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    exit /b 1
)
echo [OK] Node.js is installed

echo.
echo ========================================
echo Setup Check Complete!
echo ========================================
echo.
echo Next steps:
echo 1. cd server ^&^& pip install -r requirements.txt
echo 2. python server/server.py (in one terminal)
echo 3. cd vscode-extension ^&^& npm install ^&^& npm run compile
echo 4. Press F5 in VS Code to run the extension
echo.
