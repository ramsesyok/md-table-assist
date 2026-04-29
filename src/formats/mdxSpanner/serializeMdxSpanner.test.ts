import { describe, it, expect } from 'vitest';
import { serializeMdxSpanner } from './serializeMdxSpanner';
import type { TableModel } from '../../model/TableModel';

function makeSimpleModel(rows: string[][]): TableModel {
  const colCount = rows[0]?.length ?? 0;
  return {
    id: 'test',
    format: 'mdxSpanner',
    version: 1,
    columns: Array.from({ length: colCount }, () => ({})),
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

describe('serializeMdxSpanner', () => {
  it('serializes a simple table without merges', () => {
    const model = makeSimpleModel([['A', 'B'], ['C', 'D']]);
    const result = serializeMdxSpanner(model);
    expect(result).toBe('| A | B |\n| --- | --- |\n| C | D |');
  });

  it('serializes with alignment', () => {
    const model: TableModel = {
      id: 'test',
      format: 'mdxSpanner',
      version: 1,
      columns: [{ align: 'left' }, { align: 'center' }, { align: 'right' }],
      rows: [
        [
          { id: 'r0c0', text: 'A', row: 0, col: 0, rowspan: 1, colspan: 1, hidden: false },
          { id: 'r0c1', text: 'B', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: false },
          { id: 'r0c2', text: 'C', row: 0, col: 2, rowspan: 1, colspan: 1, hidden: false }
        ],
        [
          { id: 'r1c0', text: '1', row: 1, col: 0, rowspan: 1, colspan: 1, hidden: false },
          { id: 'r1c1', text: '2', row: 1, col: 1, rowspan: 1, colspan: 1, hidden: false },
          { id: 'r1c2', text: '3', row: 1, col: 2, rowspan: 1, colspan: 1, hidden: false }
        ]
      ]
    };
    const result = serializeMdxSpanner(model);
    expect(result).toContain('| :--- | :---: | ---: |');
  });

  it('serializes colspan with > marker', () => {
    const model: TableModel = {
      id: 'test',
      format: 'mdxSpanner',
      version: 1,
      columns: [{}, {}],
      rows: [
        [
          { id: 'r0c0', text: 'Merged', row: 0, col: 0, rowspan: 1, colspan: 2, hidden: false },
          { id: 'r0c1', text: '', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: true }
        ],
        [
          { id: 'r1c0', text: 'A', row: 1, col: 0, rowspan: 1, colspan: 1, hidden: false },
          { id: 'r1c1', text: 'B', row: 1, col: 1, rowspan: 1, colspan: 1, hidden: false }
        ]
      ]
    };
    const result = serializeMdxSpanner(model);
    expect(result).toContain('| Merged | > |');
    expect(result).toContain('| A | B |');
  });

  it('serializes rowspan with ^ marker', () => {
    const model: TableModel = {
      id: 'test',
      format: 'mdxSpanner',
      version: 1,
      columns: [{}, {}],
      rows: [
        [
          { id: 'r0c0', text: 'Tall', row: 0, col: 0, rowspan: 2, colspan: 1, hidden: false },
          { id: 'r0c1', text: 'B', row: 0, col: 1, rowspan: 1, colspan: 1, hidden: false }
        ],
        [
          { id: 'r1c0', text: '', row: 1, col: 0, rowspan: 1, colspan: 1, hidden: true },
          { id: 'r1c1', text: 'C', row: 1, col: 1, rowspan: 1, colspan: 1, hidden: false }
        ]
      ]
    };
    const result = serializeMdxSpanner(model);
    expect(result).toContain('| Tall | B |');
    expect(result).toContain('| ^ | C |');
  });

  it('returns empty string for empty table', () => {
    const model: TableModel = {
      id: 'test', format: 'mdxSpanner', version: 1, columns: [], rows: []
    };
    expect(serializeMdxSpanner(model)).toBe('');
  });
});
