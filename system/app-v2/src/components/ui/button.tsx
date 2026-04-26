import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-mid active:scale-[0.98] disabled:opacity-50',
  secondary: 'bg-card border border-border text-ink hover:bg-slate-50 active:scale-[0.98]',
  ghost: 'text-muted hover:text-ink active:scale-[0.98]',
  danger: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 active:scale-[0.98]',
};

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function LinkButton({
  href,
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors duration-150 cursor-pointer select-none ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
