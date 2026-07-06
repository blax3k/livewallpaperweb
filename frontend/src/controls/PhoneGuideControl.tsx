import React from 'react';
import { Smartphone, Check } from 'lucide-react';
import { PHONE_GUIDE_ASPECT_RATIOS, PhoneGuideAspectRatio } from '../renderers/PhoneGuide';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/dropdown-menu';
import './PhoneGuideControl.scss';

export type PhoneGuideValue = 'off' | PhoneGuideAspectRatio;

interface PhoneGuideControlProps {
  value: PhoneGuideValue;
  disabled?: boolean;
  onChange: (value: PhoneGuideValue) => void;
}

export function PhoneGuideControl({ value, disabled, onChange }: PhoneGuideControlProps) {
  const isOn = value !== 'off';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={isOn ? `Phone guide: ${value}` : 'Phone guide off'}
          className={`guide-toggle ${isOn ? 'guide-toggle--on' : ''}`.trim()}
        >
          <Smartphone size={13} />
          {isOn ? value : 'Guide'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onChange('off')}>
          <span className="guide-menu-item">
            <Check size={13} className={value === 'off' ? '' : 'guide-menu-item__check--hidden'} />
            Off
          </span>
        </DropdownMenuItem>
        {PHONE_GUIDE_ASPECT_RATIOS.map((ratio) => (
          <DropdownMenuItem key={ratio} onSelect={() => onChange(ratio)}>
            <span className="guide-menu-item">
              <Check size={13} className={value === ratio ? '' : 'guide-menu-item__check--hidden'} />
              {ratio}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
