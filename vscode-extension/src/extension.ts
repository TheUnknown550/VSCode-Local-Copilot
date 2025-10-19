import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

interface CompletionResponse {
    completion: string;
    completion_type: 'code' | 'chat';
    raw_completion?: string;
    error?: string;
}

let currentPanel: vscode.WebviewPanel | undefined = undefined;
const SERVER_URL = 'http://127.0.0.1:5000';

export function activate(context: vscode.ExtensionContext) {
    
    // Command to open chat panel
    let chatCommand = vscode.commands.registerCommand('ai.chat', () => {
        openChatPanel(context);
    });

    // Command to edit selected code
    let editCommand = vscode.commands.registerCommand('ai.editCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Please select code to edit');
            return;
        }

        const instruction = await vscode.window.showInputBox({
            prompt: 'What would you like to do with this code?',
            placeHolder: 'e.g., Add error handling, Optimize this function, Add comments'
        });

        if (!instruction) return;

        await editCodeWithAI(editor, selection, selectedText, instruction);
    });

    // Command to generate code
    let generateCommand = vscode.commands.registerCommand('ai.generateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const prompt = await vscode.window.showInputBox({
            prompt: 'Describe the code you want to generate',
            placeHolder: 'e.g., Create a function to sort an array'
        });

        if (!prompt) return;

        await generateCodeWithAI(editor, prompt);
    });

    // Command to explain code
    let explainCommand = vscode.commands.registerCommand('ai.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Please select code to explain');
            return;
        }

        openChatPanel(context);
        if (currentPanel) {
            currentPanel.webview.postMessage({
                type: 'aiResponse',
                content: 'Analyzing code...',
                isCode: false
            });

            const response = await callAI(
                `Explain this code in detail:\n\n${selectedText}`,
                'chat',
                ''
            );

            currentPanel.webview.postMessage({
                type: 'aiResponse',
                content: response.completion,
                isCode: false
            });
        }
    });

    context.subscriptions.push(chatCommand, editCommand, generateCommand, explainCommand);
}

function openChatPanel(context: vscode.ExtensionContext) {
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'localAIChat',
        'Local AI Copilot',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))],
            retainContextWhenHidden: true
        }
    );

    const htmlPath = path.join(context.extensionPath, 'src', 'webview.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    const scriptUri = currentPanel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview.js'))
    );
    
    html = html.replace(
        /<script src="webview.js"><\/script>/,
        `<script src="${scriptUri}"></script>`
    );

    currentPanel.webview.html = html;

    currentPanel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'sendPrompt') {
            await handleChatMessage(message);
        } else if (message.type === 'insertCode') {
            insertCodeInEditor(message.code);
        } else if (message.type === 'applyEdit') {
            await applyCodeEdit(message.code);
        }
    });

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
    });

    // Check server health
    checkServerHealth();
}

async function handleChatMessage(message: any) {
    const editor = vscode.window.activeTextEditor;

    // Show loading state
    currentPanel?.webview.postMessage({
        type: 'aiResponse',
        content: 'Thinking...',
        isCode: false,
        loading: true
    });

    try {
        let context = '';
        let taskType = 'chat';

        // Project-wide smart context gathering
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let projectContext = '';
        if (workspaceFolders && workspaceFolders.length > 0) {
            const folder = workspaceFolders[0].uri.fsPath;
            // Gather up to 5 key files (README, setup, main, server, extension, etc.)
            const keyFiles = fs.readdirSync(folder)
                .filter(f => /README|SETUP|main|server|extension|\.py$|\.ts$|\.js$|\.md$/i.test(f))
                .slice(0, 5);
            for (const file of keyFiles) {
                try {
                    const filePath = path.join(folder, file);
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    projectContext += `\n\n--- File: ${file} ---\n` + fileContent.slice(0, 2000); // Limit size per file
                } catch (e) { /* skip unreadable files */ }
            }
        }

        // Smart context from current editor
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            const document = editor.document;
            const cursorPosition = editor.selection.active;
            // Get up to 40 lines before and after cursor for context
            const startLine = Math.max(0, cursorPosition.line - 40);
            const endLine = Math.min(document.lineCount - 1, cursorPosition.line + 40);
            const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
            const surroundingContext = document.getText(range);

            if (selectedText) {
                context = selectedText + '\n\n--- Surrounding Context ---\n' + surroundingContext;
                taskType = 'code';
            } else {
                context = surroundingContext;
            }
        }

        // Combine project context and editor context
        if (projectContext) {
            context = (context ? context : '') + '\n\n--- Project Context ---\n' + projectContext;
        }

        const response = await callAI(message.prompt, taskType, context, message.model);
        console.log('AI response from server:', response);

        if (response.error) {
            console.error('AI error response:', response.error);
            currentPanel?.webview.postMessage({
                type: 'error',
                content: response.error
            });
            vscode.window.showErrorMessage(response.error);
            return;
        }

        const isCode = response.completion_type === 'code';
        console.log('Sending message to webview:', isCode ? 'codeResponse' : 'chatResponse', response.completion);

        // Detect file creation intent (e.g., response starts with 'Filename: ...')
        const fileMatch = response.completion.match(/^Filename:\s*(\S+)\s*\n([\s\S]*)/);
        if (fileMatch) {
            const filename = fileMatch[1];
            const fileContent = fileMatch[2].trim();
            // Ask user to confirm file creation
            const confirm = await vscode.window.showInformationMessage(
                `AI wants to create file: ${filename}. Proceed?`,
                'Create', 'Cancel'
            );
            if (confirm === 'Create') {
                await createFileInWorkspace(filename, fileContent);
                vscode.window.showInformationMessage(`File '${filename}' created!`);
            }
            currentPanel?.webview.postMessage({
                type: 'chatResponse',
                content: `File creation: ${filename}\n\n${fileContent}`,
                loading: false
            });
            return;
        }

        if (isCode) {
            currentPanel?.webview.postMessage({
                type: 'codeResponse',
                code: response.completion,
                rawContent: response.raw_completion,
                explanation: 'Preview and insert, replace, or diff with selection.',
                loading: false
            });
        } else {
            currentPanel?.webview.postMessage({
                type: 'chatResponse',
                content: response.completion,
                loading: false
            });
        }
// Create a new file in the workspace
async function createFileInWorkspace(filename: string, content: string) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }
    const folderUri = folders[0].uri;
    const fileUri = vscode.Uri.joinPath(folderUri, filename);
    try {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to create file: ${e}`);
    }
}

    } catch (err: any) {
        console.error('Exception in handleChatMessage:', err);
        currentPanel?.webview.postMessage({
            type: 'error',
            content: `Error: ${err.message}`
        });
        vscode.window.showErrorMessage(`AI request failed: ${err.message}`);
    }
}

async function callAI(
    prompt: string, 
    taskType: string = 'chat', 
    context: string = '',
    model: string = 'gemma3:4b'
): Promise<CompletionResponse> {
    const response = await fetch(`${SERVER_URL}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt, 
            model, 
            context,
            task_type: taskType
        })
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return await response.json() as CompletionResponse;
}

function insertCodeInEditor(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    // Smart insertion: insert code at cursor, auto-indent
    editor.edit((editBuilder) => {
        const position = editor.selection.active;
        // Indent code to match current line
        const currentLine = editor.document.lineAt(position.line);
        const indent = currentLine.text.match(/^\s*/)?.[0] || '';
        const indentedCode = code.split('\n').map((line, i) => i === 0 ? line : indent + line).join('\n');
        editBuilder.insert(position, indentedCode);
    });
}

async function applyCodeEdit(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    
    // Show diff preview before applying edit
    const originalDocument = editor.document;
    const originalText = originalDocument.getText(selection);

    // Create a temporary document for comparison
    const newDoc = await vscode.workspace.openTextDocument({
        content: code,
        language: originalDocument.languageId
    });

    // Show diff
    await vscode.commands.executeCommand(
        'vscode.diff',
        originalDocument.uri,
        newDoc.uri,
        'Original ← → AI Suggestion',
        { preview: true }
    );

    // Ask user to apply
    const apply = await vscode.window.showInformationMessage(
        'Apply AI suggestion?',
        'Apply',
        'Cancel'
    );

    if (apply === 'Apply') {
        editor.edit((editBuilder) => {
            editBuilder.replace(selection, code);
        });
        vscode.window.showInformationMessage('Code applied!');
    }
}

async function editCodeWithAI(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    selectedText: string,
    instruction: string
) {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "AI is editing your code...",
        cancellable: false
    }, async (progress) => {
        try {
            const response = await callAI(instruction, 'edit', selectedText);
            
            if (response.error) {
                vscode.window.showErrorMessage(response.error);
                return;
            }

            await applyCodeEdit(response.completion);

        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to edit code: ${err.message}`);
        }
    });
}

async function generateCodeWithAI(editor: vscode.TextEditor, prompt: string) {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "AI is generating code...",
        cancellable: false
    }, async (progress) => {
        try {
            const document = editor.document;
            const cursorPosition = editor.selection.active;
            
            // Get context around cursor
            const startLine = Math.max(0, cursorPosition.line - 20);
            const endLine = Math.min(document.lineCount - 1, cursorPosition.line + 5);
            const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
            const context = document.getText(range);

            const response = await callAI(prompt, 'code', context);
            
            if (response.error) {
                vscode.window.showErrorMessage(response.error);
                return;
            }

            editor.edit((editBuilder) => {
                editBuilder.insert(editor.selection.active, '\n' + response.completion + '\n');
            });

            vscode.window.showInformationMessage('Code generated!');

        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to generate code: ${err.message}`);
        }
    });
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${SERVER_URL}/health`);
        if (response.ok) {
            vscode.window.showInformationMessage('Local AI Copilot server is running!');
        }
    } catch (err) {
        vscode.window.showWarningMessage(
            'Could not connect to Local AI Copilot server. Make sure the server is running on port 5000.'
        );
    }
}

export function deactivate() {
    if (currentPanel) {
        currentPanel.dispose();
    }
}
