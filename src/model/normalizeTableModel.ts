import type { TableModel, TableCell, TableColumn } from './TableModel';

export function normalizeTableModel(model: TableModel): TableModel {
  // Normalize columns array
  const colCount = model.rows.length > 0
    ? Math.max(...model.rows.map(r => r.length))
    : (model.columns?.length ?? 0);

  const existingColumns: TableColumn[] = model.columns ?? [];
  const columns: TableColumn[] = Array.from({ length: colCount }, (_, i) =>
    existingColumns[i] ?? {}
  );

  if (model.rows.length === 0) {
    return { ...model, columns, rows: [] };
  }

  const rows: TableCell[][] = model.rows.map((row, rowIdx) => {
    const normalized: TableCell[] = [];
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const existing = row[colIdx];
      if (existing) {
        normalized.push({
          ...existing,
          id: existing.id || `r${rowIdx}c${colIdx}`,
          rowspan: Math.max(1, existing.rowspan),
          colspan: Math.max(1, existing.colspan)
        });
      } else {
        normalized.push({
          id: `r${rowIdx}c${colIdx}`,
          text: '',
          row: rowIdx,
          col: colIdx,
          rowspan: 1,
          colspan: 1,
          hidden: false
        });
      }
    }
    return normalized;
  });

  return { ...model, columns, rows };
}
