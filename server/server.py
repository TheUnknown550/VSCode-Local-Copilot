from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import re

app = Flask(__name__)
CORS(app)

MODELS = {
    "gemma3-4b": "gemma3:4b",
    "gemma3-8b": "gemma3:8b",
    "deepseek-r1-8b": "deepseek-r1:8b"
}

OLLAMA_API_URL = "http://localhost:11434/api/generate"

def detect_code_blocks(text):
    """Detect if the response contains code blocks"""
    # Check for markdown code blocks
    if '```' in text:
        return True
    # Check for common code patterns
    code_patterns = [
        r'\bdef\s+\w+\s*\(',
        r'\bfunction\s+\w+\s*\(',
        r'\bclass\s+\w+',
        r'\bconst\s+\w+\s*=',
        r'\blet\s+\w+\s*=',
        r'\bvar\s+\w+\s*=',
        r'\bimport\s+',
        r'\bfrom\s+.+\s+import',
    ]
    return any(re.search(pattern, text) for pattern in code_patterns)

def extract_code_from_markdown(text):
    """Extract code from markdown code blocks"""
    # Find all code blocks
    code_blocks = re.findall(r'```[\w]*\n(.*?)```', text, re.DOTALL)
    if code_blocks:
        return '\n\n'.join(code_blocks)
    return text

@app.route("/completion", methods=["POST"])
def completion():
    try:
        data = request.json
        print("Received request:", data)
        
        model = data.get("model", "gemma3:4b")
        prompt = data.get("prompt", "")
        context = data.get("context", "")
        task_type = data.get("task_type", "chat")  # 'chat', 'code', 'edit'
        
        if model not in MODELS:
            return jsonify({"error": f"Model {model} not available"}), 400
        
        # Build the prompt based on task type
        if task_type == "code":
            system_prompt = "You are a coding assistant. Provide only code without explanations unless asked. Format code properly."
            full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nRequest: {prompt}"
        elif task_type == "edit":
            system_prompt = "You are a code editor. Modify the provided code according to the request. Return only the modified code."
            full_prompt = f"{system_prompt}\n\nCurrent code:\n{context}\n\nEdit request: {prompt}"
        else:  # chat
            full_prompt = prompt
        
        # Call Ollama API
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": MODELS[model],
                "prompt": full_prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return jsonify({"error": f"Ollama API error: {response.text}"}), 500
        
        result = response.json()
        completion_text = result.get("response", "").strip()
        
        # Determine if this is code or chat
        is_code = detect_code_blocks(completion_text) or task_type in ["code", "edit"]
        
        # Extract code if it's in markdown format
        if is_code and '```' in completion_text:
            code_content = extract_code_from_markdown(completion_text)
            return jsonify({
                "completion": code_content,
                "raw_completion": completion_text,
                "completion_type": "code"
            })
        
        return jsonify({
            "completion": completion_text,
            "completion_type": "code" if is_code else "chat"
        })
    
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return jsonify({"error": f"Failed to connect to Ollama: {str(e)}"}), 500
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/models", methods=["GET"])
def get_models():
    """Return available models"""
    return jsonify({"models": list(MODELS.keys())})

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    try:
        # Check if Ollama is running
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            return jsonify({"status": "healthy", "ollama": "running"})
    except:
        pass
    return jsonify({"status": "unhealthy", "ollama": "not running"}), 503

if __name__ == "__main__":
    print("Starting Local AI Copilot Server...")
    print(f"Available models: {list(MODELS.keys())}")
    print("Server running on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
