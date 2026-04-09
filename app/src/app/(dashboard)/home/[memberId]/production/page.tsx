'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatYen } from '@/lib/format';
import { loadProductionCards, updateProductionCard, type ProductionCard, type ProductionCardTask } from '@/lib/productionCards';
import { MEMBERS } from '@/lib/currentMember';

const STATUS_STYLE: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  doing: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
};

export default function MemberProductionPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [cards, setCards] = useState<ProductionCard[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'doing' | 'review' | 'done'>('all');

  useEffect(() => { setCards(loadProductionCards()); }, []);

  const changeTaskStatus = (cardId: string, taskId: string, newStatus: ProductionCardTask['status']) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const now = new Date().toISOString().slice(0, 10);
    const tasks = card.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const updated = { ...t, status: newStatus };
      if (newStatus === 'done' && !t.completedAt) (updated as Record<string, unknown>).completedAt = now;
      if (newStatus === 'doing' && !t.startedAt) (updated as Record<string, unknown>).startedAt = now;
      if (newStatus !== 'done') (updated as Record<string, unknown>).completedAt = undefined;
      return updated;
    });
    updateProductionCard(cardId, { tasks });
    setCards(loadProductionCards());
  };

  const member = MEMBERS.find((m) => m.id === memberId);

  const myTasks = useMemo(() => {
    const result: { card: ProductionCard; task: ProductionCardTask }[] = [];
    for (const c of cards) {
      if (c.status === 'cancelled') continue;
      for (const t of c.tasks) {
        if (t.assigneeId === memberId) result.push({ card: c, task: t });
      }
    }
    return result;
  }, [cards, memberId]);

  const filtered = filter === 'all' ? myTasks : myTasks.filter((x) => x.task.status === filter);
  const counts = { all: myTasks.length, todo: 0, doing: 0, review: 0, done: 0 };
  for (const x of myTasks) counts[x.task.status] += 1;

  const activeTasks = myTasks.filter((x) => x.task.status !== 'done');
  const totalCost = activeTasks.reduce((s, x) => s + (x.task.estimatedCost ?? 0), 0);
  const overdueTasks = activeTasks.filter((x) => x.task.dueDate && x.task.dueDate < '2026-04-05');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700 mb-0.5">未完了タスク</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{activeTasks.length}<span className="text-sm text-gray-700 ml-1">件</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700 mb-0.5">進行中</p>
          <p className="text-2xl font-semibold text-blue-600 tabular-nums">{counts.doing}<span className="text-sm text-gray-700 ml-1">件</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700 mb-0.5">担当原価合計</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{formatYen(totalCost)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700 mb-0.5">期限切れ</p>
          <p className={`text-2xl font-semibold tabular-nums ${overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueTasks.length}<span className="text-sm text-gray-700 ml-1">件</span></p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'todo', 'doing', 'review', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 border active:scale-[0.98] transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}
            >
              {s === 'all' ? '全て' : s} ({counts[s]})
            </button>
          ))}
        </div>
        <Link href="/production" className="text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-[0.98]">カンバンを見る →</Link>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <p className="text-base font-semibold text-gray-900 mb-1">タスクはありません</p>
          <p className="text-sm text-gray-700">{member?.name ?? memberId} にアサインされた制作タスクがここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ card, task }) => {
            const overdue = task.dueDate && task.dueDate < '2026-04-05' && task.status !== 'done';
            return (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <select
                    value={task.status}
                    onChange={(e) => { e.preventDefault(); e.stopPropagation(); changeTaskStatus(card.id, task.id, e.target.value as ProductionCardTask['status']); }}
                    onClick={(e) => e.preventDefault()}
                    className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${STATUS_STYLE[task.status]}`}
                  >
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="review">review</option>
                    <option value="done">done</option>
                  </select>
                  <span className="text-sm font-semibold text-gray-900 truncate flex-1">{task.title}</span>
                  {task.estimatedCost != null && task.estimatedCost > 0 && (
                    <span className="text-xs text-gray-700 tabular-nums shrink-0">{formatYen(task.estimatedCost)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-700">
                  <span className="truncate">📁 {card.dealName}</span>
                  <span className="text-gray-600">({card.clientName})</span>
                  {task.dueDate && (
                    <span className={`shrink-0 font-semibold ${overdue ? 'text-red-600' : 'text-gray-800'}`}>
                      {overdue ? '🔴 期限切れ ' : ''}納期 {task.dueDate.slice(5)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
