'use client';

import { useEffect } from 'react';
import type { AttackTarget } from '@/lib/stores/attackStore';

const STATUS_BADGE: Record<AttackTarget['status'], { label: string; color: string }> = {
  new:       { label: '新規', color: 'bg-gray-100 text-gray-600' },
  contacted: { label: '接触済', color: 'bg-blue-50 text-blue-700' },
  meeting:   { label: '商談中', color: 'bg-amber-50 text-amber-700' },
  dealt:     { label: '案件化', color: 'bg-emerald-50 text-emerald-700' },
  declined:  { label: '辞退', color: 'bg-gray-100 text-gray-500' },
};

const NEXT_STATUS: Record<string, AttackTarget['status']> = {
  new: 'contacted',
  contacted: 'meeting',
  meeting: 'dealt',
};

type Props = {
  target: AttackTarget;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AttackTarget>) => void;
};

export function AttackDetailModal({ target, onClose, onEdit, onRemove, onUpdate }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const badge = STATUS_BADGE[target.status];
  const nextStatus = NEXT_STATUS[target.status];
  const nextBadge = nextStatus ? STATUS_BADGE[nextStatus] : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-[fade-in_200ms_ease-out]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-sm z-50 flex flex-col animate-[slide-in-right_250ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
              <span className="text-xs text-gray-500 tabular-nums">優先度 {target.priority}</span>
            </div>
            <p className="text-base font-semibold text-gray-900">{target.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{target.company}{target.department && ` / ${target.department}`}</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 active:scale-[0.98] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">役職</p>
              <p className="text-gray-900">{target.position || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">業種</p>
              <p className="text-gray-900">{target.industry || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">メール</p>
              {target.email ? (
                <a href={`mailto:${target.email}`} className="text-blue-600 hover:underline">{target.email}</a>
              ) : <p className="text-gray-500">—</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">電話</p>
              {target.phone ? (
                <a href={`tel:${target.phone}`} className="text-blue-600 hover:underline">{target.phone}</a>
              ) : <p className="text-gray-500">—</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">名刺交換日</p>
              <p className="text-gray-900 tabular-nums">{target.exchangedDate || '—'}</p>
            </div>
          </div>

          {target.memo && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">メモ</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{target.memo}</p>
            </div>
          )}

          {nextStatus && nextBadge && (
            <button
              type="button"
              onClick={() => onUpdate(target.id, { status: nextStatus })}
              className="w-full text-sm py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-colors"
            >
              → {nextBadge.label} に進める
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onRemove(target.id)}
            className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:scale-[0.98]"
          >
            削除
          </button>
          <button
            type="button"
            onClick={() => onEdit(target.id)}
            className="text-xs px-3 py-1.5 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
          >
            編集
          </button>
        </div>
      </div>
    </>
  );
}
