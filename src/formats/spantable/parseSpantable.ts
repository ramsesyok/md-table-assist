import type { TableModel, TableCell, TableParser } from '../../model/TableModel';

type RawCell = {
  text: string;
  isSpan: boolean;
};

export function parseSpantable(source: string, tableId = ''): TableModel {
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let caption: string | undefined;
  let className: string | undefined;
  const tableRows: RawCell[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // End directive
    if (trimmed === '::end-spantable::') continue;

    // Directive line
    if (trimmed.startsWith('::spantable::')) {
      const rest = trimmed.slice('::spantable::'.length).trim();
      caption = extractAttribute(rest, 'caption');
      className = extractAttribute(rest, 'class');
      continue;
    }

    // Skip separator rows (| --- | --- |)
    if (/^\|[\s|:-]+\|$/.test(trimmed) && trimmed.includes('-')) {
      continue;
    }

    // Table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = parseCells(trimmed);
      tableRows.push(cells);
      continue;
    }
  }

  if (tableRows.length === 0) {
    return {
      id: tableId,
      format: 'spantable',
      version: 1,
      caption,
      className,
      rows: []
    };
  }

  const colCount = Math.max(...tableRows.map(r => r.length));

  // Pad rows to same length
  for (const row of tableRows) {
    while (row.length < colCount) {
      row.push({ text: '', isSpan: false });
    }
  }

  const rowCount = tableRows.length;

  // Build initial cell grid
  const cells: TableCell[][] = tableRows.map((row, r) =>
    row.map((raw, c) => ({
      id: `r${r}c${c}`,
      text: raw.isSpan ? raw.text : raw.text,
      row: r,
      col: c,
      rowspan: 1,
      colspan: 1,
      hidden: false
    }))
  );

  // Infer rowspan/colspan from @span markers and adjacent empty cells
  // Rule: for each @span cell, scan right for empty cells (colspan),
  // then scan down for rows where the same column range is empty (rowspan).
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (!tableRows[r][c].isSpan) continue;

      const sourceCell = cells[r][c];

      // Scan right for colspan
      let colspan = 1;
      while (c + colspan < colCount && tableRows[r][c + colspan].text === '' && !tableRows[r][c + colspan].isSpan) {
        colspan++;
      }

      // Scan down for rowspan
      let rowspan = 1;
      outer: while (r + rowspan < rowCount) {
        for (let dc = 0; dc < colspan; dc++) {
          const below = tableRows[r + rowspan][c + dc];
          if (below.text !== '' || below.isSpan) break outer;
        }
        rowspan++;
      }

      sourceCell.colspan = colspan;
      sourceCell.rowspan = rowspan;

      // Mark covered cells as hidden
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue;
          cells[r + dr][c + dc].hidden = true;
          cells[r + dr][c + dc].text = '';
        }
      }
    }
  }

  return {
    id: tableId,
    format: 'spantable',
    version: 1,
    caption,
    className,
    rows: cells
  };
}

function parseCells(line: string): RawCell[] {
  // Remove leading/trailing |
  const inner = line.slice(1, -1);
  const parts = inner.split('|');
  return parts.map(part => {
    const trimmed = part.trim();
    // Unescape pipe
    const unescaped = trimmed.replace(/\\\|/g, '|');
    if (unescaped.endsWith(' @span')) {
      return { text: unescaped.slice(0, -' @span'.length).trim(), isSpan: true };
    }
    if (unescaped === '@span') {
      return { text: '', isSpan: true };
    }
    return { text: unescaped, isSpan: false };
  });
}

function extractAttribute(attrString: string, name: string): string | undefined {
  // Match name="value" or name='value'
  const dq = new RegExp(`${name}="((?:[^"\\\\]|\\\\.)*)"`);
  const sq = new RegExp(`${name}='((?:[^'\\\\]|\\\\.)*)'`);

  let m = attrString.match(dq);
  if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  m = attrString.match(sq);
  if (m) return m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');

  return undefined;
}

export class SpantableParser implements TableParser {
  parse(source: string): TableModel {
    return parseSpantable(source);
  }
}
