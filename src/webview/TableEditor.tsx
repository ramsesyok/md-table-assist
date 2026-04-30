import React, { useState, useCallback, useEffect } from 'react';
import type { TableModel, TableCell, TableFormat, CellAlign } from '../model/TableModel';
import { mergeCells } from '../model/mergeCells';
import { unmergeCell } from '../model/unmergeCell';
import { normalizeTableModel } from '../model/normalizeTableModel';
import { parseTsv } from '../model/parseTsv';
import { serializeSpantable } from '../formats/spantable/serializeSpantable';
import { serializePipeTable } from '../formats/pipeTable/serializePipeTable';
import { serializeMdxSpanner } from '../formats/mdxSpanner/serializeMdxSpanner';
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

const AlignLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="2" width="12" height="1.5" rx="0.5" />
    <rect x="1" y="5.5" width="8" height="1.5" rx="0.5" />
    <rect x="1" y="9" width="10" height="1.5" rx="0.5" />
    <rect x="1" y="12.5" width="6" height="1.5" rx="0.5" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="2" width="12" height="1.5" rx="0.5" />
    <rect x="3" y="5.5" width="8" height="1.5" rx="0.5" />
    <rect x="2" y="9" width="10" height="1.5" rx="0.5" />
    <rect x="4" y="12.5" width="6" height="1.5" rx="0.5" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="2" width="12" height="1.5" rx="0.5" />
    <rect x="5" y="5.5" width="8" height="1.5" rx="0.5" />
    <rect x="3" y="9" width="10" height="1.5" rx="0.5" />
    <rect x="7" y="12.5" width="6" height="1.5" rx="0.5" />
  </svg>
);

interface AlignButtonProps {
  align: CellAlign;
  active: boolean;
  onClick: () => void;
}

function AlignButton({ align, active, onClick }: AlignButtonProps): React.ReactElement {
  const Icon = align === 'left' ? AlignLeftIcon : align === 'center' ? AlignCenterIcon : AlignRightIcon;
  const label = align === 'left' ? '左寄せ' : align === 'center' ? '中央' : '右寄せ';
  return (
    <button
      className={`col-align-btn${active ? ' col-align-btn--active' : ''}`}
      onClick={onClick}
      title={label}
    >
      <Icon />
    </button>
  );
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
  return { id: '', format: 'pipeTable', version: 1, columns: [{}, {}, {}], rows };
}

function getPreviewMarkdown(table: TableModel): string {
  const fmt = table.format;
  if (fmt === 'pipeTable') {
    const result = serializePipeTable(table);
    return result.ok ? result.value : `[Error: ${result.message}]`;
  }
  if (fmt === 'mdxSpanner') {
    return serializeMdxSpanner(table);
  }
  return serializeSpantable(table);
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

  const handleTextChange = useCallback((row: number, col: number, text: string): void => {
    setTable(prev => {
      const newRows = prev.rows.map((r, ri) =>
        r.map((c, ci) => (ri === row && ci === col) ? { ...c, text } : c)
      );
      return { ...prev, rows: newRows };
    });
  }, []);

  // Paste from Excel (TSV)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent): void {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      const tsv = e.clipboardData?.getData('text/plain') ?? '';
      if (!tsv.includes('\t') && !tsv.includes('\n')) return;
      e.preventDefault();
      const parsed = parseTsv(tsv);
      setTable(prev => normalizeTableModel({
        ...parsed,
        id: prev.id,
        format: prev.format,
        columns: prev.columns,
        caption: prev.caption,
        className: prev.className
      }));
      setSelection(null);
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

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
      const newColumns = [...prev.columns, {}];
      return { ...prev, rows: newRows, columns: newColumns };
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
      const newColumns = prev.columns.filter((_, c) => c !== targetCol);
      return normalizeTableModel({ ...prev, rows: newRows, columns: newColumns });
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

  function handleFormatChange(fmt: TableFormat): void {
    setTable(prev => ({ ...prev, format: fmt }));
  }

  function handleColumnAlignChange(colIdx: number, align: CellAlign | undefined): void {
    setTable(prev => {
      const newColumns = prev.columns.map((col, i) =>
        i === colIdx ? { ...col, align } : col
      );
      return { ...prev, columns: newColumns };
    });
  }

  function handleApply(): void {
    const final: TableModel = { ...table };
    vscode.postMessage({ type: 'apply', table: final });
  }

  const previewMarkdown = showPreview ? getPreviewMarkdown(table) : null;
  const colCount = table.rows[0]?.length ?? 0;

  return (
    <div>
      <Toolbar
        caption={table.caption ?? ''}
        className={table.className ?? ''}
        format={table.format}
        showPreview={showPreview}
        errorMsg={errorMsg}
        onCaptionChange={v => setTable(prev => ({ ...prev, caption: v || undefined }))}
        onClassNameChange={v => setTable(prev => ({ ...prev, className: v || undefined }))}
        onFormatChange={handleFormatChange}
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
          <thead>
            <tr>
              {Array.from({ length: colCount }, (_, i) => {
                const current = table.columns[i]?.align;
                return (
                  <th key={i} className="align-header">
                    <AlignButton
                      align="left"
                      active={current === 'left'}
                      onClick={() => handleColumnAlignChange(i, current === 'left' ? undefined : 'left')}
                    />
                    <AlignButton
                      align="center"
                      active={current === 'center'}
                      onClick={() => handleColumnAlignChange(i, current === 'center' ? undefined : 'center')}
                    />
                    <AlignButton
                      align="right"
                      active={current === 'right'}
                      onClick={() => handleColumnAlignChange(i, current === 'right' ? undefined : 'right')}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
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
