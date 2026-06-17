import React from 'react';
import './SpritePanelControl.scss';
import { SliderRow } from '../../components/SliderRow';
import { DISPLAY_SCALE, toDisplay, toInternal } from '../../displayScale';

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

const COORD_MIN = -10 * DISPLAY_SCALE;
const COORD_MAX = 10 * DISPLAY_SCALE;
const COORD_STEP = 1;

const DEPTH_MIN = 0;
const DEPTH_MAX = Math.round(2.0 * DISPLAY_SCALE);
const DEPTH_STEP = 1;

const SIZE_MIN = Math.round(0.01 * DISPLAY_SCALE);
const SIZE_MAX = 20 * DISPLAY_SCALE;
const SIZE_STEP = 1;

export function SpritePanelControl({ spriteName, x, y, depth, width, height, disabled, onChange, onChangeStart, onChangeCommit, onDepthChange, onDepthChangeStart, onDepthCommit, onSizeChange, onSizeChangeStart, onSizeCommit }: SpritePanelControlProps) {
  const aspectRatio = width > 0 && height > 0 ? height / width : 1;

  const handleWidthChange = (displayW: number) => {
    const newW = toInternal(displayW);
    const newH = Math.max(toInternal(SIZE_MIN), newW * aspectRatio);
    onSizeChange(newW, newH);
  };

  const handleHeightChange = (displayH: number) => {
    const newH = toInternal(displayH);
    const newW = Math.max(toInternal(SIZE_MIN), newH / aspectRatio);
    onSizeChange(newW, newH);
  };

  const displayDepth = Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, toDisplay(depth)));
  const displayWidth = Math.min(SIZE_MAX, Math.max(SIZE_MIN, toDisplay(width)));
  const displayHeight = Math.min(SIZE_MAX, Math.max(SIZE_MIN, toDisplay(height)));

  return (
    <div id="sprite-panel-control" className={disabled ? 'sprite-panel-control--disabled' : undefined}>
      <div className="sprite-panel-name">{disabled ? 'No sprite selected' : spriteName}</div>
      <SliderRow
        label="X" min={COORD_MIN} max={COORD_MAX} step={COORD_STEP}
        value={toDisplay(x)} disabled={disabled} labelWidth={12} decimalPlaces={0}
        onPointerDown={() => onChangeStart?.(x, y)}
        onChange={(v) => onChange(toInternal(v), y)}
        onPointerUp={(v) => onChangeCommit?.(toInternal(v), y)}
        onFocus={() => onChangeStart?.(x, y)}
        onCommit={(v) => onChangeCommit?.(toInternal(v), y)}
      />
      <SliderRow
        label="Y" min={COORD_MIN} max={COORD_MAX} step={COORD_STEP}
        value={toDisplay(y)} disabled={disabled} labelWidth={12} decimalPlaces={0}
        onPointerDown={() => onChangeStart?.(x, y)}
        onChange={(v) => onChange(x, toInternal(v))}
        onPointerUp={(v) => onChangeCommit?.(x, toInternal(v))}
        onFocus={() => onChangeStart?.(x, y)}
        onCommit={(v) => onChangeCommit?.(x, toInternal(v))}
      />
      <SliderRow
        label="Z" min={DEPTH_MIN} max={DEPTH_MAX} step={DEPTH_STEP}
        value={displayDepth} disabled={disabled} labelWidth={12} decimalPlaces={0}
        onPointerDown={() => onDepthChangeStart?.(depth)}
        onChange={(v) => onDepthChange(toInternal(v))}
        onPointerUp={(v) => onDepthCommit?.(toInternal(v))}
        onFocus={() => onDepthChangeStart?.(depth)}
        onCommit={(v) => { if (toInternal(v) >= toInternal(DEPTH_MIN)) onDepthCommit?.(toInternal(v)); }}
      />
      <SliderRow
        label="W" min={SIZE_MIN} max={SIZE_MAX} step={SIZE_STEP}
        value={displayWidth} disabled={disabled} labelWidth={12} decimalPlaces={0}
        onPointerDown={() => onSizeChangeStart?.()}
        onChange={(v) => { if (toInternal(v) >= toInternal(SIZE_MIN)) handleWidthChange(v); }}
        onPointerUp={(v) => onSizeCommit?.(toInternal(v), Math.max(toInternal(SIZE_MIN), toInternal(v) * aspectRatio))}
        onFocus={() => onSizeChangeStart?.()}
        onCommit={(v) => { if (toInternal(v) >= toInternal(SIZE_MIN)) onSizeCommit?.(toInternal(v), Math.max(toInternal(SIZE_MIN), toInternal(v) * aspectRatio)); }}
      />
      <SliderRow
        label="H" min={SIZE_MIN} max={SIZE_MAX} step={SIZE_STEP}
        value={displayHeight} disabled={disabled} labelWidth={12} decimalPlaces={0}
        onPointerDown={() => onSizeChangeStart?.()}
        onChange={(v) => { if (toInternal(v) >= toInternal(SIZE_MIN)) handleHeightChange(v); }}
        onPointerUp={(v) => onSizeCommit?.(Math.max(toInternal(SIZE_MIN), toInternal(v) / aspectRatio), toInternal(v))}
        onFocus={() => onSizeChangeStart?.()}
        onCommit={(v) => { if (toInternal(v) >= toInternal(SIZE_MIN)) onSizeCommit?.(Math.max(toInternal(SIZE_MIN), toInternal(v) / aspectRatio), toInternal(v)); }}
      />
    </div>
  );
}
