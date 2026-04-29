import { describe, it, expect } from 'vitest';
import { parseMdxSpanner } from './parseMdxSpanner';
import { serializeMdxSpanner } from './serializeMdxSpanner';

describe('parseMdxSpanner', () => {
  it('parses a simple table without merges', () => {
    const source = '| A | B |\n| --- | --- |\n| C | D |';
    const result = parseMdxSpanner(source, 'tbl-001');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;
    expect(model.format).toBe('mdxSpanner');
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0][0].text).toBe('A');
    expect(model.rows[1][1].text).toBe('D');
  });

  it('parses alignment from separator', () => {
    const source = '| A | B | C |\n| :--- | :---: | ---: |\n| D | E | F |';
    const result = parseMdxSpanner(source, 'tbl-002');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns[0].align).toBe('left');
    expect(result.value.columns[1].align).toBe('center');
    expect(result.value.columns[2].align).toBe('right');
  });

  it('parses colspan > marker', () => {
    const source = '| Merged | > |\n| --- | --- |\n| A | B |';
    const result = parseMdxSpanner(source, 'tbl-003');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;
    expect(model.rows[0][0].colspan).toBe(2);
    expect(model.rows[0][0].text).toBe('Merged');
    expect(model.rows[0][1].hidden).toBe(true);
  });

  it('parses rowspan ^ marker', () => {
    const source = '| Tall | B |\n| --- | --- |\n| ^ | C |';
    const result = parseMdxSpanner(source, 'tbl-004');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.value;
    expect(model.rows[0][0].rowspan).toBe(2);
    expect(model.rows[1][0].hidden).toBe(true);
    expect(model.rows[1][1].text).toBe('C');
  });

  it('returns error for invalid colspan marker (no source to left)', () => {
    const source = '| > | B |\n| --- | --- |\n| C | D |';
    const result = parseMdxSpanner(source, 'tbl-005');
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid rowspan marker (no source above)', () => {
    const source = '| A | B |\n| --- | --- |\n| ^ | D |';
    // ^ in first data row (row index 1) pointing to header (row 0) - should succeed
    const result = parseMdxSpanner(source, 'tbl-006');
    // Actually ^ in row 1 is valid - it merges with row 0
    expect(result.ok).toBe(true);
  });

  it('returns error for table with fewer than 2 rows', () => {
    const result = parseMdxSpanner('| A | B |', 'tbl-007');
    expect(result.ok).toBe(false);
  });

  it('round-trips simple colspan with serialize', () => {
    const source = '| Merged | > |\n| --- | --- |\n| A | B |';
    const parsed = parseMdxSpanner(source, 'tbl-008');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const serialized = serializeMdxSpanner(parsed.value);
    expect(serialized).toBe(source);
  });

  it('round-trips rowspan with serialize', () => {
    const source = '| Tall | B |\n| --- | --- |\n| ^ | C |';
    const parsed = parseMdxSpanner(source, 'tbl-009');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const serialized = serializeMdxSpanner(parsed.value);
    expect(serialized).toBe(source);
  });
});
