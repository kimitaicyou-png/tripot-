'use client';

type Props = {
  pct: number;
  color?: string;
  height?: string;
};

export function ProgressBar({ pct, color = 'bg-blue-600', height = 'h-1.5' }: Props) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={`w-full bg-gray-100 rounded-full ${height} overflow-hidden`}>
      <div className={`${height} rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
