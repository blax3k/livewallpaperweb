import React from 'react';
import './XFocusControl.scss';

interface XFocusControlProps {
  disabled?: boolean;
  value: number;
  onChange: (value: number) => void;
  onChangeStart?: (value: number) => void;
  onChangeCommit?: (value: number) => void;
}

export function XFocusControl({ disabled, value, onChange, onChangeStart, onChangeCommit }: XFocusControlProps) {
  return (
    <div className="control-group">
      <label htmlFor="xfocus-slider">Camera Focus:</label>
      <div className="xfocus-row">
        <input
          type="range"
          id="xfocus-slider"
          min="0"
          max="1"
          step="0.01"
          value={value}
          disabled={disabled}
          onMouseDown={() => onChangeStart?.(value)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={(e) => onChangeCommit?.(parseFloat((e.target as HTMLInputElement).value))}
        />
        <span>{value.toFixed(2)}</span>
      </div>
    </div>
  );
}
