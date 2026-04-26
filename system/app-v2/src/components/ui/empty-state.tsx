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
    <div className="bg-card border border-border rounded-xl p-12 text-center">
      <p className="font-serif italic text-5xl text-subtle mb-3">{icon}</p>
      <p className="text-base text-ink font-medium">{title}</p>
      {description && <p className="text-xs text-muted mt-2">{description}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="inline-block mt-5 px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
