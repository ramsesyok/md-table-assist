import React, { useState, useCallback, useEffect } from 'react';
import type { TableModel, TableCell } from '../model/TableModel';
import { mergeCells } from '../model/mergeCells';
import { unmergeCell } from '../model/unmergeCell';
import { normalizeTableModel } from '../model/normalizeTableModel';
import { parseTsv } from '../model/parseTsv';
import { serializeSpantable } from '../formats/spantable/serializeSpantable';
import { CellView } from './CellView';
import { Toolbar } from './Toolbar';

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface TableEditorProps {
  vscode: { postMessage(msg: unknown): void };
}

function makeEmptyTable(): TableModel {
  const rows: TableCell[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: TableCell[] = [];
    for (let c = 0; c < 3; c++) {
      row.push({ id: `r${r}c${c}`, text: '', row: r, col: c, rowspan: 1, colspan: 1, hidden: false });
    }
    rows.push(row);
  }
  return { id: '', format: 'spantable', version: 1, rows };
}

export function TableEditor({ vscode }: TableEditorProps): React.ReactElement {
  const [table, setTable] = useState<TableModel>(makeEmptyTable);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Listen for messages from extension host
  useEffect(() => {
    function handler(event: MessageEvent): void {
      const msg = event.data as { type: string; table?: TableModel; message?: string };
      if (msg.type === 'load' && msg.table) {
        const loaded = normalizeTableModel(msg.table);
        setTable(loaded);
        setSelection(null);
        setErrorMsg(null);
      } else if (msg.type === 'extension-error' && msg.message) {
        setErrorMsg(msg.message);
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  function showError(msg: string): void {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  }

  // Cell selection
  const handleSelect = useCallback((row: number, col: number, extend: boolean): void => {
    setErrorMsg(null);
    if (!extend || !selection) {
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    } else {
      setSelection(prev => prev
        ? { ...prev, endRow: row, endCol: col }
        : { startRow: row, startCol: col, endRow: row, endCol: col }
      );
    }
  }, [selection]);

  function isCellSelected(row: number, col: number): boolean {
    if (!selection) return false;
    const minR = Math.min(selection.startRow, selection.endRow);
    const maxR = Math.max(selection.startRow, selection.endRow);
    const minC = Math.min(selection.startCol, selection.endCol);
    const maxC = Math.max(selection.startCol, selection.endCol);
    return row >= minR && row <= maxR && col >= minC && col <= maxC;
  }

  // Cell text change
  const handleTextChange = useCallback((row: number, col: number, text: string): void => {
    setTable(prev => {
      const newRows = prev.rows.map((r, ri) =>
        r.map((c, ci) => (ri === row && ci === col) ? { ...c, text } : c)
      );
      return { ...prev, rows: newRows };
    });
  }, []);

  // Paste from Excel (TSV) — window-level listener so it fires regardless of which element has focus
  useEffect(() => {
    function handlePaste(e: ClipboardEvent): void {
      // If a cell input is being edited, let the browser handle it normally (single-cell paste)
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      const tsv = e.clipboardData?.getData('text/plain') ?? '';
      if (!tsv.includes('\t') && !tsv.includes('\n')) return; // not a grid paste
      e.preventDefault();
      const parsed = parseTsv(tsv);
      setTable(prev => normalizeTableModel({ ...parsed, id: prev.id, caption: prev.caption, className: prev.className }));
      setSelection(null);
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Add/Delete row/col
  function addRow(): void {
    setTable(prev => {
      const colCount = prev.rows[0]?.length ?? 1;
      const newRow: TableCell[] = Array.from({ length: colCount }, (_, c) => ({
        id: `r${prev.rows.length}c${c}`,
        text: '', row: prev.rows.length, col: c,
        rowspan: 1, colspan: 1, hidden: false
      }));
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  }

  function deleteRow(): void {
    setTable(prev => {
      if (prev.rows.length <= 1) return prev;
      const targetRow = selection ? Math.max(selection.startRow, selection.endRow) : prev.rows.length - 1;
      const newRows = prev.rows.filter((_, i) => i !== targetRow)
        .map((row, r) => row.map(c => ({ ...c, row: r })));
      return normalizeTableModel({ ...prev, rows: newRows });
    });
    setSelection(null);
  }

  function addCol(): void {
    setTable(prev => {
      const newRows = prev.rows.map((row, r) => [
        ...row,
        { id: `r${r}c${row.length}`, text: '', row: r, col: row.length, rowspan: 1, colspan: 1, hidden: false }
      ]);
      return { ...prev, rows: newRows };
    });
  }

  function deleteCol(): void {
    setTable(prev => {
      const colCount = prev.rows[0]?.length ?? 0;
      if (colCount <= 1) return prev;
      const targetCol = selection ? Math.max(selection.startCol, selection.endCol) : colCount - 1;
      const newRows = prev.rows.map((row, r) =>
        row.filter((_, c) => c !== targetCol)
          .map((cell, c) => ({ ...cell, col: c }))
      );
      return normalizeTableModel({ ...prev, rows: newRows });
    });
    setSelection(null);
  }

  function handleMerge(): void {
    if (!selection) { showError('Select a range of cells to merge.'); return; }
    const { startRow, startCol, endRow, endCol } = selection;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);
    const result = mergeCells(table, minR, minC, maxR, maxC);
    if (result.success) {
      setTable(result.model);
      setSelection({ startRow: minR, startCol: minC, endRow: minR, endCol: minC });
    } else {
      showError(result.error);
    }
  }

  function handleUnmerge(): void {
    if (!selection) { showError('Select a merged cell to unmerge.'); return; }
    const row = Math.min(selection.startRow, selection.endRow);
    const col = Math.min(selection.startCol, selection.endCol);
    const result = unmergeCell(table, row, col);
    if (result.success) {
      setTable(result.model);
    } else {
      showError(result.error);
    }
  }

  function handleApply(): void {
    const final: TableModel = { ...table, caption: table.caption, className: table.className };
    vscode.postMessage({ type: 'apply', table: final });
  }

  const previewMarkdown = showPreview ? serializeSpantable(table) : null;

  return (
    <div>
      <Toolbar
        caption={table.caption ?? ''}
        className={table.className ?? ''}
        showPreview={showPreview}
        errorMsg={errorMsg}
        onCaptionChange={v => setTable(prev => ({ ...prev, caption: v || undefined }))}
        onClassNameChange={v => setTable(prev => ({ ...prev, className: v || undefined }))}
        onAddRow={addRow}
        onDeleteRow={deleteRow}
        onAddCol={addCol}
        onDeleteCol={deleteCol}
        onMerge={handleMerge}
        onUnmerge={handleUnmerge}
        onTogglePreview={() => setShowPreview(p => !p)}
        onApply={handleApply}
      />

      <div className="table-wrapper">
        <table className="editor-table">
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => (
                  <CellView
                    key={cell.id || `${rowIdx}-${colIdx}`}
                    cell={cell}
                    selected={isCellSelected(rowIdx, colIdx)}
                    onSelect={handleSelect}
                    onTextChange={handleTextChange}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPreview && previewMarkdown !== null && (
        <div className="preview-panel">
          <h3>Markdown Preview</h3>
          <pre>{previewMarkdown}</pre>
        </div>
      )}
    </div>
  );
}
