import React from 'react';
import './SpritePanelControl.scss';

interface SpritePanelControlProps {
  spriteName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
  onChangeStart?: (x: number, y: number) => void;
  onChangeCommit?: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onSizeChangeStart?: () => void;
  onSizeCommit?: (width: number, height: number) => void;
}

const COORD_MIN = -10;
const COORD_MAX = 10;
const COORD_STEP = 0.01;

const SIZE_MIN = 0.1;
const SIZE_MAX = 20;
const SIZE_STEP = 0.01;

export function SpritePanelControl({ spriteName, x, y, width, height, disabled, onChange, onChangeStart, onChangeCommit, onSizeChange, onSizeChangeStart, onSizeCommit }: SpritePanelControlProps) {
  const aspectRatio = width > 0 && height > 0 ? height / width : 1;

  const handleWidthChange = (newW: number) => {
    const newH = Math.max(SIZE_MIN, newW * aspectRatio);
    onSizeChange(newW, newH);
  };

  const handleHeightChange = (newH: number) => {
    const newW = Math.max(SIZE_MIN, newH / aspectRatio);
    onSizeChange(newW, newH);
  };

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
      <div className="sprite-panel-coord">
        <label>W</label>
        <input
          type="range"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={SIZE_STEP}
          value={Math.min(SIZE_MAX, Math.max(SIZE_MIN, width))}
          disabled={disabled}
          onPointerDown={() => onSizeChangeStart?.()}
          onChange={(e) => handleWidthChange(parseFloat(e.target.value))}
          onPointerUp={(e) => onSizeCommit?.(parseFloat((e.target as HTMLInputElement).value), Math.max(SIZE_MIN, parseFloat((e.target as HTMLInputElement).value) * aspectRatio))}
        />
        <input
          type="number"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={SIZE_STEP}
          value={parseFloat(width.toFixed(2))}
          disabled={disabled}
          onFocus={() => onSizeChangeStart?.()}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= SIZE_MIN) {
              const newH = Math.max(SIZE_MIN, val * aspectRatio);
              onSizeChange(val, newH);
              onSizeCommit?.(val, newH);
            }
          }}
        />
      </div>
      <div className="sprite-panel-coord">
        <label>H</label>
        <input
          type="range"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={SIZE_STEP}
          value={Math.min(SIZE_MAX, Math.max(SIZE_MIN, height))}
          disabled={disabled}
          onPointerDown={() => onSizeChangeStart?.()}
          onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
          onPointerUp={(e) => {
            const newH = parseFloat((e.target as HTMLInputElement).value);
            onSizeCommit?.(Math.max(SIZE_MIN, newH / aspectRatio), newH);
          }}
        />
        <input
          type="number"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={SIZE_STEP}
          value={parseFloat(height.toFixed(2))}
          disabled={disabled}
          onFocus={() => onSizeChangeStart?.()}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= SIZE_MIN) {
              const newW = Math.max(SIZE_MIN, val / aspectRatio);
              onSizeChange(newW, val);
              onSizeCommit?.(newW, val);
            }
          }}
        />
      </div>
    </div>
  );
}
