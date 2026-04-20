'use client';

import { useState } from 'react';

type RunningItem = {
  id: string;
  name: string;
  monthlyAmount: number;
  period: 'monthly' | 'yearly';
  startMonth?: string;
};

type Props = {
  items: RunningItem[];
  onChange: (items: RunningItem[]) => void;
};

function generateId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return `¥${Math.round(amount / 10000)}万`;
  }
  return `¥${amount.toLocaleString()}`;
}

export default function RunningEstimateSection({ items, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RunningItem | null>(null);

  const totalMonthly = items.reduce((sum, item) => {
    if (item.period === 'monthly') return sum + item.monthlyAmount;
    return sum + Math.round(item.monthlyAmount / 12);
  }, 0);
  const totalYearly = totalMonthly * 12;

  const handleAdd = () => {
    const newItem: RunningItem = {
      id: generateId(),
      name: '',
      monthlyAmount: 0,
      period: 'monthly',
      startMonth: '',
    };
    setDraft(newItem);
    setEditingId(newItem.id);
  };

  const handleEdit = (item: RunningItem) => {
    setDraft({ ...item });
    setEditingId(item.id);
  };

  const handleSave = () => {
    if (!draft || !draft.name || draft.monthlyAmount <= 0) return;
    const exists = items.some((i) => i.id === draft.id);
    if (exists) {
      onChange(items.map((i) => (i.id === draft.id ? draft : i)));
    } else {
      onChange([...items, draft]);
    }
    setEditingId(null);
    setDraft(null);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setDraft(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500">ランニング（継続）</span>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">
            月計 {formatAmount(totalMonthly)} / 年額 {formatAmount(totalYearly)}
          </span>
        )}
      </div>

      {items.length === 0 && editingId === null && (
        <p className="text-xs text-gray-500 px-3 py-3">ランニング項目はありません</p>
      )}

      {items.map((item) => (
        <div key={item.id}>
          {editingId === item.id && draft ? (
            <RunningItemForm
              draft={draft}
              onChange={setDraft}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 text-sm">
              <span className="flex-1 text-gray-900 font-semibold">{item.name}</span>
              <span className="text-gray-700">
                {formatAmount(item.monthlyAmount)}/{item.period === 'monthly' ? '月' : '年'}
              </span>
              {item.startMonth && (
                <span className="text-xs text-gray-500">開始: {item.startMonth}</span>
              )}
              <button
                type="button"
                onClick={() => handleEdit(item)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                削除
              </button>
            </div>
          )}
        </div>
      ))}

      {editingId !== null && draft && !items.some((i) => i.id === draft.id) && (
        <RunningItemForm
          draft={draft}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {editingId === null && (
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={handleAdd}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            + ランニング項目を追加
          </button>
        </div>
      )}
    </div>
  );
}

function RunningItemForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: RunningItem;
  onChange: (item: RunningItem) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-3 py-2 border-b border-gray-100 space-y-2 bg-gray-50">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-0.5">項目名</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="例: 保守サポート"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs text-gray-500 mb-0.5">金額</label>
          <input
            type="number"
            value={draft.monthlyAmount || ''}
            onChange={(e) => onChange({ ...draft, monthlyAmount: parseInt(e.target.value) || 0 })}
            placeholder="150000"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-20">
          <label className="block text-xs text-gray-500 mb-0.5">周期</label>
          <select
            value={draft.period}
            onChange={(e) => onChange({ ...draft, period: e.target.value as 'monthly' | 'yearly' })}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="monthly">月額</option>
            <option value="yearly">年額</option>
          </select>
        </div>
      </div>
      <div className="w-36">
        <label className="block text-xs text-gray-500 mb-0.5">開始月</label>
        <input
          type="month"
          value={draft.startMonth ?? ''}
          onChange={(e) => onChange({ ...draft, startMonth: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!draft.name || draft.monthlyAmount <= 0}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export type { RunningItem };

export const MOCK_RUNNING_ITEMS: Record<string, RunningItem[]> = {};
