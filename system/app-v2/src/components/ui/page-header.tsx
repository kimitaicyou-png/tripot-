import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="bg-card border-b border-border">
      <div className="px-6 py-6 max-w-7xl mx-auto flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className="text-xs text-muted hover:text-ink transition-colors inline-block mb-1.5">
              ← {back.label}
            </Link>
          )}
          {eyebrow && (
            <p className="text-xs uppercase tracking-widest text-subtle font-medium mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">{title}</h1>
          {subtitle && (
            <div className="text-sm text-muted mt-1.5">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
