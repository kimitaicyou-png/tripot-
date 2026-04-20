'use client';

import { useState } from 'react';
import type { ProductionCard, Phase } from '@/lib/stores/types';
import { PHASE_ORDER } from '@/lib/constants/stages';
import { KanbanColumn } from './KanbanColumn';

type Props = {
  cards: ProductionCard[];
  onMove: (cardId: string, toPhase: Phase) => void;
  onOpenCard: (id: string) => void;
};

export function KanbanBoard({ cards, onMove, onOpenCard }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overPhase, setOverPhase] = useState<Phase | null>(null);

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-2">
      <div className="flex gap-4 min-w-max">
        {PHASE_ORDER.map((phase) => {
          const phaseCards = cards.filter((c) => c.phase === phase);
          return (
            <KanbanColumn
              key={phase}
              phase={phase}
              cards={phaseCards}
              isOver={overPhase === phase}
              onDragOver={(e) => { e.preventDefault(); setOverPhase(phase); }}
              onDragLeave={() => setOverPhase((p) => (p === phase ? null : p))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) onMove(dragId, phase);
                setDragId(null);
                setOverPhase(null);
              }}
              onOpenCard={onOpenCard}
              onDragStart={(id) => setDragId(id)}
              onDragEnd={() => { setDragId(null); setOverPhase(null); }}
            />
          );
        })}
      </div>
    </div>
  );
}
