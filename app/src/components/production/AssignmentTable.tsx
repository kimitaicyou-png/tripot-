'use client';

import { useState } from 'react';

type Assignment = {
  id: string;
  resourceId: string;
  resourceName: string;
  role: string;
  type: 'inhouse' | 'outsource';
  unitPrice: number;
  plannedMonths: number;
  actualMonths: number | null;
  startDate: string;
  endDate?: string;
};

type Props = {
  assignments: Assignment[];
  revenue: number;
  onAssignmentsChange: (assignments: Assignment[]) => void;
};

const RESOURCE_OPTIONS = [
  { id: 'r1', name: '小野 崇', role: '代表取締役/PM', type: 'inhouse' as const, unitPrice: 1000000 },
  { id: 'r2', name: '柏樹 久美子', role: '営業/ディレクター', type: 'inhouse' as const, unitPrice: 800000 },
  { id: 'r3', name: '渡辺 健', role: 'エンジニア', type: 'inhouse' as const, unitPrice: 750000 },
  { id: 'r4', name: '山本 彩', role: 'エンジニア/QA', type: 'inhouse' as const, unitPrice: 700000 },
  { id: 'r5', name: 'クリエイトデザイン', role: 'UIデザイン', type: 'outsource' as const, unitPrice: 600000 },
  { id: 'r6', name: 'テックブリッジ', role: 'インフラ/DevOps', type: 'outsource' as const, unitPrice: 850000 },
  { id: 'r7', name: 'QAパートナーズ', role: 'テスト/QA', type: 'outsource' as const, unitPrice: 550000 },
];

export function AssignmentTable({ assignments, revenue, onAssignmentsChange }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPlannedMonths, setNewPlannedMonths] = useState('1');
  const [newStartDate, setNewStartDate] = useState('');

  const totalPlannedCost = assignments.reduce((s, a) => s + a.unitPrice * a.plannedMonths, 0);
  const totalActualCost = assignments.reduce((s, a) => {
    if (a.actualMonths !== null) return s + a.unitPrice * a.actualMonths;
    return s + a.unitPrice * a.plannedMonths;
  }, 0);
  const hasAnyActual = assignments.some((a) => a.actualMonths !== null);
  const displayCost = hasAnyActual ? totalActualCost : totalPlannedCost;
  const grossProfit = revenue - displayCost;
  const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

  const updateAssignment = (id: string, field: keyof Assignment, value: unknown) => {
    onAssignmentsChange(
      assignments.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const removeAssignment = (id: string) => {
    onAssignmentsChange(assignments.filter((a) => a.id !== id));
  };

  const handleAddAssignment = () => {
    const resource = RESOURCE_OPTIONS.find((r) => r.id === selectedResourceId);
    if (!resource) return;
    const newAssignment: Assignment = {
      id: `a-${Date.now()}`,
      resourceId: resource.id,
      resourceName: resource.name,
      role: newRole || resource.role,
      type: resource.type,
      unitPrice: resource.unitPrice,
      plannedMonths: parseFloat(newPlannedMonths) || 1,
      actualMonths: null,
      startDate: newStartDate || new Date().toISOString().slice(0, 10),
    };
    onAssignmentsChange([...assignments, newAssignment]);
    setShowAddModal(false);
    setSelectedResourceId('');
    setNewRole('');
    setNewPlannedMonths('1');
    setNewStartDate('');
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 text-gray-500 font-medium">担当</th>
              <th className="text-left px-3 py-2.5 text-gray-500 font-medium">種別</th>
              <th className="text-left px-3 py-2.5 text-gray-500 font-medium">役割</th>
              <th className="text-right px-3 py-2.5 text-gray-500 font-medium">単価</th>
              <th className="text-right px-3 py-2.5 text-gray-500 font-medium">予定工数</th>
              <th className="text-right px-3 py-2.5 text-gray-500 font-medium">予定コスト</th>
              <th className="text-right px-3 py-2.5 text-gray-500 font-medium">実績工数</th>
              <th className="text-right px-3 py-2.5 text-gray-500 font-medium">実績コスト</th>
              <th className="px-1 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const plannedCost = a.unitPrice * a.plannedMonths;
              const actualCost = a.actualMonths !== null ? a.unitPrice * a.actualMonths : null;
              return (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-900">{a.resourceName}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${a.type === 'inhouse' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {a.type === 'inhouse' ? '内製' : '外注'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{a.role}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                    ¥{(a.unitPrice / 10000).toFixed(0)}万
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <input
                      type="number"
                      value={a.plannedMonths}
                      onChange={(e) => updateAssignment(a.id, 'plannedMonths', parseFloat(e.target.value) || 0)}
                      step="0.5"
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-gray-900 text-right focus:ring-1 focus:ring-gray-400 tabular-nums"
                    />
                    <span className="ml-1 text-gray-500">人月</span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-700 tabular-nums">
                    ¥{(plannedCost / 10000).toFixed(0)}万
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <input
                      type="number"
                      value={a.actualMonths ?? ''}
                      onChange={(e) => updateAssignment(a.id, 'actualMonths', e.target.value === '' ? null : parseFloat(e.target.value))}
                      step="0.1"
                      placeholder="—"
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-right focus:ring-1 focus:ring-gray-400 tabular-nums placeholder:text-gray-500"
                    />
                    <span className="ml-1 text-gray-500">人月</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {actualCost !== null ? (
                      <span className={`font-medium ${actualCost > plannedCost ? 'text-red-600' : 'text-gray-700'}`}>
                        ¥{(actualCost / 10000).toFixed(0)}万
                        {actualCost !== plannedCost && (
                          <span className="ml-1 text-xs">
                            ({actualCost > plannedCost ? '+' : ''}{((actualCost - plannedCost) / 10000).toFixed(0)}万)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-1 py-2 text-center">
                    <button
                      onClick={() => removeAssignment(a.id)}
                      className="text-gray-500 hover:text-red-600 font-medium text-base leading-none"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-700">合計</td>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700 tabular-nums">
                {assignments.reduce((s, a) => s + a.plannedMonths, 0).toFixed(1)} 人月
              </td>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700 tabular-nums">
                ¥{(totalPlannedCost / 10000).toFixed(0)}万
              </td>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700 tabular-nums">
                {assignments.some((a) => a.actualMonths !== null)
                  ? `${assignments.reduce((s, a) => s + (a.actualMonths ?? 0), 0).toFixed(1)} 人月`
                  : '—'}
              </td>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700 tabular-nums">
                {hasAnyActual ? `¥${(totalActualCost / 10000).toFixed(0)}万` : '—'}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        + アサインを追加
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">予算ベース</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">売上</span>
              <span className="font-semibold text-gray-900 tabular-nums">¥{(revenue / 10000).toFixed(0)}万</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">コスト</span>
              <span className="font-semibold text-gray-700 tabular-nums">¥{(totalPlannedCost / 10000).toFixed(0)}万</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
              <span className="font-medium text-gray-700">粗利</span>
              <span className={`font-semibold tabular-nums ${revenue - totalPlannedCost >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                ¥{((revenue - totalPlannedCost) / 10000).toFixed(0)}万（{revenue > 0 ? Math.round(((revenue - totalPlannedCost) / revenue) * 100) : 0}%）
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">{assignments.every((a) => a.actualMonths !== null) ? '確定' : '速報'}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">売上</span>
              <span className="font-semibold text-gray-900 tabular-nums">¥{(revenue / 10000).toFixed(0)}万</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">コスト</span>
              <span className="font-semibold text-gray-700 tabular-nums">¥{(displayCost / 10000).toFixed(0)}万</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
              <span className="font-medium text-gray-700">粗利</span>
              <span className={`font-semibold tabular-nums ${grossProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                ¥{(grossProfit / 10000).toFixed(0)}万（{grossMargin}%）
              </span>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-sm mx-4 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">アサインを追加</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">リソース <span className="text-red-600">*</span></label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => {
                    setSelectedResourceId(e.target.value);
                    const r = RESOURCE_OPTIONS.find((o) => o.id === e.target.value);
                    if (r) setNewRole(r.role);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">選択してください</option>
                  <optgroup label="内製">
                    {RESOURCE_OPTIONS.filter((r) => r.type === 'inhouse').map((r) => (
                      <option key={r.id} value={r.id}>{r.name}（{r.role}）</option>
                    ))}
                  </optgroup>
                  <optgroup label="外注">
                    {RESOURCE_OPTIONS.filter((r) => r.type === 'outsource').map((r) => (
                      <option key={r.id} value={r.id}>{r.name}（{r.role}）</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">役割</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="PM、開発、QA など"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">予定工数（人月）<span className="text-red-600">*</span></label>
                <input
                  type="number"
                  value={newPlannedMonths}
                  onChange={(e) => setNewPlannedMonths(e.target.value)}
                  step="0.5"
                  min="0.5"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">開始日</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddAssignment}
                disabled={!selectedResourceId}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'a1', resourceId: 'r4', resourceName: '山本 彩', role: 'PM', type: 'inhouse', unitPrice: 800000, plannedMonths: 2, actualMonths: 1.6, startDate: '2026-03-01' },
  { id: 'a2', resourceId: 'r3', resourceName: '渡辺 健', role: '開発', type: 'inhouse', unitPrice: 750000, plannedMonths: 3, actualMonths: 1.5, startDate: '2026-03-15' },
  { id: 'a3', resourceId: 'r4', resourceName: '山本 彩', role: 'QA', type: 'inhouse', unitPrice: 700000, plannedMonths: 0.5, actualMonths: null, startDate: '2026-06-01' },
  { id: 'a4', resourceId: 'r5', resourceName: 'クリエイトデザイン', role: 'UIデザイン', type: 'outsource', unitPrice: 600000, plannedMonths: 1, actualMonths: 1, startDate: '2026-03-01' },
];
