'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({
  open,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="fixed inset-0 bg-slate-900/40 animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={`relative w-full ${sizeClass} bg-white border border-gray-200 rounded-xl shadow-sm max-h-[90vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50"
        aria-label="閉じる"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className ?? ''}`}>{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
      {children}
    </div>
  );
}
