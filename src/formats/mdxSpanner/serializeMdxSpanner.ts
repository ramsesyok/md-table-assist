import type { TableModel } from '../../model/TableModel';
import { alignToSeparator } from '../pipeTable/pipeTableAlignment';
import { escapeMarkdownCell } from '../spantable/escapeMarkdownCell';
import { toColspanMarker, toRowspanMarker } from './mdxSpannerMarkers';

export function serializeMdxSpanner(model: TableModel): string {
  if (model.rows.length === 0) return '';

  const colCount = model.rows[0].length;
  const lines: string[] = [];

  // Header row (row 0)
  const headerCells = buildRowCells(model, 0, colCount);
  lines.push('| ' + headerCells.join(' | ') + ' |');

  // Separator row with alignment
  const separators = Array.from({ length: colCount }, (_, i) =>
    alignToSeparator(model.columns[i]?.align)
  );
  lines.push('| ' + separators.join(' | ') + ' |');

  // Data rows
  for (let r = 1; r < model.rows.length; r++) {
    const cells = buildRowCells(model, r, colCount);
    lines.push('| ' + cells.join(' | ') + ' |');
  }

  return lines.join('\n');
}

function buildRowCells(model: TableModel, rowIdx: number, colCount: number): string[] {
  const row = model.rows[rowIdx];
  return Array.from({ length: colCount }, (_, c) => {
    const cell = row[c];
    if (!cell) return '';
    if (cell.hidden) {
      // Determine if this is a colspan or rowspan continuation
      const sourceRow = findSourceRow(model, rowIdx, c);
      if (sourceRow === rowIdx) {
        return toColspanMarker();
      }
      return toRowspanMarker();
    }
    return escapeMarkdownCell(cell.text.replace(/\n/g, ' '));
  });
}

// Returns the row index of the source cell that covers position (row, col).
// Returns row itself if the hidden cell is a colspan continuation in the same row.
function findSourceRow(model: TableModel, row: number, col: number): number {
  for (let r = 0; r <= row; r++) {
    for (let c = 0; c <= col; c++) {
      const cell = model.rows[r]?.[c];
      if (!cell || cell.hidden) continue;
      if (
        r <= row && row < r + cell.rowspan &&
        c <= col && col < c + cell.colspan
      ) {
        return r;
      }
    }
  }
  return row;
}
