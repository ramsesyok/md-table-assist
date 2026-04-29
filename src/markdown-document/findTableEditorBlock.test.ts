import { describe, it, expect } from 'vitest';
import { findTableEditorBlock, TableEditorBlockError } from './findTableEditorBlock';

const doc = `# Title

<!-- table-editor:start id="tbl-001" format="spantable" version="1" -->

::spantable::

| A | B |
| --- | --- |
| C | D |

<!-- table-editor:end id="tbl-001" -->

Some text after.

<!-- table-editor:start id="tbl-002" format="spantable" version="1" -->

| X | Y |
| --- | --- |

<!-- table-editor:end id="tbl-002" -->
`;

describe('findTableEditorBlock', () => {
  it('finds block when cursor is inside it', () => {
    const startOffset = doc.indexOf('<!-- table-editor:start id="tbl-001"');
    const cursorInside = startOffset + 50;
    const block = findTableEditorBlock(doc, cursorInside);
    expect(block).not.toBeNull();
    expect(block!.id).toBe('tbl-001');
    expect(block!.format).toBe('spantable');
    expect(block!.version).toBe(1);
  });

  it('returns null when cursor is outside all blocks', () => {
    const offset = doc.indexOf('Some text after.');
    const block = findTableEditorBlock(doc, offset);
    expect(block).toBeNull();
  });

  it('finds the correct block among multiple', () => {
    const block2Start = doc.indexOf('<!-- table-editor:start id="tbl-002"');
    const block = findTableEditorBlock(doc, block2Start + 10);
    expect(block).not.toBeNull();
    expect(block!.id).toBe('tbl-002');
  });

  it('throws on start without end', () => {
    const broken = `<!-- table-editor:start id="orphan" format="spantable" version="1" -->
some content
`;
    expect(() => findTableEditorBlock(broken, 10)).toThrow(TableEditorBlockError);
  });

  it('throws on end without start', () => {
    const broken = `some content
<!-- table-editor:end id="orphan" -->
`;
    expect(() => findTableEditorBlock(broken, 10)).toThrow(TableEditorBlockError);
  });

  it('includes innerContent without the comment lines', () => {
    const startOffset = doc.indexOf('<!-- table-editor:start id="tbl-001"');
    const block = findTableEditorBlock(doc, startOffset + 10);
    expect(block).not.toBeNull();
    expect(block!.innerContent).toContain('::spantable::');
    expect(block!.innerContent).not.toContain('table-editor:start');
    expect(block!.innerContent).not.toContain('table-editor:end');
  });
});
