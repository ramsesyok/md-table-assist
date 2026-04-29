import { describe, it, expect } from 'vitest';
import { unmergeCell } from './unmergeCell';
import { mergeCells } from './mergeCells';
import { parseTsv } from './parseTsv';

describe('unmergeCell', () => {
  function make3x3() {
    return parseTsv('A\tB\tC\nD\tE\tF\nG\tH\tI');
  }

  it('unmerges a 2x2 merged cell', () => {
    const model = make3x3();
    const merged = mergeCells(model, 0, 0, 1, 1);
    expect(merged.success).toBe(true);
    if (!merged.success) return;

    const result = unmergeCell(merged.model, 0, 0);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.model.rows[0][0].rowspan).toBe(1);
    expect(result.model.rows[0][0].colspan).toBe(1);
    expect(result.model.rows[0][1].hidden).toBe(false);
    expect(result.model.rows[1][0].hidden).toBe(false);
    expect(result.model.rows[1][1].hidden).toBe(false);
  });

  it('restores hidden cells with empty text', () => {
    const model = make3x3();
    const merged = mergeCells(model, 0, 0, 1, 1);
    if (!merged.success) return;

    const result = unmergeCell(merged.model, 0, 0);
    if (!result.success) return;

    expect(result.model.rows[0][1].text).toBe('');
    expect(result.model.rows[1][0].text).toBe('');
    expect(result.model.rows[1][1].text).toBe('');
  });

  it('preserves source cell text after unmerge', () => {
    const model = make3x3();
    const merged = mergeCells(model, 0, 0, 1, 1);
    if (!merged.success) return;

    const result = unmergeCell(merged.model, 0, 0);
    if (!result.success) return;
    expect(result.model.rows[0][0].text).toBe('A');
  });

  it('rejects unmerge on non-merged cell', () => {
    const model = make3x3();
    const result = unmergeCell(model, 0, 0);
    expect(result.success).toBe(false);
  });

  it('rejects unmerge on hidden cell', () => {
    const model = make3x3();
    const merged = mergeCells(model, 0, 0, 1, 1);
    if (!merged.success) return;

    const result = unmergeCell(merged.model, 0, 1);
    expect(result.success).toBe(false);
  });

  it('rejects out-of-bounds position', () => {
    const model = make3x3();
    const result = unmergeCell(model, 10, 10);
    expect(result.success).toBe(false);
  });
});
