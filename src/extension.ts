import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

import { findTableEditorBlock, TableEditorBlockError } from './markdown-document/findTableEditorBlock';
import { findSpantableBlock } from './markdown-document/findSpantableBlock';
import { buildReplacement } from './markdown-document/replaceBlock';
import { generateTableId } from './markdown-document/generateTableId';
import { parseSpantable } from './formats/spantable/parseSpantable';
import { serializeSpantable } from './formats/spantable/serializeSpantable';
import { normalizeTableModel } from './model/normalizeTableModel';
import type { TableModel } from './model/TableModel';
import type { WebviewToExtensionMessage, ExtensionToWebviewMessage } from './model/WebviewMessages';

// Inlined by esbuild loader: { '.html': 'text' }
import templateHtml from './webview/template.html';

type EditMode = 'new' | 'comment-block' | 'plain-spantable';

interface PanelState {
  sourceStart: number;
  sourceEnd: number;
  mode: EditMode;
  tableId: string;
}

export function activate(context: vscode.ExtensionContext): void {
  const cmd = vscode.commands.registerCommand('tableEditor.open', () => {
    openTableEditor(context);
  });
  context.subscriptions.push(cmd);
}

export function deactivate(): void {}

function openTableEditor(context: vscode.ExtensionContext): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor. Open a Markdown file first.');
    return;
  }

  const document = editor.document;
  const docText = document.getText();
  const cursorOffset = document.offsetAt(editor.selection.active);

  let table: TableModel;
  let state: PanelState;

  try {
    // Priority 1: cursor inside a table-editor comment block
    const commentBlock = findTableEditorBlock(docText, cursorOffset);
    if (commentBlock) {
      if (commentBlock.format !== 'spantable') {
        vscode.window.showErrorMessage(`Unsupported table format: "${commentBlock.format}"`);
        return;
      }
      try {
        table = normalizeTableModel(parseSpantable(commentBlock.innerContent, commentBlock.id));
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to parse spantable: ${String(e)}`);
        return;
      }
      state = {
        sourceStart: commentBlock.startOffset,
        sourceEnd: commentBlock.endOffset,
        mode: 'comment-block',
        tableId: commentBlock.id
      };
    } else {
      // Priority 2: cursor near a plain ::spantable:: block
      const plainBlock = findSpantableBlock(docText, cursorOffset);
      if (plainBlock) {
        try {
          const newId = generateTableId(collectExistingIds(docText));
          table = normalizeTableModel(parseSpantable(plainBlock.content, newId));
        } catch (e) {
          vscode.window.showErrorMessage(`Failed to parse spantable: ${String(e)}`);
          return;
        }
        state = {
          sourceStart: plainBlock.startOffset,
          sourceEnd: plainBlock.endOffset,
          mode: 'plain-spantable',
          tableId: table.id
        };
      } else {
        // Priority 3: new empty table
        const newId = generateTableId(collectExistingIds(docText));
        table = makeEmptyTable(newId);
        state = {
          sourceStart: cursorOffset,
          sourceEnd: cursorOffset,
          mode: 'new',
          tableId: newId
        };
      }
    }
  } catch (e) {
    if (e instanceof TableEditorBlockError) {
      vscode.window.showErrorMessage(`Table block error: ${e.message}`);
      return;
    }
    throw e;
  }

  createWebviewPanel(context, table, state, document);
}

function createWebviewPanel(
  context: vscode.ExtensionContext,
  table: TableModel,
  state: PanelState,
  document: vscode.TextDocument
): void {
  const panel = vscode.window.createWebviewPanel(
    'tableEditor',
    'Table Editor',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
    }
  );

  const nonce = crypto.randomBytes(16).toString('hex');
  const webviewUri = (relativePath: string) =>
    panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'out', 'webview', relativePath)
    );

  const scriptUri = webviewUri('assets/main.js');
  const styleUri = webviewUri('assets/style.css');

  panel.webview.html = buildHtml(nonce, scriptUri.toString(), styleUri.toString(), panel.webview.cspSource);

  // Wait for webview ready signal before sending data
  let ready = false;
  const pendingMessages: ExtensionToWebviewMessage[] = [];

  function postMessage(msg: ExtensionToWebviewMessage): void {
    if (ready) {
      panel.webview.postMessage(msg);
    } else {
      pendingMessages.push(msg);
    }
  }

  panel.webview.onDidReceiveMessage(
    (message: WebviewToExtensionMessage) => {
      if (message.type === 'ready') {
        ready = true;
        postMessage({ type: 'load', table, mode: state.mode });
        for (const m of pendingMessages) {
          panel.webview.postMessage(m);
        }
        pendingMessages.length = 0;
        return;
      }

      if (message.type === 'apply') {
        handleApply(message.table, state, document, panel);
        return;
      }

      if (message.type === 'error') {
        vscode.window.showErrorMessage(`Table Editor: ${message.message}`);
        return;
      }
    },
    undefined,
    context.subscriptions
  );
}

function handleApply(
  table: TableModel,
  state: PanelState,
  document: vscode.TextDocument,
  panel: vscode.WebviewPanel
): void {
  const serialized = serializeSpantable(table);
  const wrapped = wrapWithComments(table.id, serialized);

  const docText = document.getText();

  let startOffset = state.sourceStart;
  let endOffset = state.sourceEnd;

  if (state.mode === 'new') {
    // Insert at cursor position as new content
    const edit = new vscode.WorkspaceEdit();
    const insertPos = document.positionAt(cursorInsertPosition(docText, startOffset));
    edit.insert(document.uri, insertPos, '\n' + wrapped + '\n');
    vscode.workspace.applyEdit(edit).then(success => {
      if (!success) {
        vscode.window.showErrorMessage('Failed to insert table into document.');
      } else {
        panel.dispose();
      }
    });
    return;
  }

  const replacement = buildReplacement(
    {
      getText: () => docText,
      positionAt: (offset: number) => document.positionAt(offset),
      uri: { toString: () => document.uri.toString() }
    },
    startOffset,
    endOffset,
    wrapped
  );

  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(
      new vscode.Position(replacement.startLine, replacement.startCharacter),
      new vscode.Position(replacement.endLine, replacement.endCharacter)
    ),
    replacement.newText
  );

  vscode.workspace.applyEdit(edit).then(success => {
    if (!success) {
      vscode.window.showErrorMessage('Failed to apply changes to document.');
    } else {
      panel.dispose();
    }
  });
}

function buildHtml(nonce: string, scriptUri: string, styleUri: string, cspSource: string): string {
  return templateHtml
    .replace(/\{\{nonce\}\}/g, nonce)
    .replace(/\{\{scriptUri\}\}/g, scriptUri)
    .replace(/\{\{styleUri\}\}/g, styleUri)
    .replace(/\{\{cspSource\}\}/g, cspSource);
}

function wrapWithComments(id: string, content: string): string {
  return [
    `<!-- table-editor:start id="${id}" format="spantable" version="1" -->`,
    '',
    content,
    '',
    `<!-- table-editor:end id="${id}" -->`
  ].join('\n');
}

function collectExistingIds(docText: string): string[] {
  const re = /<!--\s*table-editor:start\s+id="([^"]+)"/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(docText)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

function makeEmptyTable(id: string): TableModel {
  return normalizeTableModel({
    id,
    format: 'spantable',
    version: 1,
    rows: [
      [{ id: 'r0c0', text: '', row: 0, col: 0, rowspan: 1, colspan: 1, hidden: false },
       { id: 'r0c1', text: '', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: false },
       { id: 'r0c2', text: '', row: 0, col: 2, rowspan: 1, colspan: 1, hidden: false }],
      [{ id: 'r1c0', text: '', row: 1, col: 0, rowspan: 1, colspan: 1, hidden: false },
       { id: 'r1c1', text: '', row: 1, col: 1, rowspan: 1, colspan: 1, hidden: false },
       { id: 'r1c2', text: '', row: 1, col: 2, rowspan: 1, colspan: 1, hidden: false }],
      [{ id: 'r2c0', text: '', row: 2, col: 0, rowspan: 1, colspan: 1, hidden: false },
       { id: 'r2c1', text: '', row: 2, col: 1, rowspan: 1, colspan: 1, hidden: false },
       { id: 'r2c2', text: '', row: 2, col: 2, rowspan: 1, colspan: 1, hidden: false }]
    ]
  });
}

function cursorInsertPosition(docText: string, offset: number): number {
  // Insert after the current line
  const nextNewline = docText.indexOf('\n', offset);
  return nextNewline === -1 ? docText.length : nextNewline;
}
