import { describe, it, expect } from 'vitest';
import { parsePipeTable } from './parsePipeTable';
import { serializePipeTable } from './serializePipeTable';

describe('parsePipeTable', () => {
  it('parses a simple pipe table', () => {
    const source = '| A | B | C |\n| --- | --- | --- |\n| D | E | F |';
    const result = parsePipeTable(source, 'tbl-001');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;
    expect(model.format).toBe('pipeTable');
    expect(model.id).toBe('tbl-001');
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0][0].text).toBe('A');
    expect(model.rows[0][0].header).toBe(true);
    expect(model.rows[1][0].text).toBe('D');
    expect(model.rows[1][0].rowspan).toBe(1);
    expect(model.rows[1][0].colspan).toBe(1);
    expect(model.rows[1][0].hidden).toBe(false);
  });

  it('parses alignment from separator row', () => {
    const source = '| 項目 | 内容 | 数値 |\n| :--- | :---: | ---: |\n| A | X | 100 |';
    const result = parsePipeTable(source, 'tbl-002');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;
    expect(model.columns[0].align).toBe('left');
    expect(model.columns[1].align).toBe('center');
    expect(model.columns[2].align).toBe('right');
  });

  it('parses table with no alignment (undefined)', () => {
    const source = '| A | B |\n| --- | --- |\n| C | D |';
    const result = parsePipeTable(source, 'tbl-003');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns[0].align).toBeUndefined();
    expect(result.value.columns[1].align).toBeUndefined();
  });

  it('unescapes \\| in cell text', () => {
    const source = '| A\\|B | C |\n| --- | --- |\n| D | E |';
    const result = parsePipeTable(source, 'tbl-004');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[0][0].text).toBe('A|B');
  });

  it('parses GFM tables without leading and trailing pipes', () => {
    const source = 'A | B | C\n--- | :---: | ---:\nD | E | F';
    const result = parsePipeTable(source, 'tbl-gfm');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[0][0].text).toBe('A');
    expect(result.value.rows[1][2].text).toBe('F');
    expect(result.value.columns[1].align).toBe('center');
  });

  it('returns error when GFM header and separator cell counts differ', () => {
    const source = '| A | B |\n| --- |\n| C | D |';
    const result = parsePipeTable(source, 'tbl-broken');
    expect(result.ok).toBe(false);
  });

  it('pads short body rows and ignores excess body cells like GFM', () => {
    const source = '| A | B |\n| --- | --- |\n| C |\n| D | E | F |';
    const result = parsePipeTable(source, 'tbl-variable');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows[1][1].text).toBe('');
    expect(result.value.rows[2]).toHaveLength(2);
    expect(result.value.rows[2][1].text).toBe('E');
  });

  it('returns error for table with fewer than 2 lines', () => {
    const result = parsePipeTable('| A | B |', 'tbl-005');
    expect(result.ok).toBe(false);
  });

  it('returns error when second row is not a separator', () => {
    const source = '| A | B |\n| X | Y |\n| C | D |';
    const result = parsePipeTable(source, 'tbl-006');
    expect(result.ok).toBe(false);
  });

  it('round-trips with serializePipeTable', () => {
    const source = '| A | B | C |\n| :--- | :---: | ---: |\n| D | E | F |';
    const parsed = parsePipeTable(source, 'tbl-007');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const serialized = serializePipeTable(parsed.value);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;
    expect(serialized.value).toBe(source);
  });
});
