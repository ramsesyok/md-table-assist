export type SpantableBlock = {
  startOffset: number;
  endOffset: number;
  content: string;
};

const DIRECTIVE_RE = /^[ \t]*::spantable::/m;

export function findSpantableBlock(
  documentText: string,
  cursorOffset: number
): SpantableBlock | null {
  // Find all ::spantable:: occurrences not inside a table-editor comment block
  const commentBlockRE = /<!--\s*table-editor:start[^>]*-->[\s\S]*?<!--\s*table-editor:end[^>]*-->/g;
  const commentRanges: Array<{ start: number; end: number }> = [];

  let cm: RegExpExecArray | null;
  commentBlockRE.lastIndex = 0;
  while ((cm = commentBlockRE.exec(documentText)) !== null) {
    commentRanges.push({ start: cm.index, end: cm.index + cm[0].length });
  }

  function isInsideCommentBlock(offset: number): boolean {
    return commentRanges.some(r => offset >= r.start && offset <= r.end);
  }

  DIRECTIVE_RE.lastIndex = 0;
  const directiveRE = /^[ \t]*::spantable::[^\n]*/gm;
  let best: SpantableBlock | null = null;
  let bestDistance = Infinity;

  let dm: RegExpExecArray | null;
  directiveRE.lastIndex = 0;
  while ((dm = directiveRE.exec(documentText)) !== null) {
    const directiveStart = dm.index;

    if (isInsideCommentBlock(directiveStart)) continue;

    // Find the end of the table: scan lines after the directive
    // Table ends at the first blank line (after at least one table row) or EOF
    let pos = directiveStart + dm[0].length;
    // Skip blank lines immediately after directive
    while (pos < documentText.length && documentText[pos] === '\n') {
      pos++;
    }

    // Now read table rows
    let blockEnd = pos;
    while (pos < documentText.length) {
      const lineStart = pos;
      const lineEnd = documentText.indexOf('\n', pos);
      const line = lineEnd === -1
        ? documentText.slice(pos)
        : documentText.slice(pos, lineEnd);

      if (line.trimStart().startsWith('|') || /^\s*$/.test(line) === false && line.trim() === '') {
        // Empty line: end of block (but only after we've seen content)
        if (/^\s*$/.test(line)) {
          break;
        }
        blockEnd = lineEnd === -1 ? documentText.length : lineEnd + 1;
        pos = blockEnd;
      } else if (/^\s*$/.test(line)) {
        break;
      } else {
        blockEnd = lineEnd === -1 ? documentText.length : lineEnd + 1;
        pos = lineEnd === -1 ? documentText.length : lineEnd + 1;
      }
    }

    const content = documentText.slice(directiveStart, blockEnd).trimEnd();
    const block: SpantableBlock = {
      startOffset: directiveStart,
      endOffset: directiveStart + content.length,
      content
    };

    // Pick the block nearest to cursor (or containing cursor)
    const distance = cursorOffset >= directiveStart && cursorOffset <= block.endOffset
      ? 0
      : Math.min(
          Math.abs(cursorOffset - directiveStart),
          Math.abs(cursorOffset - block.endOffset)
        );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = block;
    }
  }

  return best;
}
