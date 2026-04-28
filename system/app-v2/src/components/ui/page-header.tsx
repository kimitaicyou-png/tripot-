import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

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
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-6 max-w-7xl mx-auto flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 transition-colors mb-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              {back.label}
            </Link>
          )}
          {eyebrow && (
            <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && (
            <div className="text-sm text-gray-700 mt-1.5">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
