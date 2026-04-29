import type { TableModel, TableCell } from './TableModel';

export type UnmergeResult =
  | { success: true; model: TableModel }
  | { success: false; error: string };

export function unmergeCell(
  model: TableModel,
  row: number,
  col: number
): UnmergeResult {
  const rowCount = model.rows.length;
  const colCount = model.rows[0]?.length ?? 0;

  if (row < 0 || row >= rowCount || col < 0 || col >= colCount) {
    return { success: false, error: 'Cell position is out of bounds' };
  }

  const cell = model.rows[row][col];

  if (cell.hidden) {
    return { success: false, error: 'Cannot unmerge a hidden cell. Select the source cell.' };
  }

  if (cell.rowspan === 1 && cell.colspan === 1) {
    return { success: false, error: 'Cell is not merged' };
  }

  const endRow = row + cell.rowspan - 1;
  const endCol = col + cell.colspan - 1;

  const newRows: TableCell[][] = model.rows.map((r, rIdx) =>
    r.map((c, cIdx) => {
      if (rIdx === row && cIdx === col) {
        return { ...c, rowspan: 1, colspan: 1 };
      }
      if (rIdx >= row && rIdx <= endRow && cIdx >= col && cIdx <= endCol) {
        return { ...c, rowspan: 1, colspan: 1, hidden: false, text: '' };
      }
      return c;
    })
  );

  return { success: true, model: { ...model, rows: newRows } };
}
