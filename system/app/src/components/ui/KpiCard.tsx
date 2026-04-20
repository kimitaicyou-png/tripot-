'use client';

type Props = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bar?: { pct: number; color?: string };
};

export function KpiCard({ label, value, sub, color = 'text-gray-900', bar }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      {bar && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${bar.color ?? 'bg-blue-600'}`}
            style={{ width: `${Math.min(100, Math.max(0, bar.pct))}%` }}
          />
        </div>
      )}
    </div>
  );
}
