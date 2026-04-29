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

const AddRowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="7" rx="0.5" />
    <line x1="2" y1="5.5" x2="14" y2="5.5" />
    <line x1="8" y1="2" x2="8" y2="9" />
    <line x1="8" y1="11.5" x2="8" y2="14.5" />
    <line x1="6.5" y1="13" x2="9.5" y2="13" />
  </svg>
);

const DeleteRowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="7" rx="0.5" />
    <line x1="2" y1="5.5" x2="14" y2="5.5" />
    <line x1="8" y1="2" x2="8" y2="9" />
    <line x1="6.5" y1="13" x2="9.5" y2="13" />
  </svg>
);

const AddColIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="12" rx="0.5" />
    <line x1="5.5" y1="2" x2="5.5" y2="14" />
    <line x1="2" y1="8" x2="9" y2="8" />
    <line x1="11.5" y1="8" x2="14.5" y2="8" />
    <line x1="13" y1="6.5" x2="13" y2="9.5" />
  </svg>
);

const DeleteColIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="12" rx="0.5" />
    <line x1="5.5" y1="2" x2="5.5" y2="14" />
    <line x1="2" y1="8" x2="9" y2="8" />
    <line x1="11.5" y1="8" x2="14.5" y2="8" />
  </svg>
);

const MergeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="4" width="5" height="8" rx="0.5" />
    <rect x="9.5" y="4" width="5" height="8" rx="0.5" />
    <line x1="6.5" y1="8" x2="9.5" y2="8" />
    <polyline points="7.8,6.8 6.5,8 7.8,9.2" />
    <polyline points="8.2,6.8 9.5,8 8.2,9.2" />
  </svg>
);

const UnmergeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="4" width="13" height="8" rx="0.5" />
    <line x1="8" y1="4" x2="8" y2="12" />
    <line x1="5.5" y1="8" x2="2.5" y2="8" />
    <polyline points="3.8,6.8 2.5,8 3.8,9.2" />
    <line x1="10.5" y1="8" x2="13.5" y2="8" />
    <polyline points="12.2,6.8 13.5,8 12.2,9.2" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8 C4 3.5, 12 3.5, 15 8 C12 12.5, 4 12.5, 1 8 Z" />
    <circle cx="8" cy="8" r="2.2" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8 C4 3.5, 12 3.5, 15 8 C12 12.5, 4 12.5, 1 8 Z" />
    <circle cx="8" cy="8" r="2.2" />
    <line x1="2.5" y1="2.5" x2="13.5" y2="13.5" />
  </svg>
);

const ApplyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2.5,8.5 6.5,12.5 13.5,4" />
  </svg>
);

export function Toolbar({
  caption, className, showPreview, errorMsg,
  onCaptionChange, onClassNameChange,
  onAddRow, onDeleteRow, onAddCol, onDeleteCol,
  onMerge, onUnmerge, onTogglePreview, onApply
}: ToolbarProps): React.ReactElement {
  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-row">
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
        </div>

        <div className="toolbar-row">
          <div className="toolbar-group">
            <button className="icon-btn" onClick={onAddRow} data-tooltip="行を追加">
              <AddRowIcon />
            </button>
            <button className="icon-btn" onClick={onDeleteRow} data-tooltip="行を削除">
              <DeleteRowIcon />
            </button>
            <button className="icon-btn" onClick={onAddCol} data-tooltip="列を追加">
              <AddColIcon />
            </button>
            <button className="icon-btn" onClick={onDeleteCol} data-tooltip="列を削除">
              <DeleteColIcon />
            </button>
          </div>

          <div className="toolbar-sep" />

          <div className="toolbar-group">
            <button className="icon-btn" onClick={onMerge} data-tooltip="セルを結合">
              <MergeIcon />
            </button>
            <button className="icon-btn" onClick={onUnmerge} data-tooltip="結合を解除">
              <UnmergeIcon />
            </button>
          </div>

          <div className="toolbar-sep" />

          <div className="toolbar-group">
            <button
              className="icon-btn"
              onClick={onTogglePreview}
              data-tooltip={showPreview ? 'プレビューを非表示' : 'プレビュー'}
            >
              {showPreview ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            <button
              className="icon-btn icon-btn--apply"
              onClick={onApply}
              data-tooltip="ドキュメントに適用"
            >
              <ApplyIcon />
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="error-msg">{errorMsg}</div>
      )}
    </div>
  );
}
