'use client';

import { useState } from 'react';
import { formatYen } from '@/lib/format';

type KanbanCard = {
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  progress?: number;
  assignee?: string;
  daysLeft?: number;
  risk?: 'none' | 'low' | 'medium' | 'high';
  claim?: boolean;
  nextAction?: string;
  badge?: string;
};

type KanbanColumn = {
  id: string;
  label: string;
  cards: KanbanCard[];
};

type Props = {
  columns: KanbanColumn[];
  onCardClick?: (cardId: string) => void;
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void;
};

function RiskDot({ risk }: { risk: string }) {
  if (risk === 'none') return null;
  const color = risk === 'high' ? 'bg-red-500' : risk === 'medium' ? 'bg-amber-400' : 'bg-blue-400';
  return <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />;
}

export function KanbanBoard({ columns, onCardClick, onCardMove }: Props) {
  const [dragCard, setDragCard] = useState<{ cardId: string; fromColumn: string } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (cardId: string, columnId: string) => {
    setDragCard({ cardId, fromColumn: columnId });
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = (columnId: string) => {
    if (dragCard && dragCard.fromColumn !== columnId && onCardMove) {
      onCardMove(dragCard.cardId, dragCard.fromColumn, columnId);
    }
    setDragCard(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDragCard(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const totalAmount = col.cards.reduce((s, c) => s + (c.amount ?? 0), 0);
        const isDragOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-52 rounded-lg transition-colors ${isDragOver ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-gray-50'}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={() => handleDrop(col.id)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="px-3 py-2.5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{col.label}</span>
                <span className="text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded-full px-2 py-0.5">{col.cards.length}</span>
              </div>
              {totalAmount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{formatYen(totalAmount)}</p>
              )}
            </div>

            <div className="p-2 space-y-2 min-h-[120px]">
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id, col.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onCardClick?.(card.id)}
                  className={`bg-white border rounded-lg p-3 cursor-pointer hover:border-blue-300 transition-all ${
                    card.claim ? 'border-red-300 border-l-2 border-l-red-500' : 'border-gray-200'
                  } ${dragCard?.cardId === card.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{card.title}</p>
                    {card.risk && card.risk !== 'none' && <RiskDot risk={card.risk} />}
                  </div>
                  <p className="text-xs text-gray-500 mb-1.5">{card.subtitle}</p>

                  {card.progress !== undefined && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${card.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 tabular-nums">{card.progress}%</span>
                    </div>
                  )}

                  {card.amount !== undefined && card.amount > 0 && (
                    <p className="text-xs font-semibold text-gray-900 tabular-nums mb-1">{formatYen(card.amount)}</p>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    {card.assignee && <span className="text-gray-500">{card.assignee}</span>}
                    {card.daysLeft !== undefined && (
                      <span className={card.daysLeft < 14 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                        {card.daysLeft > 0 ? `残${card.daysLeft}日` : `${Math.abs(card.daysLeft)}日超過`}
                      </span>
                    )}
                  </div>

                  {card.nextAction && (
                    <p className="text-xs text-blue-600 mt-1.5 truncate">📅 {card.nextAction}</p>
                  )}

                  {card.badge && (
                    <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">{card.badge}</span>
                  )}

                  {card.claim && (
                    <p className="text-xs text-red-600 font-medium mt-1">⚠ クレーム対応中</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { KanbanCard, KanbanColumn };
