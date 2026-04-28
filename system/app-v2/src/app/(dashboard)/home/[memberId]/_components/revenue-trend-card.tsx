import { ArrowUp, ArrowDown } from 'lucide-react';

type Point = { week: string; value: number };

export function RevenueTrendCard({
  data,
  accent = '#0F172A',
}: {
  data: Point[];
  accent?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 w-full">
        <p className="text-xs uppercase tracking-widest text-gray-500">週次売上推移</p>
        <p className="text-sm text-gray-700 mt-3">まだデータがありません</p>
      </div>
    );
  }

  const w = 600;
  const h = 160;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const xy = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - ((d.value - min) / range) * innerH;
    return { x, y, value: d.value, week: d.week };
  });
  const linePath = `M ${xy.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${w - padR},${padT + innerH} L ${padL},${padT + innerH} Z`;
  const last = xy[xy.length - 1]!;
  const first = xy[0]!;
  const change =
    first.value > 0 ? Math.round(((last.value - first.value) / first.value) * 100) : 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const avg = Math.round(total / data.length);
  const gradId = `trend-${accent.replace('#', '')}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 w-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">週次売上推移</p>
          <p className="font-semibold text-3xl text-gray-900 tabular-nums mt-1">
            ¥{Math.round(last.value).toLocaleString('ja-JP')}
            <span className="text-sm text-gray-700 ml-1 font-sans not-italic">万</span>
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
              change >= 0
                ? 'text-emerald-700 bg-green-50 border border-green-200'
                : 'text-red-700 bg-red-50 border border-red-200'
            }`}
          >
            {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
          <p className="text-[11px] text-gray-700 mt-1 tabular-nums font-mono">
            平均 ¥{avg.toLocaleString('ja-JP')}万
          </p>
        </div>
      </div>
      <div className="flex-1 mt-3 -mx-2 min-h-0 flex items-end">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ height: 110 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <line
              key={r}
              x1={padL}
              x2={w - padR}
              y1={padT + innerH * r}
              y2={padT + innerH * r}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1={last.x}
            y1={padT}
            x2={last.x}
            y2={padT + innerH}
            stroke={accent}
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.4"
          />
          {xy.map((p, i) => (
            <g key={i}>
              {i === xy.length - 1 ? (
                <>
                  <circle cx={p.x} cy={p.y} r="10" fill={accent} fillOpacity="0.15" />
                  <circle cx={p.x} cy={p.y} r="5" fill={accent} stroke="#fff" strokeWidth="2.5" />
                </>
              ) : (
                <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke={accent} strokeWidth="2" />
              )}
            </g>
          ))}
          {xy.map((p, i) => (
            <text
              key={`x-${i}`}
              x={p.x}
              y={h - 6}
              textAnchor="middle"
              fill="#64748B"
              style={{ fontSize: 10, fontWeight: 500 }}
            >
              {p.week}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
