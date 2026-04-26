import type { ReactNode } from 'react';

type Tone = 'default' | 'up' | 'down' | 'accent';

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  big = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  big?: boolean;
}) {
  const valueColor =
    tone === 'up'
      ? 'text-kpi-up'
      : tone === 'down'
        ? 'text-kpi-down'
        : tone === 'accent'
          ? 'text-amber-700'
          : 'text-ink';

  const valueSize = big ? 'text-5xl md:text-6xl' : 'text-3xl md:text-4xl';

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-subtle">{label}</p>
      <p className={`font-serif italic ${valueSize} ${valueColor} mt-1.5 tracking-tight tabular-nums`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-1.5">{sub}</p>}
    </div>
  );
}

export function HeroValue({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  const valueColor =
    tone === 'up'
      ? 'text-kpi-up'
      : tone === 'down'
        ? 'text-kpi-down'
        : tone === 'accent'
          ? 'text-amber-700'
          : 'text-ink';

  return (
    <section className="py-2">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`font-serif italic text-6xl md:text-8xl ${valueColor} tracking-tight tabular-nums mt-2 leading-none`}
      >
        {value}
      </p>
      {sub && <p className="text-sm text-muted mt-3">{sub}</p>}
    </section>
  );
}
