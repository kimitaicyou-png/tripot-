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
      ? 'text-emerald-700'
      : tone === 'down'
        ? 'text-red-700'
        : tone === 'accent'
          ? 'text-amber-700'
          : 'text-gray-900';

  const valueSize = big ? 'text-[28px]' : 'text-xl';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`${valueSize} font-semibold ${valueColor} mt-1 tabular-nums`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
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
      ? 'text-emerald-700'
      : tone === 'down'
        ? 'text-red-700'
        : tone === 'accent'
          ? 'text-amber-700'
          : 'text-gray-900';

  return (
    <section className="py-2">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-[28px] font-semibold ${valueColor} tabular-nums mt-1`}>
        {value}
      </p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </section>
  );
}
