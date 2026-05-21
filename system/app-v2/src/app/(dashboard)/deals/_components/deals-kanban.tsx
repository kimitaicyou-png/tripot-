'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { updateDealStage } from '@/lib/actions/deals';
import { formatYen, formatShortYen } from '@/lib/format';
import { toast } from '@/components/ui/toaster';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';

/**
 * 案件パイプライン Kanban（Client Component、ドラッグ&ドロップ対応）
 *
 * 隊長指摘 (2026-05-20)「動線が多いと迷う」+「すすめなさい」の継続実装。
 * 表示専用 Kanban から、カードを別 stage 列にドラッグして案件ステージを変更できる
 * インタラクティブ版に進化。
 *
 * 設計：
 * - dnd-kit/core を使用（HTML5 native よりアクセシブル、touch 対応）
 * - 楽観的更新：ドラッグ即 UI を更新、その後 updateDealStage を呼んで失敗時ロールバック
 * - toast で成功/失敗通知、router.refresh で確実に同期
 * - 既存 InlineStageChanger と同じ updateDealStage を呼ぶ（一貫性）
 */

type DealItem = {
  id: string;
  title: string;
  stage: string;
  amount: number | null;
  monthly_amount: number | null;
  revenue_type: string;
  assignee_name: string | null;
  customer_name: string | null;
  updated_at: Date;
  gross_profit: number | null;
  gross_profit_rate: string | number | null;
};

function DealCard({
  deal,
  isDragging = false,
}: {
  deal: DealItem;
  isDragging?: boolean;
}) {
  const rate = deal.gross_profit_rate == null ? null : Number(deal.gross_profit_rate);
  return (
    <div
      className={`block bg-white border rounded-lg p-3 transition-all duration-150 ${
        isDragging
          ? 'border-gray-900 shadow-sm rotate-2 cursor-grabbing'
          : 'border-gray-200 hover:border-gray-400 cursor-grab'
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium leading-tight line-clamp-2">
            {deal.title}
          </p>
          {deal.customer_name && (
            <p className="text-[11px] text-gray-600 mt-1 truncate">{deal.customer_name}</p>
          )}
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span className="font-mono tabular-nums text-sm text-gray-900 font-semibold">
              {formatShortYen(deal.amount)}
            </span>
            {rate !== null && (deal.amount ?? 0) > 0 && (
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                  rate >= 50
                    ? 'bg-emerald-50 text-emerald-700'
                    : rate >= 20
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                }`}
                title={`粗利 ${formatYen(deal.gross_profit)} / 粗利率 ${rate.toFixed(2)}%`}
              >
                {rate.toFixed(0)}%
              </span>
            )}
          </div>
          {deal.revenue_type !== 'spot' && deal.monthly_amount ? (
            <p className="text-[10px] text-amber-700 font-mono tabular-nums mt-0.5">
              月 {formatShortYen(deal.monthly_amount)}
            </p>
          ) : null}
          {deal.assignee_name && (
            <p className="text-[10px] text-gray-500 mt-1 truncate">{deal.assignee_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ deal }: { deal: DealItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  // ドラッグ中は本体を半透明にし、DragOverlay が前面で表示される
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? 'opacity-30' : ''}
    >
      <Link
        href={`/deals/${deal.id}`}
        // クリックとドラッグの両立：クリックは onMouseDown が抑制されないように
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <DealCard deal={deal} />
      </Link>
    </div>
  );
}

function DroppableColumn({
  stageKey,
  children,
}: {
  stageKey: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  return (
    <div
      ref={setNodeRef}
      className={`p-2 space-y-2 min-h-[120px] max-h-[640px] overflow-y-auto rounded-b-xl transition-colors duration-150 ${
        isOver ? 'bg-amber-50/50' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function DealsKanban({ deals: initialDeals }: { deals: DealItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deals, setDeals] = useState<DealItem[]>(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // 6px ドラッグでアクティベート、誤クリック防止
    })
  );

  const allStages = TRIPOT_CONFIG.stages;
  const mainStages = allStages.filter((s) => s.key !== 'lost');
  const lostDeals = deals.filter((d) => d.stage === 'lost');

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStage = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    const prevStage = deal.stage;

    // 楽観的更新
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
    );
    setPendingChanges((s) => new Set(s).add(dealId));

    try {
      const result = await updateDealStage(dealId, targetStage);
      if (!result.ok) {
        // ロールバック
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stage: prevStage } : d))
        );
        toast.error('ステージ変更に失敗', { description: result.error });
        return;
      }
      const fromLabel = allStages.find((s) => s.key === prevStage)?.label ?? prevStage;
      const toLabel = allStages.find((s) => s.key === targetStage)?.label ?? targetStage;
      toast.success(`ステージを変更しました`, {
        description: `${deal.title}：${fromLabel} → ${toLabel}`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      // ロールバック
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: prevStage } : d))
      );
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('ステージ変更に失敗', { description: msg });
    } finally {
      setPendingChanges((s) => {
        const next = new Set(s);
        next.delete(dealId);
        return next;
      });
    }
  }

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* 説明バー */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-xs text-gray-700">
          カードを別の列にドラッグすると案件ステージが変わります。
          書類のステータス更新でも自動進行します（提案 shared → 提案中、見積 accepted → 受注 等）。
        </div>

        {/* 横スクロール Kanban */}
        <div className="overflow-x-auto -mx-6 px-6 pb-4">
          <div className="flex gap-3 min-w-max">
            {mainStages.map((stageDef) => {
              const items = deals.filter((d) => d.stage === stageDef.key);
              const total = items.reduce((s, d) => s + (d.amount ?? 0), 0);
              const cashflowWeighted = Math.round(total * stageDef.cashflowWeight);
              const cashflowPercent = Math.round(stageDef.cashflowWeight * 100);

              return (
                <section
                  key={stageDef.key}
                  className="w-72 shrink-0 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <div className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg ${stageDef.badgeClass}`}
                      >
                        {stageDef.label}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-gray-500">
                        CF {cashflowPercent}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-mono tabular-nums text-gray-700">
                        {items.length} 件
                      </span>
                      <span className="font-mono tabular-nums text-gray-900 font-semibold">
                        {formatShortYen(total)}
                      </span>
                    </div>
                    {cashflowWeighted > 0 && cashflowWeighted !== total && (
                      <p className="text-[10px] font-mono tabular-nums text-gray-500 mt-0.5">
                        加重 {formatShortYen(cashflowWeighted)}
                      </p>
                    )}
                  </div>

                  <DroppableColumn stageKey={stageDef.key}>
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        （ここにドラッグ）
                      </p>
                    ) : (
                      items.map((d) => (
                        <div
                          key={d.id}
                          className={pendingChanges.has(d.id) ? 'opacity-50' : ''}
                        >
                          <DraggableCard deal={d} />
                        </div>
                      ))
                    )}
                  </DroppableColumn>
                </section>
              );
            })}
          </div>
        </div>

        {/* 失注 */}
        {lostDeals.length > 0 && (
          <details className="bg-white border border-gray-200 rounded-xl">
            <summary className="cursor-pointer list-none px-5 py-3 hover:bg-gray-50 active:scale-[0.998] rounded-xl">
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-red-700" />
                <span className="text-gray-900 font-medium">失注</span>
                <span className="font-mono tabular-nums text-xs text-gray-500">
                  {lostDeals.length} 件
                </span>
                <span className="text-xs text-gray-500 ml-auto">クリックで表示</span>
              </div>
            </summary>
            <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-2">
              {lostDeals.map((d) => (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-400"
                >
                  <p className="text-sm text-gray-900 font-medium">{d.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {d.customer_name ?? '—'} · {formatYen(d.amount)}
                  </p>
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="w-64">
            <DealCard deal={activeDeal} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
