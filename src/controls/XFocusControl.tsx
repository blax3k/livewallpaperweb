import React from 'react';
import './XFocusControl.scss';

interface XFocusControlProps {
  visible: boolean;
  value: number;
  onChange: (value: number) => void;
}

export function XFocusControl({ visible, value, onChange }: XFocusControlProps) {
  if (!visible) return null;
  return (
    <div className="control-group">
      <label htmlFor="xfocus-slider">Camera Focus (xFocus):</label>
      <div className="xfocus-row">
        <input
          type="range"
          id="xfocus-slider"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span>{value.toFixed(2)}</span>
      </div>
    </div>
  );
}
