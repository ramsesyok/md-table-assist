// Minimal interface matching vscode.TextDocument's positionAt/getText
export interface TextDocumentLike {
  getText(): string;
  positionAt(offset: number): { line: number; character: number };
  uri: { toString(): string };
}

export type RangeReplacement = {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
  newText: string;
  uri: string;
};

export function buildReplacement(
  document: TextDocumentLike,
  startOffset: number,
  endOffset: number,
  newContent: string
): RangeReplacement {
  const start = document.positionAt(startOffset);
  const end = document.positionAt(endOffset);
  return {
    startLine: start.line,
    startCharacter: start.character,
    endLine: end.line,
    endCharacter: end.character,
    newText: newContent,
    uri: document.uri.toString()
  };
}
