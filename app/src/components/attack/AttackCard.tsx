'use client';

import type { AttackTarget } from '@/lib/stores/attackStore';

const STATUS_BADGE: Record<AttackTarget['status'], { label: string; color: string }> = {
  new:       { label: '新規', color: 'bg-gray-100 text-gray-600' },
  contacted: { label: '接触済', color: 'bg-blue-50 text-blue-700' },
  meeting:   { label: '商談中', color: 'bg-amber-50 text-amber-700' },
  dealt:     { label: '案件化', color: 'bg-emerald-50 text-emerald-700' },
  declined:  { label: '辞退', color: 'bg-gray-100 text-gray-500' },
};

type Props = {
  target: AttackTarget;
  onClick: () => void;
};

export function AttackCard({ target, onClick }: Props) {
  const badge = STATUS_BADGE[target.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-gray-200 shadow-sm bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{target.name}</p>
          <p className="text-xs text-gray-500 truncate">{target.company}{target.position && ` / ${target.position}`}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        {target.industry && <span>{target.industry}</span>}
        {target.exchangedDate && <span className="tabular-nums">{target.exchangedDate}</span>}
        <span className="ml-auto tabular-nums">優先度 {target.priority}</span>
      </div>
      {target.memo && (
        <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{target.memo}</p>
      )}
    </button>
  );
}
