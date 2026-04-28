import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  cta,
}: {
  icon?: LucideIcon | string;
  title: string;
  description?: string;
  cta?: { href: string; label: string };
}) {
  const Icon: LucideIcon = typeof icon === 'function' ? icon : Inbox;
  const useIconComponent = typeof icon !== 'string';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      {useIconComponent ? (
        <div className="flex justify-center mb-3">
          <Icon className="w-12 h-12 text-gray-500" strokeWidth={1.5} />
        </div>
      ) : (
        <p className="font-semibold text-5xl text-gray-500 mb-3">{icon}</p>
      )}
      <p className="text-base text-gray-900 font-medium">{title}</p>
      {description && <p className="text-xs text-gray-700 mt-2">{description}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="inline-block mt-5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
