import Link from 'next/link';

export function EmptyState({
  icon = '◯',
  title,
  description,
  cta,
}: {
  icon?: string;
  title: string;
  description?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      <p className="font-semibold text-5xl text-gray-500 mb-3">{icon}</p>
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
