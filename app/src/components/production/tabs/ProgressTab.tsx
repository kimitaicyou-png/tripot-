'use client';

import type { ProductionCard, CardStatus, RiskLevel, Milestone } from '@/lib/stores/types';
import { RISK_COLOR } from '@/lib/constants/stages';

type Props = {
  card: ProductionCard;
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
};

export function ProgressTab({ card, onUpdate }: Props) {
  const milestones = card.milestones ?? [];
  const progress = card.progress ?? 0;

  const addMilestone = () => {
    onUpdate(card.id, {
      milestones: [...milestones, { id: `ms_${Date.now()}`, label: '新しいマイルストーン', dueDate: '2026-05-01', done: false }],
    });
  };

  const toggleMilestone = (msId: string) => {
    onUpdate(card.id, {
      milestones: milestones.map((m) => m.id === msId ? { ...m, done: !m.done } : m),
    });
  };

  const updateMilestone = (msId: string, patch: Partial<Milestone>) => {
    onUpdate(card.id, {
      milestones: milestones.map((m) => m.id === msId ? { ...m, ...patch } : m),
    });
  };

  const removeMilestone = (msId: string) => {
    onUpdate(card.id, {
      milestones: milestones.filter((m) => m.id !== msId),
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">進捗</p>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">{progress}%</span>
        </div>
        <input
          type="range"
          min={0} max={100} step={5}
          value={progress}
          onChange={(e) => onUpdate(card.id, { progress: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-800">リスク</span>
            <select
              value={card.risk}
              onChange={(e) => onUpdate(card.id, { risk: e.target.value as RiskLevel })}
              className={`text-xs font-medium rounded-full px-2 py-1 border focus:ring-2 focus:ring-blue-500 ${RISK_COLOR[card.risk]} text-gray-900`}
            >
              <option value="none">リスクなし</option>
              <option value="low">リスク低</option>
              <option value="medium">リスク中</option>
              <option value="high">リスク高</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-800">ステータス</span>
            <select
              value={card.status}
              onChange={(e) => onUpdate(card.id, { status: e.target.value as CardStatus })}
              className={`text-xs font-medium rounded-full px-2 py-1 border focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                card.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                card.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                card.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <option value="active">アクティブ</option>
              <option value="paused">保留</option>
              <option value="done">完了</option>
              <option value="cancelled">中止</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">マイルストーン</p>
          <button type="button" onClick={addMilestone} className="text-xs font-medium text-blue-600 hover:text-blue-800 active:scale-[0.98]">+ 追加</button>
        </div>
        {milestones.length === 0 ? (
          <p className="text-xs text-gray-700 text-center py-4">マイルストーンがありません</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                <button type="button" onClick={() => toggleMilestone(m.id)} className="text-sm shrink-0 active:scale-[0.98]">{m.done ? '✅' : '○'}</button>
                <input
                  type="text" value={m.label}
                  onChange={(e) => updateMilestone(m.id, { label: e.target.value })}
                  className={`text-xs flex-1 bg-transparent border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-1 py-0.5 text-gray-900 ${m.done ? 'line-through text-gray-500' : ''}`}
                />
                <input
                  type="date" value={m.dueDate}
                  onChange={(e) => updateMilestone(m.id, { dueDate: e.target.value })}
                  className="text-xs bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 text-gray-900 shrink-0"
                />
                <button type="button" onClick={() => removeMilestone(m.id)} className="text-gray-600 hover:text-red-600 text-sm shrink-0 active:scale-[0.98] w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center" title="削除">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-900">振り返り</p>
        </div>
        <textarea
          value={card.retrospective ?? ''}
          onChange={(e) => onUpdate(card.id, { retrospective: e.target.value })}
          placeholder="良かった点・反省・次に活かすこと"
          className="w-full min-h-[100px] text-sm p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-b-xl resize-y text-gray-900"
        />
      </div>
    </>
  );
}
