'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { updateProductionCardStatus } from '@/lib/actions/production';
import { toast } from '@/components/ui/toaster';

type ProductionStatus = 'requirements' | 'designing' | 'building' | 'reviewing' | 'delivered' | 'cancelled';

type Card = {
  id: string;
  title: string;
  status: ProductionStatus;
  deal_id: string | null;
  deal_title: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  started_at: string | null;
  delivered_at: string | null;
};

type StatusGroup = {
  key: ProductionStatus;
  label: string;
  headerClass: string;
  borderClass: string;
};

const STATUS_GROUPS: StatusGroup[] = [
  { key: 'requirements', label: '要件定義', headerClass: 'text-gray-700 bg-gray-50', borderClass: 'border-gray-200' },
  { key: 'designing', label: '設計', headerClass: 'text-blue-700 bg-blue-50', borderClass: 'border-blue-200' },
  { key: 'building', label: '実装', headerClass: 'text-indigo-700 bg-indigo-50', borderClass: 'border-indigo-200' },
  { key: 'reviewing', label: 'レビュー', headerClass: 'text-amber-700 bg-amber-50', borderClass: 'border-amber-200' },
  { key: 'delivered', label: '納品済', headerClass: 'text-emerald-700 bg-emerald-50', borderClass: 'border-emerald-200' },
  { key: 'cancelled', label: 'キャンセル', headerClass: 'text-gray-500 bg-gray-50', borderClass: 'border-gray-200' },
];

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export function ProductionKanban({ initialCards }: { initialCards: Card[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const newStatus = over.id as ProductionStatus;
    if (!STATUS_GROUPS.some((g) => g.key === newStatus)) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

    const oldStatus = card.status;

    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c)));

    startTransition(async () => {
      const result = await updateProductionCardStatus(cardId, newStatus);
      if (!result.success) {
        toast.error('ステータス更新失敗', { description: result.error });
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: oldStatus } : c)));
        return;
      }
      toast.success(`「${STATUS_GROUPS.find((g) => g.key === newStatus)?.label}」に更新`);
      router.refresh();
    });
  }

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_GROUPS.map((group) => {
          const list = cards.filter((c) => c.status === group.key);
          return <Column key={group.key} group={group} cards={list} />;
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_GROUPS.map((group) => {
          const list = cards.filter((c) => c.status === group.key);
          return <Column key={group.key} group={group} cards={list} />;
        })}
      </div>
      <DragOverlay>
        {activeCard ? <CardContent card={activeCard} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ group, cards }: { group: StatusGroup; cards: Card[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border ${group.borderClass} bg-white transition-colors ${isOver ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
    >
      <div className={`px-3 py-2 rounded-t-lg ${group.headerClass} border-b ${group.borderClass}`}>
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest font-medium">{group.label}</p>
          <span className="text-xs font-mono tabular-nums">{cards.length}</span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
        {cards.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">空</p>
        ) : (
          cards.map((c) => <DraggableCard key={c.id} card={c} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-900 transition-colors">
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-500 hover:text-gray-700 cursor-grab active:cursor-grabbing"
            aria-label="ドラッグして移動"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <CardContent card={card} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CardContent({ card, dragging = false }: { card: Card; dragging?: boolean }) {
  return (
    <div className={dragging ? 'bg-white border border-gray-900 rounded-lg p-3 shadow-sm' : ''}>
      <Link
        href={`/production/${card.id}`}
        className="text-sm font-medium text-gray-900 truncate block hover:underline"
        onClick={(e) => dragging && e.preventDefault()}
      >
        {card.title}
      </Link>
      {card.deal_id && card.deal_title && (
        <Link
          href={`/deals/${card.deal_id}`}
          className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 truncate mt-0.5"
          onClick={(e) => dragging && e.preventDefault()}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{card.deal_title}</span>
        </Link>
      )}
      <div className="flex flex-wrap items-baseline gap-2 mt-1.5 text-xs text-gray-500">
        {card.estimated_cost !== null && card.estimated_cost > 0 && (
          <span>
            見積{' '}
            <span className="font-mono tabular-nums text-gray-900">{formatYen(card.estimated_cost)}</span>
          </span>
        )}
        {card.actual_cost !== null && card.actual_cost > 0 && (
          <span>
            実績{' '}
            <span className="font-mono tabular-nums text-gray-900">{formatYen(card.actual_cost)}</span>
          </span>
        )}
        {card.delivered_at && <span className="font-mono tabular-nums">納品 {card.delivered_at}</span>}
      </div>
    </div>
  );
}
