'use client';

import { useState } from 'react';

type Deliverable = {
  id: string;
  name: string;
  type: 'document' | 'design' | 'code' | 'other';
  status: 'draft' | 'review' | 'approved' | 'delivered';
  updatedAt: string;
  assignee: string;
};

type Props = {
  deliverables: Deliverable[];
  onChange: (deliverables: Deliverable[]) => void;
};

const TYPE_LABEL: Record<Deliverable['type'], string> = {
  document: '書類',
  design: 'デザイン',
  code: 'コード',
  other: 'その他',
};

const STATUS_BADGE: Record<Deliverable['status'], string> = {
  draft:     'bg-gray-100 text-gray-600',
  review:    'bg-blue-50 text-blue-700 border border-blue-200',
  approved:  'bg-gray-100 text-gray-700 border border-gray-300',
  delivered: 'bg-gray-900 text-white',
};

const STATUS_LABEL: Record<Deliverable['status'], string> = {
  draft:     '下書き',
  review:    'レビュー中',
  approved:  '承認済み',
  delivered: '納品済み',
};

function generateId(): string {
  return `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY_DRAFT: Omit<Deliverable, 'id'> = {
  name: '',
  type: 'document',
  status: 'draft',
  updatedAt: '',
  assignee: '',
};

export default function Deliverables({ deliverables, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<Deliverable, 'id'>>(EMPTY_DRAFT);

  const handleAdd = () => {
    if (!draft.name) return;
    onChange([...deliverables, { id: generateId(), ...draft }]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  };

  const handleStatusChange = (id: string, status: Deliverable['status']) => {
    onChange(deliverables.map((d) => d.id === id ? { ...d, status } : d));
  };

  const handleDelete = (id: string) => {
    onChange(deliverables.filter((d) => d.id !== id));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">納品物</span>
        <span className="text-xs text-gray-500">{deliverables.length}件</span>
      </div>

      {deliverables.length === 0 && !adding && (
        <p className="text-sm text-gray-500 text-center py-6">納品物はまだありません</p>
      )}

      {deliverables.length > 0 && (
        <div className="divide-y divide-gray-100">
          {deliverables.map((d) => (
            <div key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{TYPE_LABEL[d.type]}</span>
                  {d.assignee && <span className="text-xs text-gray-500">{d.assignee}</span>}
                  {d.updatedAt && <span className="text-xs text-gray-500">{d.updatedAt}</span>}
                </div>
              </div>
              <select
                value={d.status}
                onChange={(e) => handleStatusChange(d.id, e.target.value as Deliverable['status'])}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {(Object.keys(STATUS_LABEL) as Deliverable['status'][]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[d.status]}`}>
                {STATUS_LABEL[d.status]}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                className="text-gray-500 hover:text-red-600 text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">名前 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="例: 要件定義書 v1.0"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-gray-500 mb-0.5">種別</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Deliverable['type'] })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {(Object.entries(TYPE_LABEL) as [Deliverable['type'], string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">担当</label>
              <input
                type="text"
                value={draft.assignee}
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
                placeholder="担当者名"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-0.5">更新日</label>
              <input
                type="date"
                value={draft.updatedAt}
                onChange={(e) => setDraft({ ...draft, updatedAt: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.name}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              追加
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
            + 納品物を追加
          </button>
        </div>
      )}
    </div>
  );
}

export type { Deliverable };

export const MOCK_DELIVERABLES: Deliverable[] = [
  { id: 'del1', name: '要件定義書 v2.0',          type: 'document', status: 'approved',  updatedAt: '2026-04-03', assignee: '柏樹' },
  { id: 'del2', name: 'UIデザインカンプ',           type: 'design',   status: 'review',    updatedAt: '2026-04-05', assignee: 'クリエイトデザイン' },
  { id: 'del3', name: 'フロントエンドソースコード', type: 'code',     status: 'draft',     updatedAt: '2026-04-06', assignee: '犬飼' },
  { id: 'del4', name: 'テスト結果報告書',           type: 'document', status: 'draft',     updatedAt: '',           assignee: '' },
];
