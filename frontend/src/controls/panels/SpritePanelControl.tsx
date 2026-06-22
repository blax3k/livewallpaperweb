import React, { useState, useRef, useEffect } from 'react';
import { Link2, Unlink2 } from 'lucide-react';
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

const LINK_ICON_SIZE = 12;

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
  const [linked, setLinked] = useState(true);
  // Ratio captured at unlink time; enforced again when relinking.
  const lockedRatio = useRef<number | null>(null);

  // Reset when a different sprite is selected.
  useEffect(() => {
    lockedRatio.current = null;
    setLinked(true);
  }, [spriteName]);

  const liveRatio = width > 0 && height > 0 ? height / width : 1;
  const effectiveRatio = lockedRatio.current ?? liveRatio;

  const handleToggleLinked = () => {
    if (linked) {
      lockedRatio.current = liveRatio;
      setLinked(false);
    } else {
      setLinked(true);
      if (lockedRatio.current !== null) {
        const ratio = lockedRatio.current;
        const [newW, newH] = width >= height
          ? [width, Math.max(toInternal(SIZE_MIN), width * ratio)]
          : [Math.max(toInternal(SIZE_MIN), height / ratio), height];
        onSizeChangeStart?.();
        onSizeChange(newW, newH);
        onSizeCommit?.(newW, newH);
      }
    }
  };

  const handleWidthChange = (displayW: number) => {
    const newW = toInternal(displayW);
    const newH = linked ? Math.max(toInternal(SIZE_MIN), newW * effectiveRatio) : height;
    onSizeChange(newW, newH);
  };

  const handleHeightChange = (displayH: number) => {
    const newH = toInternal(displayH);
    const newW = linked ? Math.max(toInternal(SIZE_MIN), newH / effectiveRatio) : width;
    onSizeChange(newW, newH);
  };

  const handleSizeCommit = (displayValue: number, axis: 'width' | 'height') => {
    const v = toInternal(displayValue);
    if (v < toInternal(SIZE_MIN)) return;
    const [newW, newH] = axis === 'width'
      ? [v, linked ? Math.max(toInternal(SIZE_MIN), v * effectiveRatio) : height]
      : [linked ? Math.max(toInternal(SIZE_MIN), v / effectiveRatio) : width, v];
    onSizeCommit?.(newW, newH);
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
      <div className="size-controls">
        <SliderRow
          label="W" min={SIZE_MIN} max={SIZE_MAX} step={SIZE_STEP}
          value={displayWidth} disabled={disabled} labelWidth={12} decimalPlaces={0}
          onPointerDown={() => onSizeChangeStart?.()}
          onChange={(v) => { if (toInternal(v) >= toInternal(SIZE_MIN)) handleWidthChange(v); }}
          onPointerUp={(v) => handleSizeCommit(v, 'width')}
          onFocus={() => onSizeChangeStart?.()}
          onCommit={(v) => handleSizeCommit(v, 'width')}
        />
        <SliderRow
          label="H" min={SIZE_MIN} max={SIZE_MAX} step={SIZE_STEP}
          value={displayHeight} disabled={disabled} labelWidth={12} decimalPlaces={0}
          onPointerDown={() => onSizeChangeStart?.()}
          onChange={(v) => { if (toInternal(v) >= toInternal(SIZE_MIN)) handleHeightChange(v); }}
          onPointerUp={(v) => handleSizeCommit(v, 'height')}
          onFocus={() => onSizeChangeStart?.()}
          onCommit={(v) => handleSizeCommit(v, 'height')}
        />
        <div className="aspect-ratio-toggle">
          <button
            className={`aspect-ratio-toggle__btn${linked ? ' aspect-ratio-toggle__btn--linked' : ''}`}
            onClick={handleToggleLinked}
            title={linked ? 'Unlink width and height' : 'Link width and height'}
            tabIndex={-1}
          >
            {linked ? <Link2 size={LINK_ICON_SIZE} /> : <Unlink2 size={LINK_ICON_SIZE} />}
          </button>
        </div>
      </div>
    </div>
  );
}
