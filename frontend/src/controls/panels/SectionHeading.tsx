import React from 'react';
import './SectionHeading.scss';

export function SectionHeading({ children, action, className = '' }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`section-heading ${className}`.trim()}>
      <div className="section-heading__label">
        {children}
      </div>
      {action}
    </div>
  );
}
