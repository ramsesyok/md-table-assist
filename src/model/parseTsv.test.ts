import { describe, it, expect } from 'vitest';
import { parseTsv } from './parseTsv';

describe('parseTsv', () => {
  it('parses a basic 3x3 TSV', () => {
    const tsv = 'A\tB\tC\nD\tE\tF\nG\tH\tI';
    const model = parseTsv(tsv);
    expect(model.rows.length).toBe(3);
    expect(model.rows[0].length).toBe(3);
    expect(model.rows[0][0].text).toBe('A');
    expect(model.rows[1][1].text).toBe('E');
    expect(model.rows[2][2].text).toBe('I');
  });

  it('normalizes unequal row lengths', () => {
    const tsv = 'A\tB\tC\nD\tE';
    const model = parseTsv(tsv);
    expect(model.rows[0].length).toBe(3);
    expect(model.rows[1].length).toBe(3);
    expect(model.rows[1][2].text).toBe('');
  });

  it('returns a single empty cell for empty input', () => {
    const model = parseTsv('');
    expect(model.rows.length).toBe(1);
    expect(model.rows[0].length).toBe(1);
    expect(model.rows[0][0].text).toBe('');
  });

  it('parses single cell input', () => {
    const model = parseTsv('Hello');
    expect(model.rows.length).toBe(1);
    expect(model.rows[0].length).toBe(1);
    expect(model.rows[0][0].text).toBe('Hello');
  });

  it('sets rowspan=1, colspan=1, hidden=false on all cells', () => {
    const model = parseTsv('A\tB\nC\tD');
    for (const row of model.rows) {
      for (const cell of row) {
        expect(cell.rowspan).toBe(1);
        expect(cell.colspan).toBe(1);
        expect(cell.hidden).toBe(false);
      }
    }
  });

  it('assigns correct row/col indices', () => {
    const model = parseTsv('A\tB\nC\tD');
    expect(model.rows[0][1].row).toBe(0);
    expect(model.rows[0][1].col).toBe(1);
    expect(model.rows[1][0].row).toBe(1);
    expect(model.rows[1][0].col).toBe(0);
  });

  it('handles CRLF line endings', () => {
    const model = parseTsv('A\tB\r\nC\tD');
    expect(model.rows.length).toBe(2);
    expect(model.rows[1][1].text).toBe('D');
  });

  it('ignores trailing empty line', () => {
    const model = parseTsv('A\tB\nC\tD\n');
    expect(model.rows.length).toBe(2);
  });
});
