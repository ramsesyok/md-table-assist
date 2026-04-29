import React from 'react';

interface ToolbarProps {
  caption: string;
  className: string;
  showPreview: boolean;
  onCaptionChange: (v: string) => void;
  onClassNameChange: (v: string) => void;
  onAddRow: () => void;
  onDeleteRow: () => void;
  onAddCol: () => void;
  onDeleteCol: () => void;
  onMerge: () => void;
  onUnmerge: () => void;
  onTogglePreview: () => void;
  onApply: () => void;
  errorMsg: string | null;
}

export function Toolbar({
  caption, className, showPreview, errorMsg,
  onCaptionChange, onClassNameChange,
  onAddRow, onDeleteRow, onAddCol, onDeleteCol,
  onMerge, onUnmerge, onTogglePreview, onApply
}: ToolbarProps): React.ReactElement {
  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-group">
          <label>Caption:</label>
          <input
            type="text"
            value={caption}
            onChange={e => onCaptionChange(e.target.value)}
            placeholder="Table caption"
          />
        </div>
        <div className="toolbar-group">
          <label>Class:</label>
          <input
            type="text"
            value={className}
            onChange={e => onClassNameChange(e.target.value)}
            placeholder="CSS class"
          />
        </div>

        <div className="toolbar-sep" />

        <div className="toolbar-group">
          <button onClick={onAddRow} title="Add Row">+Row</button>
          <button onClick={onDeleteRow} title="Delete Row">-Row</button>
          <button onClick={onAddCol} title="Add Column">+Col</button>
          <button onClick={onDeleteCol} title="Delete Column">-Col</button>
        </div>

        <div className="toolbar-sep" />

        <div className="toolbar-group">
          <button onClick={onMerge} title="Merge selected cells">Merge</button>
          <button onClick={onUnmerge} title="Unmerge selected cell">Unmerge</button>
        </div>

        <div className="toolbar-sep" />

        <div className="toolbar-group">
          <button onClick={onTogglePreview}>{showPreview ? 'Hide Preview' : 'Preview'}</button>
          <button onClick={onApply} style={{ fontWeight: 'bold' }}>Apply to Document</button>
        </div>
      </div>

      {errorMsg && (
        <div className="error-msg">{errorMsg}</div>
      )}
    </div>
  );
}
