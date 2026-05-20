import React from 'react';
import './SpritePanelControl.scss';
import { SliderRow } from '../components/SliderRow';

interface SpritePanelControlProps {
  spriteName: string;
  x: number;
  y: number;
  depth: number;
  width: number;
  height: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
  onChangeStart?: (x: number, y: number) => void;
  onChangeCommit?: (x: number, y: number) => void;
  onDepthChange: (depth: number) => void;
  onDepthChangeStart?: (depth: number) => void;
  onDepthCommit?: (depth: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onSizeChangeStart?: () => void;
  onSizeCommit?: (width: number, height: number) => void;
}

const COORD_MIN = -10;
const COORD_MAX = 10;
const COORD_STEP = 0.01;

const DEPTH_MIN = 0.1;
const DEPTH_MAX = 2.0;
const DEPTH_STEP = 0.01;

const SIZE_MIN = 0.1;
const SIZE_MAX = 20;
const SIZE_STEP = 0.01;

export function SpritePanelControl({ spriteName, x, y, depth, width, height, disabled, onChange, onChangeStart, onChangeCommit, onDepthChange, onDepthChangeStart, onDepthCommit, onSizeChange, onSizeChangeStart, onSizeCommit }: SpritePanelControlProps) {
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
      <SliderRow
        label="X" min={COORD_MIN} max={COORD_MAX} step={COORD_STEP}
        value={x} disabled={disabled} labelWidth={12}
        onPointerDown={() => onChangeStart?.(x, y)}
        onChange={(v) => onChange(v, y)}
        onPointerUp={(v) => onChangeCommit?.(v, y)}
        onFocus={() => onChangeStart?.(x, y)}
        onCommit={(v) => onChangeCommit?.(v, y)}
      />
      <SliderRow
        label="Y" min={COORD_MIN} max={COORD_MAX} step={COORD_STEP}
        value={y} disabled={disabled} labelWidth={12}
        onPointerDown={() => onChangeStart?.(x, y)}
        onChange={(v) => onChange(x, v)}
        onPointerUp={(v) => onChangeCommit?.(x, v)}
        onFocus={() => onChangeStart?.(x, y)}
        onCommit={(v) => onChangeCommit?.(x, v)}
      />
      <SliderRow
        label="Z" min={DEPTH_MIN} max={DEPTH_MAX} step={DEPTH_STEP}
        value={Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, depth))} disabled={disabled} labelWidth={12}
        onPointerDown={() => onDepthChangeStart?.(depth)}
        onChange={(v) => onDepthChange(v)}
        onPointerUp={(v) => onDepthCommit?.(v)}
        onFocus={() => onDepthChangeStart?.(depth)}
        onCommit={(v) => { if (v >= DEPTH_MIN) onDepthCommit?.(v); }}
      />
      <SliderRow
        label="W" min={SIZE_MIN} max={SIZE_MAX} step={SIZE_STEP}
        value={Math.min(SIZE_MAX, Math.max(SIZE_MIN, width))} disabled={disabled} labelWidth={12}
        onPointerDown={() => onSizeChangeStart?.()}
        onChange={(v) => { if (v >= SIZE_MIN) handleWidthChange(v); }}
        onPointerUp={(v) => onSizeCommit?.(v, Math.max(SIZE_MIN, v * aspectRatio))}
        onFocus={() => onSizeChangeStart?.()}
        onCommit={(v) => { if (v >= SIZE_MIN) onSizeCommit?.(v, Math.max(SIZE_MIN, v * aspectRatio)); }}
      />
      <SliderRow
        label="H" min={SIZE_MIN} max={SIZE_MAX} step={SIZE_STEP}
        value={Math.min(SIZE_MAX, Math.max(SIZE_MIN, height))} disabled={disabled} labelWidth={12}
        onPointerDown={() => onSizeChangeStart?.()}
        onChange={(v) => { if (v >= SIZE_MIN) handleHeightChange(v); }}
        onPointerUp={(v) => onSizeCommit?.(Math.max(SIZE_MIN, v / aspectRatio), v)}
        onFocus={() => onSizeChangeStart?.()}
        onCommit={(v) => { if (v >= SIZE_MIN) onSizeCommit?.(Math.max(SIZE_MIN, v / aspectRatio), v); }}
      />
    </div>
  );
}
