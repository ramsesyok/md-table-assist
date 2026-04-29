import type { TableModel } from './TableModel';

export type ExtensionToWebviewMessage =
  | { type: 'load'; table: TableModel; mode: 'new' | 'comment-block' | 'plain-spantable' }
  | { type: 'extension-error'; message: string };

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'apply'; table: TableModel }
  | { type: 'error'; message: string };
