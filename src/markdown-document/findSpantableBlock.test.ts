import { describe, it, expect } from 'vitest';
import { findSpantableBlock } from './findSpantableBlock';

describe('findSpantableBlock', () => {
  const doc = `# Title

::spantable:: caption="表1"

| A | B |
| --- | --- |
| C | D |

Some text.

::spantable::

| X | Y |
| --- | --- |
`;

  it('finds block when cursor is on the directive line', () => {
    const offset = doc.indexOf('::spantable:: caption=');
    const block = findSpantableBlock(doc, offset);
    expect(block).not.toBeNull();
    expect(block!.content).toContain('::spantable::');
    expect(block!.content).toContain('caption=');
  });

  it('finds block when cursor is inside table rows', () => {
    const offset = doc.indexOf('| A | B |');
    const block = findSpantableBlock(doc, offset);
    expect(block).not.toBeNull();
    expect(block!.content).toContain('caption=');
  });

  it('finds nearest block when cursor is between blocks', () => {
    const offset = doc.indexOf('Some text.');
    const block = findSpantableBlock(doc, offset);
    // Should return one of the two blocks
    expect(block).not.toBeNull();
  });

  it('does not detect spantable inside a comment block', () => {
    const wrapped = `<!-- table-editor:start id="tbl-001" format="spantable" version="1" -->

::spantable::

| A | B |
| --- | --- |

<!-- table-editor:end id="tbl-001" -->
`;
    // Cursor outside the comment block
    const block = findSpantableBlock(wrapped, 0);
    expect(block).toBeNull();
  });

  it('returns null for document with no spantable', () => {
    const block = findSpantableBlock('# Title\n\nNo tables here.\n', 5);
    expect(block).toBeNull();
  });
});
