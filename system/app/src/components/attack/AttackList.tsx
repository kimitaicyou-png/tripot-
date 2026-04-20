'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AttackTarget } from '@/lib/stores/attackStore';
import { loadTargets, saveTargets, addTarget, updateTarget, removeTarget } from '@/lib/stores/attackStore';
import { AttackCard } from './AttackCard';
import { AttackForm } from './AttackForm';
import { AttackDetailModal } from './AttackDetailModal';

type FilterStatus = AttackTarget['status'] | 'all';

const FILTER_OPTIONS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'new', label: '新規' },
  { id: 'contacted', label: '接触済' },
  { id: 'meeting', label: '商談中' },
  { id: 'dealt', label: '案件化' },
  { id: 'declined', label: '辞退' },
];

export function AttackList() {
  const [targets, setTargets] = useState<AttackTarget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTargets(loadTargets());
  }, []);

  const filtered = useMemo(() => {
    let result = targets;
    if (filter !== 'all') result = result.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        t.industry.toLowerCase().includes(q) ||
        t.memo.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.priority - a.priority);
  }, [targets, filter, search]);

  const handleSave = (target: AttackTarget) => {
    if (editingId) {
      updateTarget(target.id, target);
    } else {
      addTarget(target);
    }
    setTargets(loadTargets());
    setShowForm(false);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    removeTarget(id);
    setTargets(loadTargets());
    setDetailId(null);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDetailId(null);
    setShowForm(true);
  };

  const handleUpdateTarget = (id: string, patch: Partial<AttackTarget>) => {
    updateTarget(id, patch);
    setTargets(loadTargets());
  };

  const detailTarget = detailId ? targets.find((t) => t.id === detailId) : null;
  const editTarget = editingId ? targets.find((t) => t.id === editingId) : undefined;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: targets.length };
    for (const t of targets) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [targets]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">アタックリスト</h2>
          <p className="text-xs text-gray-500 mt-0.5">{targets.length}件のターゲット</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-colors"
        >
          ＋ ターゲット追加
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前・企業・業種で検索..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
        />
      </div>

      <div className="flex gap-1 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-lg active:scale-[0.98] transition-colors ${
              filter === f.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {f.label} {(statusCounts[f.id] ?? 0) > 0 && <span className="ml-1 tabular-nums">({statusCounts[f.id]})</span>}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{editingId ? 'ターゲット編集' : '新規ターゲット'}</h3>
          <AttackForm
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            {targets.length === 0 ? 'アタックリストが空です' : '条件に一致するターゲットがありません'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((t) => (
            <AttackCard key={t.id} target={t} onClick={() => setDetailId(t.id)} />
          ))}
        </div>
      )}

      {detailTarget && (
        <AttackDetailModal
          target={detailTarget}
          onClose={() => setDetailId(null)}
          onEdit={handleEdit}
          onRemove={handleRemove}
          onUpdate={handleUpdateTarget}
        />
      )}
    </div>
  );
}
