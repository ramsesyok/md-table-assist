import type { TableModel } from './TableModel';

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateTableModel(model: TableModel): ValidationResult {
  const errors: string[] = [];

  if (model.rows.length === 0) {
    return { valid: true, errors: [] };
  }

  const colCount = model.rows[0].length;
  for (let r = 0; r < model.rows.length; r++) {
    if (model.rows[r].length !== colCount) {
      errors.push(`Row ${r} has ${model.rows[r].length} columns, expected ${colCount}`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  const rowCount = model.rows.length;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = model.rows[r][c];

      if (cell.hidden) {
        if (cell.rowspan > 1 || cell.colspan > 1) {
          errors.push(`Hidden cell at (${r},${c}) must not have rowspan/colspan > 1`);
        }
        continue;
      }

      if (cell.rowspan < 1 || cell.colspan < 1) {
        errors.push(`Cell at (${r},${c}) has invalid rowspan/colspan`);
        continue;
      }

      if (r + cell.rowspan - 1 >= rowCount || c + cell.colspan - 1 >= colCount) {
        errors.push(`Cell at (${r},${c}) span exceeds table bounds`);
        continue;
      }

      if (cell.rowspan > 1 || cell.colspan > 1) {
        for (let dr = 0; dr < cell.rowspan; dr++) {
          for (let dc = 0; dc < cell.colspan; dc++) {
            if (dr === 0 && dc === 0) continue;
            const covered = model.rows[r + dr][c + dc];
            if (!covered.hidden) {
              errors.push(`Cell at (${r},${c}) span covers non-hidden cell at (${r + dr},${c + dc})`);
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
