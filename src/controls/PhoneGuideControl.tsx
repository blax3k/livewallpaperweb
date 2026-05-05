import React from 'react';
import './PhoneGuideControl.scss';

interface PhoneGuideControlProps {
  visible: boolean;
  onToggle: (visible: boolean) => void;
}

export function PhoneGuideControl({ visible, onToggle }: PhoneGuideControlProps) {
  if (!visible) return null;
  return (
    <div className="control-group">
      <label className="guide-label">
        <input
          type="checkbox"
          id="phone-guide-toggle"
          className="guide-checkbox"
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>Show Phone Guide</span>
      </label>
    </div>
  );
}
