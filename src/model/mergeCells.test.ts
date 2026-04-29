import { describe, it, expect } from 'vitest';
import { mergeCells } from './mergeCells';
import { parseTsv } from './parseTsv';

describe('mergeCells', () => {
  function make3x3() {
    return parseTsv('A\tB\tC\nD\tE\tF\nG\tH\tI');
  }

  it('merges a 2x2 rectangle', () => {
    const model = make3x3();
    const result = mergeCells(model, 0, 0, 1, 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const src = result.model.rows[0][0];
    expect(src.rowspan).toBe(2);
    expect(src.colspan).toBe(2);
    expect(src.hidden).toBe(false);
    expect(result.model.rows[0][1].hidden).toBe(true);
    expect(result.model.rows[1][0].hidden).toBe(true);
    expect(result.model.rows[1][1].hidden).toBe(true);
  });

  it('rejects single-cell selection', () => {
    const result = mergeCells(make3x3(), 0, 0, 0, 0);
    expect(result.success).toBe(false);
  });

  it('rejects out-of-bounds selection', () => {
    const result = mergeCells(make3x3(), 0, 0, 5, 5);
    expect(result.success).toBe(false);
  });

  it('rejects partial overlap with existing merged cell', () => {
    const model = make3x3();
    const merged = mergeCells(model, 0, 0, 1, 1);
    expect(merged.success).toBe(true);
    if (!merged.success) return;
    // Try to merge a range that partially overlaps the 2x2 merged cell
    const result = mergeCells(merged.model, 1, 1, 2, 2);
    expect(result.success).toBe(false);
  });

  it('allows merging a range that fully contains an existing merge', () => {
    const model = make3x3();
    const inner = mergeCells(model, 0, 0, 0, 1);
    expect(inner.success).toBe(true);
    if (!inner.success) return;
    // Expand to cover the full first two rows
    const result = mergeCells(inner.model, 0, 0, 1, 1);
    expect(result.success).toBe(true);
  });

  it('clears text from hidden cells', () => {
    const model = make3x3();
    const result = mergeCells(model, 0, 0, 1, 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.model.rows[0][1].text).toBe('');
    expect(result.model.rows[1][0].text).toBe('');
    expect(result.model.rows[1][1].text).toBe('');
  });

  it('preserves source cell text', () => {
    const model = make3x3();
    const result = mergeCells(model, 0, 0, 1, 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.model.rows[0][0].text).toBe('A');
  });
});
