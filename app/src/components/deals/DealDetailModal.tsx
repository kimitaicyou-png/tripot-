'use client';

import { useEffect } from 'react';
import type { Deal } from '@/lib/stores/types';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';

type Props = {
  deal: Deal;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Deal>) => void;
};

const NEXT_STAGE: Partial<Record<string, string[]>> = {
  lead: ['meeting'],
  meeting: ['proposal'],
  proposal: ['estimate_sent'],
  estimate_sent: ['negotiation'],
  negotiation: ['ordered', 'lost'],
  ordered: ['in_production'],
  in_production: ['delivered'],
  delivered: ['acceptance'],
  acceptance: ['invoiced'],
  invoiced: ['accounting'],
  accounting: ['paid'],
};

export function DealDetailModal({ deal, onClose, onUpdate }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const nextStages = NEXT_STAGE[deal.stage] ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-[fade-in_200ms_ease-out]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-[560px] bg-white shadow-sm z-50 flex flex-col animate-[slide-in-right_250ms_ease-out]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">{deal.dealName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{deal.clientName} · {deal.industry}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 active:scale-[0.98] text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STAGE_BADGE[deal.stage]}`}>
              {STAGE_LABEL[deal.stage]}
            </span>
            <span className="text-xs text-gray-500">担当: {deal.assignee}</span>
            <span className="text-xs text-gray-500">最終: {deal.lastDate}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-0.5">受注額</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{deal.amount > 0 ? formatYen(deal.amount) : '未定'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-0.5">確度</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{deal.probability}%</p>
            </div>
          </div>

          {deal.memo && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">メモ</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.memo}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">金額変更</p>
            <input
              type="number"
              defaultValue={deal.amount}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v !== deal.amount) onUpdate(deal.id, { amount: v });
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">メモ更新</p>
            <textarea
              defaultValue={deal.memo}
              onBlur={(e) => {
                if (e.target.value !== deal.memo) onUpdate(deal.id, { memo: e.target.value });
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {nextStages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">ステージ変更</p>
              <div className="flex gap-2 flex-wrap">
                {nextStages.map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdate(deal.id, { stage: s as Deal['stage'], lastDate: new Date().toISOString().slice(0, 10) })}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all duration-150 ${
                      s === 'lost'
                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    → {STAGE_LABEL[s as Deal['stage']]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
