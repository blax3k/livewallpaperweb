import React from 'react';
import './PhoneGuideControl.scss';

interface PhoneGuideControlProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (visible: boolean) => void;
}

export function PhoneGuideControl({ checked, disabled, onChange }: PhoneGuideControlProps) {
  return (
    <label className="guide-label">
      <input
        type="checkbox"
        className="guide-checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>Phone Guide</span>
    </label>
  );
}
