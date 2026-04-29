import type { TableModel, TableCell, TableColumn } from '../../model/TableModel';
import { separatorToAlign } from './pipeTableAlignment';

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function parsePipeTable(source: string, tableId = ''): ParseResult<TableModel> {
  const allLines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  // Keep only pipe table lines
  const lines = allLines.map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2) {
    return { ok: false, message: 'Not a valid pipe table: need at least a header and a separator row' };
  }

  const headerCells = splitCells(lines[0]);
  const separatorCells = splitCells(lines[1]);

  // Validate separator row
  if (!separatorCells.every(s => /^:?-+:?$/.test(s.trim()))) {
    return { ok: false, message: 'Not a valid pipe table: second row must be an alignment separator row' };
  }

  const colCount = headerCells.length;

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
  // Remove leading and trailing |, then split on |
  const inner = line.replace(/^\|/, '').replace(/\|$/, '');
  // Split on | that are not preceded by backslash
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '|' && (i === 0 || inner[i - 1] !== '\\')) {
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
