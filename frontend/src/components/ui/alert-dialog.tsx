import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import './alert-dialog.scss';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;

export function AlertDialogContent({ className = '', children, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="alert-dialog-overlay" />
      <AlertDialogPrimitive.Content className={`alert-dialog-content ${className}`.trim()} {...props}>
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
