alert('Webview loaded!');
(function() {
    const vscode = acquireVsCodeApi();

    const sendButton = document.getElementById('sendBtn');
    const inputBox = document.getElementById('promptInput');
    const modelSelect = document.getElementById('modelSelect');
    const chatArea = document.getElementById('chatArea');

    let isProcessing = false;

    function addMessage(content, type = 'user', isCode = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        if (isCode) {
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = content;
            pre.appendChild(code);
            messageDiv.appendChild(pre);
            
            // Add action buttons for code
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'code-actions';
            
            const insertBtn = document.createElement('button');
            insertBtn.textContent = 'Insert at Cursor';
            insertBtn.onclick = () => {
                vscode.postMessage({
                    type: 'insertCode',
                    code: content
                });
            };
            
            const replaceBtn = document.createElement('button');
            replaceBtn.textContent = 'Replace Selection';
            replaceBtn.onclick = () => {
                vscode.postMessage({
                    type: 'replaceCode',
                    code: content
                });
            };
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(content);
            };
            
            actionsDiv.appendChild(insertBtn);
            actionsDiv.appendChild(replaceBtn);
            actionsDiv.appendChild(copyBtn);
            messageDiv.appendChild(actionsDiv);
        } else {
            // Format text with markdown-like support
            const formattedContent = formatText(content);
            messageDiv.innerHTML = formattedContent;
        }
        
        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function formatText(text) {
        // Basic markdown formatting
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        return formatted;
    }

    function addLoadingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        messageDiv.id = 'loading-message';
        messageDiv.innerHTML = '<span class="loading"></span> Thinking...';
        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function removeLoadingMessage() {
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) {
            loadingMsg.remove();
        }
    }

    function sendPrompt() {
        const prompt = inputBox.value.trim();
        const model = modelSelect.value;
        
        if (!prompt || isProcessing) return;

        isProcessing = true;
        sendButton.disabled = true;

        // Add user message to chat
        addMessage(prompt, 'user');

        // Add loading indicator
        addLoadingMessage();

        // Send message to extension
        vscode.postMessage({
            type: 'sendPrompt',
            prompt: prompt,
            model: model
        });

        // Clear input
        inputBox.value = '';
        inputBox.style.height = 'auto';
    }

    sendButton.addEventListener('click', sendPrompt);

    // Handle Enter key (send) and Shift+Enter (new line)
    inputBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendPrompt();
        }
    });

    // Auto-resize textarea
    inputBox.addEventListener('input', () => {
        inputBox.style.height = 'auto';
        inputBox.style.height = inputBox.scrollHeight + 'px';
    });

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Received message from extension:', message);

        removeLoadingMessage();
        isProcessing = false;
        sendButton.disabled = false;

        switch (message.type) {
            case 'chatResponse':
                addMessage(message.content, 'ai', false);
                break;
            
            case 'codeResponse':
                addMessage(message.code, 'ai', true);
                if (message.explanation) {
                    addMessage(message.explanation, 'ai', false);
                }
                break;
            
            case 'aiResponse':
                addMessage(message.content, 'ai', message.isCode);
                break;
            
            case 'error':
                addMessage(`Error: ${message.content}`, 'system');
                break;
            
            case 'info':
                addMessage(message.content, 'system');
                break;
        }
    });

    // Initial message
    addMessage('Hello! I\'m your Local AI Copilot. How can I help you today?', 'ai');
})();
