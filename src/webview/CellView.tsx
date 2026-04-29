import React, { useState, useRef, useEffect } from 'react';
import type { TableCell } from '../model/TableModel';

interface CellViewProps {
  cell: TableCell;
  selected: boolean;
  onSelect: (row: number, col: number, extend: boolean) => void;
  onTextChange: (row: number, col: number, text: string) => void;
}

// Visible cell — all hooks called unconditionally
function VisibleCell({ cell, selected, onSelect, onTextChange }: CellViewProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cell.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(cell.text);
  }, [cell.text, editing]);

  function commitEdit(): void {
    setEditing(false);
    onTextChange(cell.row, cell.col, draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setDraft(cell.text);
      setEditing(false);
    }
  }

  const isMerged = cell.rowspan > 1 || cell.colspan > 1;
  const tdClass = [
    selected ? 'selected' : '',
    isMerged ? 'merged-source' : ''
  ].filter(Boolean).join(' ');

  return (
    <td
      className={tdClass}
      rowSpan={cell.rowspan}
      colSpan={cell.colspan}
      onClick={e => onSelect(cell.row, cell.col, e.shiftKey)}
      onDoubleClick={() => { setDraft(cell.text); setEditing(true); }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="cell-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span>{cell.text || ' '}</span>
      )}
    </td>
  );
}

export function CellView(props: CellViewProps): React.ReactElement | null {
  if (props.cell.hidden) return null;
  return <VisibleCell {...props} />;
}
