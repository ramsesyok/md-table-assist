import { describe, it, expect } from 'vitest';
import { normalizeTableModel } from './normalizeTableModel';
import type { TableModel } from './TableModel';

function makeModel(rows: Array<Array<{ text: string }>>): TableModel {
  return {
    id: 'test',
    format: 'spantable',
    version: 1,
    rows: rows.map((row, r) =>
      row.map((cell, c) => ({
        id: `r${r}c${c}`,
        text: cell.text,
        row: r,
        col: c,
        rowspan: 1,
        colspan: 1,
        hidden: false
      }))
    )
  };
}

describe('normalizeTableModel', () => {
  it('pads shorter rows to match the longest row', () => {
    const model: TableModel = {
      id: 'test',
      format: 'spantable',
      version: 1,
      rows: [
        [{ id: 'r0c0', text: 'A', row: 0, col: 0, rowspan: 1, colspan: 1, hidden: false },
         { id: 'r0c1', text: 'B', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: false },
         { id: 'r0c2', text: 'C', row: 0, col: 2, rowspan: 1, colspan: 1, hidden: false }],
        [{ id: 'r1c0', text: 'D', row: 1, col: 0, rowspan: 1, colspan: 1, hidden: false }]
      ]
    };
    const result = normalizeTableModel(model);
    expect(result.rows[1].length).toBe(3);
    expect(result.rows[1][1].text).toBe('');
    expect(result.rows[1][2].text).toBe('');
  });

  it('fills missing id with row/col based id', () => {
    const model: TableModel = {
      id: 'test',
      format: 'spantable',
      version: 1,
      rows: [[{ id: '', text: 'X', row: 0, col: 0, rowspan: 1, colspan: 1, hidden: false }]]
    };
    const result = normalizeTableModel(model);
    expect(result.rows[0][0].id).toBe('r0c0');
  });

  it('clamps rowspan/colspan to at least 1', () => {
    const model: TableModel = {
      id: 'test',
      format: 'spantable',
      version: 1,
      rows: [[{ id: 'r0c0', text: 'X', row: 0, col: 0, rowspan: 0, colspan: -1, hidden: false }]]
    };
    const result = normalizeTableModel(model);
    expect(result.rows[0][0].rowspan).toBe(1);
    expect(result.rows[0][0].colspan).toBe(1);
  });

  it('returns empty rows unchanged', () => {
    const model = makeModel([]);
    const result = normalizeTableModel(model);
    expect(result.rows).toEqual([]);
  });

  it('is idempotent', () => {
    const model = makeModel([[{ text: 'A' }, { text: 'B' }], [{ text: 'C' }, { text: 'D' }]]);
    const once = normalizeTableModel(model);
    const twice = normalizeTableModel(once);
    expect(twice).toEqual(once);
  });
});
