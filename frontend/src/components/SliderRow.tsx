import React from 'react';
import './SliderRow.scss';

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  decimalPlaces?: number;
  labelWidth?: number | string;
  labelAlign?: 'left' | 'right';
  onChange: (value: number) => void;
  onPointerDown?: () => void;
  onPointerUp?: (value: number) => void;
  onFocus?: () => void;
  onCommit?: (value: number) => void;
}

export function SliderRow({
  label, min, max, step, value, disabled,
  decimalPlaces = 2, labelWidth, labelAlign,
  onChange, onPointerDown, onPointerUp, onFocus, onCommit,
}: SliderRowProps) {
  const labelStyle: React.CSSProperties = {};
  if (labelWidth !== undefined) labelStyle.width = labelWidth;
  if (labelAlign !== undefined) labelStyle.textAlign = labelAlign;

  return (
    <div className="slider-row">
      <label style={Object.keys(labelStyle).length ? labelStyle : undefined}>
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onPointerDown={() => onPointerDown?.()}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={(e) => onPointerUp?.(parseFloat((e.target as HTMLInputElement).value))}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={parseFloat(value.toFixed(decimalPlaces))}
        disabled={disabled}
        onFocus={() => onFocus?.()}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) { onChange(v); onCommit?.(v); }
        }}
      />
    </div>
  );
}
