import { describe, it, expect } from 'vitest';
import { parseSpantable } from './parseSpantable';
import { serializeSpantable } from './serializeSpantable';
import { parseTsv } from '../../model/parseTsv';
import { mergeCells } from '../../model/mergeCells';

describe('parseSpantable', () => {
  const simpleTable = `::spantable::

| A | B | C |
| --- | --- | --- |
| D | E | F |`;

  it('parses a simple table', () => {
    const model = parseSpantable(simpleTable);
    expect(model.rows.length).toBe(2);
    expect(model.rows[0].length).toBe(3);
    expect(model.rows[0][0].text).toBe('A');
    expect(model.rows[1][2].text).toBe('F');
  });

  it('extracts caption attribute', () => {
    const src = `::spantable:: caption="比較表"\n\n| A |\n| --- |`;
    const model = parseSpantable(src);
    expect(model.caption).toBe('比較表');
  });

  it('extracts class attribute', () => {
    const src = `::spantable:: class="wide-table"\n\n| A |\n| --- |`;
    const model = parseSpantable(src);
    expect(model.className).toBe('wide-table');
  });

  it('extracts both caption and class', () => {
    const src = `::spantable:: caption="テスト表" class="my-table"\n\n| A |\n| --- |`;
    const model = parseSpantable(src);
    expect(model.caption).toBe('テスト表');
    expect(model.className).toBe('my-table');
  });

  it('returns undefined caption when not set', () => {
    const model = parseSpantable(simpleTable);
    expect(model.caption).toBeUndefined();
  });

  it('detects @span and sets colspan', () => {
    const src = `::spantable::\n\n| A @span |   | C |\n| --- | --- | --- |\n| D | E | F |`;
    const model = parseSpantable(src);
    expect(model.rows[0][0].colspan).toBe(2);
    expect(model.rows[0][1].hidden).toBe(true);
    expect(model.rows[0][2].text).toBe('C');
  });

  it('detects @span and sets rowspan', () => {
    const src = `::spantable::\n\n| A @span | B |\n| --- | --- |\n|   | D |`;
    const model = parseSpantable(src);
    expect(model.rows[0][0].rowspan).toBe(2);
    expect(model.rows[1][0].hidden).toBe(true);
  });

  it('round-trips a table with colspan merge', () => {
    const base = parseTsv('A\tB\tC\nD\tE\tF');
    const merged = mergeCells(base, 0, 0, 0, 1);
    expect(merged.success).toBe(true);
    if (!merged.success) return;

    const serialized = serializeSpantable(merged.model);
    const parsed = parseSpantable(serialized);

    expect(parsed.rows.length).toBe(merged.model.rows.length);
    expect(parsed.rows[0][0].colspan).toBe(2);
    expect(parsed.rows[0][1].hidden).toBe(true);
    expect(parsed.rows[0][2].text).toBe('C');
  });

  it('round-trips a table with rowspan merge', () => {
    const base = parseTsv('A\tB\nC\tD\nE\tF');
    const merged = mergeCells(base, 0, 0, 1, 0);
    expect(merged.success).toBe(true);
    if (!merged.success) return;

    const serialized = serializeSpantable(merged.model);
    const parsed = parseSpantable(serialized);

    expect(parsed.rows[0][0].rowspan).toBe(2);
    expect(parsed.rows[1][0].hidden).toBe(true);
  });

  it('round-trips caption', () => {
    const base = parseTsv('A\tB');
    const withCaption = { ...base, caption: '比較表' };
    const serialized = serializeSpantable(withCaption);
    const parsed = parseSpantable(serialized);
    expect(parsed.caption).toBe('比較表');
  });

  it('round-trips escaped double quotes in caption', () => {
    const base = parseTsv('A');
    const withCaption = { ...base, caption: 'Say "hello"' };
    const serialized = serializeSpantable(withCaption);
    const parsed = parseSpantable(serialized);
    expect(parsed.caption).toBe('Say "hello"');
  });

  it('handles empty table body', () => {
    const src = '::spantable:: caption="empty"';
    const model = parseSpantable(src);
    expect(model.rows.length).toBe(0);
    expect(model.caption).toBe('empty');
  });
});
