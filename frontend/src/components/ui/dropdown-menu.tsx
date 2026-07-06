import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import './dropdown-menu.scss';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className = '', sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={`dropdown-menu-content ${className}`.trim()}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

interface DropdownMenuItemProps extends React.ComponentProps<typeof DropdownMenuPrimitive.Item> {
  danger?: boolean;
}

export function DropdownMenuItem({ className = '', danger, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={`dropdown-menu-item ${danger ? 'dropdown-menu-item--danger' : ''} ${className}`.trim()}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className = '', ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={`dropdown-menu-separator ${className}`.trim()} {...props} />;
}
