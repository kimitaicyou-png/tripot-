'use client';

import { useState, Fragment } from 'react';

type Invoice = {
  id: string;
  dealName: string;
  clientName: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  paidAmount: number;
  paidDate?: string;
};

type Props = {
  invoices: Invoice[];
  onChange: (invoices: Invoice[]) => void;
};

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    dealName: 'SaaSプラットフォーム開発',
    clientName: 'トライポット株式会社',
    amount: 3250000,
    issuedDate: '2026-02-28',
    dueDate: '2026-03-31',
    status: 'overdue',
    paidAmount: 0,
  },
  {
    id: 'inv-002',
    dealName: '生産管理DX フェーズ1',
    clientName: '株式会社名港工業',
    amount: 4600000,
    issuedDate: '2026-03-15',
    dueDate: '2026-04-15',
    status: 'partial',
    paidAmount: 2000000,
    paidDate: '2026-04-01',
  },
  {
    id: 'inv-003',
    dealName: '電子カルテAPI連携',
    clientName: '株式会社中京メディカル',
    amount: 7800000,
    issuedDate: '2026-03-20',
    dueDate: '2026-04-20',
    status: 'unpaid',
    paidAmount: 0,
  },
  {
    id: 'inv-004',
    dealName: '内部管理ツール開発',
    clientName: '愛知県信用金庫',
    amount: 2100000,
    issuedDate: '2026-03-01',
    dueDate: '2026-03-31',
    status: 'paid',
    paidAmount: 2100000,
    paidDate: '2026-03-28',
  },
  {
    id: 'inv-005',
    dealName: 'QC管理システム追加開発',
    clientName: '愛知トヨタ協力工場',
    amount: 1800000,
    issuedDate: '2026-04-01',
    dueDate: '2026-04-30',
    status: 'unpaid',
    paidAmount: 0,
  },
];

const TODAY = new Date('2026-04-05');

function yen(v: number): string {
  if (v >= 10000) return `¥${(v / 10000).toLocaleString('ja-JP')}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

function overdueDays(dueDate: string): number {
  const due = new Date(dueDate);
  const diff = Math.floor((TODAY.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

const STATUS_LABEL: Record<Invoice['status'], string> = {
  unpaid: '未入金',
  partial: '一部入金',
  paid: '入金済',
  overdue: '期日超過',
};

const STATUS_STYLE: Record<Invoice['status'], string> = {
  unpaid: 'bg-gray-50 text-gray-500 border border-gray-200',
  partial: 'bg-blue-50 text-blue-600 border border-blue-200',
  paid: 'bg-green-50 text-green-700 border border-green-200',
  overdue: 'bg-red-50 text-red-600 border border-red-200',
};

export function PaymentReconciliation({ invoices: initialInvoices, onChange }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [inputDate, setInputDate] = useState('2026-04-05');

  function update(updated: Invoice[]) {
    setInvoices(updated);
    onChange(updated);
  }

  function handleReconcile(id: string) {
    const amount = parseInt(inputAmount.replace(/,/g, ''), 10);
    if (isNaN(amount) || amount <= 0) return;
    const updated = invoices.map((inv) => {
      if (inv.id !== id) return inv;
      const newPaid = inv.paidAmount + amount;
      const remaining = inv.amount - newPaid;
      const status: Invoice['status'] = remaining <= 0 ? 'paid' : 'partial';
      return { ...inv, paidAmount: Math.min(newPaid, inv.amount), status, paidDate: inputDate };
    });
    update(updated);
    setSelectedId(null);
    setInputAmount('');
  }

  const unpaidTotal = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  const overdueTotal = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  const thisMonthDue = invoices
    .filter((i) => i.dueDate.startsWith('2026-04') && i.status !== 'paid')
    .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">入金消込</p>
        <p className="text-xs text-gray-500 mt-0.5">請求書の入金確認と消込管理</p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
        {[
          { label: '未入金合計', value: yen(unpaidTotal), color: 'text-gray-900' },
          { label: '期日超過合計', value: yen(overdueTotal), color: 'text-red-600' },
          { label: '今月入金予定', value: yen(thisMonthDue), color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['案件名', '請求先', '請求額', '入金済', '残額', '支払期日', 'ステータス', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const remaining = inv.amount - inv.paidAmount;
              const days = overdueDays(inv.dueDate);
              const isOverdue = inv.status === 'overdue';
              return (
                <Fragment key={inv.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 whitespace-nowrap">{inv.dealName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{inv.clientName}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {yen(inv.amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap text-blue-600">
                      {inv.paidAmount > 0 ? yen(inv.paidAmount) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">
                      {remaining > 0 ? (
                        <span className={isOverdue ? 'text-red-600' : 'text-gray-900'}>{yen(remaining)}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                        {inv.dueDate}
                        {isOverdue && ` (${days}日超過)`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded"
                        >
                          入金確認
                        </button>
                      )}
                    </td>
                  </tr>
                  {selectedId === inv.id && (
                    <tr key={`${inv.id}-input`} className="bg-blue-50">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500">入金額（残額: {yen(remaining)}）</span>
                          <input
                            type="number"
                            value={inputAmount}
                            onChange={(e) => setInputAmount(e.target.value)}
                            placeholder="0"
                            className="border border-gray-200 rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <input
                            type="date"
                            value={inputDate}
                            onChange={(e) => setInputDate(e.target.value)}
                            className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            onClick={() => handleReconcile(inv.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                          >
                            消込確定
                          </button>
                          <button
                            onClick={() => setSelectedId(null)}
                            className="px-3 py-1.5 text-gray-500 text-xs font-semibold"
                          >
                            キャンセル
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PaymentReconciliationDemo() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  return <PaymentReconciliation invoices={invoices} onChange={setInvoices} />;
}
