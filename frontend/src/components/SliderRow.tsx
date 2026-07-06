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

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const trackStyle = {
    '--lw-track-fill': `linear-gradient(to right, var(--color-accent) ${percent}%, var(--color-track) ${percent}%)`,
  } as React.CSSProperties;

  const formatValue = (v: number) => String(parseFloat(v.toFixed(decimalPlaces)));

  const [localText, setLocalText] = React.useState(() => formatValue(value));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) setLocalText(formatValue(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimalPlaces, isFocused]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalText(text);
    if (text === '') {
      onChange(min);
      return;
    }
    const v = parseFloat(text);
    if (!isNaN(v) && v >= min && v <= max) {
      onChange(v);
      onCommit?.(v);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const v = parseFloat(localText);
    const finalValue = (localText === '' || isNaN(v))
      ? min
      : Math.min(max, Math.max(min, v));
    onChange(finalValue);
    onCommit?.(finalValue);
    setLocalText(formatValue(finalValue));
  };

  return (
    <div className="slider-row">
      <label style={Object.keys(labelStyle).length ? labelStyle : undefined}>
        {label}
      </label>
      <input
        type="range"
        style={disabled ? undefined : trackStyle}
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
        type="text"
        inputMode="decimal"
        value={localText}
        disabled={disabled}
        onFocus={() => { setIsFocused(true); onFocus?.(); }}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </div>
  );
}
