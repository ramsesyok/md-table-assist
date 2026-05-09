import type { TableModel, TableCell, TableColumn } from '../../model/TableModel';
import { separatorToAlign } from './pipeTableAlignment';

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function parsePipeTable(source: string, tableId = ''): ParseResult<TableModel> {
  const allLines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = allLines.map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return { ok: false, message: 'Not a valid pipe table: need at least a header and a separator row' };
  }

  const headerCells = splitCells(lines[0]);
  const separatorCells = splitCells(lines[1]);

  // Validate separator row
  if (!separatorCells.every(isSeparatorCell)) {
    return { ok: false, message: 'Not a valid pipe table: second row must be an alignment separator row' };
  }

  const colCount = headerCells.length;
  if (colCount !== separatorCells.length) {
    return { ok: false, message: 'Not a valid GFM table: header and separator rows must have the same number of cells' };
  }

  const columns: TableColumn[] = Array.from({ length: colCount }, (_, i) => ({
    align: separatorToAlign(separatorCells[i] ?? '')
  }));

  const rows: TableCell[][] = [];

  // Header row (index 0 in the model)
  rows.push(headerCells.map((text, c) => ({
    id: `r0c${c}`,
    text: unescapeCell(text),
    row: 0,
    col: c,
    rowspan: 1,
    colspan: 1,
    hidden: false,
    header: true
  })));

  // Data rows start at lines[2] (lines[1] is separator)
  for (let li = 2; li < lines.length; li++) {
    const rowIdx = li - 1; // row 1, 2, ... in the model
    const cells = splitCells(lines[li]);
    // Pad to colCount if needed
    const padded: string[] = Array.from({ length: colCount }, (_, c) => cells[c] ?? '');
    rows.push(padded.map((text, c) => ({
      id: `r${rowIdx}c${c}`,
      text: unescapeCell(text),
      row: rowIdx,
      col: c,
      rowspan: 1,
      colspan: 1,
      hidden: false
    })));
  }

  return {
    ok: true,
    value: {
      id: tableId,
      format: 'pipeTable',
      version: 1,
      columns,
      rows
    }
  };
}

function splitCells(line: string): string[] {
  // GFM allows leading and trailing pipes, but does not require them.
  const trimmed = line.trim();
  let inner = trimmed;
  if (inner.startsWith('|')) {
    inner = inner.slice(1);
  }
  if (inner.endsWith('|') && !isEscaped(inner, inner.length - 1)) {
    inner = inner.slice(0, -1);
  }

  // Split on pipes that are not escaped with a backslash.
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '|' && !isEscaped(inner, i)) {
      parts.push(current.trim());
      current = '';
    } else {
      current += inner[i];
    }
  }
  parts.push(current.trim());
  return parts;
}

function unescapeCell(text: string): string {
  return text.replace(/\\\|/g, '|');
}

function isSeparatorCell(text: string): boolean {
  // GitHub's user-facing docs require at least three hyphens per delimiter cell.
  return /^:?-{3,}:?$/.test(text.trim());
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
}
