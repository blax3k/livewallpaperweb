import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import './dialog.scss';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogOverlay({ className = '', ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={`dialog-overlay ${className}`.trim()} {...props} />;
}

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showClose?: boolean;
}

export function DialogContent({ className = '', children, showClose = true, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content className={`dialog-content ${className}`.trim()} {...props}>
        {children}
        {showClose && (
          <DialogPrimitive.Close className="dialog-close-button">
            <X size={14} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
