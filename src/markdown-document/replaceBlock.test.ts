import { describe, it, expect } from 'vitest';
import { buildReplacement, type TextDocumentLike } from './replaceBlock';

function makeDoc(text: string): TextDocumentLike {
  return {
    getText() { return text; },
    positionAt(offset: number) {
      const before = text.slice(0, offset);
      const lines = before.split('\n');
      return { line: lines.length - 1, character: lines[lines.length - 1].length };
    },
    uri: { toString: () => 'file:///test.md' }
  };
}

describe('buildReplacement', () => {
  it('builds a replacement for a known range', () => {
    const text = 'Hello World\n';
    const doc = makeDoc(text);
    const r = buildReplacement(doc, 6, 11, 'Markdown');
    expect(r.startLine).toBe(0);
    expect(r.startCharacter).toBe(6);
    expect(r.endLine).toBe(0);
    expect(r.endCharacter).toBe(11);
    expect(r.newText).toBe('Markdown');
  });

  it('computes correct line/character for multi-line document', () => {
    const text = 'Line 1\nLine 2\nLine 3\n';
    const doc = makeDoc(text);
    // offset 7 = start of "Line 2"
    const r = buildReplacement(doc, 7, 13, 'Replaced');
    expect(r.startLine).toBe(1);
    expect(r.startCharacter).toBe(0);
    expect(r.endLine).toBe(1);
    expect(r.endCharacter).toBe(6);
    expect(r.newText).toBe('Replaced');
  });

  it('preserves content before and after range (via newText)', () => {
    const text = 'Before\n[BLOCK]\nAfter\n';
    const doc = makeDoc(text);
    const start = text.indexOf('[BLOCK]');
    const end = start + '[BLOCK]'.length;
    const r = buildReplacement(doc, start, end, 'NEW');
    expect(r.newText).toBe('NEW');
    // Content reconstruction (simulated)
    const result = text.slice(0, start) + r.newText + text.slice(end);
    expect(result).toBe('Before\nNEW\nAfter\n');
  });
});
