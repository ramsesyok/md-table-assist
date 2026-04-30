import { describe, it, expect } from 'vitest';
import { findTableEditorBlock } from './findTableEditorBlock';

const pipeTableDoc = `<!-- table-editor:start id="tbl-010" format="pipeTable" version="1" -->

| 項目 | 内容 | 数値 |
| :--- | :---: | ---: |
| A | X | 100 |

<!-- table-editor:end id="tbl-010" -->`;

const mdxSpannerDoc = `<!-- table-editor:start id="tbl-011" format="mdxSpanner" version="1" -->

| 項目 | 内容 |
| --- | --- |
| A | > |

<!-- table-editor:end id="tbl-011" -->`;

describe('findTableEditorBlock format detection', () => {
  it('detects format="pipeTable"', () => {
    const offset = pipeTableDoc.indexOf('<!-- table-editor:start');
    const block = findTableEditorBlock(pipeTableDoc, offset + 10);
    expect(block).not.toBeNull();
    expect(block!.format).toBe('pipeTable');
    expect(block!.id).toBe('tbl-010');
  });

  it('detects format="mdxSpanner"', () => {
    const offset = mdxSpannerDoc.indexOf('<!-- table-editor:start');
    const block = findTableEditorBlock(mdxSpannerDoc, offset + 10);
    expect(block).not.toBeNull();
    expect(block!.format).toBe('mdxSpanner');
    expect(block!.id).toBe('tbl-011');
  });

  it('includes inner pipe table content', () => {
    const offset = pipeTableDoc.indexOf('<!-- table-editor:start');
    const block = findTableEditorBlock(pipeTableDoc, offset + 10);
    expect(block!.innerContent).toContain('| 項目 | 内容 | 数値 |');
    expect(block!.innerContent).toContain(':---');
  });

  it('includes inner mdxSpanner content with markers', () => {
    const offset = mdxSpannerDoc.indexOf('<!-- table-editor:start');
    const block = findTableEditorBlock(mdxSpannerDoc, offset + 10);
    expect(block!.innerContent).toContain('| > |');
  });
});
