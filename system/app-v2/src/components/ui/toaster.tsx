'use client';

import { Toaster as SonnerToaster } from 'sonner';
export { toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'bg-card border border-border text-ink rounded-xl shadow-sm font-sans text-sm',
          title: 'text-ink font-medium',
          description: 'text-muted text-sm',
          actionButton: 'bg-ink text-card text-xs px-2 py-1 rounded-lg',
          cancelButton: 'text-subtle text-xs',
        },
      }}
    />
  );
}
