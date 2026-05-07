import React from 'react';
import './SpritePanelControl.scss';

interface SpritePanelControlProps {
  spriteName: string;
  x: number;
  y: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
  onChangeStart?: (x: number, y: number) => void;
  onChangeCommit?: (x: number, y: number) => void;
}

const COORD_MIN = -10;
const COORD_MAX = 10;
const COORD_STEP = 0.01;

export function SpritePanelControl({ spriteName, x, y, disabled, onChange, onChangeStart, onChangeCommit }: SpritePanelControlProps) {
  return (
    <div id="sprite-panel-control" className={disabled ? 'sprite-panel-control--disabled' : undefined}>
      <div className="sprite-panel-name">{disabled ? 'No sprite selected' : spriteName}</div>
      <div className="sprite-panel-coord">
        <label>X</label>
        <input
          type="range"
          min={COORD_MIN}
          max={COORD_MAX}
          step={COORD_STEP}
          value={x}
          disabled={disabled}
          onPointerDown={() => onChangeStart?.(x, y)}
          onChange={(e) => onChange(parseFloat(e.target.value), y)}
          onPointerUp={(e) => onChangeCommit?.(parseFloat((e.target as HTMLInputElement).value), y)}
        />
        <input
          type="number"
          min={COORD_MIN}
          max={COORD_MAX}
          step={COORD_STEP}
          value={parseFloat(x.toFixed(2))}
          disabled={disabled}
          onFocus={() => onChangeStart?.(x, y)}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) { onChange(val, y); onChangeCommit?.(val, y); }
          }}
        />
      </div>
      <div className="sprite-panel-coord">
        <label>Y</label>
        <input
          type="range"
          min={COORD_MIN}
          max={COORD_MAX}
          step={COORD_STEP}
          value={y}
          disabled={disabled}
          onPointerDown={() => onChangeStart?.(x, y)}
          onChange={(e) => onChange(x, parseFloat(e.target.value))}
          onPointerUp={(e) => onChangeCommit?.(x, parseFloat((e.target as HTMLInputElement).value))}
        />
        <input
          type="number"
          min={COORD_MIN}
          max={COORD_MAX}
          step={COORD_STEP}
          value={parseFloat(y.toFixed(2))}
          disabled={disabled}
          onFocus={() => onChangeStart?.(x, y)}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) { onChange(x, val); onChangeCommit?.(x, val); }
          }}
        />
      </div>
    </div>
  );
}
