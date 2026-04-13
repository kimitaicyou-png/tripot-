'use client';

import { useState, useEffect } from 'react';
import type { ProductionCard } from '@/lib/stores/types';
import { PHASE_LABEL, RISK_COLOR, RISK_LABEL } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';
import { safePercent } from '@/lib/safeMath';
import { getMemberName } from '@/lib/constants/members';

type Tab = 'requirements' | 'structure' | 'tasks' | 'progress';

const TABS: { id: Tab; label: string }[] = [
  { id: 'requirements', label: '要件' },
  { id: 'structure', label: '構成' },
  { id: 'tasks', label: 'タスク' },
  { id: 'progress', label: '進捗' },
];

type Props = {
  card: ProductionCard;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
  children?: (tab: Tab, card: ProductionCard) => React.ReactNode;
};

export function CardDetailModal({ card, onClose, onUpdate, children }: Props) {
  const [tab, setTab] = useState<Tab>('requirements');
  const [handoffOpen, setHandoffOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const refs = card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' };
  const amt = card.amount ?? 0;
  const grossProfit = amt + (card.amendments ?? []).reduce((s, a) => s + a.amount, 0) - refs.budget;
  const grossRate = safePercent(grossProfit, amt);
  const delivery = [...(card.milestones ?? [])].reverse().find((m) => m.dueDate)?.dueDate ?? '';
  const dl = delivery ? Math.ceil((new Date(delivery).getTime() - new Date('2026-04-05').getTime()) / 86400000) : null;
  const dlColor = dl !== null && dl <= 14 ? 'text-red-600' : dl !== null && dl <= 30 ? 'text-blue-600' : 'text-gray-700';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-[fade-in_200ms_ease-out]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-4xl bg-white shadow-sm z-50 flex flex-col animate-[slide-in-right_250ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">{PHASE_LABEL[card.phase]}</span>
              {card.risk !== 'none' && <span className={`text-xs font-medium rounded-full px-2 py-0.5 border ${RISK_COLOR[card.risk]}`}>{RISK_LABEL[card.risk]}</span>}
            </div>
            <p className="text-base font-semibold text-gray-900 truncate">{card.dealName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.clientName}</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 active:scale-[0.98] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-5 pt-3 pb-0 bg-white border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
            <div><p className="text-gray-500 mb-0.5">受注額</p><p className="font-semibold text-gray-900 tabular-nums">{formatYen(amt)}</p></div>
            <div><p className="text-gray-500 mb-0.5">粗利</p><p className={`font-semibold tabular-nums ${grossRate >= 40 ? 'text-blue-600' : grossRate >= 20 ? 'text-gray-900' : 'text-red-600'}`}>{formatYen(grossProfit)}（{grossRate}%）</p></div>
            <div><p className="text-gray-500 mb-0.5">進捗</p><p className="font-semibold text-gray-900 tabular-nums">{card.progress ?? 0}%</p></div>
            <div><p className="text-gray-500 mb-0.5">納期</p><p className={`font-semibold ${dlColor} tabular-nums`}>{delivery || '—'}{dl !== null && dl >= 0 ? ` (残${dl}日)` : dl !== null ? ` (${Math.abs(dl)}日超過)` : ''}</p></div>
          </div>

          <button
            type="button"
            onClick={() => setHandoffOpen(!handoffOpen)}
            className="w-full px-3 py-2 bg-gray-50 flex items-center justify-between gap-2 hover:bg-gray-100 active:scale-[0.99] rounded-lg mb-3 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">引き継ぎ情報</span>
            <span className="text-gray-600 text-sm">{handoffOpen ? '▲' : '▼'}</span>
          </button>

          {handoffOpen && (
            <div className="border border-gray-200 rounded-lg mb-3 divide-y divide-gray-100 text-sm">
              <div className="p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">提案サマリー</p>
                <p className="text-gray-900 whitespace-pre-wrap">{refs.proposalSummary || '(未記載)'}</p>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">営業引き継ぎメモ</p>
                <textarea
                  value={card.salesHandoffNotes ?? ''}
                  onChange={(e) => onUpdate(card.id, { salesHandoffNotes: e.target.value })}
                  placeholder="先方の決裁者、予算感、競合状況など"
                  className="w-full min-h-[80px] text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y text-gray-900"
                />
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-700 mb-1">見積・予算</p>
                <div className="space-y-1 text-gray-900">
                  <div className="flex justify-between"><span className="text-gray-700">受注金額</span><span className="font-medium tabular-nums">{formatYen(amt)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-700">制作予算</span><span className="font-medium tabular-nums">{formatYen(refs.budget)}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1"><span className="text-gray-700">目標粗利</span><span className="font-medium tabular-nums text-blue-600">{formatYen(grossProfit)}（{grossRate}%）</span></div>
                </div>
                <p className="text-xs text-gray-700 mt-2">PM: <span className="font-medium text-gray-900">{getMemberName(card.pmId ?? '')}</span></p>
              </div>
            </div>
          )}

          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors active:scale-[0.98] ${
                  tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children?.(tab, card)}
        </div>
      </div>
    </>
  );
}
