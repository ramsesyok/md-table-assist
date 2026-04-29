import type { TableModel, TableCell, TableColumn } from '../../model/TableModel';
import { separatorToAlign } from '../pipeTable/pipeTableAlignment';
import { isMdxSpannerColspanMarker, isMdxSpannerRowspanMarker } from './mdxSpannerMarkers';

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function parseMdxSpanner(source: string, tableId = ''): ParseResult<TableModel> {
  const allLines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = allLines.map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2) {
    return { ok: false, message: 'Not a valid mdxSpanner table: need at least a header and a separator row' };
  }

  const headerCells = splitCells(lines[0]);
  const separatorCells = splitCells(lines[1]);

  if (!separatorCells.every(s => /^:?-+:?$/.test(s.trim()))) {
    return { ok: false, message: 'Not a valid mdxSpanner table: second row must be an alignment separator row' };
  }

  const colCount = headerCells.length;

  const columns: TableColumn[] = Array.from({ length: colCount }, (_, i) => ({
    align: separatorToAlign(separatorCells[i] ?? '')
  }));

  // Build raw text grid (header + data rows, skip separator at index 1)
  const rawRows: string[][] = [];
  rawRows.push(headerCells);
  for (let li = 2; li < lines.length; li++) {
    const cells = splitCells(lines[li]);
    rawRows.push(Array.from({ length: colCount }, (_, c) => cells[c] ?? ''));
  }

  const rowCount = rawRows.length;

  // Initialize cell grid with rowspan/colspan = 1
  const cells: TableCell[][] = rawRows.map((rawRow, r) =>
    rawRow.map((text, c) => ({
      id: `r${r}c${c}`,
      text: unescapeCell(text),
      row: r,
      col: c,
      rowspan: 1,
      colspan: 1,
      hidden: false,
      header: r === 0
    }))
  );

  // Pass 1: resolve colspan markers (>)
  // For each > marker, increase colspan of the nearest non-> source to the left
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (!isMdxSpannerColspanMarker(rawRows[r][c])) continue;
      // Find source: scan left for first non-marker, non-hidden cell
      let sourceCol = c - 1;
      while (sourceCol >= 0 && isMdxSpannerColspanMarker(rawRows[r][sourceCol])) {
        sourceCol--;
      }
      if (sourceCol < 0) {
        return { ok: false, message: `Invalid colspan marker at row ${r}, col ${c}: no source cell to the left` };
      }
      cells[r][sourceCol].colspan = c - sourceCol + 1;
      cells[r][c].hidden = true;
      cells[r][c].text = '';
    }
  }

  // Pass 2: resolve rowspan markers (^)
  // For each ^ marker, increase rowspan of the nearest non-^ source above
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (!isMdxSpannerRowspanMarker(rawRows[r][c])) continue;
      // Find source: scan up for first non-marker, non-hidden cell
      let sourceRow = r - 1;
      while (sourceRow >= 0 && isMdxSpannerRowspanMarker(rawRows[sourceRow][c])) {
        sourceRow--;
      }
      if (sourceRow < 0) {
        return { ok: false, message: `Invalid rowspan marker at row ${r}, col ${c}: no source cell above` };
      }
      cells[sourceRow][c].rowspan = r - sourceRow + 1;
      cells[r][c].hidden = true;
      cells[r][c].text = '';
    }
  }

  return {
    ok: true,
    value: {
      id: tableId,
      format: 'mdxSpanner',
      version: 1,
      columns,
      rows: cells
    }
  };
}

function splitCells(line: string): string[] {
  const inner = line.replace(/^\|/, '').replace(/\|$/, '');
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
