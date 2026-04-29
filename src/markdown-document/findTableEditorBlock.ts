export type TableEditorBlock = {
  startOffset: number;
  endOffset: number;
  id: string;
  format: string;
  version: number;
  innerContent: string;
};

export class TableEditorBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TableEditorBlockError';
  }
}

const START_RE = /<!--\s*table-editor:start\s+id="([^"]+)"\s+format="([^"]+)"\s+version="(\d+)"\s*-->/g;
const END_RE = /<!--\s*table-editor:end\s+id="([^"]+)"\s*-->/g;

export function findTableEditorBlock(
  documentText: string,
  cursorOffset: number
): TableEditorBlock | null {
  const starts: Array<{ index: number; end: number; id: string; format: string; version: number }> = [];
  const ends: Array<{ index: number; end: number; id: string }> = [];

  let m: RegExpExecArray | null;

  START_RE.lastIndex = 0;
  while ((m = START_RE.exec(documentText)) !== null) {
    starts.push({
      index: m.index,
      end: m.index + m[0].length,
      id: m[1],
      format: m[2],
      version: parseInt(m[3], 10)
    });
  }

  END_RE.lastIndex = 0;
  while ((m = END_RE.exec(documentText)) !== null) {
    ends.push({
      index: m.index,
      end: m.index + m[0].length,
      id: m[1]
    });
  }

  // Validate pairing
  for (const start of starts) {
    const matchingEnd = ends.find(e => e.id === start.id);
    if (!matchingEnd) {
      throw new TableEditorBlockError(
        `table-editor:start found with id="${start.id}" but no matching table-editor:end`
      );
    }
  }
  for (const end of ends) {
    const matchingStart = starts.find(s => s.id === end.id);
    if (!matchingStart) {
      throw new TableEditorBlockError(
        `table-editor:end found with id="${end.id}" but no matching table-editor:start`
      );
    }
  }

  // Find block containing cursor
  for (const start of starts) {
    const matchingEnd = ends.find(e => e.id === start.id)!;
    if (cursorOffset >= start.index && cursorOffset <= matchingEnd.end) {
      const innerContent = documentText.slice(start.end, matchingEnd.index).trim();
      return {
        startOffset: start.index,
        endOffset: matchingEnd.end,
        id: start.id,
        format: start.format,
        version: start.version,
        innerContent
      };
    }
  }

  return null;
}
