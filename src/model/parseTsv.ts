import type { TableModel, TableCell } from './TableModel';

export function parseTsv(tsv: string): TableModel {
  const lines = tsv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const nonEmptyLines = lines.filter((_, i) => {
    if (i === lines.length - 1 && lines[i] === '') return false;
    return true;
  });

  if (nonEmptyLines.length === 0) {
    return makeEmptyModel();
  }

  const rawRows = nonEmptyLines.map(line => line.split('\t'));
  const colCount = Math.max(...rawRows.map(r => r.length));

  const rows: TableCell[][] = rawRows.map((rawRow, rowIdx) => {
    const cells: TableCell[] = [];
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      cells.push({
        id: `r${rowIdx}c${colIdx}`,
        text: rawRow[colIdx] ?? '',
        row: rowIdx,
        col: colIdx,
        rowspan: 1,
        colspan: 1,
        hidden: false
      });
    }
    return cells;
  });

  return {
    id: '',
    format: 'spantable',
    version: 1,
    rows
  };
}

function makeEmptyModel(): TableModel {
  const rows: TableCell[][] = [[{
    id: 'r0c0',
    text: '',
    row: 0,
    col: 0,
    rowspan: 1,
    colspan: 1,
    hidden: false
  }]];
  return { id: '', format: 'spantable', version: 1, rows };
}
