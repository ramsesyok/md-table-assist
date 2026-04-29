import type { TableModel, TableSerializer } from '../../model/TableModel';
import { escapeMarkdownCell, escapeAttributeValue } from './escapeMarkdownCell';

export function serializeSpantable(model: TableModel): string {
  const parts: string[] = [];

  // Build directive line
  let directive = '::spantable::';
  if (model.caption) {
    directive += ` caption="${escapeAttributeValue(model.caption)}"`;
  }
  if (model.className) {
    directive += ` class="${escapeAttributeValue(model.className)}"`;
  }
  parts.push(directive);
  parts.push('');

  if (model.rows.length === 0) {
    parts.push('');
    parts.push('::end-spantable::');
    return parts.join('\n');
  }

  // Compute column widths for alignment
  const colCount = model.rows[0].length;
  const colWidths: number[] = new Array(colCount).fill(3);

  for (const row of model.rows) {
    for (const cell of row) {
      if (cell.hidden) continue;
      const cellText = buildCellContent(cell.text, cell.rowspan > 1 || cell.colspan > 1);
      const escaped = escapeMarkdownCell(cellText);
      if (cell.colspan > 1) {
        // For spanning cells the visual width is distributed across columns;
        // just ensure the source column is wide enough
        colWidths[cell.col] = Math.max(colWidths[cell.col], escaped.length);
      } else {
        colWidths[cell.col] = Math.max(colWidths[cell.col], escaped.length);
      }
    }
  }

  // Determine if first row is a header row
  const hasHeader = model.rows[0].some(c => c.header);

  for (let rowIdx = 0; rowIdx < model.rows.length; rowIdx++) {
    const row = model.rows[rowIdx];
    const cells: string[] = [];

    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const cell = row[colIdx];
      if (cell.hidden) {
        cells.push(' '.repeat(colWidths[colIdx]));
        continue;
      }
      const isSpan = cell.rowspan > 1 || cell.colspan > 1;
      const raw = buildCellContent(cell.text, isSpan);
      const escaped = escapeMarkdownCell(raw);
      // For cells spanning multiple columns, pad to the natural width only
      cells.push(escaped.padEnd(colWidths[colIdx]));
    }

    parts.push('| ' + cells.join(' | ') + ' |');

    // Emit separator after header row (row 0 if hasHeader, else also after row 0)
    if (rowIdx === 0) {
      const sep = colWidths.map(w => '-'.repeat(w));
      parts.push('| ' + sep.join(' | ') + ' |');
    }
  }

  parts.push('');
  parts.push('::end-spantable::');

  return parts.join('\n');
}

function buildCellContent(text: string, isSpan: boolean): string {
  if (isSpan) {
    return text ? `${text} @span` : '@span';
  }
  return text;
}

export class SpantableSerializer implements TableSerializer {
  serialize(table: TableModel): string {
    return serializeSpantable(table);
  }
}
