'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';

type FixedCost = {
  id: string;
  name: string;
  category: 'rent' | 'salary' | 'license' | 'insurance' | 'other';
  monthlyAmount: number;
  note?: string;
};

type Props = {
  costs: FixedCost[];
  onChange: (costs: FixedCost[]) => void;
};

const MOCK_COSTS: FixedCost[] = [
  {
    id: 'fc-001',
    name: 'オフィス賃料（HARVEY栄EAST）',
    category: 'rent',
    monthlyAmount: 300000,
    note: '5F・6F',
  },
  {
    id: 'fc-002',
    name: '給与（西田 玄暉）',
    category: 'salary',
    monthlyAmount: 800000,
  },
  {
    id: 'fc-003',
    name: '給与（土岐 公人）',
    category: 'salary',
    monthlyAmount: 650000,
  },
  {
    id: 'fc-004',
    name: '給与（石川 真也）',
    category: 'salary',
    monthlyAmount: 600000,
  },
  {
    id: 'fc-005',
    name: 'SaaSツール一式（GitHub / Slack / Figma 他）',
    category: 'license',
    monthlyAmount: 120000,
  },
  {
    id: 'fc-006',
    name: '社会保険・雇用保険',
    category: 'insurance',
    monthlyAmount: 310000,
    note: '法定福利費',
  },
];

const CATEGORY_LABEL: Record<FixedCost['category'], string> = {
  rent: '家賃',
  salary: '給与',
  license: 'ソフトウェア',
  insurance: '保険・社保',
  other: 'その他',
};

const CATEGORY_STYLE: Record<FixedCost['category'], string> = {
  rent: 'bg-gray-50 text-gray-600 border border-gray-200',
  salary: 'bg-blue-50 text-blue-600 border border-blue-200',
  license: 'bg-gray-50 text-gray-500 border border-gray-200',
  insurance: 'bg-gray-50 text-gray-500 border border-gray-200',
  other: 'bg-gray-50 text-gray-500 border border-gray-200',
};

function yen(v: number): string {
  if (v >= 10000) return `¥${(v / 10000).toLocaleString('ja-JP')}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

type NewCost = Omit<FixedCost, 'id'>;

const EMPTY_FORM: NewCost = {
  name: '',
  category: 'other',
  monthlyAmount: 0,
  note: '',
};

const GROSS_MARGIN_RATE = 46;

export function FixedCosts({ costs: initialCosts, onChange }: Props) {
  const [costs, setCosts] = useState<FixedCost[]>(initialCosts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewCost>(EMPTY_FORM);

  function update(updated: FixedCost[]) {
    setCosts(updated);
    onChange(updated);
  }

  function handleAdd() {
    if (!form.name || form.monthlyAmount <= 0) return;
    update([...costs, { ...form, id: `fc-${Date.now()}` }]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    if (!confirm('この固定費を削除しますか？')) return;
    update(costs.filter((c) => c.id !== id));
  }

  const totalMonthly = costs.reduce((s, c) => s + c.monthlyAmount, 0);
  const totalAnnual = totalMonthly * 12;
  const breakeven = Math.ceil(totalMonthly / (GROSS_MARGIN_RATE / 100));

  const categories = ['rent', 'salary', 'license', 'insurance', 'other'] as const;

  const categoryTotals = categories
    .map((cat) => ({
      cat,
      total: costs.filter((c) => c.category === cat).reduce((s, c) => s + c.monthlyAmount, 0),
    }))
    .filter((c) => c.total > 0);

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">月次固定費管理</p>
          <p className="text-xs text-gray-500 mt-0.5">毎月発生する固定費の一覧と損益分岐点</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded"
        >
          + 固定費を追加
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
        {[
          { label: '月額合計', value: yen(totalMonthly), color: 'text-gray-900' },
          { label: '年額合計', value: yen(totalAnnual), color: 'text-gray-900' },
          { label: '損益分岐点（月次売上）', value: yen(breakeven), color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">カテゴリ別集計</p>
        <div className="flex flex-wrap gap-3">
          {categoryTotals.map(({ cat, total }) => (
            <div key={cat} className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_STYLE[cat]}`}>
                {CATEGORY_LABEL[cat]}
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{yen(total)}</span>
              <span className="text-xs text-gray-500">
                ({Math.round((total / totalMonthly) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-3 border-b border-gray-200 bg-blue-50">
        <p className="text-xs font-semibold text-gray-500 mb-1">損益分岐点の計算式</p>
        <p className="text-xs text-gray-700">
          固定費合計 {yen(totalMonthly)} ÷ 粗利率 {GROSS_MARGIN_RATE}% = 必要売上 <span className="font-semibold text-red-600">{yen(breakeven)}</span>
        </p>
      </div>

      {showForm && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">新規固定費追加</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">名称 <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">カテゴリ</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as FixedCost['category'] })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">月額（円） <span className="text-red-600">*</span></label>
              <input
                type="number"
                value={form.monthlyAmount || ''}
                onChange={(e) => setForm({ ...form, monthlyAmount: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">備考</label>
              <input
                type="text"
                value={form.note || ''}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
            >
              追加
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-1.5 text-gray-500 text-xs font-semibold"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['名称', 'カテゴリ', '月額', '年額', '備考', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {costs.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{c.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_STYLE[c.category]}`}>
                    {CATEGORY_LABEL[c.category]}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                  {yen(c.monthlyAmount)}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-500 tabular-nums whitespace-nowrap">
                  {yen(c.monthlyAmount * 12)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.note ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500">合計</td>
              <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">{yen(totalMonthly)}</td>
              <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">{yen(totalAnnual)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function FixedCostsDemo() {
  const [costs, setCosts] = usePersistedState<FixedCost[]>('finance_fixed_costs', MOCK_COSTS);
  return <FixedCosts costs={costs} onChange={setCosts} />;
}
