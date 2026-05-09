import { parsePipeTable } from '../formats/pipeTable/parsePipeTable';

export type PipeTableBlock = {
  startOffset: number;
  endOffset: number;
  content: string;
};

type LineInfo = {
  text: string;
  start: number;
  end: number;
};

export function findPipeTableBlock(
  documentText: string,
  cursorOffset: number
): PipeTableBlock | null {
  const commentRanges = collectCommentBlockRanges(documentText);
  const lines = splitLines(documentText);
  let best: PipeTableBlock | null = null;
  let bestDistance = Infinity;

  for (let i = 0; i < lines.length - 1; i++) {
    if (isInsideCommentBlock(lines[i].start, commentRanges)) continue;
    if (!couldBeGfmRow(lines[i].text) || !couldBeGfmRow(lines[i + 1].text)) continue;

    const firstTwoLines = `${lines[i].text}\n${lines[i + 1].text}`;
    if (!parsePipeTable(firstTwoLines).ok) continue;

    let endLine = i + 1;
    for (let j = i + 2; j < lines.length; j++) {
      const text = lines[j].text;
      if (isInsideCommentBlock(lines[j].start, commentRanges)) break;
      if (text.trim().length === 0 || !couldBeGfmRow(text)) break;
      endLine = j;
    }

    const startOffset = lines[i].start;
    const endOffset = lines[endLine].end;
    const content = documentText.slice(startOffset, endOffset).trimEnd();
    const block = {
      startOffset,
      endOffset: startOffset + content.length,
      content
    };
    const distance = cursorOffset >= block.startOffset && cursorOffset <= block.endOffset
      ? 0
      : Math.min(
          Math.abs(cursorOffset - block.startOffset),
          Math.abs(cursorOffset - block.endOffset)
        );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = block;
    }

    i = endLine;
  }

  return best;
}

function collectCommentBlockRanges(documentText: string): Array<{ start: number; end: number }> {
  const commentBlockRE = /<!--\s*table-editor:start[^>]*-->[\s\S]*?<!--\s*table-editor:end[^>]*-->/g;
  const ranges: Array<{ start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = commentBlockRE.exec(documentText)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

function splitLines(documentText: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let start = 0;
  while (start <= documentText.length) {
    const newline = documentText.indexOf('\n', start);
    if (newline === -1) {
      lines.push({ text: documentText.slice(start), start, end: documentText.length });
      break;
    }
    lines.push({ text: documentText.slice(start, newline), start, end: newline + 1 });
    start = newline + 1;
  }
  return lines;
}

function couldBeGfmRow(line: string): boolean {
  return hasUnescapedPipe(line);
}

function hasUnescapedPipe(line: string): boolean {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|' && !isEscaped(line, i)) {
      return true;
    }
  }
  return false;
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
}

function isInsideCommentBlock(offset: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some(r => offset >= r.start && offset <= r.end);
}
