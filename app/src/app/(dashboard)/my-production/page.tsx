'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatYen } from '@/lib/format';
import { loadProductionCards, type ProductionCard, type ProductionCardTask } from '@/lib/productionCards';
import { getCurrentMemberId, MEMBERS } from '@/lib/currentMember';

const STATUS_STYLE: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  doing: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
};

export default function MyProductionPage() {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'doing' | 'review' | 'done'>('all');

  useEffect(() => { setCards(loadProductionCards()); }, []);

  const memberId = getCurrentMemberId();
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">マイ制作</p>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">{member?.name ?? memberId} のタスク</h1>
        </div>
        <Link href="/production" className="text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-[0.98]">カンバンを見る →</Link>
      </div>

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

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <p className="text-base font-semibold text-gray-900 mb-1">タスクはありません</p>
          <p className="text-sm text-gray-700">制作カードからタスクがアサインされるとここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ card, task }) => {
            const overdue = task.dueDate && task.dueDate < '2026-04-05' && task.status !== 'done';
            return (
              <Link
                key={task.id}
                href="/production"
                className="block bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-300 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_STYLE[task.status]}`}>{task.status}</span>
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
