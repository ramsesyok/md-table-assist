import { describe, it, expect } from 'vitest';
import { serializeSpantable } from './serializeSpantable';
import { parseTsv } from '../../model/parseTsv';
import { mergeCells } from '../../model/mergeCells';
import type { TableModel } from '../../model/TableModel';

describe('serializeSpantable', () => {
  it('serializes a simple 2x3 table', () => {
    const model = parseTsv('A\tB\tC\nD\tE\tF');
    const result = serializeSpantable(model);
    expect(result).toContain('::spantable::');
    expect(result).toContain('| A');
    expect(result).toContain('| D');
  });

  it('emits caption when set', () => {
    const model: TableModel = { ...parseTsv('A\tB'), caption: '比較表' };
    const result = serializeSpantable(model);
    expect(result).toContain('caption="比較表"');
  });

  it('omits caption when empty', () => {
    const model: TableModel = { ...parseTsv('A\tB'), caption: '' };
    const result = serializeSpantable(model);
    expect(result).not.toContain('caption=');
  });

  it('omits caption when undefined', () => {
    const model = parseTsv('A\tB');
    const result = serializeSpantable(model);
    expect(result).not.toContain('caption=');
  });

  it('emits class when set', () => {
    const model: TableModel = { ...parseTsv('A\tB'), className: 'wide-table' };
    const result = serializeSpantable(model);
    expect(result).toContain('class="wide-table"');
  });

  it('emits @span for colspan merge', () => {
    const base = parseTsv('A\tB\tC\nD\tE\tF');
    const merged = mergeCells(base, 0, 0, 0, 1);
    expect(merged.success).toBe(true);
    if (!merged.success) return;
    const result = serializeSpantable(merged.model);
    expect(result).toContain('A @span');
  });

  it('emits @span for rowspan merge', () => {
    const base = parseTsv('A\tB\nC\tD\nE\tF');
    const merged = mergeCells(base, 0, 0, 1, 0);
    expect(merged.success).toBe(true);
    if (!merged.success) return;
    const result = serializeSpantable(merged.model);
    expect(result).toContain('A @span');
  });

  it('emits empty cell content for hidden cells', () => {
    const base = parseTsv('A\tB\tC\nD\tE\tF');
    const merged = mergeCells(base, 0, 0, 0, 1);
    if (!merged.success) return;
    const result = serializeSpantable(merged.model);
    // The hidden cell (row 0, col 1) should produce an empty cell
    const rows = result.split('\n').filter(l => l.startsWith('|') && !l.includes('---'));
    // First data row should have 3 cells: A @span | (empty) | C
    expect(rows[0]).toMatch(/A @span.*\|.*\|.*C/);
  });

  it('escapes pipe characters in cell text', () => {
    const model = parseTsv('A|B\tC');
    const result = serializeSpantable(model);
    expect(result).toContain('A\\|B');
  });

  it('emits separator row after first row', () => {
    const model = parseTsv('H1\tH2\nD1\tD2');
    const result = serializeSpantable(model);
    const lines = result.split('\n');
    const sepIndex = lines.findIndex(l => l.includes('---'));
    expect(sepIndex).toBeGreaterThan(-1);
    // Separator must come after the first data row
    const firstDataIndex = lines.findIndex(l => l.startsWith('|') && !l.includes('---'));
    expect(sepIndex).toBe(firstDataIndex + 1);
  });

  it('escapes double quotes in caption attribute', () => {
    const model: TableModel = { ...parseTsv('A'), caption: 'Say "hello"' };
    const result = serializeSpantable(model);
    expect(result).toContain('\\"hello\\"');
  });
});
