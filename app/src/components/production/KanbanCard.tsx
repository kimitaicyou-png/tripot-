'use client';

import type { ProductionCard } from '@/lib/stores/types';
import { PHASE_LABEL, RISK_COLOR, RISK_LABEL } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';
import { safePercent } from '@/lib/safeMath';
import { getMemberName } from '@/lib/constants/members';
import { ProgressBar } from '@/components/ui/ProgressBar';

type Props = {
  card: ProductionCard;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

function getDeliveryDate(card: ProductionCard): string {
  const last = [...card.milestones].reverse().find((m) => m.dueDate);
  return last?.dueDate ?? '';
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - new Date('2026-04-05').getTime()) / 86400000);
}

export function KanbanCard({ card, onOpen, onDragStart, onDragEnd }: Props) {
  const delivery = getDeliveryDate(card);
  const dl = daysUntil(delivery);
  const dlColor = dl !== null && dl <= 14 ? 'text-red-600' : dl !== null && dl <= 30 ? 'text-blue-600' : 'text-gray-700';

  const grossProfit = card.amount + (card.amendments ?? []).reduce((s, a) => s + a.amount, 0) - card.referenceArtifacts.budget;
  const grossRate = safePercent(grossProfit, card.amount);

  const taskCost = card.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const budgetPct = safePercent(taskCost, card.referenceArtifacts.budget);
  const budgetBadge =
    budgetPct > 100 ? { label: `予算超過 ${budgetPct}%`, cls: 'bg-red-50 text-red-700 border-red-300' } :
    budgetPct >= 80 ? { label: `予算 ${budgetPct}%`, cls: 'bg-amber-50 text-amber-700 border-amber-300' } :
    null;

  const needsTasks = card.tasks.length === 0 && card.status === 'active';

  const cardStyle =
    card.status === 'cancelled' ? 'bg-gray-50 border-red-200 opacity-60' :
    card.status === 'done' ? 'bg-gray-50 border-emerald-200 opacity-70' :
    card.status === 'paused' ? 'bg-amber-50/40 border-amber-200 opacity-80' :
    'bg-white border-gray-200';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`border rounded-lg p-3 cursor-pointer active:scale-[0.98] hover:border-blue-300 transition-all duration-150 ${cardStyle}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-sm font-medium text-gray-900 leading-tight truncate flex-1 ${card.status === 'cancelled' ? 'line-through text-gray-600' : ''}`}>
          {card.dealName}
        </p>
        {card.risk !== 'none' && (
          <span className={`text-xs font-medium rounded-full px-1.5 py-0.5 border shrink-0 ${RISK_COLOR[card.risk]}`}>
            {RISK_LABEL[card.risk]}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{card.clientName}</p>
      <div className="flex items-center gap-1.5 mb-2">
        <ProgressBar pct={card.progress} height="h-1.5" />
        <span className="text-xs font-medium text-gray-600 tabular-nums w-7 text-right">{card.progress}%</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 truncate">{getMemberName(card.pmId)}</span>
        <span className={`font-medium tabular-nums ${grossRate >= 40 ? 'text-blue-600' : grossRate >= 20 ? 'text-gray-700' : 'text-red-600'}`}>{grossRate}%</span>
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-gray-700 font-medium tabular-nums">{formatYen(card.amount)}</span>
        {delivery && (
          <span className={`font-medium ${dlColor}`}>
            {delivery.slice(5)}{dl !== null && dl >= 0 ? ` (残${dl})` : dl !== null ? ` (${Math.abs(dl)}超過)` : ''}
          </span>
        )}
      </div>
      {card.status !== 'active' && (
        <div className={`mt-2 text-xs font-medium rounded px-1.5 py-0.5 text-center border ${
          card.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
          card.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {card.status === 'cancelled' ? '中止' : card.status === 'paused' ? '保留' : '完了'}
        </div>
      )}
      {budgetBadge && <div className={`mt-2 text-xs font-medium rounded px-1.5 py-0.5 text-center border ${budgetBadge.cls}`}>{budgetBadge.label}</div>}
      {needsTasks && <div className="mt-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-center">タスク未生成</div>}
    </div>
  );
}
