# Local AI Copilot for VS Code

A VS Code extension that provides GitHub Copilot-like functionality using locally running Ollama models.

## Features

- 🤖 **Chat Interface** - Interactive AI chat panel similar to GitHub Copilot
- 💻 **Code Generation** - Generate code from natural language descriptions
- ✏️ **Code Editing** - Edit and refactor selected code with AI assistance
- 📝 **Code Explanation** - Understand complex code with detailed explanations
- 🔄 **Diff Preview** - See before/after comparisons before applying changes
- 🎨 **Beautiful UI** - Modern interface that matches VS Code's theme
- 🚀 **Multiple Models** - Choose between different Ollama models

## Prerequisites

1. **Ollama** - Install from [https://ollama.ai](https://ollama.ai)
2. **Python 3.8+** - For the backend server
3. **Node.js 16+** - For building the extension

## Supported Models

This extension is configured for:
- `gemma3:4b` - Fast responses, good for quick tasks
- `gemma3:8b` - Better quality, slightly slower
- `deepseek-r1:8b` - Reasoning model, best for complex tasks

## Installation

### Step 1: Install Ollama Models

```bash
ollama pull gemma3:4b
ollama pull gemma3:8b
ollama pull deepseek-r1:8b
```

### Step 2: Set Up Python Server

```bash
cd server
pip install -r requirements.txt
python server.py
```

The server will start on `http://127.0.0.1:5000`

### Step 3: Build and Install VS Code Extension

```bash
cd vscode-extension
npm install
npm run compile
```

Then press `F5` to launch the extension in a new VS Code window.

## Usage

### Chat Interface

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Local AI Copilot: Chat"
3. Start chatting with your AI!

### Quick Actions

- **Explain Code**: Select code → Right-click → "AI: Explain Code"
- **Edit Code**: Select code → Right-click → "AI: Edit Code"
- **Generate Code**: Place cursor → Right-click → "AI: Generate Code"

### Chat Features

- **Text Responses**: Regular chat messages appear in the chat window
- **Code Responses**: Code suggestions appear with action buttons:
  - **Insert at Cursor**: Add code at current position
  - **Replace Selection**: Replace selected code with AI suggestion
  - **Copy**: Copy code to clipboard

### Model Selection

Choose your preferred model from the dropdown in the chat panel:
- Use smaller models (4b) for faster responses
- Use larger models (8b) for better quality and complex tasks

## How It Works

1. **VS Code Extension**: Provides the UI and integrates with VS Code
2. **Python Server**: Handles communication with Ollama
3. **Ollama**: Runs the AI models locally on your machine

```
VS Code Extension (TypeScript)
       ↓
Python Server (Flask)
       ↓
Ollama API (Port 11434)
       ↓
Local AI Models
```

## Configuration

### Changing Models

Edit `server/server.py` to add or modify models:

```python
MODELS = {
    "model-name": "ollama-model-name",
    # Add more models here
}
```

Edit `vscode-extension/src/webview.html` to update the dropdown:

```html
<option value="model-name">Display Name</option>
```

### Changing Server Port

In `server/server.py`:
```python
app.run(port=5000, debug=True)  # Change port here
```

In `vscode-extension/src/extension.ts`:
```typescript
const SERVER_URL = 'http://127.0.0.1:5000';  // Update port here
```

## Troubleshooting

### Server Won't Start

1. Check if Python dependencies are installed:
   ```bash
   pip install -r server/requirements.txt
   ```

2. Check if port 5000 is available:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Mac/Linux
   lsof -i :5000
   ```

### Ollama Connection Issues

1. Verify Ollama is running:
   ```bash
   ollama list
   ```

2. Check Ollama API:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Test model:
   ```bash
   ollama run gemma3:4b "Hello"
   ```

### Extension Not Working

1. Check server health:
   ```bash
   curl http://127.0.0.1:5000/health
   ```

2. Check browser console in VS Code:
   - Open Command Palette
   - Type "Developer: Toggle Developer Tools"
   - Check for errors

3. Rebuild extension:
   ```bash
   cd vscode-extension
   npm run compile
   ```

## Development

### Project Structure

```
├── server/
│   ├── server.py           # Flask server
│   └── requirements.txt    # Python dependencies
├── vscode-extension/
│   ├── src/
│   │   ├── extension.ts    # Main extension code
│   │   ├── webview.html    # Chat UI
│   │   └── webview.js      # Chat logic
│   ├── package.json        # Extension manifest
│   └── tsconfig.json       # TypeScript config
└── README.md
```

### Building for Production

```bash
cd vscode-extension
npm install -g vsce
vsce package
```

This creates a `.vsix` file you can install with:
```bash
code --install-extension local-ai-copilot-*.vsix
```

## Contributing

Feel free to submit issues and pull requests!

## License

MIT License

## Credits

Built with:
- [Ollama](https://ollama.ai) - Local AI models
- [Flask](https://flask.palletsprojects.com/) - Python web framework
- [VS Code Extension API](https://code.visualstudio.com/api) - Extension framework
