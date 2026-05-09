import { describe, it, expect } from 'vitest';
import { findPipeTableBlock } from './findPipeTableBlock';

describe('findPipeTableBlock', () => {
  const doc = `# Title

Alpha | Beta
--- | ---
A | B

Some text.

| X | Y |
| --- | --- |
| 1 | 2 |
`;

  it('finds a GFM table without outer pipes', () => {
    const offset = doc.indexOf('Alpha | Beta');
    const block = findPipeTableBlock(doc, offset);
    expect(block).not.toBeNull();
    expect(block!.content).toBe('Alpha | Beta\n--- | ---\nA | B');
  });

  it('finds a GFM table with outer pipes', () => {
    const offset = doc.indexOf('| X | Y |');
    const block = findPipeTableBlock(doc, offset);
    expect(block).not.toBeNull();
    expect(block!.content).toContain('| X | Y |');
  });

  it('does not detect a table inside a table-editor comment block', () => {
    const wrapped = `<!-- table-editor:start id="tbl-001" format="pipeTable" version="1" -->

| A | B |
| --- | --- |

<!-- table-editor:end id="tbl-001" -->
`;
    expect(findPipeTableBlock(wrapped, 0)).toBeNull();
  });

  it('requires the header and separator rows to have matching cell counts', () => {
    const broken = `| A | B |
| --- |
| C |`;
    expect(findPipeTableBlock(broken, 0)).toBeNull();
  });
});
