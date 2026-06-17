import React from 'react';
import { SliderRow } from '../components/SliderRow';
import { DISPLAY_SCALE, toDisplay, toInternal } from '../displayScale';

interface XFocusControlProps {
  disabled?: boolean;
  value: number;
  onChange: (value: number) => void;
  onChangeStart?: (value: number) => void;
  onChangeCommit?: (value: number) => void;
}

export function XFocusControl({ disabled, value, onChange, onChangeStart, onChangeCommit }: XFocusControlProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <SliderRow
        label="Focus"
        min={0} max={DISPLAY_SCALE} step={1}
        value={Math.round(toDisplay(value))}
        disabled={disabled}
        decimalPlaces={0}
        onChange={(v) => onChange(toInternal(v))}
        onPointerDown={() => onChangeStart?.(value)}
        onPointerUp={(v) => onChangeCommit?.(toInternal(v))}
      />
    </div>
  );
}
