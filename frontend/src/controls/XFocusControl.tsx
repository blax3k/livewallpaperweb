import React from 'react';
import { SliderRow } from '../components/SliderRow';

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
        min={0} max={1} step={0.01}
        value={value}
        disabled={disabled}
        decimalPlaces={2}
        onChange={onChange}
        onPointerDown={() => onChangeStart?.(value)}
        onPointerUp={(v) => onChangeCommit?.(v)}
      />
    </div>
  );
}
