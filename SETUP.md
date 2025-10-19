# Quick Setup Guide

## 1. Install Ollama and Models

Download and install Ollama from https://ollama.ai

Then install the models:
```bash
ollama pull gemma3:4b
ollama pull gemma3:8b
ollama pull deepseek-r1:8b
```

Verify installation:
```bash
ollama list
```

## 2. Start the Python Server

Open a terminal in the project folder:

```powershell
cd server
pip install -r requirements.txt
python server.py
```

You should see:
```
Starting Local AI Copilot Server...
Available models: ['gemma3-4b', 'gemma3-8b', 'deepseek-r1-8b']
Server running on http://127.0.0.1:5000
```

Keep this terminal running!

## 3. Build the VS Code Extension

Open another terminal:

```powershell
cd vscode-extension
npm install
npm run compile
```

## 4. Run the Extension

In VS Code:
1. Press `F5` (or Run → Start Debugging)
2. A new VS Code window will open with the extension loaded
3. Press `Ctrl+Shift+P` and type "Local AI Copilot: Chat"
4. Start chatting!

## Testing the Setup

### Test 1: Server Health Check

Open browser to: http://127.0.0.1:5000/health

Should show:
```json
{"status":"healthy","ollama":"running"}
```

### Test 2: Ollama Direct

```bash
ollama run gemma3:4b "Write a hello world in Python"
```

### Test 3: Server API

```powershell
$body = @{
    prompt = "Write hello world in Python"
    model = "gemma3-4b"
    task_type = "code"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:5000/completion" -Method POST -Body $body -ContentType "application/json"
```

## Common Issues

### Issue: "Failed to connect to AI server"

**Solution**: Make sure the Python server is running
```powershell
cd server
python server.py
```

### Issue: "Ollama API error"

**Solution**: Make sure Ollama is running
```bash
ollama list
```

If Ollama isn't running, start it:
- Windows: Ollama should auto-start. Check system tray.
- Mac: `ollama serve`
- Linux: `ollama serve`

### Issue: "Model not available"

**Solution**: Pull the model
```bash
ollama pull gemma3:4b
```

### Issue: Extension commands not showing

**Solution**: 
1. Close the debug VS Code window
2. In your main VS Code window, run:
   ```powershell
   cd vscode-extension
   npm run compile
   ```
3. Press `F5` again

## Using the Extension

### Chat Command
1. `Ctrl+Shift+P` → "Local AI Copilot: Chat"
2. Select model from dropdown
3. Type your question and press Enter

### Code Editing
1. Select some code
2. Right-click → "AI: Edit Code"
3. Describe what you want to change
4. Review the diff and apply

### Code Generation
1. Place cursor where you want code
2. Right-click → "AI: Generate Code"  
3. Describe what you want to create
4. Code will be inserted

### Code Explanation
1. Select code you want explained
2. Right-click → "AI: Explain Code"
3. Read explanation in chat panel

## Tips

- 💡 Use `gemma3-4b` for quick responses
- 💡 Use `deepseek-r1-8b` for complex reasoning tasks
- 💡 Select code before asking questions for better context
- 💡 The chat panel remembers your conversation
- 💡 Code suggestions show "Before/After" diffs

## Next Steps

Once everything works:
1. Package the extension: `vsce package`
2. Install it: `code --install-extension *.vsix`
3. Stop using `F5` and use it like a real extension!

## Need Help?

Check the full README.md for detailed documentation.
