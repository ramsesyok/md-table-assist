import type { TableModel, TableCell } from './TableModel';

export type MergeResult =
  | { success: true; model: TableModel }
  | { success: false; error: string };

export function mergeCells(
  model: TableModel,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): MergeResult {
  const rowCount = model.rows.length;
  const colCount = model.rows[0]?.length ?? 0;

  if (
    startRow < 0 || startCol < 0 ||
    endRow >= rowCount || endCol >= colCount ||
    startRow > endRow || startCol > endCol
  ) {
    return { success: false, error: 'Selection is out of bounds' };
  }

  if (startRow === endRow && startCol === endCol) {
    return { success: false, error: 'Cannot merge a single cell' };
  }

  // Check no partial overlap with existing merged cells
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = model.rows[r][c];

      // A hidden cell inside our selection is fine only if its source cell
      // is also fully inside our selection
      if (cell.hidden) {
        const source = findSourceCell(model, r, c);
        if (!source) return { success: false, error: `No source cell found for hidden cell at (${r},${c})` };
        if (
          source.row < startRow || source.row > endRow ||
          source.col < startCol || source.col > endCol
        ) {
          return { success: false, error: 'Selection partially overlaps an existing merged cell' };
        }
        continue;
      }

      // A visible source cell with span that extends outside our selection is a partial overlap
      if (cell.rowspan > 1 || cell.colspan > 1) {
        const cellEndRow = cell.row + cell.rowspan - 1;
        const cellEndCol = cell.col + cell.colspan - 1;
        if (cellEndRow > endRow || cellEndCol > endCol) {
          return { success: false, error: 'Selection partially overlaps an existing merged cell' };
        }
      }
    }
  }

  const newRowspan = endRow - startRow + 1;
  const newColspan = endCol - startCol + 1;

  const newRows: TableCell[][] = model.rows.map((row, r) =>
    row.map((cell, c) => {
      if (r === startRow && c === startCol) {
        return { ...cell, rowspan: newRowspan, colspan: newColspan, hidden: false };
      }
      if (r >= startRow && r <= endRow && c >= startCol && c <= endCol) {
        return { ...cell, rowspan: 1, colspan: 1, hidden: true, text: '' };
      }
      return cell;
    })
  );

  return { success: true, model: { ...model, rows: newRows } };
}

function findSourceCell(
  model: TableModel,
  hiddenRow: number,
  hiddenCol: number
): TableCell | null {
  for (let r = 0; r <= hiddenRow; r++) {
    for (let c = 0; c <= hiddenCol; c++) {
      const cell = model.rows[r][c];
      if (!cell.hidden && cell.rowspan > 1 || !cell.hidden && cell.colspan > 1) {
        if (
          r + cell.rowspan - 1 >= hiddenRow &&
          c + cell.colspan - 1 >= hiddenCol
        ) {
          return cell;
        }
      }
    }
  }
  return null;
}
