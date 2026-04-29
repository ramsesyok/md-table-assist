import React from 'react';
import ReactDOM from 'react-dom/client';
import { TableEditor } from './TableEditor';
import './tableEditor.css';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

// Show JS errors visually in the webview for easy debugging
window.addEventListener('error', (e) => {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#5a1d1d;color:#f48771;padding:12px;font-family:monospace;font-size:12px;z-index:9999;white-space:pre-wrap;';
  errDiv.textContent = `JS Error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ''}`;
  document.body.appendChild(errDiv);
});

window.addEventListener('unhandledrejection', (e) => {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#5a1d1d;color:#f48771;padding:12px;font-family:monospace;font-size:12px;z-index:9999;white-space:pre-wrap;';
  errDiv.textContent = `Unhandled Promise: ${String(e.reason)}`;
  document.body.appendChild(errDiv);
});

const vscode = acquireVsCodeApi();

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <TableEditor vscode={vscode} />
    </React.StrictMode>
  );
} else {
  document.body.innerHTML = '<div style="padding:20px;color:red;">Error: #root element not found</div>';
}

// Notify extension that the webview is ready
vscode.postMessage({ type: 'ready' });
