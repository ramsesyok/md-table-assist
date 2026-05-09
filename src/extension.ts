import * as vscode from 'vscode';
import * as crypto from 'crypto';

import { findTableEditorBlock, TableEditorBlockError } from './markdown-document/findTableEditorBlock';
import { findSpantableBlock } from './markdown-document/findSpantableBlock';
import { buildReplacement } from './markdown-document/replaceBlock';
import { generateTableId } from './markdown-document/generateTableId';
import { parseSpantable } from './formats/spantable/parseSpantable';
import { serializeSpantable } from './formats/spantable/serializeSpantable';
import { parsePipeTable } from './formats/pipeTable/parsePipeTable';
import { serializePipeTable } from './formats/pipeTable/serializePipeTable';
import { parseMdxSpanner } from './formats/mdxSpanner/parseMdxSpanner';
import { serializeMdxSpanner } from './formats/mdxSpanner/serializeMdxSpanner';
import { normalizeTableModel } from './model/normalizeTableModel';
import type { TableModel, TableFormat } from './model/TableModel';
import type { WebviewToExtensionMessage, ExtensionToWebviewMessage } from './model/WebviewMessages';

// Inlined by esbuild loader: { '.html': 'text' }
import templateHtml from './webview/template.html';

type EditMode = 'new' | 'comment-block' | 'plain-spantable';

interface PanelState {
  sourceStart: number;
  sourceEnd: number;
  mode: EditMode;
  tableId: string;
  format: TableFormat;
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
      const fmt = commentBlock.format as TableFormat;
      let parsed: TableModel;
      if (fmt === 'spantable') {
        try {
          parsed = parseSpantable(commentBlock.innerContent, commentBlock.id);
        } catch (e) {
          vscode.window.showErrorMessage(`Failed to parse spantable: ${String(e)}`);
          return;
        }
      } else if (fmt === 'pipeTable') {
        const result = parsePipeTable(commentBlock.innerContent, commentBlock.id);
        if (!result.ok) {
          vscode.window.showErrorMessage(`Failed to parse pipeTable: ${result.message}`);
          return;
        }
        parsed = result.value;
      } else if (fmt === 'mdxSpanner') {
        const result = parseMdxSpanner(commentBlock.innerContent, commentBlock.id);
        if (!result.ok) {
          vscode.window.showErrorMessage(`Failed to parse mdxSpanner: ${result.message}`);
          return;
        }
        parsed = result.value;
      } else {
        vscode.window.showErrorMessage(`Unsupported table format: "${commentBlock.format}"`);
        return;
      }
      table = normalizeTableModel(parsed);
      state = {
        sourceStart: commentBlock.startOffset,
        sourceEnd: commentBlock.endOffset,
        mode: 'comment-block',
        tableId: commentBlock.id,
        format: fmt
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
          tableId: table.id,
          format: 'spantable'
        };
      } else {
        // Priority 3: new empty table
        const newId = generateTableId(collectExistingIds(docText));
        table = makeEmptyTable(newId);
        state = {
          sourceStart: cursorOffset,
          sourceEnd: cursorOffset,
          mode: 'new',
          tableId: newId,
          format: 'spantable'
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
    'Markdown Table Assist',
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
        vscode.window.showErrorMessage(`Markdown Table Assist: ${message.message}`);
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
  let serialized: string;
  const fmt = table.format;

  if (fmt === 'spantable') {
    serialized = serializeSpantable(table);
  } else if (fmt === 'pipeTable') {
    const result = serializePipeTable(table);
    if (!result.ok) {
      vscode.window.showErrorMessage(result.message);
      return;
    }
    serialized = result.value;
  } else if (fmt === 'mdxSpanner') {
    serialized = serializeMdxSpanner(table);
  } else {
    vscode.window.showErrorMessage(`Unsupported format for saving: "${fmt}"`);
    return;
  }

  const wrapped = wrapWithComments(table.id, fmt, serialized);
  const docText = document.getText();

  const startOffset = state.sourceStart;
  const endOffset = state.sourceEnd;

  if (state.mode === 'new') {
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

function wrapWithComments(id: string, format: TableFormat, content: string): string {
  return [
    `<!-- table-editor:start id="${id}" format="${format}" version="1" -->`,
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
    format: 'pipeTable',
    version: 1,
    columns: [{}, {}, {}],
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
  const nextNewline = docText.indexOf('\n', offset);
  return nextNewline === -1 ? docText.length : nextNewline;
}
