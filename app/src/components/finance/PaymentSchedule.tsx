'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';

type Payment = {
  id: string;
  payeeName: string;
  category: 'outsource' | 'rent' | 'license' | 'tax' | 'salary' | 'other';
  amount: number;
  dueDate: string;
  status: 'scheduled' | 'paid' | 'overdue';
  recurring: boolean;
  memo?: string;
};

type Props = {
  payments: Payment[];
  onChange: (payments: Payment[]) => void;
};

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    payeeName: 'デラフォース株式会社',
    category: 'outsource',
    amount: 850000,
    dueDate: '2026-04-25',
    status: 'scheduled',
    recurring: false,
    memo: 'SaaS開発 フェーズ2外注',
  },
  {
    id: 'pay-002',
    payeeName: 'クウハク合同会社',
    category: 'outsource',
    amount: 420000,
    dueDate: '2026-04-25',
    status: 'scheduled',
    recurring: false,
    memo: 'UI/UXデザイン',
  },
  {
    id: 'pay-003',
    payeeName: 'ドットシンク株式会社',
    category: 'outsource',
    amount: 680000,
    dueDate: '2026-04-30',
    status: 'scheduled',
    recurring: false,
    memo: 'バックエンド開発',
  },
  {
    id: 'pay-004',
    payeeName: 'HARVEY栄EAST',
    category: 'rent',
    amount: 300000,
    dueDate: '2026-04-27',
    status: 'scheduled',
    recurring: true,
    memo: '5F・6F 月額賃料',
  },
  {
    id: 'pay-005',
    payeeName: 'GitHub Enterprise',
    category: 'license',
    amount: 48000,
    dueDate: '2026-04-15',
    status: 'paid',
    recurring: true,
  },
  {
    id: 'pay-006',
    payeeName: 'Slack Business+',
    category: 'license',
    amount: 32000,
    dueDate: '2026-04-15',
    status: 'paid',
    recurring: true,
  },
  {
    id: 'pay-007',
    payeeName: '名古屋市 法人市民税',
    category: 'tax',
    amount: 185000,
    dueDate: '2026-03-31',
    status: 'overdue',
    recurring: false,
  },
  {
    id: 'pay-008',
    payeeName: '社員給与（4名）',
    category: 'salary',
    amount: 2400000,
    dueDate: '2026-04-25',
    status: 'scheduled',
    recurring: true,
  },
];

const CATEGORY_LABEL: Record<Payment['category'], string> = {
  outsource: '外注費',
  rent: '家賃',
  license: 'ライセンス',
  tax: '税金',
  salary: '給与',
  other: 'その他',
};

const CATEGORY_STYLE: Record<Payment['category'], string> = {
  outsource: 'bg-blue-50 text-blue-600 border border-blue-200',
  rent: 'bg-gray-50 text-gray-600 border border-gray-200',
  license: 'bg-gray-50 text-gray-500 border border-gray-200',
  tax: 'bg-red-50 text-red-600 border border-red-200',
  salary: 'bg-gray-50 text-gray-900 border border-gray-200',
  other: 'bg-gray-50 text-gray-500 border border-gray-200',
};

const STATUS_LABEL: Record<Payment['status'], string> = {
  scheduled: '支払予定',
  paid: '支払済',
  overdue: '期日超過',
};

const STATUS_STYLE: Record<Payment['status'], string> = {
  scheduled: 'text-gray-500',
  paid: 'text-green-700',
  overdue: 'text-red-600 font-semibold',
};

type NewPayment = Omit<Payment, 'id' | 'status'>;

function yen(v: number): string {
  if (v >= 10000) return `¥${(v / 10000).toLocaleString('ja-JP')}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

const EMPTY_FORM: NewPayment = {
  payeeName: '',
  category: 'outsource',
  amount: 0,
  dueDate: '',
  recurring: false,
  memo: '',
};

export function PaymentSchedule({ payments: initialPayments, onChange }: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewPayment>(EMPTY_FORM);

  function update(updated: Payment[]) {
    setPayments(updated);
    onChange(updated);
  }

  function handleMarkPaid(id: string) {
    update(payments.map((p) => (p.id === id ? { ...p, status: 'paid' } : p)));
  }

  function handleAdd() {
    if (!form.payeeName || !form.dueDate || form.amount <= 0) return;
    const newPayment: Payment = {
      ...form,
      id: `pay-${Date.now()}`,
      status: 'scheduled',
    };
    update([...payments, newPayment]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  const thisMonthScheduled = payments.filter(
    (p) => p.dueDate.startsWith('2026-04') && p.status === 'scheduled'
  );
  const totalScheduled = thisMonthScheduled.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);

  const categories = ['outsource', 'rent', 'license', 'tax', 'salary', 'other'] as const;

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">支払い管理</p>
          <p className="text-xs text-gray-500 mt-0.5">支払予定・実績の一覧管理</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded"
        >
          + 支払いを追加
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
        {[
          { label: '今月支払予定', value: yen(totalScheduled), color: 'text-gray-900' },
          { label: '支払済（今月）', value: yen(totalPaid), color: 'text-green-700' },
          { label: '期日超過', value: yen(totalOverdue), color: totalOverdue > 0 ? 'text-red-600' : 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">新規支払い追加</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">支払先 <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.payeeName}
                onChange={(e) => setForm({ ...form, payeeName: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">カテゴリ</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Payment['category'] })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">金額（円） <span className="text-red-600">*</span></label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">支払期日 <span className="text-red-600">*</span></label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">メモ</label>
              <input
                type="text"
                value={form.memo || ''}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">毎月繰り返し</span>
              </label>
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
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['支払先', 'カテゴリ', '金額', '支払期日', '繰り返し', 'ステータス', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 whitespace-nowrap">{p.payeeName}</p>
                  {p.memo && <p className="text-xs text-gray-500 mt-0.5">{p.memo}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_STYLE[p.category]}`}>
                    {CATEGORY_LABEL[p.category]}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                  {yen(p.amount)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap ${p.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {p.dueDate}
                </td>
                <td className="px-4 py-3 text-center text-gray-500">
                  {p.recurring ? '毎月' : '—'}
                </td>
                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {p.status === 'scheduled' && (
                    <button
                      onClick={() => handleMarkPaid(p.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded"
                    >
                      支払済にする
                    </button>
                  )}
                  {p.status === 'overdue' && (
                    <button
                      onClick={() => handleMarkPaid(p.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded"
                    >
                      支払済にする
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PaymentScheduleDemo() {
  const [payments, setPayments] = usePersistedState<Payment[]>('finance_payments', MOCK_PAYMENTS);
  return <PaymentSchedule payments={payments} onChange={setPayments} />;
}
