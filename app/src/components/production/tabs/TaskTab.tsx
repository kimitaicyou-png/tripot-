'use client';

import { useState, useMemo } from 'react';
import type { ProductionCard, ProductionCardTask } from '@/lib/stores/types';
import { MEMBERS, getMemberName } from '@/lib/constants/members';
import { VENDORS } from '@/lib/constants/vendors';
import { formatYen } from '@/lib/format';
import { safePercent } from '@/lib/safeMath';
import { calcMemberLoad } from '@/lib/calc/productionCalc';
import { ProgressBar } from '@/components/ui/ProgressBar';

type Props = {
  card: ProductionCard;
  allCards: ProductionCard[];
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
  onTaskUpdate: (cardId: string, taskId: string, patch: Partial<ProductionCardTask>) => void;
  onTaskAdd: (cardId: string, task: ProductionCardTask) => void;
  onTaskRemove: (cardId: string, taskId: string) => void;
  aiBusy: string | null;
  onAiAction: (action: string) => void;
};

const STATUS_CLS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  doing: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
};

export function TaskTab({ card, allCards, onUpdate, onTaskUpdate, onTaskAdd, onTaskRemove, aiBusy, onAiAction }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState(card.pmId);

  const memberLoad = useMemo(() => calcMemberLoad(allCards), [allCards]);
  const taskCost = card.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const budget = card.referenceArtifacts.budget;
  const budgetPct = safePercent(taskCost, budget);
  const budgetRemaining = budget - taskCost;
  const needsTasks = card.tasks.length === 0;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const task: ProductionCardTask = {
      id: `t_${card.id}_${Date.now()}`,
      title: newTitle.trim(),
      status: 'todo',
      assigneeId: newAssignee || undefined,
    };
    onTaskAdd(card.id, task);
    setNewTitle('');
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-900">予算消化</p>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <span>制作予算</span>
            <span className="font-medium text-gray-900 tabular-nums">{formatYen(budget)}</span>
            <span>/</span>
            <span>消化</span>
            <span className={`font-medium tabular-nums ${budgetPct > 100 ? 'text-red-600' : 'text-gray-900'}`}>{formatYen(taskCost)}</span>
            <span>/</span>
            <span>残</span>
            <span className={`font-medium tabular-nums ${budgetRemaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatYen(budgetRemaining)}</span>
          </div>
          <ProgressBar
            pct={budgetPct}
            color={budgetPct > 100 ? 'bg-red-600' : budgetPct > 80 ? 'bg-amber-500' : 'bg-blue-600'}
            height="h-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">タスク <span className="text-gray-500 font-normal">({card.tasks.length}件)</span></p>
          {!needsTasks && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const dups = card.tasks.filter((x) => x.status !== 'done').map((x, i) => ({ ...x, id: `t_${card.id}_dup_${Date.now()}_${i}`, status: 'todo' as const }));
                  if (dups.length > 0) onUpdate(card.id, { tasks: [...card.tasks, ...dups] });
                }}
                className="text-xs font-medium text-gray-800 hover:text-blue-600 active:scale-[0.98]"
              >全複製</button>
            </div>
          )}
        </div>
        {needsTasks ? (
          <div className="p-4 space-y-3">
            <button
              onClick={() => onAiAction('generate-tasks')}
              disabled={aiBusy !== null}
              className="w-full py-3 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {aiBusy === 'generate-tasks' ? '生成中...' : 'AIでタスクを自動生成'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {card.tasks.map((t, idx) => (
              <div key={t.id} className="px-3 py-2.5 hover:bg-gray-50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col shrink-0 -mr-0.5">
                    <button disabled={idx === 0} onClick={() => { const arr = [...card.tasks]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; onUpdate(card.id, { tasks: arr }); }} className="text-gray-600 text-xs leading-none disabled:opacity-20 active:scale-[0.9]">▲</button>
                    <button disabled={idx === card.tasks.length - 1} onClick={() => { const arr = [...card.tasks]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; onUpdate(card.id, { tasks: arr }); }} className="text-gray-600 text-xs leading-none disabled:opacity-20 active:scale-[0.9]">▼</button>
                  </div>
                  <select
                    value={t.status}
                    onChange={(e) => onTaskUpdate(card.id, t.id, { status: e.target.value as ProductionCardTask['status'] })}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500 shrink-0 cursor-pointer ${STATUS_CLS[t.status]}`}
                  >
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="review">review</option>
                    <option value="done">done</option>
                  </select>
                  <input
                    type="text" value={t.title}
                    onChange={(e) => onTaskUpdate(card.id, t.id, { title: e.target.value })}
                    className={`text-sm flex-1 bg-transparent border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white rounded-lg px-1 py-0.5 ${t.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}
                  />
                  <button onClick={() => { onTaskAdd(card.id, { ...t, id: `t_${card.id}_dup_${Date.now()}`, status: 'todo' }); }} className="text-gray-700 hover:text-blue-600 text-sm shrink-0 active:scale-[0.98] w-6 h-6 rounded-lg hover:bg-blue-50 flex items-center justify-center" title="複製">📋</button>
                  <button onClick={() => onTaskRemove(card.id, t.id)} className="text-gray-700 hover:text-red-600 text-sm shrink-0 active:scale-[0.98] w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center" title="削除">✕</button>
                </div>
                <div className="flex items-center gap-2 text-xs pl-1">
                  <select
                    value={t.assigneeType ?? 'internal'}
                    onChange={(e) => onTaskUpdate(card.id, t.id, { assigneeType: e.target.value as 'internal' | 'external' })}
                    className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 shrink-0 text-gray-900"
                  >
                    <option value="internal">内部</option>
                    <option value="external">外部</option>
                  </select>
                  {(t.assigneeType ?? 'internal') === 'internal' ? (
                    <select
                      value={t.assigneeId ?? ''}
                      onChange={(e) => onTaskUpdate(card.id, t.id, { assigneeId: e.target.value || undefined })}
                      className="text-xs text-gray-900 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 min-w-[12rem]"
                    >
                      <option value="">未割当</option>
                      {MEMBERS.map((m) => {
                        const load = memberLoad.get(m.id)?.active ?? 0;
                        const lvl = m.level === 'junior' ? 'Jr' : m.level === 'mid' ? 'Mid' : m.level === 'senior' ? 'Sr' : 'Lead';
                        const warn = load >= 8 ? '!' : load >= 4 ? '△' : '';
                        return <option key={m.id} value={m.id}>{m.name} [{lvl}] {load}件{warn}</option>;
                      })}
                    </select>
                  ) : (
                    <input
                      type="text" value={t.externalPartnerName ?? ''}
                      onChange={(e) => onTaskUpdate(card.id, t.id, { externalPartnerName: e.target.value })}
                      placeholder="外注先"
                      className="text-xs text-gray-900 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 min-w-[8rem]"
                    />
                  )}
                  <span className="text-gray-700">原価</span>
                  <input
                    type="number" value={t.estimatedCost ?? ''}
                    onChange={(e) => onTaskUpdate(card.id, t.id, { estimatedCost: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="円"
                    className="text-xs text-gray-900 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 w-24 tabular-nums"
                  />
                  <span className="text-gray-700">納期</span>
                  <input
                    type="date" value={t.dueDate ?? ''}
                    onChange={(e) => onTaskUpdate(card.id, t.id, { dueDate: e.target.value || undefined })}
                    className="text-xs text-gray-900 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {t.assigneeType === 'external' && (
                  <div className="flex items-center gap-2 text-xs pl-1">
                    <span className="text-gray-800">レビュー担当</span>
                    <select
                      value={t.reviewerId ?? ''}
                      onChange={(e) => onTaskUpdate(card.id, t.id, { reviewerId: e.target.value || undefined })}
                      className="text-xs bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">未設定</option>
                      {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {t.reviewerId && (
                      <select
                        value={t.reviewStatus ?? 'pending'}
                        onChange={(e) => {
                          const rs = e.target.value as 'pending' | 'in_review' | 'approved' | 'rejected';
                          const patch: Partial<ProductionCardTask> = { reviewStatus: rs };
                          if (rs === 'approved') patch.status = 'done';
                          if (rs === 'rejected') patch.status = 'doing';
                          onTaskUpdate(card.id, t.id, patch);
                        }}
                        className={`text-xs font-medium rounded-full px-2 py-0.5 border focus:ring-2 focus:ring-blue-500 ${
                          (t.reviewStatus ?? 'pending') === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          (t.reviewStatus ?? 'pending') === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                          (t.reviewStatus ?? 'pending') === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="pending">待ち</option>
                        <option value="in_review">レビュー中</option>
                        <option value="approved">承認</option>
                        <option value="rejected">差し戻し</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
              <input
                type="text" value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="+ タスクを追加してEnter"
                className="text-sm flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
              />
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-2 focus:ring-blue-500 shrink-0 max-w-[7rem] text-gray-900"
              >
                {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim()}
                className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] shrink-0"
              >追加</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
