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
            'bg-white border border-gray-200 text-gray-900 rounded-xl shadow-sm font-sans text-sm',
          title: 'text-gray-900 font-medium',
          description: 'text-gray-700 text-sm',
          actionButton: 'bg-gray-900 text-white text-xs px-2 py-1 rounded-lg',
          cancelButton: 'text-gray-500 text-xs',
        },
      }}
    />
  );
}
