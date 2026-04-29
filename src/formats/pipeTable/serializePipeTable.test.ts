import { describe, it, expect } from 'vitest';
import { serializePipeTable } from './serializePipeTable';
import type { TableModel } from '../../model/TableModel';

function makeModel(rows: string[][], columns: Array<{ align?: 'left' | 'center' | 'right' }> = []): TableModel {
  const colCount = rows[0]?.length ?? 0;
  return {
    id: 'test',
    format: 'pipeTable',
    version: 1,
    columns: Array.from({ length: colCount }, (_, i) => columns[i] ?? {}),
    rows: rows.map((row, r) =>
      row.map((text, c) => ({
        id: `r${r}c${c}`,
        text,
        row: r,
        col: c,
        rowspan: 1,
        colspan: 1,
        hidden: false,
        header: r === 0
      }))
    )
  };
}

describe('serializePipeTable', () => {
  it('serializes a simple table without alignment', () => {
    const model = makeModel([['A', 'B', 'C'], ['D', 'E', 'F']]);
    const result = serializePipeTable(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(
      '| A | B | C |\n' +
      '| --- | --- | --- |\n' +
      '| D | E | F |'
    );
  });

  it('serializes a table with alignment', () => {
    const model = makeModel(
      [['項目', '内容', '数値'], ['A', 'X', '100']],
      [{ align: 'left' }, { align: 'center' }, { align: 'right' }]
    );
    const result = serializePipeTable(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(
      '| 項目 | 内容 | 数値 |\n' +
      '| :--- | :---: | ---: |\n' +
      '| A | X | 100 |'
    );
  });

  it('escapes pipe characters in cells', () => {
    const model = makeModel([['A|B', 'C'], ['D', 'E']]);
    const result = serializePipeTable(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('A\\|B');
  });

  it('returns error when a cell has colspan > 1', () => {
    const model: TableModel = {
      id: 'test',
      format: 'pipeTable',
      version: 1,
      columns: [{}, {}],
      rows: [[
        { id: 'r0c0', text: 'A', row: 0, col: 0, rowspan: 1, colspan: 2, hidden: false },
        { id: 'r0c1', text: '', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: true }
      ]]
    };
    const result = serializePipeTable(model);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/結合セル/);
  });

  it('returns error when a cell has rowspan > 1', () => {
    const model: TableModel = {
      id: 'test',
      format: 'pipeTable',
      version: 1,
      columns: [{}],
      rows: [
        [{ id: 'r0c0', text: 'A', row: 0, col: 0, rowspan: 2, colspan: 1, hidden: false }],
        [{ id: 'r1c0', text: '', row: 1, col: 0, rowspan: 1, colspan: 1, hidden: true }]
      ]
    };
    const result = serializePipeTable(model);
    expect(result.ok).toBe(false);
  });

  it('returns error when a cell is hidden', () => {
    const model: TableModel = {
      id: 'test',
      format: 'pipeTable',
      version: 1,
      columns: [{}, {}],
      rows: [[
        { id: 'r0c0', text: 'A', row: 0, col: 0, rowspan: 1, colspan: 1, hidden: false },
        { id: 'r0c1', text: '', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: true }
      ]]
    };
    const result = serializePipeTable(model);
    expect(result.ok).toBe(false);
  });

  it('returns ok with empty string for empty table', () => {
    const model: TableModel = {
      id: 'test', format: 'pipeTable', version: 1, columns: [], rows: []
    };
    const result = serializePipeTable(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('');
  });
});
