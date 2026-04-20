'use client';

import { useState } from 'react';

type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  impact: 'none' | 'schedule' | 'cost' | 'both';
  costDelta: number;
  scheduleDelta: number;
  status: 'requested' | 'approved' | 'rejected';
  requestedAt: string;
  requestedBy: string;
};

type Props = {
  changes: ChangeRequest[];
  onChange: (changes: ChangeRequest[]) => void;
};

const IMPACT_BADGE: Record<ChangeRequest['impact'], string> = {
  none:     'bg-gray-100 text-gray-500',
  schedule: 'bg-blue-50 text-blue-700 border border-blue-200',
  cost:     'bg-gray-100 text-gray-700 border border-gray-300',
  both:     'bg-red-50 text-red-700 border border-red-200',
};

const IMPACT_LABEL: Record<ChangeRequest['impact'], string> = {
  none:     '影響なし',
  schedule: 'スケジュール影響',
  cost:     'コスト影響',
  both:     'コスト+スケジュール影響',
};

const STATUS_BADGE: Record<ChangeRequest['status'], string> = {
  requested: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved:  'bg-gray-100 text-gray-700 border border-gray-300',
  rejected:  'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_LABEL: Record<ChangeRequest['status'], string> = {
  requested: '申請中',
  approved:  '承認',
  rejected:  '却下',
};

const EMPTY_DRAFT: Omit<ChangeRequest, 'id'> = {
  title: '',
  description: '',
  impact: 'none',
  costDelta: 0,
  scheduleDelta: 0,
  status: 'requested',
  requestedAt: '',
  requestedBy: '',
};

function generateId(): string {
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function ChangeLog({ changes, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<ChangeRequest, 'id'>>(EMPTY_DRAFT);

  const handleAdd = () => {
    if (!draft.title) return;
    onChange([...changes, { id: generateId(), ...draft }]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  };

  const handleApprove = (id: string) => {
    onChange(changes.map((c) => c.id === id ? { ...c, status: 'approved' } : c));
  };

  const handleReject = (id: string) => {
    onChange(changes.map((c) => c.id === id ? { ...c, status: 'rejected' } : c));
  };

  const totalCostDelta = changes.filter((c) => c.status === 'approved').reduce((s, c) => s + c.costDelta, 0);
  const totalScheduleDelta = changes.filter((c) => c.status === 'approved').reduce((s, c) => s + c.scheduleDelta, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">変更管理</span>
        {changes.some((c) => c.status === 'approved') && (
          <div className="flex gap-3 text-xs text-gray-500">
            {totalCostDelta !== 0 && (
              <span className={totalCostDelta > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                コスト {totalCostDelta > 0 ? '+' : ''}{(totalCostDelta / 10000).toFixed(0)}万
              </span>
            )}
            {totalScheduleDelta !== 0 && (
              <span className={totalScheduleDelta > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                納期 +{totalScheduleDelta}日
              </span>
            )}
          </div>
        )}
      </div>

      {changes.length === 0 && !adding && (
        <p className="text-sm text-gray-500 text-center py-6">変更記録はありません</p>
      )}

      <div className="divide-y divide-gray-100">
        {changes.map((c) => (
          <div key={c.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-gray-600 mb-1.5 leading-relaxed">{c.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${IMPACT_BADGE[c.impact]}`}>
                    {IMPACT_LABEL[c.impact]}
                  </span>
                  {c.costDelta !== 0 && (
                    <span className="text-xs text-gray-600">
                      コスト: {c.costDelta > 0 ? '+' : ''}¥{c.costDelta.toLocaleString()}
                    </span>
                  )}
                  {c.scheduleDelta !== 0 && (
                    <span className="text-xs text-gray-600">
                      納期: +{c.scheduleDelta}日
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.requestedAt} · {c.requestedBy}</p>
              </div>

              {c.status === 'requested' && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(c.id)}
                    className="text-xs px-2 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 font-semibold"
                  >
                    承認
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(c.id)}
                    className="text-xs px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">タイトル <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="変更内容を簡潔に"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">詳細</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              placeholder="変更の詳細や背景を記入"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">影響度</label>
              <select
                value={draft.impact}
                onChange={(e) => setDraft({ ...draft, impact: e.target.value as ChangeRequest['impact'] })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="none">影響なし</option>
                <option value="schedule">スケジュール</option>
                <option value="cost">コスト</option>
                <option value="both">両方</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">コスト差分(円)</label>
              <input
                type="number"
                value={draft.costDelta || ''}
                onChange={(e) => setDraft({ ...draft, costDelta: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">スケジュール(日)</label>
              <input
                type="number"
                value={draft.scheduleDelta || ''}
                onChange={(e) => setDraft({ ...draft, scheduleDelta: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">申請者</label>
              <input
                type="text"
                value={draft.requestedBy}
                onChange={(e) => setDraft({ ...draft, requestedBy: e.target.value })}
                placeholder="申請者名"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">申請日</label>
              <input
                type="date"
                value={draft.requestedAt}
                onChange={(e) => setDraft({ ...draft, requestedAt: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.title}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              記録
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT); }}
              className="px-4 py-1.5 text-sm border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            + 変更を記録
          </button>
        </div>
      )}
    </div>
  );
}

export type { ChangeRequest };

export const MOCK_CHANGES: ChangeRequest[] = [
  {
    id: 'cr1',
    title: '自動採点エンジンのスコープ追加',
    description: '当初予定になかったAI採点機能を追加',
    impact: 'both',
    costDelta: 500000,
    scheduleDelta: 14,
    status: 'approved',
    requestedAt: '2026-03-25',
    requestedBy: '教育委員会',
  },
  {
    id: 'cr2',
    title: 'レポート出力フォーマット変更',
    description: 'PDF→Excel出力に変更',
    impact: 'schedule',
    costDelta: 0,
    scheduleDelta: 3,
    status: 'requested',
    requestedAt: '2026-04-04',
    requestedBy: '教育委員会',
  },
];
