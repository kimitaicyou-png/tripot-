'use client';

import { useState } from 'react';

type TimeEntry = {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  hours: number;
  description: string;
  taskId?: string;
};

type Props = {
  entries: TimeEntry[];
  onChange: (entries: TimeEntry[]) => void;
  budget: number;
};

const MEMBER_OPTIONS = [
  { id: 'kashiwagi', name: '柏樹 久美子' },
  { id: 'inukai',    name: '犬飼 智之' },
  { id: 'izumi',     name: '和泉 阿委璃' },
  { id: 'ono',       name: '小野 崇' },
];

const EMPTY_DRAFT = {
  date: '',
  memberId: 'kashiwagi',
  memberName: '柏樹 久美子',
  hours: 0,
  description: '',
};

function generateId(): string {
  return `te_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function TimeLog({ entries, onChange, budget }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const budgetRate = budget > 0 ? Math.min(100, Math.round((totalHours / budget) * 100)) : 0;
  const isOver = totalHours > budget && budget > 0;

  const memberTotals = MEMBER_OPTIONS.map((m) => ({
    ...m,
    hours: entries.filter((e) => e.memberId === m.id).reduce((s, e) => s + e.hours, 0),
  })).filter((m) => m.hours > 0);

  const handleAdd = () => {
    if (!draft.date || !draft.description || draft.hours <= 0) return;
    const member = MEMBER_OPTIONS.find((m) => m.id === draft.memberId) ?? MEMBER_OPTIONS[0];
    onChange([
      ...entries,
      {
        id: generateId(),
        date: draft.date,
        memberId: draft.memberId,
        memberName: member.name,
        hours: draft.hours,
        description: draft.description,
      },
    ]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">工数実績</span>
          <span className="text-xs text-gray-500">
            {totalHours}h / {budget > 0 ? `${budget}h` : '予算未設定'}
          </span>
        </div>
        {budget > 0 && (
          <div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-red-600' : 'bg-blue-600'}`}
                style={{ width: `${budgetRate}%` }}
              />
            </div>
            <p className={`text-xs mt-0.5 font-semibold ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
              {isOver ? `予算超過: ${totalHours - budget}h超` : `消化率 ${budgetRate}%`}
            </p>
          </div>
        )}
      </div>

      {memberTotals.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-3">
          {memberTotals.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{m.name}</span>
              <span className="text-xs font-semibold text-gray-900 tabular-nums">{m.hours}h</span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !adding && (
        <p className="text-sm text-gray-500 text-center py-6">工数記録はありません</p>
      )}

      {sortedEntries.length > 0 && (
        <div className="divide-y divide-gray-100">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50">
              <div className="w-20 shrink-0">
                <p className="text-xs font-semibold text-gray-500">{entry.date.slice(5).replace('-', '/')}</p>
                <p className="text-xs text-gray-500">{entry.memberName}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{entry.description}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 tabular-nums w-12 text-right">
                  {entry.hours}h
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="text-gray-500 hover:text-red-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-0.5">日付 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">担当者</label>
              <select
                value={draft.memberId}
                onChange={(e) => setDraft({ ...draft, memberId: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {MEMBER_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className="block text-xs text-gray-500 mb-0.5">時間 <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={draft.hours || ''}
                onChange={(e) => setDraft({ ...draft, hours: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">作業内容 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="例: ログイン画面の実装"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.date || !draft.description || draft.hours <= 0}
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
            + 工数を記録
          </button>
        </div>
      )}
    </div>
  );
}

export type { TimeEntry };

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  { id: 'te1', date: '2026-04-01', memberId: 'inukai',    memberName: '犬飼 智之',   hours: 6,   description: 'ログイン・認証機能実装' },
  { id: 'te2', date: '2026-04-01', memberId: 'kashiwagi', memberName: '柏樹 久美子', hours: 2,   description: '顧客要件確認・調整' },
  { id: 'te3', date: '2026-04-02', memberId: 'inukai',    memberName: '犬飼 智之',   hours: 7,   description: 'データ入力フォーム実装' },
  { id: 'te4', date: '2026-04-02', memberId: 'izumi',     memberName: '和泉 阿委璃', hours: 4,   description: 'UIデザイン修正・画面設計' },
  { id: 'te5', date: '2026-04-03', memberId: 'inukai',    memberName: '犬飼 智之',   hours: 8,   description: 'ダッシュボード・一覧画面実装' },
  { id: 'te6', date: '2026-04-03', memberId: 'kashiwagi', memberName: '柏樹 久美子', hours: 1.5, description: '中間報告・進捗確認' },
  { id: 'te7', date: '2026-04-04', memberId: 'inukai',    memberName: '犬飼 智之',   hours: 5,   description: 'レポート出力機能実装' },
  { id: 'te8', date: '2026-04-05', memberId: 'izumi',     memberName: '和泉 阿委璃', hours: 3,   description: 'スマートフォン対応・レスポンシブ調整' },
];

export const MOCK_BUDGET_HOURS = 160;
