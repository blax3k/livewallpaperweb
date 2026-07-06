import React from 'react';
import { Smartphone } from 'lucide-react';
import './PhoneGuideControl.scss';

interface PhoneGuideControlProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (visible: boolean) => void;
}

export function PhoneGuideControl({ checked, disabled, onChange }: PhoneGuideControlProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={checked ? 'Phone guide on' : 'Phone guide off'}
      onClick={() => onChange(!checked)}
      className={`guide-toggle ${checked ? 'guide-toggle--on' : ''}`.trim()}
    >
      <Smartphone size={13} />
      Guide
    </button>
  );
}
