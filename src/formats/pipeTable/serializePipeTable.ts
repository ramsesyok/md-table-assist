import type { TableModel } from '../../model/TableModel';
import { alignToSeparator } from './pipeTableAlignment';
import { escapeMarkdownCell } from '../spantable/escapeMarkdownCell';

export type SerializeResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function serializePipeTable(model: TableModel): SerializeResult {
  for (const row of model.rows) {
    for (const cell of row) {
      if (cell.hidden || cell.rowspan > 1 || cell.colspan > 1) {
        return {
          ok: false,
          message: 'Pipe Table形式では結合セルを保存できません。結合を解除するか、mdxSpannerまたはspantable形式を選択してください。'
        };
      }
    }
  }

  if (model.rows.length === 0) {
    return { ok: true, value: '' };
  }

  const colCount = model.rows[0].length;
  const lines: string[] = [];

  // Header row (row 0)
  const headerCells = model.rows[0].map(cell => escapeAndNormalize(cell.text));
  lines.push('| ' + headerCells.join(' | ') + ' |');

  // Separator row with alignment
  const separators = Array.from({ length: colCount }, (_, i) =>
    alignToSeparator(model.columns[i]?.align)
  );
  lines.push('| ' + separators.join(' | ') + ' |');

  // Data rows
  for (let r = 1; r < model.rows.length; r++) {
    const cells = model.rows[r].map(cell => escapeAndNormalize(cell.text));
    lines.push('| ' + cells.join(' | ') + ' |');
  }

  return { ok: true, value: lines.join('\n') };
}

function escapeAndNormalize(text: string): string {
  return escapeMarkdownCell(text.replace(/\n/g, ' '));
}
