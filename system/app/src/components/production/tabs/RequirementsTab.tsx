'use client';

import { useState, useMemo } from 'react';
import type { ProductionCard, ProductionCardTask } from '@/lib/stores/types';
import { parseRequirementItems } from '@/lib/calc/productionCalc';

type Props = {
  card: ProductionCard;
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
  aiBusy: string | null;
  onAiAction: (action: string) => void;
};

export function RequirementsTab({ card, onUpdate, aiBusy, onAiAction }: Props) {
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const refs = card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' };
  const tasks = card.tasks ?? [];
  const items = useMemo(() => parseRequirementItems(refs.requirement), [refs.requirement]);
  const tasksByReq = useMemo(() => {
    const map = new Map<string, ProductionCardTask[]>();
    for (const t of tasks) {
      for (const ref of t.requirementRefs ?? []) {
        const arr = map.get(ref) ?? [];
        arr.push(t);
        map.set(ref, arr);
      }
    }
    return map;
  }, [tasks]);

  const pushUndo = () => setUndoStack((s) => [...s, refs.requirement ?? '']);
  const popUndo = () => {
    const last = undoStack[undoStack.length - 1];
    if (last === undefined) return;
    onUpdate(card.id, { referenceArtifacts: { ...refs, requirement: last } });
    setUndoStack((s) => s.slice(0, -1));
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-gray-900">要件定義</p>
          <div className="flex gap-1.5 flex-wrap">
            {undoStack.length > 0 && (
              <button onClick={popUndo} className="text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-200 active:scale-[0.98]">元に戻す</button>
            )}
            <button
              onClick={() => { pushUndo(); onAiAction('refine-requirements'); }}
              disabled={aiBusy !== null}
              className="text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2 py-1 hover:bg-purple-100 active:scale-[0.98] disabled:opacity-50"
            >{aiBusy === 'refine-requirements' ? '整形中...' : 'AIで整形'}</button>
            <button
              onClick={() => onAiAction('generate-sitemap')}
              disabled={aiBusy !== null || !(refs.requirement ?? '').trim()}
              className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100 active:scale-[0.98] disabled:opacity-50"
            >{aiBusy === 'generate-sitemap' ? '生成中...' : 'サイトマップ生成'}</button>
            <button
              onClick={() => onAiAction('generate-tasks')}
              disabled={aiBusy !== null || !(refs.requirement ?? '').trim()}
              className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50"
            >{aiBusy === 'generate-tasks' ? '生成中...' : 'タスク自動生成'}</button>
          </div>
        </div>
        <textarea
          value={refs.requirement ?? ''}
          onChange={(e) => onUpdate(card.id, { referenceArtifacts: { ...refs, requirement: e.target.value } })}
          placeholder="# 要件定義書&#10;&#10;## 機能要件&#10;- ..."
          className="w-full min-h-[260px] text-sm p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-b-xl resize-y font-mono text-gray-900"
        />
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">要件項目 ⇔ タスク</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const linked = tasksByReq.get(item.id) ?? [];
              const covered = linked.length > 0;
              return (
                <li key={item.id} className="px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span style={{ paddingLeft: `${item.depth * 12}px` }} className={`text-sm flex-1 ${covered ? 'text-gray-900' : 'text-gray-700'}`}>・{item.text}</span>
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 border shrink-0 ${covered ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {covered ? `${linked.length}タスク` : '未カバー'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
