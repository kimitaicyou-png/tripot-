'use client';

import type { ProductionCard, Phase } from '@/lib/stores/types';
import { PHASE_LABEL, PHASE_BORDER_COLOR } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';
import { KanbanCard } from './KanbanCard';

type Props = {
  phase: Phase;
  cards: ProductionCard[];
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onOpenCard: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
};

export function KanbanColumn({ phase, cards, isOver, onDragOver, onDragLeave, onDrop, onOpenCard, onDragStart, onDragEnd }: Props) {
  const totalAmount = cards.reduce((s, c) => s + c.amount, 0);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-72 shrink-0 rounded-xl border-l-2 transition-colors ${PHASE_BORDER_COLOR[phase]} ${
        isOver ? 'border border-blue-400 bg-blue-50/60' : 'border border-gray-200 bg-gray-50'
      }`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-inherit rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate">{PHASE_LABEL[phase]}</span>
          <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5 tabular-nums">{cards.length}</span>
        </div>
        <span className="text-xs font-medium text-gray-500 tabular-nums shrink-0">
          {cards.length > 0 ? formatYen(totalAmount) : '—'}
        </span>
      </div>
      <div className="p-2 space-y-2 min-h-[120px]">
        {cards.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-6">—</div>
        ) : (
          cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onOpen={() => onOpenCard(card.id)}
              onDragStart={() => onDragStart(card.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}
