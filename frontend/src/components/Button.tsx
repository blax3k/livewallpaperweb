import React from 'react';
import './Button.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger';
}

export function Button({ variant = 'default', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn--${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
